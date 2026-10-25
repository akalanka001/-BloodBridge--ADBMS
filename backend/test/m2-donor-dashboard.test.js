import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';

describe('Member 2 — Donor Dashboard, History, Review & Preferences (M2)', () => {
  let donorUser = null;
  let donorToken = null;
  let otherDonorUser = null;
  let otherDonorToken = null;
  let donorId = null;
  let bloodBankId = null;

  before(async () => {
    // 1. Get or create a blood bank for testing
    const bbRes = await pool.query(`SELECT id FROM blood_banks LIMIT 1`);
    if (bbRes.rows.length > 0) {
      bloodBankId = bbRes.rows[0].id;
    } else {
      const loc = await pool.query(`
        INSERT INTO locations (district_code, ds_code, town)
        VALUES ('CO', 'COL', 'Colombo')
        RETURNING id
      `);
      const ins = await pool.query(`
        INSERT INTO blood_banks (name, location_id, is_verified)
        VALUES ('Test Blood Bank M2', $1, true)
        RETURNING id
      `, [loc.rows[0].id]);
      bloodBankId = ins.rows[0].id;
    }

    // 2. Register primary donor
    const uniqueDonorEmail = `m2.donor.${Date.now()}@bloodbridge.lk`;
    const regRes = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Member Two Test Donor',
        email: uniqueDonorEmail,
        password: 'Password123!',
        phone: '0779998811',
        birthDate: '1995-04-12',
        weightKg: 68.5,
        bloodTypeCode: 'O+',
        districtCode: 'CO',
        town: 'Colombo 03',
      });
    assert.equal(regRes.status, 201, `Donor reg failed: ${JSON.stringify(regRes.body)}`);
    donorUser = regRes.body.user;

    // Login primary donor
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueDonorEmail, password: 'Password123!' });
    donorToken = loginRes.body.token || loginRes.body.data?.tokens?.accessToken;

    const dRes = await pool.query(`SELECT id FROM donors WHERE user_id = $1`, [donorUser.id]);
    donorId = dRes.rows[0].id;

    // 3. Register second donor to test authorization separation
    const otherEmail = `m2.other.${Date.now()}.${Math.random().toString(36).slice(2)}@bloodbridge.lk`;
    const regOther = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Other Donor',
        email: otherEmail,
        password: 'Password123!',
        phone: '0779998822',
        birthDate: '1998-01-20',
        weightKg: 62.0,
        bloodTypeCode: 'A+',
        districtCode: 'GA',
      });
    assert.equal(regOther.status, 201, `Other donor reg failed: ${JSON.stringify(regOther.body)}`);
    otherDonorUser = regOther.body.user;
    const loginOther = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: otherEmail, password: 'Password123!' });
    assert.equal(loginOther.status, 200, `Other donor login failed: ${JSON.stringify(loginOther.body)}`);
    otherDonorToken = loginOther.body.token || loginOther.body.data?.tokens?.accessToken;
  });

  after(async () => {
    if (donorId) {
      await pool.query(`DELETE FROM donor_appointments WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_invitations WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_account_claims WHERE user_id = $1`, [donorUser.id]);
      await pool.query(`DELETE FROM donations WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_assessments WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_visits WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_consent_history WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donor_consents WHERE donor_id = $1`, [donorId]);
      await pool.query(`DELETE FROM donors WHERE id = $1`, [donorId]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [donorUser.id]);
    }
    if (otherDonorUser) {
      await pool.query(`DELETE FROM donors WHERE user_id = $1`, [otherDonorUser.id]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [otherDonorUser.id]);
    }
  });

  it('M2-01: denies unauthenticated requests to donor dashboard and endpoints (401)', async () => {
    const res = await request(app).get('/api/v1/donors/me/dashboard');
    assert.equal(res.status, 401);
  });

  it('M2-02: returns initial dashboard summary matching database views', async () => {
    const res = await request(app)
      .get('/api/v1/donors/me/dashboard')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.email.toLowerCase(), donorUser.email.toLowerCase());
    assert.equal(Number(res.body.data.total_donations), 0);
    assert.ok(Array.isArray(res.body.data.donation_journey));
    assert.ok(res.body.data.next_review_info);
    assert.equal(res.body.data.next_review_info.is_deferred, false);
    assert.ok(res.body.data.next_review_info.clearance_disclaimer.includes('medical transfusion clearance'));
  });

  it('M2-03: updates availability toggle and granular consents with audit trail', async () => {
    const patchRes = await request(app)
      .patch('/api/v1/donors/me/preferences')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        availableForContact: false,
        emergencyAppealOptIn: false,
        campNotificationsOptIn: true,
        smsAlerts: true,
        emailAlerts: true,
        inAppAlerts: true,
      });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.availableForContact, false);
    assert.equal(patchRes.body.data.emergency_appeal_opt_in, false);
    assert.equal(patchRes.body.data.sms_alerts, true);

    // Verify persisted in PostgreSQL
    const { rows: donorRows } = await pool.query(
      `SELECT available_for_contact FROM donors WHERE id = $1`,
      [donorId],
    );
    assert.equal(donorRows[0].available_for_contact, false);

    // Verify audit record created in donor_consent_history via trigger
    const { rows: histRows } = await pool.query(
      `SELECT * FROM donor_consent_history WHERE donor_id = $1 ORDER BY recorded_at DESC`,
      [donorId],
    );
    assert.ok(histRows.length > 0, 'Audit history must be created by trigger');
  });

  it('M2-04: updates profile while protecting verified blood group from overwrites', async () => {
    // 1. Initial self-reported update
    const updateRes = await request(app)
      .patch('/api/v1/donors/me')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        fullName: 'Member Two Verified Donor',
        town: 'Bambalapitiya',
        bloodTypeCode: 'O+',
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.town, 'Bambalapitiya');

    // 2. Insert a medically verified processed donation
    await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, collected_volume_ml, process_status)
       VALUES ($1, $2, now() - interval '10 days', 450, 'PROCESSED')`,
      [donorId, bloodBankId],
    );

    // 3. Attempt to maliciously or accidentally change blood type to AB-
    const tamperRes = await request(app)
      .patch('/api/v1/donors/me')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodTypeCode: 'AB-',
        town: 'Wellawatte',
      });
    assert.equal(tamperRes.status, 200);
    // Town must update, but blood group must remain protected O+
    assert.equal(tamperRes.body.data.town, 'Wellawatte');
    assert.equal(tamperRes.body.data.blood_type_code, 'O+', 'Verified blood group must not be overwritten');
  });

  it('M2-05: correctly calculates next review date with 120-day interval and handles deferrals', async () => {
    // Primary donor currently has a donation 10 days ago -> review date must be 110 days in future
    const revRes = await request(app)
      .get('/api/v1/donors/me/next-donation-review')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(revRes.status, 200);
    assert.equal(revRes.body.data.is_deferred, false);
    assert.ok(revRes.body.data.days_until_review >= 109 && revRes.body.data.days_until_review <= 111);

    // Now record a temporary deferral
    await pool.query(
      `INSERT INTO donor_assessments (donor_id, assessed_by, status, deferral_reason, deferral_until, assessed_at)
       VALUES ($1, $2, 'TEMPORARY_DEFERRAL', 'Low hemoglobin level (11.8 g/dL)', CURRENT_DATE + INTERVAL '30 days', now())`,
      [donorId, donorUser.id],
    );

    const deferredRes = await request(app)
      .get('/api/v1/donors/me/next-donation-review')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(deferredRes.status, 200);
    assert.equal(deferredRes.body.data.is_deferred, true);
    assert.equal(deferredRes.body.data.deferral_status, 'TEMPORARY_DEFERRAL');
    assert.equal(deferredRes.body.data.deferral_reason, 'Low hemoglobin level (11.8 g/dL)');
    assert.ok(deferredRes.body.data.clearance_disclaimer.length > 0);
  });

  it('M2-06: lists verified donations excluding rejected or incomplete collections', async () => {
    // Insert a REJECTED donation
    await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, collected_volume_ml, process_status)
       VALUES ($1, $2, now() - interval '40 days', 300, 'REJECTED')`,
      [donorId, bloodBankId],
    );

    const donRes = await request(app)
      .get('/api/v1/donors/me/donations')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(donRes.status, 200);
    // Must contain exactly 1 donation (the PROCESSED one), NOT the REJECTED one
    assert.equal(donRes.body.data.length, 1);
    assert.notEqual(donRes.body.data[0].process_status, 'REJECTED');
  });

  it('M2-07: manages invitations securely without leaking patient data', async () => {
    // Seed an invitation for this donor
    const invRes = await pool.query(
      `INSERT INTO donor_invitations (donor_id, blood_bank_id, title, message, area_description, blood_type_code, urgency)
       VALUES ($1, $2, 'Urgent O+ Blood Needed', 'High trauma demand at National Hospital', 'Colombo 07', 'O+', 'URGENT')
       RETURNING id`,
      [donorId, bloodBankId],
    );
    const invitationId = invRes.rows[0].id;

    // 1. List invitations
    const listRes = await request(app)
      .get('/api/v1/donors/me/invitations')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(listRes.status, 200);
    const found = listRes.body.data.find((i) => i.id === invitationId);
    assert.ok(found);
    assert.equal(found.title, 'Urgent O+ Blood Needed');
    // Ensure no patient identifiers are present
    assert.equal(found.patient_name, undefined);
    assert.equal(found.patient_id, undefined);

    // 2. Donor responds INTERESTED
    const respondRes = await request(app)
      .post(`/api/v1/donors/me/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ response: 'INTERESTED' });

    assert.equal(respondRes.status, 200);
    assert.equal(respondRes.body.data.status, 'INTERESTED');

    // 3. Other donor cannot respond to primary donor's invitation (404/unauthorized)
    const unauthorizedRes = await request(app)
      .post(`/api/v1/donors/me/invitations/${invitationId}/respond`)
      .set('Authorization', `Bearer ${otherDonorToken}`)
      .send({ response: 'DISMISSED' });

    assert.equal(unauthorizedRes.status, 404);
  });

  it('M2-08: books and cancels donor appointments with status tracking', async () => {
    // 1. Book appointment
    const bookRes = await request(app)
      .post('/api/v1/donors/me/appointments')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodBankId,
        appointmentDate: '2026-11-15',
        timeSlot: '10:00 - 10:30',
        donationType: 'WHOLE_BLOOD',
        notes: 'Morning appointment preferred',
      });

    assert.equal(bookRes.status, 201);
    const appointmentId = bookRes.body.data.id;
    assert.equal(bookRes.body.data.status, 'BOOKED');

    // 2. List appointments
    const listRes = await request(app)
      .get('/api/v1/donors/me/appointments')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.some((a) => a.id === appointmentId));

    // 3. Cancel appointment
    const cancelRes = await request(app)
      .patch(`/api/v1/donors/me/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');
  });

  it('M2-09: submits and lists offline donor record link claims', async () => {
    // Create an unlinked walk-in donor record
    const { rows: walkin } = await pool.query(
      `INSERT INTO donors (full_name, phone, blood_type_code, district_code, registration_origin)
       VALUES ('Historic Walkin Record', '0779998811', 'O+', 'CO', 'STAFF_WALKIN')
       RETURNING id`,
    );
    const walkinId = walkin[0].id;

    // Submit claim
    const claimRes = await request(app)
      .post('/api/v1/donors/me/link-claims')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donorId: walkinId,
        verificationNotes: 'Donated 5 times at National Blood Center under NIC 951234567V',
      });

    assert.equal(claimRes.status, 201);
    assert.equal(claimRes.body.data.status, 'PENDING');

    // List claims
    const myClaimsRes = await request(app)
      .get('/api/v1/donors/me/link-claims')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(myClaimsRes.status, 200);
    assert.ok(myClaimsRes.body.data.some((c) => c.donor_id === walkinId));
  });
});
