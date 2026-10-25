import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Load environment variables if available
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

const operationalUrl = process.env.DATABASE_URL;
const warehouseUrl = process.env.WAREHOUSE_DATABASE_URL;
const host = process.env.PGHOST || '127.0.0.1';
const defaultHostPort = (host === 'localhost' || host === '127.0.0.1') && !process.env.DOCKER && (process.env.POSTGRES_USER === 'bloodbridge' && !process.env.PGUSER) ? 5433 : 5432;
const port = Number(process.env.PGPORT || (process.env.CI ? 5432 : (process.env.DOCKER ? 5432 : defaultHostPort)));
const user = process.env.PGUSER || process.env.POSTGRES_USER || 'bloodbridge';
const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
const warehouseDatabaseName = process.env.PGDATABASE_WAREHOUSE || 'bloodbridge_warehouse';

const isSupabaseOrRemote = Boolean(
  (warehouseUrl && (warehouseUrl.includes('supabase') || warehouseUrl.includes('sslmode=require'))) ||
  (operationalUrl && (operationalUrl.includes('supabase') || operationalUrl.includes('sslmode=require'))) ||
  (host && (host.includes('supabase.co') || host.includes('supabase.com'))) ||
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true'
);

const warehousePoolConfig = warehouseUrl
  ? {
      connectionString: warehouseUrl,
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      max: 10,
      connectionTimeoutMillis: 10000,
    }
  : {
      host,
      port,
      user,
      password,
      database: warehouseDatabaseName,
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      max: 10,
      connectionTimeoutMillis: 10000,
    };

export const warehousePool = new pg.Pool(warehousePoolConfig);

let isInitialized = false;

/**
 * Ensures the warehouse database, schema, tables, and date dimension exist.
 */
export async function ensureWarehouseDatabase() {
  if (isInitialized) return;

  // 1. Check if database exists by attempting connection or creating via maintenance DB
  if (!warehouseUrl && !isSupabaseOrRemote) {
    try {
      const client = await warehousePool.connect();
      client.release();
    } catch (err) {
      if (err.code === '3D000') {
        // Database does not exist; connect to maintenance DB and create it
        const maintenancePool = new pg.Pool({
          host,
          port,
          user,
          password,
          database: 'postgres',
          connectionTimeoutMillis: 10000,
        });
        const mClient = await maintenancePool.connect();
        try {
          await mClient.query(`CREATE DATABASE "${warehouseDatabaseName}";`);
        } finally {
          mClient.release();
          await maintenancePool.end();
        }
      } else {
        throw err;
      }
    }
  }

  // 2. Apply warehouse migrations 004 and 005
  const client = await warehousePool.connect();
  try {
    const warehouseDir = path.join(rootDir, 'database', 'warehouse');
    const migration004Path = path.join(warehouseDir, '004_warehouse.sql');
    const migration005Path = path.join(warehouseDir, '005_analytics_extension.sql');

    if (fs.existsSync(migration004Path)) {
      const sql004 = fs.readFileSync(migration004Path, 'utf8');
      await client.query(sql004);
    }

    if (fs.existsSync(migration005Path)) {
      const sql005 = fs.readFileSync(migration005Path, 'utf8');
      await client.query(sql005);
    }

    // 3. Seed dim_date if empty (covers 2024-01-01 through 2027-12-31)
    const { rows: dateRows } = await client.query('SELECT count(*)::int AS count FROM dim_date');
    if (!dateRows[0] || dateRows[0].count === 0) {
      await client.query(`
        INSERT INTO dim_date (date_key, full_date, year, month, quarter)
        SELECT
          to_char(d, 'YYYYMMDD')::int AS date_key,
          d::date AS full_date,
          extract(year FROM d)::smallint AS year,
          extract(month FROM d)::smallint AS month,
          extract(quarter FROM d)::smallint AS quarter
        FROM generate_series('2024-01-01'::date, '2027-12-31'::date, '1 day'::interval) d
        ON CONFLICT (date_key) DO NOTHING;
      `);
    }

    isInitialized = true;
  } finally {
    client.release();
  }
}

export async function queryWarehouse(sql, params = []) {
  await ensureWarehouseDatabase();
  return warehousePool.query(sql, params);
}
