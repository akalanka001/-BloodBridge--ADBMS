import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pgModule;
try {
  pgModule = require('../backend/node_modules/pg');
} catch {
  pgModule = require('pg');
}
const pg = pgModule.default || pgModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'database', 'migrations');

// Auto-load .env file if available
if (typeof process.loadEnvFile === 'function') {
  const candidatePaths = [
    path.resolve(rootDir, '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
        break;
      } catch {
        // ignore
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
const host = process.env.PGHOST || '127.0.0.1';
const port = Number(process.env.PGPORT || (process.env.CI ? 5432 : (process.env.DOCKER ? 5432 : 5433)));
const user = process.env.PGUSER || process.env.POSTGRES_USER || 'bloodbridge';
const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'bloodbridge';

const isSupabaseOrRemote = Boolean(
  (connectionString && (connectionString.includes('supabase') || connectionString.includes('sslmode=require'))) ||
  (host && (host.includes('supabase.co') || host.includes('supabase.com'))) ||
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true'
);

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
    }
  : {
      host,
      port,
      user,
      password,
      database,
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
    };

console.log(
  connectionString
    ? `[migrate] Connecting to remote PostgreSQL via DATABASE_URL (SSL: ${isSupabaseOrRemote})...`
    : `[migrate] Connecting to PostgreSQL at ${host}:${port}/${database} (user: ${user}, SSL: ${isSupabaseOrRemote})...`
);

let pool = new pg.Pool(poolConfig);

async function ensureDatabaseExists() {
  if (connectionString || isSupabaseOrRemote) return; // Cloud instances usually provide their target database
  try {
    const testClient = await pool.connect();
    testClient.release();
  } catch (err) {
    if (err.code === '3D000') {
      // Database does not exist; connect to 'postgres' maintenance DB and create it
      console.log(`[migrate] Database "${database}" does not exist. Creating it on ${host}:${port}...`);
      const maintenancePool = new pg.Pool({ ...poolConfig, database: 'postgres' });
      const mClient = await maintenancePool.connect();
      try {
        await mClient.query(`CREATE DATABASE "${database}";`);
        console.log(`[migrate] Database "${database}" successfully created.`);
      } finally {
        mClient.release();
        await maintenancePool.end();
      }
      // Reinitialize target pool
      pool = new pg.Pool(poolConfig);
    } else {
      throw err;
    }
  }
}

const ADVISORY_LOCK_ID = 849201948;

function stripOuterTransactionBlocks(sql) {
  const lines = sql.split('\n');
  let inDollarQuote = false;
  let dollarTag = null;
  const filtered = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const dollarMatches = line.match(/\$[a-zA-Z0-9_]*\$/g);
    if (dollarMatches) {
      for (const tag of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = null;
        }
      }
    }

    if (!inDollarQuote) {
      if (/^BEGIN\s*;/i.test(trimmed) || /^COMMIT\s*;/i.test(trimmed)) {
        filtered.push(`-- [migrate stripped outer transaction]: ${line}`);
        continue;
      }
    }
    filtered.push(line);
  }

  return filtered.join('\n');
}

async function run() {
  await ensureDatabaseExists();
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    // Acquire PostgreSQL session advisory lock to serialize concurrent migration runners
    console.log('[migrate] Acquiring migration lock (advisory lock: 849201948)...');
    await client.query('SELECT pg_advisory_lock($1);', [ADVISORY_LOCK_ID]);
    lockAcquired = true;

    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Baseline detection for already-initialized databases
    const { rows: existingTables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('users', 'districts');
    `);
    const tableNames = existingTables.map((r) => r.table_name);

    if (tableNames.includes('users')) {
      await client.query(`
        INSERT INTO schema_migrations (version) VALUES ('001_schema.sql')
        ON CONFLICT (version) DO NOTHING;
      `);
    }

    if (tableNames.includes('districts')) {
      await client.query(`
        INSERT INTO schema_migrations (version) VALUES ('002_seed_reference.sql')
        ON CONFLICT (version) DO NOTHING;
      `);
    }

    const { rows: existingViews } = await client.query(`
      SELECT viewname FROM pg_views
      WHERE schemaname = 'public' AND viewname = 'v_available_blood_stock';
    `);
    if (existingViews.length > 0) {
      await client.query(`
        INSERT INTO schema_migrations (version) VALUES ('007_advanced_objects.sql')
        ON CONFLICT (version) DO NOTHING;
      `);
    }

    // 3. Read migration files (ignoring non-migration verification scripts like 009)
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('009_'))
      .sort();

    const { rows: appliedRows } = await client.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map((r) => r.version));

    let appliedCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(`[migrate] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const rawSql = fs.readFileSync(filePath, 'utf8');
      const sanitizedSql = stripOuterTransactionBlocks(rawSql);

      await client.query('BEGIN');
      try {
        await client.query(sanitizedSql);
        await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] Failed to apply ${file}:`, err.message);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('[migrate] Database is already up to date. No pending migrations.');
    } else {
      console.log(`[migrate] Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1);', [ADVISORY_LOCK_ID]);
      } catch {}
    }
    client.release();
    await pool.end();
  }
}


run().catch((err) => {
  console.error('[migrate] Migration runner failed:', err.message);
  process.exit(1);
});
