#!/usr/bin/env node
import { etlService } from '../backend/src/modules/analytics/etl.service.js';
import { ensureWarehouseDatabase } from '../backend/src/warehouseDb.js';
import { pool } from '../backend/src/db.js';

const modeArg = process.argv.find((a) => a.startsWith('--mode='));
const loadMode = modeArg ? modeArg.split('=')[1].toUpperCase() : 'INCREMENTAL';

console.log('=== BloodBridge Data Warehouse ETL Runner ===');
console.log(`Execution Mode: ${loadMode}`);
console.log(`Timestamp: ${new Date().toISOString()}`);

async function main() {
  try {
    console.log('[ETL] Verifying warehouse database connectivity and schema migrations...');
    await ensureWarehouseDatabase();

    console.log('[ETL] Starting ETL extraction, transformation, and load pipeline...');
    const result = await etlService.runEtl({
      jobName: 'CLI_WAREHOUSE_ETL',
      loadMode,
      requestedBy: 'CLI_RUNNER',
    });

    console.log('\n--- ETL Execution Summary ---');
    console.log(`Run ID: ${result.runId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Total Rows Loaded: ${result.rowsLoaded}`);
    console.log('Breakdown by entity:', JSON.stringify(result.stepCounts, null, 2));
    console.log(`Error Count: ${result.errorCount}`);
    console.log(`Finished At: ${result.finishedAt}`);

    console.log('\n--- Source-to-Warehouse Reconciliation Audit ---');
    const audit = await etlService.getReconciliationAudit();
    console.table(audit.reconciliation);
    console.log(`Overall Health: ${audit.health}`);
    console.log(`Data Freshness: ${audit.dataFreshness}`);

    process.exit(0);
  } catch (err) {
    console.error('\n[ETL ERROR] Pipeline failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {}
  }
}

main();
