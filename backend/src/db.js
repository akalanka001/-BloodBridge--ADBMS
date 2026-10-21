import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Automatically load .env for developers running locally outside Docker
if (typeof process.loadEnvFile === 'function') {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];
  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
        break;
      } catch {
        // ignore parsing errors
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
const host = process.env.PGHOST || 'localhost';
const isSupabaseOrRemote = Boolean(
  (connectionString && (connectionString.includes('supabase') || connectionString.includes('sslmode=require'))) ||
  (host && (host.includes('supabase.co') || host.includes('supabase.com'))) ||
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true'
);

const defaultHostPort = (host === 'localhost' || host === '127.0.0.1') && !process.env.DOCKER && (process.env.POSTGRES_USER === 'bloodbridge' && !process.env.PGUSER) ? 5433 : 5432;
const resolvedPort = Number(process.env.PGPORT || defaultHostPort);

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      max: 12,
      connectionTimeoutMillis: 10000,
    }
  : {
      host,
      port: resolvedPort,
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'bloodbridge',
      ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
      max: 12,
      connectionTimeoutMillis: 10000,
    };

export const pool = new pg.Pool(poolConfig);

export async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
