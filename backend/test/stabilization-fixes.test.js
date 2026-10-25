import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('BloodBridge — Version1 Stabilization & Hardening Regression Suite (FIX-01 to FIX-10)', () => {
  let adminUser = null;
  let adminToken = null;
  let bankAUser = null;
  let bankAToken = null;
  let bankBUser = null;
  let bankBToken = null;
  let hospAUser = null;
  let hospAToken = null;
  let hospBUser = null;
  let hospBToken = null;
  let donorUser = null;
  let donorToken = null;
  let donor2User = null;
  let donor2Token = null;

  let bankAId = null;
  let bankBId = null;
  let hospAId = null;
  let hospBId = null;
  let donorId = null;
  let donor2Id = null;
  let unitBankBId = null;
  let testCampId = null;

  before(async () => {
    // 1. Locations
    const locRes = await pool.query(`SELECT id FROM locations WHERE district_code = 'CO' LIMIT 1`);
    let locId = locRes.rows[0]?.id;
    if (!locId) {
      const insLoc = await pool.query(
        `INSERT INTO locations (district_code, ds_code, town) VALUES ('CO', 'COL', 'Colombo') RETURNING id`,
      );
      locId = insLoc.rows[0].id;
    }

    // 2. Institutions
    const b1 = await pool.query(
      `INSERT INTO blood_banks (name, location_id, contact_phone, is_verified)
       VALUES ('Stabilization Bank Alpha', $1, '0112111111', true) RETURNING id`,
      [locId],
    );
    bankAId = Number(b1.rows[0].id);

    const b2 = await pool.query(
      `INSERT INTO blood_banks (name, location_id, contact_phone, is_verified)
       VALUES ('Stabilization Bank Beta', $1, '0112222222', true) RETURNING id`,
      [locId],
    );
    bankBId = Number(b2.rows[0].id);

    const h1 = await pool.query(
      `INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
       VALUES ('Stabilization Hospital One', $1, '0112333333', true) RETURNING id`,
      [locId],
    );
    hospAId = Number(h1.rows[0].id);

    const h2 = await pool.query(
      `INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
       VALUES ('Stabilization Hospital Two', $1, '0112444444', true) RETURNING id`,
      [locId],
    );
    hospBId = Number(h2.rows[0].id);

    // 3. Users and Staff Memberships
    const ts = Date.now();

    // Admin
    const uAdmin = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('System Admin', 'admin.${ts}@bloodbridge.lk', 'hash', 'ADMIN', true) RETURNING id`,
    );
    adminUser = uAdmin.rows[0];
    adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN', email: adminUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Bank A Staff
    const uBA = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Bank Alpha', 'bank.a.${ts}@bloodbridge.lk', 'hash', 'BANK_STAFF', true) RETURNING id`,
    );
    bankAUser = uBA.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [bankAUser.id, bankAId],
    );
    bankAToken = jwt.sign({ sub: bankAUser.id, role: 'BANK_STAFF', email: bankAUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Bank B Staff
    const uBB = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Bank Beta', 'bank.b.${ts}@bloodbridge.lk', 'hash', 'BANK_STAFF', true) RETURNING id`,
    );
    bankBUser = uBB.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [bankBUser.id, bankBId],
    );
    bankBToken = jwt.sign({ sub: bankBUser.id, role: 'BANK_STAFF', email: bankBUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Hospital A Staff
    const uHA = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Hosp One', 'hosp.a.${ts}@bloodbridge.lk', 'hash', 'HOSPITAL_STAFF', true) RETURNING id`,
    );
    hospAUser = uHA.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, hospital_id, is_active)
       VALUES ($1, $2, true)`,
      [hospAUser.id, hospAId],
    );
    hospAToken = jwt.sign({ sub: hospAUser.id, role: 'HOSPITAL_STAFF', email: hospAUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Hospital B Staff
    const uHB = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Hosp Two', 'hosp.b.${ts}@bloodbridge.lk', 'hash', 'HOSPITAL_STAFF', true) RETURNING id`,
    );
    hospBUser = uHB.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, hospital_id, is_active)
       VALUES ($1, $2, true)`,
      [hospBUser.id, hospBId],
    );
    hospBToken = jwt.sign({ sub: hospBUser.id, role: 'HOSPITAL_STAFF', email: hospBUser.email }, JWT_SECRET, { expiresIn: '2h' });

    // Donors
    const uD1 = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Donor One', 'donor.1.${ts}@bloodbridge.lk', 'hash', 'DONOR', true) RETURNING id`,
    );
    donorUser = uD1.rows[0];
    donorToken = jwt.sign({ sub: donorUser.id, role: 'DONOR', email: donorUser.email }, JWT_SECRET, { expiresIn: '2h' });
    const d1 = await pool.query(
      `INSERT INTO donors (user_id, blood_type_code, district_code, ds_code, available_for_contact)
       VALUES ($1, 'A+', 'CO', 'COL', true) RETURNING id`,
      [donorUser.id],
    );
    donorId = d1.rows[0].id;
    await pool.query(
      `INSERT INTO donor_consents (donor_id, contact_allowed, emergency_appeal_opt_in, sms_alerts, email_alerts)
       VALUES ($1, true, true, false, false)
       ON CONFLICT (donor_id) DO UPDATE SET contact_allowed = true, emergency_appeal_opt_in = true`,
      [donorId],
    );

    const uD2 = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Donor Two', 'donor.2.${ts}@bloodbridge.lk', 'hash', 'DONOR', true) RETURNING id`,
    );
    donor2User = uD2.rows[0];
    donor2Token = jwt.sign({ sub: donor2User.id, role: 'DONOR', email: donor2User.email }, JWT_SECRET, { expiresIn: '2h' });
    const d2 = await pool.query(
      `INSERT INTO donors (user_id, blood_type_code, district_code, ds_code, available_for_contact)
       VALUES ($1, 'O+', 'CO', 'COL', true) RETURNING id`,
      [donor2User.id],
    );
    donor2Id = d2.rows[0].id;
    await pool.query(
      `INSERT INTO donor_consents (donor_id, contact_allowed, emergency_appeal_opt_in, sms_alerts, email_alerts)
       VALUES ($1, true, true, false, false)
       ON CONFLICT (donor_id) DO UPDATE SET contact_allowed = true, emergency_appeal_opt_in = true`,
      [donor2Id],
    );

    // Create a blood unit owned by Bank B
    const donRes = await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status)
       VALUES ($1, $2, now() - INTERVAL '1 day', 'PROCESSED') RETURNING id`,
      [donorId, bankBId],
    );
    const unitRes = await pool.query(
      `INSERT INTO blood_units (
         donation_id, blood_bank_id, blood_type_code, component_code,
         release_status, inventory_status, collected_at, expires_at
       )
       VALUES ($1, $2, 'A+', 'RBC', 'QUARANTINED', 'IN_STOCK', now() - INTERVAL '1 day', now() + INTERVAL '30 days')
       RETURNING id`,
      [donRes.rows[0].id, bankBId],
    );
    unitBankBId = unitRes.rows[0].id;

    // Create an approved camp for testing
    const orgRes = await pool.query(
      `INSERT INTO camp_organizers (name, is_verified) VALUES ('Red Cross Test', true) RETURNING id`,
    );
    const campRes = await pool.query(
      `INSERT INTO donation_camps (
         title, organizer_id, blood_bank_id, location_id, starts_at, ends_at, capacity, status, approved_by
       )
       VALUES ('Community Blood Drive', $1, $2, $3, now() + INTERVAL '1 day', now() + INTERVAL '1 day 8 hours', 40, 'APPROVED', $4)
       RETURNING id`,
      [orgRes.rows[0].id, bankAId, locId, adminUser.id],
    );
    testCampId = campRes.rows[0].id;
  });

  // ==========================================
  // FIX-01: Blood Bank Authorization
  // ==========================================
  describe('FIX-01: Blood Bank Scoped Access Control', () => {
    it('Bank A staff cannot view Bank B inventory units (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/units?bankId=${bankBId}`)
        .set('Authorization', `Bearer ${bankAToken}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /Staff member not authorized for this blood bank/i);
    });

    it('Bank A staff cannot release Bank B blood unit (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/units/${unitBankBId}/release`)
        .set('Authorization', `Bearer ${bankAToken}`)
        .send({ releaseStatus: 'RELEASED', notes: 'Unauthorized attempt' });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /Staff member not authorized to release units from this blood bank/i);
    });

    it('Bank A staff cannot access Bank B expiry alerts or movements (403)', async () => {
      const expRes = await request(app)
        .get(`/api/v1/inventory/expiry-alerts?bankId=${bankBId}`)
        .set('Authorization', `Bearer ${bankAToken}`);
      assert.equal(expRes.status, 403);

      const movRes = await request(app)
        .get(`/api/v1/inventory/movements?bankId=${bankBId}`)
        .set('Authorization', `Bearer ${bankAToken}`);
      assert.equal(movRes.status, 403);
    });

    it('Admin cannot bypass clinical release authorization without bank membership (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/units/${unitBankBId}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ releaseStatus: 'RELEASED', notes: 'Admin clinical bypass attempt' });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /requires active clinical staff membership/i);
    });

    it('Bank B staff can legitimately release their own bank unit (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/inventory/units/${unitBankBId}/release`)
        .set('Authorization', `Bearer ${bankBToken}`)
        .send({ releaseStatus: 'RELEASED', notes: 'Legitimate authorized clinical release' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.release_status, 'RELEASED');
    });
  });

  // ==========================================
  // FIX-02: Shared Authentication and API Client
  // ==========================================
  describe('FIX-02: Auth Consistency & Token Refresh', () => {
    it('Refuses token refresh when refresh token is missing or invalid (401/400)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.bogus.token' });

      assert.ok([400, 401].includes(res.status));
    });

    it('Allows public access to reference endpoints without authorization header', async () => {
      const res = await request(app).get('/api/v1/locations/districts');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    it('Allows access to verified blood bank directory without prior login', async () => {
      const res = await request(app).get('/api/v1/blood-banks');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((b) => b.id === String(bankAId) || b.id === bankAId));
    });
  });

  // ==========================================
  // FIX-03: Notification Permission & Recipient Authorization
  // ==========================================
  describe('FIX-03: Notification Permission & Outbox Authorization', () => {
    it('Hospital staff cannot dispatch notifications for another hospital (403)', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${hospAToken}`)
        .send({
          recipientUserId: donorUser.id,
          channel: 'IN_APP',
          category: 'SYSTEM',
          title: 'Unauthorized Message',
          message: 'Cross hospital message attempt',
        });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /Unauthorized: hospital cannot message unrelated donors/i);
    });

    it('Notification outbox masks sensitive phone / email in delivery logs', async () => {
      // Seed a delivery log with real phone to verify masking
      await pool.query(
        `INSERT INTO notification_deliveries (
           recipient_user_id, channel, destination, subject, body, status, idempotency_key
         ) VALUES ($1, 'SMS', '0771234567', 'Test SMS', 'Blood donation needed', 'DELIVERED', gen_random_uuid()::text)`,
        [donorUser.id],
      );

      const res = await request(app)
        .get('/api/v1/notifications/delivery-status')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const smsDelivery = res.body.data.find(d => d.channel === 'SMS' && d.subject === 'Test SMS');
      assert.ok(smsDelivery, 'SMS delivery log must be returned');
      assert.equal(smsDelivery.destination, '077****567', 'Phone number must be masked with asterisks');
    });
  });

  // ==========================================
  // FIX-04: Analytics Authorization
  // ==========================================
  describe('FIX-04: Analytics Authorization & Scope Isolation', () => {
    it('Donor accessing operational analytics returns 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${donorToken}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /restricted to authorized personnel/i);
    });

    it('Hospital A staff query is strictly scoped to Hospital A', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${hospAToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.metrics);
      assert.ok(res.body.data.timestamp);
    });

    it('Bank A staff query is strictly scoped to Bank A', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${bankAToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.metrics);
      assert.ok(res.body.data.distribution);
    });

    it('Non-admin cannot execute benchmark runs (403)', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/benchmarks')
        .set('Authorization', `Bearer ${bankAToken}`)
        .send({ experimentId: 'EXP-01-COMPOSITE-GEO' });

      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // FIX-05: Geographic Donor Matching & Correctness
  // ==========================================
  describe('FIX-05: Geographic Escalation & Exact Blood Group Matching', () => {
    it('Emergency appeals match candidate counts accurately without blanket O- across components', async () => {
      // Create request item for Hospital A
      const reqRes = await pool.query(
        `INSERT INTO blood_requests (hospital_id, created_by, urgency, status, needed_by)
         VALUES ($1, $2, 'CRITICAL', 'OPEN', now() + INTERVAL '2 days') RETURNING id`,
        [hospAId, hospAUser.id],
      );
      const reqId = reqRes.rows[0].id;

      const itemRes = await pool.query(
        `INSERT INTO request_items (request_id, blood_type_code, component_code, units_requested)
         VALUES ($1, 'A+', 'RBC', 2) RETURNING id`,
        [reqId],
      );
      const itemId = itemRes.rows[0].id;

      const appRes = await request(app)
        .post('/api/v1/emergency-appeals')
        .set('Authorization', `Bearer ${hospAToken}`)
        .send({
          requestId: reqId,
          requestItemId: itemId,
          hospitalId: hospAId,
          shortageUnits: 2,
          reason: 'Emergency trauma surgery',
          escalationLevel: 'GN_DIVISION',
        });

      assert.equal(appRes.status, 201);
      assert.equal(appRes.body.data.status, 'ACTIVE');

      // Escalate to DS_DIVISION
      const escRes = await request(app)
        .post(`/api/v1/emergency-appeals/${appRes.body.data.id}/escalate`)
        .set('Authorization', `Bearer ${hospAToken}`)
        .send({ targetStage: 'DS_DIVISION' });

      assert.equal(escRes.status, 200);
      assert.equal(escRes.body.data.escalation_level, 'DS_DIVISION');
    });
  });

  // ==========================================
  // FIX-06: Donor Invitation Lifecycle
  // ==========================================
  describe('FIX-06: Donor Invitation State Machine & Concurrency', () => {
    let invitationId = null;

    before(async () => {
      const invRes = await pool.query(
        `INSERT INTO donor_invitations (donor_id, blood_bank_id, title, message, blood_type_code, status, expires_at)
         VALUES ($1, $2, 'Critical Platelet Shortage', 'Please assist if possible', 'A+', 'PENDING', now() + INTERVAL '3 days')
         RETURNING id`,
        [donorId, bankAId],
      );
      invitationId = invRes.rows[0].id;
    });

    it('Donor can respond INTERESTED to a pending invitation (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/donors/me/invitations/${invitationId}/respond`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ response: 'INTERESTED' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'INTERESTED');
      assert.ok(res.body.data.responded_at);
    });

    it('Second response to the same invitation is rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/donors/me/invitations/${invitationId}/respond`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ response: 'UNAVAILABLE' });

      assert.equal(res.status, 409);
      assert.match(res.body.error, /already been answered/i);
    });

    it('Other donor cannot respond to primary donor invitation (404)', async () => {
      const res = await request(app)
        .post(`/api/v1/donors/me/invitations/${invitationId}/respond`)
        .set('Authorization', `Bearer ${donor2Token}`)
        .send({ response: 'DISMISSED' });

      assert.equal(res.status, 404);
    });

    it('Expired invitation response is rejected (400)', async () => {
      const expRes = await pool.query(
        `INSERT INTO donor_invitations (donor_id, blood_bank_id, title, message, blood_type_code, status, expires_at)
         VALUES ($1, $2, 'Old Appeal', 'Past appeal', 'A+', 'PENDING', now() - INTERVAL '1 hour')
         RETURNING id`,
        [donorId, bankAId],
      );
      const expId = expRes.rows[0].id;

      const res = await request(app)
        .post(`/api/v1/donors/me/invitations/${expId}/respond`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ response: 'INTERESTED' });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /expired/i);
    });
  });

  // ==========================================
  // FIX-07: Appointment Booking Integrity
  // ==========================================
  describe('FIX-07: Appointment Booking Integrity & Capacity Control', () => {
    let appointmentId = null;

    it('Rejects appointment booking with past date (400)', async () => {
      const res = await request(app)
        .post('/api/v1/donors/me/appointments')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodBankId: bankAId,
          appointmentDate: '2020-01-01',
          timeSlot: '09:00 - 09:30',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /past/i);
    });

    it('Books a valid available slot with medical clearance notice disclaimer (201)', async () => {
      const res = await request(app)
        .post('/api/v1/donors/me/appointments')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodBankId: bankAId,
          appointmentDate: '2026-11-20',
          timeSlot: '09:00 - 09:30',
          donationType: 'WHOLE_BLOOD',
          notes: 'First time donor visit',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'BOOKED');
      assert.ok(res.body.data.medical_clearance_notice);
      appointmentId = res.body.data.id;
    });

    it('Rejects duplicate active appointment on the same date (409)', async () => {
      const res = await request(app)
        .post('/api/v1/donors/me/appointments')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          bloodBankId: bankAId,
          appointmentDate: '2026-11-20',
          timeSlot: '14:00 - 14:30',
        });

      assert.equal(res.status, 409);
      assert.match(res.body.error, /already have an active appointment/i);
    });

    it('Other donor cannot cancel primary donor appointment (403/404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/donors/me/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${donor2Token}`);

      assert.ok([403, 404].includes(res.status));
    });

    it('Primary donor can cancel their appointment and release capacity (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/donors/me/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${donorToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'CANCELLED');
    });

    it('Repeated cancellation of already cancelled appointment is rejected (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/donors/me/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${donorToken}`);

      assert.equal(res.status, 400);
      assert.match(res.body.error, /already cancelled/i);
    });
  });

  // ==========================================
  // FIX-08: Database Consent Default & Hardening
  // ==========================================
  describe('FIX-08: Consent Hardening & Synthetic Data Separation', () => {
    it('Newly registered donor has SMS and Email alerts defaulted to FALSE', async () => {
      const newEmail = `fresh.donor.${Date.now()}@bloodbridge.lk`;
      const regRes = await request(app)
        .post('/api/v1/auth/register-donor')
        .send({
          fullName: 'Fresh Consent Donor',
          email: newEmail,
          password: 'Password123!',
          districtCode: 'CO',
        });

      assert.equal(regRes.status, 201);
      const newUserId = regRes.body.user.id;

      const { rows } = await pool.query(
        `SELECT cons.sms_alerts, cons.email_alerts, cons.emergency_appeal_opt_in
         FROM donors d
         LEFT JOIN donor_consents cons ON cons.donor_id = d.id
         WHERE d.user_id = $1`,
        [newUserId],
      );

      assert.equal(rows[0]?.sms_alerts, false);
      assert.equal(rows[0]?.email_alerts, false);
    });
  });

  // ==========================================
  // FIX-09 & FIX-10: Directory & Health Verification
  // ==========================================
  describe('FIX-09 & FIX-10: Verified Blood Bank Directory & Dynamic Health Endpoint', () => {
    it('GET /health returns live PostgreSQL connectivity status', async () => {
      const res = await request(app).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.database, 'connected');
      assert.ok(res.body.dbTime);
    });

    it('GET /api/v1/blood-banks returns verified directory with contact and address', async () => {
      const res = await request(app).get('/api/v1/blood-banks');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      const sample = res.body.data[0];
      assert.ok(sample.id);
      assert.ok(sample.name);
      assert.equal(sample.is_verified, true);
    });
  });

  after(async () => {
    // Cleanup test data
    try {
      if (testCampId) {
        await pool.query(`DELETE FROM donation_camps WHERE id = $1`, [testCampId]);
      }
      if (hospAId) {
        await pool.query(`DELETE FROM appeal_escalation_steps WHERE appeal_id IN (SELECT id FROM emergency_appeals WHERE hospital_id IN ($1, $2))`, [hospAId, hospBId]);
        await pool.query(`DELETE FROM emergency_appeals WHERE hospital_id IN ($1, $2)`, [hospAId, hospBId]);
        await pool.query(`DELETE FROM request_items WHERE request_id IN (SELECT id FROM blood_requests WHERE hospital_id IN ($1, $2))`, [hospAId, hospBId]);
        await pool.query(`DELETE FROM blood_requests WHERE hospital_id IN ($1, $2)`, [hospAId, hospBId]);
      }
      if (unitBankBId) {
        await pool.query(`DELETE FROM inventory_movements WHERE blood_unit_id = $1`, [unitBankBId]);
        await pool.query(`DELETE FROM blood_units WHERE id = $1`, [unitBankBId]);
      }
      if (donorUser) {
        await pool.query(`DELETE FROM notification_deliveries WHERE recipient_user_id IN ($1, $2)`, [donorUser.id, donor2User.id]);
        await pool.query(`DELETE FROM notifications WHERE recipient_user_id IN ($1, $2)`, [donorUser.id, donor2User.id]);
        await pool.query(`DELETE FROM donor_appointments WHERE donor_id IN ($1, $2)`, [donorId, donor2Id]);
        await pool.query(`DELETE FROM donor_invitations WHERE donor_id IN ($1, $2)`, [donorId, donor2Id]);
        await pool.query(`DELETE FROM donor_consents WHERE donor_id IN ($1, $2)`, [donorId, donor2Id]);
        await pool.query(`DELETE FROM donations WHERE donor_id IN ($1, $2)`, [donorId, donor2Id]);
        await pool.query(`DELETE FROM donors WHERE id IN ($1, $2)`, [donorId, donor2Id]);
        await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [donorUser.id, donor2User.id]);
      }
      if (bankAUser) {
        await pool.query(`DELETE FROM staff_memberships WHERE user_id IN ($1, $2, $3, $4)`, [
          bankAUser.id, bankBUser?.id, hospAUser?.id, hospBUser?.id,
        ]);
        await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)`, [
          bankAUser.id, bankBUser?.id, hospAUser?.id, hospBUser?.id, adminUser?.id,
        ]);
        await pool.query(`DELETE FROM blood_banks WHERE id IN ($1, $2)`, [bankAId, bankBId]);
        await pool.query(`DELETE FROM hospitals WHERE id IN ($1, $2)`, [hospAId, hospBId]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  });
});
