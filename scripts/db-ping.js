import { pool } from '../backend/src/db.js';

console.log('\n======================================================');
console.log('🔍 Testing BloodBridge Database Connection...');
console.log('======================================================\n');

async function checkDatabase() {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    const duration = Date.now() - startTime;

    try {
      const { rows: info } = await client.query(`
        SELECT current_database() AS db, current_user AS user, version(), now() AS server_time
      `);

      const { rows: tables } = await client.query(`
        SELECT count(*)::int AS count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);

      const { rows: views } = await client.query(`
        SELECT count(*)::int AS count FROM pg_views WHERE schemaname = 'public'
      `);

      const { rows: procs } = await client.query(`
        SELECT count(*)::int AS count FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind = 'p'
      `);

      const { rows: funcs } = await client.query(`
        SELECT count(*)::int AS count FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind = 'f' AND NOT p.proname LIKE 'pg_%'
      `);

      const { rows: triggers } = await client.query(`
        SELECT count(*)::int AS count FROM pg_trigger WHERE NOT tgisinternal
      `);

      let migrationsCount = '0';
      try {
        const { rows: migs } = await client.query(`SELECT count(*)::int AS count FROM schema_migrations`);
        migrationsCount = migs[0].count;
      } catch {
        migrationsCount = 'schema_migrations not created yet (run npm run db:setup)';
      }

      console.log('✅ DATABASE CONNECTION SUCCESSFUL!');
      console.log('------------------------------------------------------');
      console.log(`Database Name:       ${info[0].db}`);
      console.log(`Connected User:      ${info[0].user}`);
      console.log(`PostgreSQL Engine:   ${info[0].version.split(',')[0]}`);
      console.log(`Server Timestamp:    ${new Date(info[0].server_time).toISOString()}`);
      console.log(`Latency:             ${duration}ms`);
      console.log('------------------------------------------------------');
      console.log('📊 Object Inventory:');
      console.log(` - Tables Installed:       ${tables[0].count}`);
      console.log(` - Views Installed:        ${views[0].count}`);
      console.log(` - Stored Procedures:      ${procs[0].count}`);
      console.log(` - User Functions:         ${funcs[0].count}`);
      console.log(` - Active Triggers:        ${triggers[0].count}`);
      console.log(` - Applied Migrations:     ${migrationsCount}`);
      console.log('------------------------------------------------------');
      console.log('🎉 Everything is working properly and ready for development!\n');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('\n❌ DATABASE CONNECTION FAILED!');
    console.error('------------------------------------------------------');
    console.error(`Error Code:    ${err.code || 'N/A'}`);
    console.error(`Error Message: ${err.message}`);
    console.error('------------------------------------------------------');
    console.log('\n💡 Troubleshooting Tips:');
    if (err.code === 'ECONNREFUSED') {
      console.log('  1. Check if your PostgreSQL server or Docker is running.');
      console.log('  2. For Docker, run: npm run dev');
      console.log('  3. For Local PostgreSQL, ensure service is started on port 5432.');
    } else if (err.code === '28P01') {
      console.log('  1. Authentication failed. Verify PGUSER/POSTGRES_USER and PGPASSWORD in your .env file.');
    } else if (err.code === '3D000') {
      console.log('  1. Database does not exist yet. Run: npm run db:setup');
    } else {
      console.log('  1. Check your .env file configuration against .env.example.');
    }
    console.log();
    process.exit(1);
  }
}

checkDatabase();
