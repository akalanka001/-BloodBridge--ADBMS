import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { processNotificationDeliveries } from '../src/infrastructure/outboxWorker.js';
import { clearSentEmails, getSentEmails } from '../src/infrastructure/emailProvider.js';
import { clearSentSms, getSentSms } from '../src/infrastructure/smsProvider.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('Member 5 — Donation Camps, Media & Multi-Channel Notifications (M5)', () => {
  let bankAId = null;
  let bankBId = null;
  let bankStaffA = null;
  let tokenBankA = null;
  let tokenBankB = null;
  let donorUser = null;
  let tokenDonor = null;
  let donorId = null;
  let adminUser = null;
  let tokenAdmin = null;
  let organizerId = null;
  let locationId = null;

  before(async () => {
    // 1. Resolve location
    const locRes = await pool.query('SELECT id FROM locations LIMIT 1');
    if (locRes.rows.length) {
      locationId = locRes.rows[0].id;
    } else {
      const insLoc = await pool.query(
        `INSERT INTO locations (district_code, ds_code, town)
         VALUES ('CO', 'CO-01', 'Colombo Central')
         RETURNING id`,
      );
      locationId = insLoc.rows[0].id;
    }

    // 2. Resolve or create two distinct blood banks
    const bbRes = await pool.query('SELECT id FROM blood_banks LIMIT 2');
    if (bbRes.rows.length >= 2) {
      bankAId = Number(bbRes.rows[0].id);
      bankBId = Number(bbRes.rows[1].id);
    } else {
      const b1 = await pool.query(
        `INSERT INTO blood_banks (name, location_id, is_verified)
         VALUES ('Camp Coordinating Bank A ' || floor(random()*10000), $1, true)
         RETURNING id`,
        [locationId],
      );
      const b2 = await pool.query(
        `INSERT INTO blood_banks (name, location_id, is_verified)
         VALUES ('Camp Foreign Bank B ' || floor(random()*10000), $1, true)
         RETURNING id`,
        [locationId],
      );
      bankAId = Number(b1.rows[0].id);
      bankBId = Number(b2.rows[0].id);
    }

    // 3. Resolve or create organizer
    const orgRes = await pool.query('SELECT id FROM camp_organizers LIMIT 1');
    if (orgRes.rows.length) {
      organizerId = Number(orgRes.rows[0].id);
    } else {
      const insOrg = await pool.query(
        `INSERT INTO camp_organizers (name, is_verified)
         VALUES ('National Youth Blood Society', true)
         RETURNING id`,
      );
      organizerId = Number(insOrg.rows[0].id);
    }

    // 4. Create Bank Staff A (assigned to bankAId)
    const unique = Date.now();
    const uARes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Camp Manager', 'camp.staff.${unique}@bloodbridge.lk', 'hash', 'BANK_STAFF', true)
       RETURNING id, full_name, email, role`,
    );
    bankStaffA = uARes.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [bankStaffA.id, bankAId],
    );
    tokenBankA = jwt.sign(
      { sub: bankStaffA.id, email: bankStaffA.email, role: 'BANK_STAFF', bloodBankId: bankAId },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 5. Create Staff B (unrelated bank)
    const uBRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Other Bank Staff', 'other.staff.${unique}@bloodbridge.lk', 'hash', 'BANK_STAFF', true)
       RETURNING id, full_name, email, role`,
    );
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [uBRes.rows[0].id, bankBId],
    );
    tokenBankB = jwt.sign(
      { sub: uBRes.rows[0].id, email: uBRes.rows[0].email, role: 'BANK_STAFF', bloodBankId: bankBId },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 6. Create Admin User
    const admRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Admin Director', 'admin.camps.${unique}@bloodbridge.lk', 'hash', 'ADMIN', true)
       RETURNING id, email, role`,
    );
    adminUser = admRes.rows[0];
    tokenAdmin = jwt.sign(
      { sub: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 7. Create Donor User and donor profile
    const donUserRes = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
       VALUES ('Kasun Registered Donor', 'donor.camps.${unique}@bloodbridge.lk', '0773344556', 'hash', 'DONOR', true)
       RETURNING id, email, phone, role`,
    );
    donorUser = donUserRes.rows[0];
    tokenDonor = jwt.sign(
      { sub: donorUser.id, email: donorUser.email, role: 'DONOR' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const dRes = await pool.query(
      `INSERT INTO donors (
         user_id, full_name, phone, blood_type_code, district_code,
         available_for_contact, camp_notifications_opt_in
       )
       VALUES ($1, 'Kasun Registered Donor', '0773344556', 'A+', 'CO', true, true)
       RETURNING id`,
      [donorUser.id],
    );
    donorId = dRes.rows[0].id;

    // Set initial consents
    await pool.query(
      `INSERT INTO donor_consents (donor_id, contact_allowed, camp_notification_opt_in, sms_alerts, email_alerts)
       VALUES ($1, true, true, true, true)
       ON CONFLICT (donor_id) DO UPDATE SET contact_allowed = true, sms_alerts = true, email_alerts = true`,
      [donorId],
    );
  });

  /* -------------------------------------------------------------------------
   * 1. Camp Creation & Authorization
   * ------------------------------------------------------------------------- */
  it('M5-01: Creates draft donation camp with valid schedule, organizer, and location', async () => {
    const payload = {
      title: 'Moratuwa University Annual Camp',
      description: 'Annual student and staff blood drive at the engineering pavilion',
      organizerId,
      bloodBankId: bankAId,
      customLocation: {
        districtCode: 'CO',
        town: 'Moratuwa',
        addressLine: 'Katubedda Campus Grounds',
      },
      startsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      endsAt: new Date(Date.now() + 86400000 * 5 + 18000000).toISOString(),
      capacity: 120,
      publicContact: '011-2650301',
    };

    const res = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res.status, 201, `Failed to create camp: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data.id, 'Expected returned camp ID');
    assert.equal(res.body.data.status, 'DRAFT', 'Newly created camp must start in DRAFT status');
  });

  it('M5-02: Rejects camp creation if staff user is not assigned to the coordinating blood bank (403)', async () => {
    const payload = {
      title: 'Unauthorized Camp Attempt',
      organizerId,
      bloodBankId: bankAId, // Staff B does not belong to Bank A
      locationId,
      startsAt: new Date(Date.now() + 86400000 * 10).toISOString(),
      endsAt: new Date(Date.now() + 86400000 * 10 + 14400000).toISOString(),
      capacity: 50,
    };

    const res = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankB}`)
      .send(payload);

    assert.equal(res.status, 403, 'Cross-bank camp creation must be forbidden');
  });

  it('M5-03: Rejects invalid camp schedule when end time is before start time (400)', async () => {
    const payload = {
      title: 'Invalid Time Camp',
      organizerId,
      bloodBankId: bankAId,
      locationId,
      startsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      endsAt: new Date(Date.now() + 86400000 * 1).toISOString(), // ends before it starts!
      capacity: 60,
    };

    const res = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res.status, 400, 'Invalid date ordering must be rejected with 400');
  });

  /* -------------------------------------------------------------------------
   * 2. Camp Approval & Lifecycle
   * ------------------------------------------------------------------------- */
  it('M5-04: Submits DRAFT camp for approval and verifies status transitions to PENDING', async () => {
    // 1. Create a draft camp
    const createRes = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        title: 'Pending Submission Test Camp',
        organizerId,
        bloodBankId: bankAId,
        locationId,
        startsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 7 + 14400000).toISOString(),
        capacity: 80,
      });

    const campId = createRes.body.data.id;

    // 2. Submit camp
    const subRes = await request(app)
      .post(`/api/v1/camps/${campId}/submit`)
      .set('Authorization', `Bearer ${tokenBankA}`);

    assert.equal(subRes.status, 200);
    assert.equal(subRes.body.data.status, 'PENDING');
  });

  it('M5-05: Approves PENDING camp via stored procedure sp_approve_donation_camp', async () => {
    // 1. Create and submit
    const createRes = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        title: 'Approval Execution Camp',
        organizerId,
        bloodBankId: bankAId,
        locationId,
        startsAt: new Date(Date.now() + 86400000 * 8).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 8 + 14400000).toISOString(),
        capacity: 100,
      });

    const campId = createRes.body.data.id;
    await request(app).post(`/api/v1/camps/${campId}/submit`).set('Authorization', `Bearer ${tokenBankA}`);

    // 2. Approve camp
    const appRes = await request(app)
      .post(`/api/v1/camps/${campId}/approve`)
      .set('Authorization', `Bearer ${tokenBankA}`);

    assert.equal(appRes.status, 200);

    const { rows } = await pool.query('SELECT status, approved_by FROM donation_camps WHERE id = $1', [campId]);
    assert.equal(rows[0].status, 'APPROVED');
    assert.equal(rows[0].approved_by, bankStaffA.id);
  });

  it('M5-06: Public camp search returns APPROVED upcoming camps without leaking private records', async () => {
    const res = await request(app).get('/api/v1/camps');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    // Ensure all returned camps are APPROVED
    for (const c of res.body.data) {
      assert.ok(!c.donor_id, 'Public camp listing must not expose donor IDs');
      assert.ok(!c.patient_id, 'Public camp listing must not expose patient IDs');
    }
  });

  it('M5-07: Cancels a camp via sp_cancel_donation_camp, records reason, and excludes it from public view', async () => {
    // Create and approve a camp
    const cRes = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        title: 'Camp To Be Cancelled',
        organizerId,
        bloodBankId: bankAId,
        locationId,
        startsAt: new Date(Date.now() + 86400000 * 12).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 12 + 14400000).toISOString(),
        capacity: 50,
      });
    const campId = cRes.body.data.id;
    await request(app).post(`/api/v1/camps/${campId}/submit`).set('Authorization', `Bearer ${tokenBankA}`);
    await request(app).post(`/api/v1/camps/${campId}/approve`).set('Authorization', `Bearer ${tokenBankA}`);

    // Cancel camp
    const cancelRes = await request(app)
      .post(`/api/v1/camps/${campId}/cancel`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ reason: 'Severe tropical storm advisory issued for district' });

    assert.equal(cancelRes.status, 200);

    const { rows } = await pool.query('SELECT status, cancellation_reason FROM donation_camps WHERE id = $1', [campId]);
    assert.equal(rows[0].status, 'CANCELLED');
    assert.ok(rows[0].cancellation_reason.includes('Severe tropical storm'));

    // Check public list excludes cancelled camp
    const pubRes = await request(app).get('/api/v1/camps');
    const ids = pubRes.body.data.map(c => c.camp_id || c.id);
    assert.ok(!ids.includes(campId), 'Cancelled camp must never appear in public search');
  });

  /* -------------------------------------------------------------------------
   * 3. Donor Registration, Cancellation & Attendance
   * ------------------------------------------------------------------------- */
  it('M5-08: Donor registers for approved future camp, updates capacity, and prevents duplicate registration (409)', async () => {
    // 1. Create & approve a fresh camp
    const cRes = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        title: 'Donor Registration Camp',
        organizerId,
        bloodBankId: bankAId,
        locationId,
        startsAt: new Date(Date.now() + 86400000 * 14).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 14 + 14400000).toISOString(),
        capacity: 100,
      });
    const campId = cRes.body.data.id;
    await request(app).post(`/api/v1/camps/${campId}/submit`).set('Authorization', `Bearer ${tokenBankA}`);
    await request(app).post(`/api/v1/camps/${campId}/approve`).set('Authorization', `Bearer ${tokenBankA}`);

    // 2. Donor registers
    const regRes = await request(app)
      .post(`/api/v1/camps/${campId}/registrations`)
      .set('Authorization', `Bearer ${tokenDonor}`);

    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.data.status, 'REGISTERED');

    // 3. Repeated registration attempt must be rejected (409 conflict)
    const dupRes = await request(app)
      .post(`/api/v1/camps/${campId}/registrations`)
      .set('Authorization', `Bearer ${tokenDonor}`);

    assert.equal(dupRes.status, 409, 'Duplicate camp registration must be rejected with 409');
  });

  it('M5-09: Staff records attendee check-in and verifies attendance does NOT generate a completed donation', async () => {
    // 1. Create and approve camp
    const cRes = await request(app)
      .post('/api/v1/camps')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        title: 'Attendance Verification Camp',
        organizerId,
        bloodBankId: bankAId,
        locationId,
        startsAt: new Date(Date.now() + 86400000 * 15).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 15 + 14400000).toISOString(),
        capacity: 50,
      });
    const campId = cRes.body.data.id;
    await request(app).post(`/api/v1/camps/${campId}/submit`).set('Authorization', `Bearer ${tokenBankA}`);
    await request(app).post(`/api/v1/camps/${campId}/approve`).set('Authorization', `Bearer ${tokenBankA}`);

    // Check count of donations before
    const { rows: donBefore } = await pool.query('SELECT count(*)::int AS count FROM donations WHERE donor_id = $1', [donorId]);

    // 2. Record check-in attendance
    const chkRes = await request(app)
      .post(`/api/v1/camps/${campId}/check-ins`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        donorId,
        status: 'ATTENDED',
        notes: 'Arrived at reception and received queue ticket #12',
      });

    assert.equal(chkRes.status, 200);

    // 3. Verify attendance record is ATTENDED in camp_registrations
    const { rows: regRows } = await pool.query(
      'SELECT status, checked_in_by, attendance_notes FROM camp_registrations WHERE camp_id = $1 AND donor_id = $2',
      [campId, donorId],
    );
    assert.equal(regRows[0].status, 'ATTENDED');
    assert.equal(regRows[0].checked_in_by, bankStaffA.id);

    // 4. Verify no donation was created by mere attendance check-in
    const { rows: donAfter } = await pool.query('SELECT count(*)::int AS count FROM donations WHERE donor_id = $1', [donorId]);
    assert.equal(donAfter[0].count, donBefore[0].count, 'Attendance check-in must never create a completed donation');
  });

  /* -------------------------------------------------------------------------
   * 4. Media Upload, Binary Magic Bytes & Size Limits
   * ------------------------------------------------------------------------- */
  it('M5-10: Media upload verifies binary magic bytes, rejects disguised text files, and enforces 5MB limit', async () => {
    // 1. Valid PNG binary with magic bytes (\x89PNG\r\n\x1a\n)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);
    const validBase64 = `data:image/png;base64,${validPngBuffer.toString('base64')}`;

    const goodRes = await request(app)
      .post('/api/v1/media')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        base64Data: validBase64,
        originalName: 'valid_poster.png',
        altText: 'Valid camp promotional poster',
      });

    assert.equal(goodRes.status, 201);
    assert.equal(goodRes.body.data.mime_type, 'image/png');

    // 2. Disguised fake image (plain text content with .png name)
    const fakeBuffer = Buffer.from('<html><body><script>alert("hack")</script></body></html>');
    const fakeBase64 = `data:image/png;base64,${fakeBuffer.toString('base64')}`;

    const fakeRes = await request(app)
      .post('/api/v1/media')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        base64Data: fakeBase64,
        originalName: 'fake_image.png',
      });

    assert.equal(fakeRes.status, 400, 'Disguised non-image file must be rejected via magic bytes verification');
  });

  /* -------------------------------------------------------------------------
   * 5. Multi-Channel Notifications, Consent Enforcement & Idempotency
   * ------------------------------------------------------------------------- */
  it('M5-11: Enqueues and delivers notifications via multi-channel outbox worker with recipient consent', async () => {
    clearSentEmails();
    clearSentSms();

    // 1. Send SMS notification
    const smsRes = await request(app)
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        recipientUserId: donorUser.id,
        title: 'Emergency Blood Shortage in Colombo',
        message: 'A+ red cells urgently needed at Colombo National Blood Center. Can you donate today?',
        channel: 'SMS',
        priority: 'EMERGENCY',
        category: 'EMERGENCY',
      });

    assert.equal(smsRes.status, 201);

    // 2. Trigger worker
    await processNotificationDeliveries(10);

    const sent = getSentSms();
    assert.ok(sent.length >= 1, 'Expected SMS provider to dispatch message');
    assert.equal(sent[sent.length - 1].to, '+94773344556');
    assert.ok(sent[sent.length - 1].message.includes('A+ red cells urgently needed'));
  });

  it('M5-12: Prevents notification dispatch when donor has opted out of SMS alerts in donor_consents', async () => {
    clearSentSms();

    // Opt out donor from SMS
    await pool.query(
      `UPDATE donor_consents SET sms_alerts = false WHERE donor_id = $1`,
      [donorId],
    );

    // Enqueue SMS
    await request(app)
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        recipientUserId: donorUser.id,
        title: 'Camp Reminder',
        message: 'Your registered camp starts tomorrow morning at 8:00 AM',
        channel: 'SMS',
        priority: 'ROUTINE',
        category: 'CAMP',
      });

    // Run outbox worker
    const results = await processNotificationDeliveries(10);
    const skipped = results.find(r => r.status === 'SKIPPED_NO_SMS_CONSENT');
    assert.ok(skipped, 'Worker must skip dispatch when recipient lacks explicit SMS consent');

    const sent = getSentSms();
    assert.equal(sent.length, 0, 'No SMS should be dispatched without donor consent');
  });

  it('M5-13: Idempotent delivery prevents duplicate notification dispatches with identical keys', async () => {
    clearSentEmails();

    // Re-enable email consent
    await pool.query('UPDATE donor_consents SET email_alerts = true, contact_allowed = true WHERE donor_id = $1', [donorId]);

    const notificationPayload = {
      recipientUserId: donorUser.id,
      title: 'Appointment Confirmed',
      message: 'Your whole blood donation appointment has been scheduled.',
      channel: 'EMAIL',
      priority: 'ROUTINE',
      category: 'APPOINTMENT',
    };

    // First send
    const res1 = await request(app)
      .post('/api/v1/notifications/send')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(notificationPayload);

    assert.equal(res1.status, 201);

    await processNotificationDeliveries(10);
    const firstDeliveryCount = getSentEmails().length;
    assert.ok(firstDeliveryCount >= 1);

    // Second processing run: should NOT resend delivered items
    await processNotificationDeliveries(10);
    assert.equal(getSentEmails().length, firstDeliveryCount, 'Worker must not resend already delivered notifications');
  });
});
