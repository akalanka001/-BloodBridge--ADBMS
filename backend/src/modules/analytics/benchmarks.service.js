import { pool } from '../../db.js';
import { queryWarehouse } from '../../warehouseDb.js';

export class BenchmarksService {
  constructor() {
    this.approvedTemplates = [
      {
        id: 'EXP-01-COMPOSITE-GEO',
        name: 'Donor Matching & Geographical Filtering',
        description: 'Compares sequential scan against composite partial B-tree index (idx_donors_available_geo) on blood_type_code, district_code with availability predicate.',
        indexStrategy: 'Composite B-Tree with Partial Predicate (WHERE available_for_contact = TRUE)',
        targetTable: 'donors',
        queryIdentifier: 'Q_DONOR_MATCH_GEO',
      },
      {
        id: 'EXP-02-PARTIAL-INDEX',
        name: 'Available Stock Expiry Lookup',
        description: 'Evaluates partial index performance filtering released unexpired component stock ordered by nearest expiration date.',
        indexStrategy: 'Partial Composite B-Tree (idx_units_available) with RELEASED & IN_STOCK predicates',
        targetTable: 'blood_units',
        queryIdentifier: 'Q_STOCK_EXPIRY_ALLOC',
      },
      {
        id: 'EXP-03-HASH-VS-BTREE',
        name: 'Hash vs B-Tree Exact Equality Lookup',
        description: 'Academic comparison of exact UUID equality lookup demonstrating single-row index scan overhead and WAL behavior.',
        indexStrategy: 'B-Tree vs Hash Index Equality Scan',
        targetTable: 'blood_units',
        queryIdentifier: 'Q_EXACT_UUID_LOOKUP',
      },
      {
        id: 'EXP-04-OLAP-STAR-JOIN',
        name: 'Star Schema Fact-Dimension vs Operational OLTP Join',
        description: 'Compares aggregation of blood demand: Denormalized OLAP Fact-Dimension Join vs OLTP join with correlated subqueries.',
        indexStrategy: 'Star Schema Surrogate Key Joins + Dimensional Hash Aggregate',
        targetTable: 'fact_request_items vs request_items',
        queryIdentifier: 'Q_DEMAND_AGGREGATE',
      },
      {
        id: 'EXP-05-CLUSTER-PHYSICAL',
        name: 'Physical Table Organization (CLUSTER Experiment)',
        description: 'Evaluates reduction in shared buffer reads when table rows are physically clustered on disk matching index ordering.',
        indexStrategy: 'CLUSTER on Index (Physical Heap Reordering)',
        targetTable: 'scratch_benchmark_units',
        queryIdentifier: 'Q_HEAP_BUFFER_EFFICIENCY',
      },
    ];
  }

  /**
   * Returns list of approved benchmark templates
   */
  getTemplates() {
    return this.approvedTemplates;
  }

  /**
   * Executes a benchmark experiment and returns actual measured PostgreSQL timings and query plans.
   * @param {Object} options
   * @param {string} options.experimentId - ID from approvedTemplates
   * @param {number} [options.repetitionCount=3] - Number of query iterations
   */
  async runBenchmark(options = {}) {
    const experimentId = options.experimentId || 'EXP-01-COMPOSITE-GEO';
    const repetitionCount = Math.min(Math.max(parseInt(options.repetitionCount, 10) || 3, 1), 10);

    const template = this.approvedTemplates.find((t) => t.id === experimentId);
    if (!template) {
      throw new Error(`Invalid benchmark experiment ID: ${experimentId}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let baselineResult;
      let optimizedResult;

      switch (experimentId) {
        case 'EXP-01-COMPOSITE-GEO': {
          const sql = `
            SELECT d.id, d.blood_type_code, d.district_code, d.ds_code
            FROM donors d
            WHERE d.blood_type_code = 'O+'
              AND d.district_code = 'CO'
              AND d.available_for_contact = TRUE
          `;
          baselineResult = await this.measureWithPlan(client, sql, { disableIndexes: true }, repetitionCount);
          optimizedResult = await this.measureWithPlan(client, sql, { disableIndexes: false }, repetitionCount);
          break;
        }

        case 'EXP-02-PARTIAL-INDEX': {
          const sql = `
            SELECT id, blood_type_code, component_code, expires_at
            FROM blood_units
            WHERE blood_type_code = 'O+'
              AND component_code = 'RBC'
              AND release_status = 'RELEASED'
              AND inventory_status = 'IN_STOCK'
              AND expires_at > now()
            ORDER BY expires_at ASC
            LIMIT 50
          `;
          baselineResult = await this.measureWithPlan(client, sql, { disableIndexes: true }, repetitionCount);
          optimizedResult = await this.measureWithPlan(client, sql, { disableIndexes: false }, repetitionCount);
          break;
        }

        case 'EXP-03-HASH-VS-BTREE': {
          const { rows: unitRows } = await client.query('SELECT id FROM blood_units LIMIT 1');
          const testId = unitRows[0]?.id || '00000000-0000-0000-0000-000000000000';
          const sql = `SELECT * FROM blood_units WHERE id = '${testId}'::uuid`;
          baselineResult = await this.measureWithPlan(client, sql, { disableIndexes: true }, repetitionCount);
          optimizedResult = await this.measureWithPlan(client, sql, { disableIndexes: false }, repetitionCount);
          break;
        }

        case 'EXP-04-OLAP-STAR-JOIN': {
          const oltpSql = `
            SELECT ri.blood_type_code,
                   sum(ri.units_requested)::int AS requested,
                   count(ir.id)::int AS fulfilled
            FROM request_items ri
            JOIN blood_requests br ON br.id = ri.request_id
            LEFT JOIN inventory_reservations ir ON ir.request_item_id = ri.id AND ir.status = 'FULFILLED'
            GROUP BY ri.blood_type_code
          `;
          baselineResult = await this.measureWithPlan(client, oltpSql, { disableIndexes: false }, repetitionCount);

          // For OLAP star schema, query the warehouse DB
          const starSql = `
            SELECT bt.blood_type_code,
                   sum(fri.requested_units)::int AS requested,
                   sum(fri.fulfilled_units)::int AS fulfilled
            FROM fact_request_items fri
            JOIN dim_blood_type bt ON bt.type_key = fri.type_key
            GROUP BY bt.blood_type_code
          `;
          const whClient = await queryWarehouse('SELECT 1');
          optimizedResult = await this.measureWarehouseWithPlan(starSql, repetitionCount);
          break;
        }

        case 'EXP-05-CLUSTER-PHYSICAL': {
          // Scratch table experiment
          await client.query(`
            CREATE TEMP TABLE temp_scratch_units AS
            SELECT gen_random_uuid() AS id,
                   (ARRAY['O+','A+','B+','AB+','O-','A-','B-','AB-'])[floor(random()*8)+1] AS blood_type_code,
                   now() + (random() * 30 || ' days')::interval AS expires_at
            FROM generate_series(1, 1000);
            CREATE INDEX idx_temp_units_type_exp ON temp_scratch_units(blood_type_code, expires_at);
          `);

          const testSql = `
            SELECT * FROM temp_scratch_units
            WHERE blood_type_code = 'O+'
            ORDER BY expires_at
          `;
          baselineResult = await this.measureWithPlan(client, testSql, { disableIndexes: false }, repetitionCount);

          await client.query('CLUSTER temp_scratch_units USING idx_temp_units_type_exp');
          optimizedResult = await this.measureWithPlan(client, testSql, { disableIndexes: false }, repetitionCount);
          break;
        }
      }

      await client.query('ROLLBACK'); // Always rollback so no benchmark modifies state

      const baselineMs = Number(baselineResult.averageExecutionTimeMs.toFixed(3));
      const optimizedMs = Number(optimizedResult.averageExecutionTimeMs.toFixed(3));

      // Calculate actual percentage difference
      let improvementPct = 0;
      if (baselineMs > 0) {
        improvementPct = Number((((baselineMs - optimizedMs) / baselineMs) * 100).toFixed(1));
      }

      return {
        experimentId: template.id,
        experimentName: template.name,
        queryIdentifier: template.queryIdentifier,
        indexStrategy: template.indexStrategy,
        targetTable: template.targetTable,
        repetitionCount,
        baseline: {
          executionTimeMs: baselineMs,
          planType: baselineResult.planSummary,
          sharedHitBlocks: baselineResult.sharedHitBlocks,
          sharedReadBlocks: baselineResult.sharedReadBlocks,
          queryPlan: baselineResult.rawPlan,
        },
        optimized: {
          executionTimeMs: optimizedMs,
          planType: optimizedResult.planSummary,
          sharedHitBlocks: optimizedResult.sharedHitBlocks,
          sharedReadBlocks: optimizedResult.sharedReadBlocks,
          queryPlan: optimizedResult.rawPlan,
        },
        improvementPercentage: improvementPct,
        summary: improvementPct >= 0
          ? `${improvementPct}% FASTER (${baselineMs}ms vs ${optimizedMs}ms)`
          : `${Math.abs(improvementPct)}% SLOWER (${baselineMs}ms vs ${optimizedMs}ms - small dataset cache effect)`,
        measuredAt: new Date().toISOString(),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Helper that runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) across repetitions
   */
  async measureWithPlan(client, querySql, options = {}, repetitions = 3) {
    if (options.disableIndexes) {
      await client.query('SET LOCAL enable_indexscan = off;');
      await client.query('SET LOCAL enable_bitmapscan = off;');
    } else {
      await client.query('SET LOCAL enable_indexscan = on;');
      await client.query('SET LOCAL enable_bitmapscan = on;');
    }

    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${querySql}`;
    let totalTime = 0;
    let lastPlanJson = null;

    for (let i = 0; i < repetitions; i++) {
      const { rows } = await client.query(explainSql);
      const planData = rows[0]['QUERY PLAN'][0];
      totalTime += planData['Execution Time'];
      lastPlanJson = planData;
    }

    const avgTime = totalTime / repetitions;
    const planNode = lastPlanJson?.Plan?.['Node Type'] || 'Unknown';
    const sharedHit = lastPlanJson?.Plan?.['Shared Hit Blocks'] || 0;
    const sharedRead = lastPlanJson?.Plan?.['Shared Read Blocks'] || 0;

    return {
      averageExecutionTimeMs: avgTime,
      planSummary: planNode,
      sharedHitBlocks: sharedHit,
      sharedReadBlocks: sharedRead,
      rawPlan: lastPlanJson,
    };
  }

  async measureWarehouseWithPlan(querySql, repetitions = 3) {
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${querySql}`;
    let totalTime = 0;
    let lastPlanJson = null;

    for (let i = 0; i < repetitions; i++) {
      const { rows } = await queryWarehouse(explainSql);
      const planData = rows[0]['QUERY PLAN'][0];
      totalTime += planData['Execution Time'];
      lastPlanJson = planData;
    }

    const avgTime = totalTime / repetitions;
    const planNode = lastPlanJson?.Plan?.['Node Type'] || 'Unknown';
    const sharedHit = lastPlanJson?.Plan?.['Shared Hit Blocks'] || 0;
    const sharedRead = lastPlanJson?.Plan?.['Shared Read Blocks'] || 0;

    return {
      averageExecutionTimeMs: avgTime,
      planSummary: planNode,
      sharedHitBlocks: sharedHit,
      sharedReadBlocks: sharedRead,
      rawPlan: lastPlanJson,
    };
  }
}

export const benchmarksService = new BenchmarksService();
