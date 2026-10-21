import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from '../backend/node_modules/pg/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'database', 'migrations');

const host = process.env.PGHOST || '127.0.0.1';
const port = Number(process.env.PGPORT || (process.env.CI ? 5432 : 5433));
const user = process.env.PGUSER || process.env.POSTGRES_USER || 'bloodbridge';
const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'HAzi@1915';
const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'bloodbridge';

console.log(`[migrate] Connecting to PostgreSQL at ${host}:${port}/${database}...`);

const pool = new pg.Pool({
  host,
  port,
  user,
  password,
  database,
  connectionTimeoutMillis: 5000,
});

async function run() {
  const client = await pool.connect();
  try {
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
    const tableNames = existingTables.map(r => r.table_name);

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
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.startsWith('009_'))
      .sort();

    const { rows: appliedRows } = await client.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map(r => r.version));

    let appliedCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(`[migrate] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
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
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Migration runner failed:', err);
  process.exit(1);
});
