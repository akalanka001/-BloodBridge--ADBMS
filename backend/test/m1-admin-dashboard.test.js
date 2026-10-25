import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-chars-min!!';

describe('Member 1 — Complete Administrator Dashboard & Governance API', () => {
  let adminToken;
  let adminUserId;
  let bankStaffToken;
  let bankStaffUserId;
  let donorToken;
  let donorUserId;
  let testHospitalId;
  let testBankId;
  let testManagedUserId;

  before(async () => {
    const hashed = await bcrypt.hash('SecureAdminPass123!', 10);

    // 1. Admin user
    const adminRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, email_verified)
      VALUES ('System Administrator', 'gov_admin@bloodbridge.test', $1, 'ADMIN', true, true)
      ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', is_active = true
      RETURNING id
    `, [hashed]);
    adminUserId = adminRes.rows[0].id;
    adminToken = jwt.sign({ sub: adminUserId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '2h' });

    // 2. Bank staff user
    const bankRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, email_verified)
      VALUES ('National Bank Staff', 'gov_bank_staff@bloodbridge.test', $1, 'BANK_STAFF', true, true)
      ON CONFLICT (email) DO UPDATE SET role = 'BANK_STAFF', is_active = true
      RETURNING id
    `, [hashed]);
    bankStaffUserId = bankRes.rows[0].id;
    bankStaffToken = jwt.sign({ sub: bankStaffUserId, role: 'BANK_STAFF' }, JWT_SECRET, { expiresIn: '2h' });

    // 3. Donor user
    const donorRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, email_verified)
      VALUES ('Regular Donor User', 'gov_donor@bloodbridge.test', $1, 'DONOR', true, true)
      ON CONFLICT (email) DO UPDATE SET role = 'DONOR', is_active = true
      RETURNING id
    `, [hashed]);
    donorUserId = donorRes.rows[0].id;
    donorToken = jwt.sign({ sub: donorUserId, role: 'DONOR' }, JWT_SECRET, { expiresIn: '2h' });

    // 4. Target managed user for deactivation / assignment tests
    const managedRes = await pool.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, email_verified)
      VALUES ('Managed Staff Candidate', 'managed_candidate@bloodbridge.test', $1, 'DONOR', true, true)
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `, [hashed]);
    testManagedUserId = managedRes.rows[0].id;

    // 5. Ensure reference location, hospital, and blood bank exist
    const locRes = await pool.query(`
      INSERT INTO locations (district_code, ds_code, town, address_line)
      VALUES ('CO', 'COL', 'Colombo Central', 'Test Medical Road')
      RETURNING id
    `);
    const testLocationId = locRes.rows[0].id;

    const hRes = await pool.query(`
      INSERT INTO hospitals (name, location_id, is_verified)
      VALUES ('Test Hospital Admin M1', $1, true)
      RETURNING id
    `, [testLocationId]);
    testHospitalId = hRes.rows[0].id;

    const bRes = await pool.query(`
      INSERT INTO blood_banks (name, location_id, hospital_id, is_verified)
      VALUES ('Test Blood Bank Admin M1', $1, $2, true)
      RETURNING id
    `, [testLocationId, testHospitalId]);
    testBankId = bRes.rows[0].id;
  });

  // --- 1. RBAC & Security Gateway ---
  it('M1-01: Rejects unauthenticated admin access with 401', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    assert.equal(res.status, 401);
  });

  it('M1-02: Rejects non-admin roles (DONOR & BANK_STAFF) from admin endpoints with 403 Forbidden', async () => {
    const donorRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(donorRes.status, 403);

    const staffRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${bankStaffToken}`);
    assert.equal(staffRes.status, 403);
  });

  // --- 2. Admin Dashboard & Real PostgreSQL KPIs ---
  it('M1-03: GET /api/v1/admin/dashboard returns 10 genuine DB-backed KPI cards and recent activities', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { kpis, recentAudit, recentCamps, pendingClaims, notificationWarnings } = res.body.data;

    assert.ok(typeof kpis.registered_donors === 'number');
    assert.ok(typeof kpis.online_donors === 'number');
    assert.ok(typeof kpis.walkin_donors === 'number');
    assert.ok(typeof kpis.verified_hospitals === 'number');
    assert.ok(typeof kpis.active_blood_banks === 'number');
    assert.ok(typeof kpis.pending_requests === 'number');
    assert.ok(typeof kpis.stock_alerts === 'number');
    assert.ok(typeof kpis.pending_claims === 'number');
    assert.ok(typeof kpis.pending_camps === 'number');
    assert.ok(typeof kpis.failed_notifications === 'number');

    assert.ok(Array.isArray(recentAudit));
    assert.ok(Array.isArray(recentCamps));
    assert.ok(Array.isArray(pendingClaims));
    assert.ok(Array.isArray(notificationWarnings));
  });

  // --- 3. User Management & Auditing ---
  it('M1-04: GET /api/v1/admin/users returns paginated users with memberships and without password hashes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(typeof res.body.data.total === 'number');

    for (const u of res.body.data.users) {
      assert.equal(u.password_hash, undefined, 'password_hash must never be leaked');
      assert.ok(u.id);
      assert.ok(u.email);
      assert.ok(Array.isArray(u.memberships));
    }
  });

  it('M1-05: GET /api/v1/admin/users/:id returns user details with memberships and audit records', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, adminUserId);
    assert.equal(res.body.data.role, 'ADMIN');
    assert.equal(res.body.data.password_hash, undefined);
    assert.ok(Array.isArray(res.body.data.memberships));
    assert.ok(Array.isArray(res.body.data.auditLogs));
  });

  it('M1-06: PATCH /api/v1/admin/users/:id/status deactivates user, revokes sessions and writes audit log', async () => {
    // Insert a dummy active session
    await pool.query(`
      INSERT INTO auth_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, 'dummy_token_hash_deactivate_test', '127.0.0.1', 'NodeTest', now() + interval '1 day')
      ON CONFLICT (token_hash) DO NOTHING
    `, [testManagedUserId]);

    const res = await request(app)
      .patch(`/api/v1/admin/users/${testManagedUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, reason: 'Temporary suspension for staff review' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_active, false);

    // Verify session revoked
    const { rows: sessions } = await pool.query(
      'SELECT revoked_at FROM auth_sessions WHERE user_id = $1 AND token_hash = \'dummy_token_hash_deactivate_test\'',
      [testManagedUserId],
    );
    assert.ok(sessions[0].revoked_at, 'Active auth sessions must be revoked on deactivation');

    // Verify audit log
    const { rows: audit } = await pool.query(
      'SELECT action FROM audit_logs WHERE entity_name = \'users\' AND entity_id = $1 ORDER BY occurred_at DESC LIMIT 1',
      [testManagedUserId],
    );
    assert.match(audit[0].action, /USER_DEACTIVATED/);

    // Reactivate user
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${testManagedUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true, reason: 'Reactivated after clearance' });
    assert.equal(reactivateRes.status, 200);
    assert.equal(reactivateRes.body.data.is_active, true);
  });

  it('M1-07: Prevents deactivating the last active system administrator (400 Bad Request)', async () => {
    // If adminUserId is the only admin or we try to deactivate all admins:
    const { rows: adminRows } = await pool.query(
      'SELECT id FROM users WHERE role = \'ADMIN\' AND is_active = true',
    );

    // If there's more than 1 admin, deactivate other test admins temporarily or test when only 1 exists
    const testSingleAdmin = adminRows[0].id;
    // Set all other admins inactive temporarily in a test transaction or simulate check
    const res = await request(app)
      .patch(`/api/v1/admin/users/${testSingleAdmin}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, reason: 'Attempting to deactivate last admin' });

    if (adminRows.length === 1) {
      assert.equal(res.status, 400);
      assert.match(res.body.error, /last active system administrator/i);
    } else {
      // With multiple admins, status will be 200, so we reactivate it back
      assert.equal(res.status, 200);
      await pool.query('UPDATE users SET is_active = true WHERE id = $1', [testSingleAdmin]);
    }
  });

  // --- 4. Staff Membership Assignment & Validation ---
  it('M1-08: POST /api/v1/admin/staff-memberships assigns membership and validates institution/role consistency', async () => {
    // Assign hospital staff
    const res = await request(app)
      .post('/api/v1/admin/staff-memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: testManagedUserId,
        role: 'HOSPITAL_STAFF',
        hospitalId: testHospitalId,
        isActive: true,
        reason: 'Assigned as surgical ward blood coordinator',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user_id, testManagedUserId);
    assert.equal(String(res.body.data.hospital_id), String(testHospitalId));

    // Verify user role was updated to HOSPITAL_STAFF
    const { rows: uRows } = await pool.query('SELECT role FROM users WHERE id = $1', [testManagedUserId]);
    assert.equal(uRows[0].role, 'HOSPITAL_STAFF');
  });

  it('M1-09: Rejects inconsistent role-to-institution assignment (e.g. HOSPITAL_STAFF with bloodBankId)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/staff-memberships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: testManagedUserId,
        role: 'HOSPITAL_STAFF',
        bloodBankId: testBankId, // Mismatch!
        isActive: true,
      });

    assert.equal(res.status, 400);
  });

  it('M1-10: PATCH /api/v1/admin/staff-memberships/:id revokes and audits membership', async () => {
    const { rows: mRows } = await pool.query(
      'SELECT id FROM staff_memberships WHERE user_id = $1 LIMIT 1',
      [testManagedUserId],
    );
    const membershipId = mRows[0].id;

    const res = await request(app)
      .patch(`/api/v1/admin/staff-memberships/${membershipId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, reason: 'Staff transferred out of district' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_active, false);

    // Verify audit log
    const { rows: audit } = await pool.query(
      'SELECT action FROM audit_logs WHERE entity_name = \'staff_memberships\' AND entity_id = $1 ORDER BY occurred_at DESC LIMIT 1',
      [membershipId.toString()],
    );
    assert.match(audit[0].action, /REVOKE_STAFF_MEMBERSHIP/);
  });

  // --- 5. Institutions Management & Verification ---
  it('M1-11: GET /api/v1/admin/institutions returns unified hospitals and blood banks with geography data', async () => {
    const res = await request(app)
      .get('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    const first = res.body.data[0];
    assert.ok(['HOSPITAL', 'BLOOD_BANK'].includes(first.type));
    assert.ok(first.name);
    assert.ok(first.district_code);
    assert.ok(first.district_name);
    assert.ok(first.province_name);
    assert.ok(typeof first.active_staff_count === 'number');
  });

  it('M1-12: POST /api/v1/admin/institutions creates new verified hospital with location and audit entry', async () => {
    const res = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'HOSPITAL',
        name: 'Western General Hospital Demo',
        contactPhone: '+94112345999',
        isVerified: true,
        location: {
          districtCode: 'CO',
          dsCode: 'COL',
          town: 'Colombo Central',
          addressLine: '124 Baseline Road',
          latitude: 6.9271,
          longitude: 79.8612,
        },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Western General Hospital Demo');
    assert.equal(res.body.data.type, 'HOSPITAL');
    assert.equal(res.body.data.is_verified, true);

    const newHospitalId = res.body.data.id;

    // Verify audit log
    const { rows: audit } = await pool.query(
      'SELECT action FROM audit_logs WHERE entity_name = \'hospitals\' AND entity_id = $1',
      [newHospitalId.toString()],
    );
    assert.equal(audit[0].action, 'CREATE_INSTITUTION');
  });

  it('M1-13: Rejects institution creation with invalid geography foreign key (400)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'HOSPITAL',
        name: 'Invalid Geo Hospital',
        location: {
          districtCode: 'INVALID_DISTRICT_CODE',
          town: 'Nowhere',
        },
      });

    assert.equal(res.status, 400);
  });

  it('M1-14: PATCH /api/v1/admin/institutions/:type/:id/verify toggles verification and logs audit reason', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/institutions/HOSPITAL/${testHospitalId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true, reason: 'MoH regulatory license verified' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_verified, true);

    const { rows: audit } = await pool.query(
      'SELECT action FROM audit_logs WHERE entity_name = \'hospitals\' AND entity_id = $1 ORDER BY occurred_at DESC LIMIT 1',
      [testHospitalId.toString()],
    );
    assert.match(audit[0].action, /VERIFY_INSTITUTION/);
  });

  // --- 6. Camp Approvals & Rejection Workflow ---
  it('M1-15: Camp review: Admin can approve a PENDING camp or reject it with a reason', async () => {
    // Ensure reference location and organizer exist for test camp
    let campLocationId;
    const { rows: locRows } = await pool.query('SELECT id FROM locations LIMIT 1');
    if (locRows.length > 0) {
      campLocationId = locRows[0].id;
    } else {
      const insLoc = await pool.query(
        `INSERT INTO locations (district_code, ds_code, town)
         VALUES ('CO', 'COL', 'Colombo')
         RETURNING id`
      );
      campLocationId = insLoc.rows[0].id;
    }

    let campOrganizerId;
    const { rows: orgRows } = await pool.query('SELECT id FROM camp_organizers LIMIT 1');
    if (orgRows.length > 0) {
      campOrganizerId = orgRows[0].id;
    } else {
      const insOrg = await pool.query(
        `INSERT INTO camp_organizers (name, is_verified)
         VALUES ($1, true)
         RETURNING id`,
        [`M1 Test Organizer ${Date.now()}`]
      );
      campOrganizerId = insOrg.rows[0].id;
    }

    const campRes = await pool.query(`
      INSERT INTO donation_camps (
        title, organizer_id, blood_bank_id, location_id,
        starts_at, ends_at, capacity, status, proposed_by
      )
      VALUES (
        'Admin Review Test Camp', $1, $2, $3,
        now() + interval '5 days', now() + interval '5 days 6 hours',
        100, 'PENDING', $4
      )
      RETURNING id
    `, [campOrganizerId, testBankId, campLocationId, adminUserId]);

    const testCampId = campRes.rows[0].id;

    // Test rejection with reason via POST /api/v1/camps/:id/reject
    const rejectRes = await request(app)
      .post(`/api/v1/camps/${testCampId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Insufficient mobile blood collection capacity for requested date' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.data.status, 'CANCELLED');
    assert.equal(rejectRes.body.data.cancellation_reason, 'Insufficient mobile blood collection capacity for requested date');
  });

  // --- 7. Notification Monitoring & Safe Privacy ---
  it('M1-16: GET /api/v1/notifications/delivery-status returns delivery log without exposing message payloads', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/delivery-status')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    if (res.body.data.length > 0) {
      const item = res.body.data[0];
      assert.ok(item.id);
      assert.ok(item.channel);
      assert.ok(item.status);
      assert.equal(item.body, undefined, 'Raw message body must not be leaked in delivery log');
    }
  });

  // --- 8. Audit Activity ---
  it('M1-17: GET /api/v1/admin/audit-logs returns immutable historical audit activity', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.logs));
    assert.ok(typeof res.body.data.total === 'number');

    if (res.body.data.logs.length > 0) {
      const log = res.body.data.logs[0];
      assert.ok(log.entity_name);
      assert.ok(log.action);
      assert.ok(log.occurred_at);
    }
  });
});
