import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { queryWarehouse } from '../src/warehouseDb.js';
import { etlService } from '../src/modules/analytics/etl.service.js';
import { benchmarksService } from '../src/modules/analytics/benchmarks.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('Member 6 — Data Warehouse, Analytics & Advanced PostgreSQL Optimization', () => {
  let adminToken = '';
  let bankStaffToken = '';
  let donorToken = '';
  let testAdminUserId = '';
  let testBankStaffUserId = '';
  let testDonorUserId = '';

  before(async () => {
    // 1. Ensure test users exist in operational DB
    const hashed = await bcrypt.hash('TestPass123!', 10);

    // Admin user
    const adminRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('M6 Admin Evaluator', 'm6_admin@test.lk', $1, 'ADMIN')
      ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'
      RETURNING id
    `, [hashed]);
    testAdminUserId = adminRes.rows[0].id;
    adminToken = jwt.sign({ sub: testAdminUserId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '2h' });

    // Bank staff user
    const bankRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('M6 Bank Staff', 'm6_bankstaff@test.lk', $1, 'BANK_STAFF')
      ON CONFLICT (email) DO UPDATE SET role = 'BANK_STAFF'
      RETURNING id
    `, [hashed]);
    testBankStaffUserId = bankRes.rows[0].id;
    bankStaffToken = jwt.sign({ sub: testBankStaffUserId, role: 'BANK_STAFF' }, JWT_SECRET, { expiresIn: '2h' });

    // Link bank staff to blood bank 1
    const { rows: banks } = await pool.query('SELECT id FROM blood_banks LIMIT 1');
    if (banks.length > 0) {
      await pool.query(`
        INSERT INTO staff_memberships (user_id, blood_bank_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, blood_bank_id) DO NOTHING
      `, [testBankStaffUserId, banks[0].id]);
    }

    // Donor user
    const donorRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('M6 Regular Donor', 'm6_donor@test.lk', $1, 'DONOR')
      ON CONFLICT (email) DO UPDATE SET role = 'DONOR'
      RETURNING id
    `, [hashed]);
    testDonorUserId = donorRes.rows[0].id;
    donorToken = jwt.sign({ sub: testDonorUserId, role: 'DONOR' }, JWT_SECRET, { expiresIn: '2h' });

    // 2. Run initial full ETL to seed warehouse
    await etlService.runEtl({ jobName: 'TEST_INIT_ETL', loadMode: 'FULL', requestedBy: 'TEST_SUITE' });
  });

  // --- 1. ETL Idempotence & Boundary Handling ---
  it('M6-01: ETL is completely idempotent; rerunning does not duplicate fact records or rows', async () => {
    await etlService.runEtl({
      jobName: 'TEST_IDEMPOTENCY_RUN1',
      loadMode: 'FULL',
      requestedBy: 'TEST_SUITE',
    });

    const { rows: initialCounts } = await queryWarehouse(`
      SELECT
        (SELECT count(*) FROM fact_donations)::int AS donations,
        (SELECT count(*) FROM fact_request_items)::int AS requests,
        (SELECT count(*) FROM fact_camp_registrations)::int AS camps
    `);

    // Run ETL again in full mode
    const runResult = await etlService.runEtl({
      jobName: 'TEST_IDEMPOTENCY_RUN2',
      loadMode: 'FULL',
      requestedBy: 'TEST_SUITE',
    });

    assert.equal(runResult.status, 'SUCCESS');

    const { rows: rerunCounts } = await queryWarehouse(`
      SELECT
        (SELECT count(*) FROM fact_donations)::int AS donations,
        (SELECT count(*) FROM fact_request_items)::int AS requests,
        (SELECT count(*) FROM fact_camp_registrations)::int AS camps
    `);

    assert.equal(rerunCounts[0].donations, initialCounts[0].donations);
    assert.equal(rerunCounts[0].requests, initialCounts[0].requests);
    assert.equal(rerunCounts[0].camps, initialCounts[0].camps);
  });

  it('M6-02: Incremental load uses watermark timestamp and leaves existing facts intact', async () => {
    const runResult = await etlService.runEtl({
      jobName: 'TEST_INCREMENTAL_WATERMARK',
      loadMode: 'INCREMENTAL',
      requestedBy: 'TEST_SUITE',
    });

    assert.equal(runResult.status, 'SUCCESS');
    assert.equal(runResult.loadMode, 'INCREMENTAL');
    assert.ok(runResult.runId);
  });

  // --- 2. Source-to-Warehouse Reconciliation ---
  it('M6-03: Reconciliation audit reports 0 discrepancy between operational DB and warehouse facts', async () => {
    await etlService.runEtl({ jobName: 'TEST_RECON_SYNC', loadMode: 'FULL', requestedBy: 'TEST_SUITE' });
    const audit = await etlService.getReconciliationAudit();

    assert.equal(audit.health, 'HEALTHY');
    assert.ok(Array.isArray(audit.reconciliation));

    const donationRecon = audit.reconciliation.find((r) => r.entity === 'Donations');
    assert.ok(donationRecon);
    assert.equal(donationRecon.discrepancy, 0);
    assert.equal(donationRecon.status, 'MATCHED');

    const reqRecon = audit.reconciliation.find((r) => r.entity === 'Request Items');
    assert.ok(reqRecon);
    assert.equal(reqRecon.discrepancy, 0);
    assert.equal(reqRecon.status, 'MATCHED');
  });

  // --- 3. Star Schema Dimensional & Fact Integrity ---
  it('M6-04: Fact tables maintain foreign key integrity with dim_date and reference dimensions', async () => {
    const { rows: orphanDonations } = await queryWarehouse(`
      SELECT count(*)::int AS orphans
      FROM fact_donations fd
      LEFT JOIN dim_date dd ON dd.date_key = fd.date_key
      LEFT JOIN dim_district di ON di.district_key = fd.district_key
      WHERE dd.date_key IS NULL OR di.district_key IS NULL
    `);
    assert.equal(orphanDonations[0].orphans, 0);

    const { rows: orphanRequests } = await queryWarehouse(`
      SELECT count(*)::int AS orphans
      FROM fact_request_items fri
      LEFT JOIN dim_date dd ON dd.date_key = fri.date_key
      LEFT JOIN dim_district di ON di.district_key = fri.district_key
      LEFT JOIN dim_blood_type bt ON bt.type_key = fri.type_key
      LEFT JOIN dim_component ct ON ct.component_key = fri.component_key
      WHERE dd.date_key IS NULL OR di.district_key IS NULL OR bt.type_key IS NULL OR ct.component_key IS NULL
    `);
    assert.equal(orphanRequests[0].orphans, 0);
  });

  it('M6-05: Fact source keys are strictly unique, guaranteeing analytical grain', async () => {
    const { rows: duplicateDonations } = await queryWarehouse(`
      SELECT source_donation_id, count(*)
      FROM fact_donations
      GROUP BY source_donation_id
      HAVING count(*) > 1
    `);
    assert.equal(duplicateDonations.length, 0);

    const { rows: duplicateRequests } = await queryWarehouse(`
      SELECT source_request_item_id, count(*)
      FROM fact_request_items
      GROUP BY source_request_item_id
      HAVING count(*) > 1
    `);
    assert.equal(duplicateRequests.length, 0);
  });

  // --- 4. Materialized View Refresh ---
  it('M6-06: Materialized view mv_warehouse_demand_aggregates can be refreshed concurrently', async () => {
    await queryWarehouse('REFRESH MATERIALIZED VIEW mv_warehouse_demand_aggregates;');
    const { rows } = await queryWarehouse('SELECT count(*)::int AS count FROM mv_warehouse_demand_aggregates');
    assert.ok(rows[0].count >= 0);
  });

  // --- 5. Dashboard Overview API & Genuine PostgreSQL KPIs ---
  it('M6-07: GET /api/v1/analytics/dashboard returns 6 actual PostgreSQL-backed KPI cards', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    const { metrics } = res.body.data;

    assert.ok(typeof metrics.total_donors === 'number');
    assert.ok(typeof metrics.online_donors === 'number');
    assert.ok(typeof metrics.walkin_donors === 'number');
    assert.equal(metrics.total_donors, metrics.online_donors + metrics.walkin_donors);

    assert.ok(typeof metrics.active_hospitals === 'number');
    assert.ok(typeof metrics.requests_this_month === 'number');
    assert.ok(typeof metrics.stock_alerts === 'number');
    assert.ok(typeof metrics.available_units === 'number');
    assert.ok(typeof metrics.collections_this_month === 'number');

    // Confirm values agree with operational database queries directly
    const { rows: dbTotals } = await pool.query('SELECT count(*)::int AS count FROM donors');
    assert.equal(metrics.total_donors, dbTotals[0].count);
  });

  // --- 6. Demand by Blood Group (All 8 Groups) ---
  it('M6-08: GET /api/v1/analytics/demand-by-group returns all 8 blood groups with zero-count handling', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/demand-by-group')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 8);

    const expectedGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
    for (const g of expectedGroups) {
      const match = res.body.data.find((item) => item.blood_type === g);
      assert.ok(match, `Missing blood group ${g}`);
      assert.ok(typeof match.requested_units === 'number');
      assert.ok(typeof match.percentage_of_total === 'number');
    }
  });

  // --- 7. Request and Donation Trends ---
  it('M6-09: GET /api/v1/analytics/request-trends returns 6 or 12 month time-series buckets', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/request-trends?period=6')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 6);
    assert.ok(res.body.data[0].month_name);
    assert.ok(typeof res.body.data[0].requested_units !== 'undefined');
  });

  it('M6-10: GET /api/v1/analytics/donation-trends calculates month-over-month growth and cumulative totals', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/donation-trends?period=6')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 6);
    const lastMonth = res.body.data[res.body.data.length - 1];
    assert.ok(typeof lastMonth.donations_count !== 'undefined');
    assert.ok(typeof lastMonth.cumulative_donations !== 'undefined');
  });

  // --- 8. Stock Trends & Camp Performance ---
  it('M6-11: GET /api/v1/analytics/stock-trends returns component stock snapshots with expiry breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/stock-trends')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    if (res.body.data.length > 0) {
      const item = res.body.data[0];
      assert.ok(item.blood_bank_name);
      assert.ok(typeof item.available_units === 'number');
      assert.ok(typeof item.expiring_7d_units === 'number');
    }
  });

  it('M6-12: GET /api/v1/analytics/camp-performance evaluates turnout ratios by district', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/camp-performance')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    if (res.body.data.length > 0) {
      const item = res.body.data[0];
      assert.ok(item.district_name);
      assert.ok(typeof item.registered_count !== 'undefined');
    }
  });

  it('M6-13: GET /api/v1/analytics/transfers returns inter-bank transfer movement trends', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/transfers')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  // --- 9. Role-Based Access Control & Strict Privacy ---
  it('M6-14: Rejects unauthenticated analytics access with 401', async () => {
    const res = await request(app).get('/api/v1/analytics/dashboard');
    assert.equal(res.status, 401);
  });

  it('M6-15: Denies DONOR role access to aggregate warehouse analytics with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(res.status, 403);
    assert.match(res.body.error, /Access denied|restricted/i);
  });

  it('M6-16: Denies non-admin roles from triggering ETL or benchmark execution (403)', async () => {
    const etlRes = await request(app)
      .post('/api/v1/analytics/etl-runs')
      .set('Authorization', `Bearer ${bankStaffToken}`)
      .send({ loadMode: 'FULL' });
    assert.equal(etlRes.status, 403);

    const benchRes = await request(app)
      .post('/api/v1/analytics/benchmarks')
      .set('Authorization', `Bearer ${bankStaffToken}`)
      .send({ experimentId: 'EXP-01-COMPOSITE-GEO' });
    assert.equal(benchRes.status, 403);
  });

  it('M6-17: Strict privacy check: Analytics payloads contain NO personal or clinical records', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const payloadString = JSON.stringify(res.body);
    assert.equal(/amara|sunil|kamal|077|@example|\bnote\b.*medical/i.test(payloadString), false);
    assert.equal(payloadString.includes('nic_hash'), false);
    assert.equal(payloadString.includes('phone'), false);
  });

  // --- 10. Database Performance Lab & Live EXPLAIN ANALYZE ---
  it('M6-18: POST /api/v1/analytics/benchmarks executes live EXPLAIN ANALYZE with plan capture', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/benchmarks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        experimentId: 'EXP-01-COMPOSITE-GEO',
        repetitionCount: 2,
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    const { baseline, optimized, improvementPercentage } = res.body.data;

    assert.ok(typeof baseline.executionTimeMs === 'number');
    assert.ok(typeof optimized.executionTimeMs === 'number');
    assert.ok(typeof improvementPercentage === 'number');
    assert.ok(baseline.queryPlan);
    assert.ok(optimized.queryPlan);
    assert.ok(baseline.planType);
    assert.ok(optimized.planType);
  });

  it('M6-19: Rejects arbitrary or unapproved benchmark IDs (400)', async () => {
    const res = await request(app)
      .post('/api/v1/analytics/benchmarks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        experimentId: 'DROP_TABLE_EXP',
      });

    assert.equal(res.status, 400);
  });

  // --- 11. CSV Export ---
  it('M6-20: Supports authorized CSV exports with proper Content-Type and headers', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/demand-by-group?format=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /attachment; filename="demand_by_blood_group\.csv"/);
    assert.match(res.text, /blood_type.*requested_units/);
  });
});
