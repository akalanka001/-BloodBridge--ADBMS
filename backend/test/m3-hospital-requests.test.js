import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('Member 3 — Hospital Requests, Emergency Appeals & Fulfillment (M3)', () => {
  let hospitalUserA = null;
  let tokenA = null;
  let hospitalUserB = null;
  let tokenB = null;
  let donorUser = null;
  let donorToken = null;
  let hospitalAId = null;
  let hospitalBId = null;
  let bloodBankId = null;
  let locationAId = null;
  let bankStaffUser = null;

  async function createTestBloodUnit(bankId, staffId, bloodType = 'O-', component = 'RBC', status = 'IN_STOCK') {
    const email = `unit.donor.${Date.now()}.${Math.random().toString(36).slice(2)}@bloodbridge.lk`;
    const uRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Unit Donor', $1, 'fake_hash', 'DONOR', true)
       RETURNING id`,
      [email],
    );
    const dRes = await pool.query(
      `INSERT INTO donors (user_id, blood_type_code, district_code, available_for_contact)
       VALUES ($1, $2, 'CO', true)
       RETURNING id`,
      [uRes.rows[0].id, bloodType],
    );
    const donRes = await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status)
       VALUES ($1, $2, now() - INTERVAL '2 days', 'PROCESSED')
       RETURNING id`,
      [dRes.rows[0].id, bankId],
    );
    const unitRes = await pool.query(
      `INSERT INTO blood_units (
         donation_id, blood_bank_id, blood_type_code, component_code,
         release_status, inventory_status, released_by, collected_at, expires_at
       )
       VALUES ($1, $2, $3, $4, 'RELEASED', $5, $6, now() - INTERVAL '2 days', now() + INTERVAL '20 days')
       RETURNING id`,
      [donRes.rows[0].id, bankId, bloodType, component, status, staffId],
    );
    return unitRes.rows[0].id;
  }

  before(async () => {
    // 1. Get or create location
    const locRes = await pool.query(
      `SELECT id FROM locations WHERE district_code = 'CO' LIMIT 1`,
    );
    if (locRes.rows.length) {
      locationAId = locRes.rows[0].id;
    } else {
      const insLoc = await pool.query(
        `INSERT INTO locations (district_code, ds_code, town)
         VALUES ('CO', 'CO-01', 'Colombo Central')
         RETURNING id`,
      );
      locationAId = insLoc.rows[0].id;
    }

    // 2. Create two hospitals for cross-institution tests
    const h1 = await pool.query(
      `INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
       VALUES ('Colombo General Hospital M3', $1, '0112111111', true)
       RETURNING id`,
      [locationAId],
    );
    hospitalAId = Number(h1.rows[0].id);

    const h2 = await pool.query(
      `INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
       VALUES ('Kandy Teaching Hospital M3', $1, '0812222222', true)
       RETURNING id`,
      [locationAId],
    );
    hospitalBId = Number(h2.rows[0].id);

    // 3. Create Blood Bank for fulfillment tests
    const bbRes = await pool.query(
      `INSERT INTO blood_banks (name, location_id, contact_phone, is_verified)
       VALUES ('Central Blood Bank M3', $1, '0112333333', true)
       RETURNING id`,
      [locationAId],
    );
    bloodBankId = Number(bbRes.rows[0].id);

    // Create a bank staff user to release blood units
    const emailBS = `bank.staff.m3.${Date.now()}@bloodbridge.lk`;
    const uBS = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Bank Staff M3', $1, 'fake_hash', 'BANK_STAFF', true)
       RETURNING id, role, email`,
      [emailBS],
    );
    bankStaffUser = uBS.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [bankStaffUser.id, bloodBankId],
    );

    // 4. Create hospital staff user A (Hospital A)
    const emailA = `hospital.staff.a.${Date.now()}@bloodbridge.lk`;
    const uA = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Dr. Hospital Staff A', $1, 'fake_hash', 'HOSPITAL_STAFF', true)
       RETURNING id, role, email`,
      [emailA],
    );
    hospitalUserA = uA.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, hospital_id, is_active)
       VALUES ($1, $2, true)`,
      [hospitalUserA.id, hospitalAId],
    );
    tokenA = jwt.sign({ sub: hospitalUserA.id, role: 'HOSPITAL_STAFF' }, JWT_SECRET, { expiresIn: '1h' });

    // 5. Create hospital staff user B (Hospital B)
    const emailB = `hospital.staff.b.${Date.now()}@bloodbridge.lk`;
    const uB = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Dr. Hospital Staff B', $1, 'fake_hash', 'HOSPITAL_STAFF', true)
       RETURNING id, role, email`,
      [emailB],
    );
    hospitalUserB = uB.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, hospital_id, is_active)
       VALUES ($1, $2, true)`,
      [hospitalUserB.id, hospitalBId],
    );
    tokenB = jwt.sign({ sub: hospitalUserB.id, role: 'HOSPITAL_STAFF' }, JWT_SECRET, { expiresIn: '1h' });

    // 6. Create donor user (to test role restriction)
    const emailD = `donor.m3.${Date.now()}@bloodbridge.lk`;
    const uD = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Test Donor M3', $1, 'fake_hash', 'DONOR', true)
       RETURNING id, role, email`,
      [emailD],
    );
    donorUser = uD.rows[0];
    donorToken = jwt.sign({ sub: donorUser.id, role: 'DONOR' }, JWT_SECRET, { expiresIn: '1h' });
  });

  it('M3-01: denies unauthenticated access to hospital endpoints (401)', async () => {
    const res = await request(app).get('/api/v1/requests');
    assert.equal(res.status, 401);

    const dashRes = await request(app).get('/api/v1/hospital/dashboard');
    assert.equal(dashRes.status, 401);
  });

  it('M3-02: denies non-hospital roles (e.g. DONOR) access to hospital endpoints (403)', async () => {
    const res = await request(app)
      .get('/api/v1/requests')
      .set('Authorization', `Bearer ${donorToken}`);
    assert.equal(res.status, 403);
  });

  it('M3-03: rejects blood request creation for unauthorized hospitalId (403)', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
    const res = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalBId, // Staff A trying to request for Hospital B
        urgency: 'URGENT',
        neededBy: futureDate,
        items: [
          { bloodTypeCode: 'O+', componentCode: 'RBC', unitsRequested: 2 },
        ],
      });
    assert.equal(res.status, 403);
  });

  it('M3-04: rejects invalid component codes, past neededBy, and non-positive quantities (400)', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    // 1. Invalid component (WB is not supported in component_types)
    const resComp = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalAId,
        urgency: 'URGENT',
        neededBy: futureDate,
        items: [{ bloodTypeCode: 'O+', componentCode: 'WB', unitsRequested: 2 }],
      });
    assert.equal(resComp.status, 400);

    // 2. Past neededBy
    const resPast = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalAId,
        urgency: 'ROUTINE',
        neededBy: pastDate,
        items: [{ bloodTypeCode: 'A+', componentCode: 'RBC', unitsRequested: 1 }],
      });
    assert.equal(resPast.status, 400);

    // 3. Zero units
    const resZero = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalAId,
        urgency: 'ROUTINE',
        neededBy: futureDate,
        items: [{ bloodTypeCode: 'A+', componentCode: 'RBC', unitsRequested: 0 }],
      });
    assert.equal(resZero.status, 400);
  });

  let createdRequestId = null;
  let createdItemId = null;

  it('M3-05: creates multi-item blood request transactionally with OPEN status and audit history', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
    const res = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalAId,
        urgency: 'CRITICAL',
        neededBy: futureDate,
        notes: 'Emergency surgical backup needed',
        items: [
          { bloodTypeCode: 'O-', componentCode: 'RBC', unitsRequested: 3 },
          { bloodTypeCode: 'O+', componentCode: 'PLATELETS', unitsRequested: 2 },
        ],
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, 'OPEN');
    createdRequestId = res.body.data.id;

    // Check request items in database
    const items = await pool.query(
      `SELECT id, blood_type_code, component_code, units_requested
       FROM request_items WHERE request_id = $1 ORDER BY units_requested DESC`,
      [createdRequestId],
    );
    assert.equal(items.rows.length, 2);
    createdItemId = items.rows[0].id;

    // Check audit history
    const history = await pool.query(
      `SELECT * FROM request_status_history WHERE request_id = $1`,
      [createdRequestId],
    );
    assert.ok(history.rows.length >= 1);
    assert.equal(history.rows[0].to_status, 'OPEN');
  });

  it('M3-06: fetches hospital dashboard KPIs and real overview matching database', async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/dashboard?hospitalId=${hospitalAId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const { kpis, recentRequests, urgentShortages } = res.body.data;

    assert.ok(kpis);
    assert.ok(typeof kpis.active_requests === 'number');
    assert.ok(kpis.active_requests >= 1);
    assert.ok(kpis.critical_priority >= 1);

    // Verify recent requests contain created request
    assert.ok(Array.isArray(recentRequests));
    const found = recentRequests.find((r) => r.id === createdRequestId);
    assert.ok(found);
    assert.equal(found.urgency, 'CRITICAL');
    assert.equal(found.total_requested_units, 5);

    // Verify urgent shortages list includes our items
    assert.ok(Array.isArray(urgentShortages));
    assert.ok(urgentShortages.length >= 1);
  });

  it('M3-07: fetches progress & matching summary without leaking private donor data', async () => {
    const res = await request(app)
      .get(`/api/v1/requests/${createdRequestId}/progress`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const summary = res.body.data;
    assert.ok(summary);
    assert.equal(summary.requestId, createdRequestId);
    assert.ok(typeof summary.matchingProgress === 'number');
    assert.ok(typeof summary.inventoryFacilitiesCount === 'number');
    assert.ok(typeof summary.potentialDonorsCount === 'number');

    // Strict privacy assurance: summary must not contain donor names, phone, or patient data
    assert.equal(summary.donorNames, undefined);
    assert.equal(summary.donorPhones, undefined);
    assert.equal(summary.patientName, undefined);
  });

  let appealId = null;

  it('M3-08: creates emergency appeal with shortage units and executes safe geographic escalation', async () => {
    // 1. Create emergency appeal
    const res = await request(app)
      .post('/api/v1/emergency-appeals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        requestId: createdRequestId,
        requestItemId: createdItemId,
        hospitalId: hospitalAId,
        shortageUnits: 2,
        reason: 'Trauma ICU shortage: immediate blood required',
        escalationLevel: 'GN_DIVISION',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, 'ACTIVE');
    assert.equal(res.body.data.shortage_units, 2);
    appealId = res.body.data.id;

    // 2. Fetch appeal details
    const getRes = await request(app)
      .get(`/api/v1/emergency-appeals/${appealId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.steps.length, 1);
    assert.equal(getRes.body.data.steps[0].stage_name, 'GN_DIVISION');

    // 3. Escalate appeal from GN_DIVISION to DS_DIVISION
    const escRes = await request(app)
      .post(`/api/v1/emergency-appeals/${appealId}/escalate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ targetStage: 'DS_DIVISION' });

    assert.equal(escRes.status, 200);
    assert.equal(escRes.body.data.escalation_level, 'DS_DIVISION');
    assert.equal(escRes.body.data.steps.length, 2);
    assert.equal(escRes.body.data.steps[1].stage_name, 'DS_DIVISION');
  });

  it('M3-09: confirms fulfillment delivery receipt and prevents replay / double receipt', async () => {
    // 1. Create a blood unit and reservation to simulate dispatch
    const unitId = await createTestBloodUnit(bloodBankId, bankStaffUser.id, 'O-', 'RBC', 'RESERVED');

    const resRes = await pool.query(
      `INSERT INTO inventory_reservations (request_item_id, blood_unit_id, status, reserved_by)
       VALUES ($1, $2, 'ACTIVE', $3)
       RETURNING id`,
      [createdItemId, unitId, bankStaffUser.id],
    );
    const resId = resRes.rows[0].id;

    // 2. Create fulfillment in DISPATCHED state
    const fulRes = await pool.query(
      `INSERT INTO fulfillments (request_id, blood_bank_id, status)
       VALUES ($1, $2, 'DISPATCHED')
       RETURNING id`,
      [createdRequestId, bloodBankId],
    );
    const fulfillmentId = fulRes.rows[0].id;

    await pool.query(
      `INSERT INTO fulfillment_units (fulfillment_id, reservation_id, blood_unit_id)
       VALUES ($1, $2, $3)`,
      [fulfillmentId, resId, unitId],
    );

    // 3. Confirm receipt via API
    const receiveRes = await request(app)
      .post(`/api/v1/fulfillments/${fulfillmentId}/receive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        receivedQuantity: 1,
        conditionNotes: 'All cold chain seals intact at 4C',
      });

    assert.equal(receiveRes.status, 200);
    assert.equal(receiveRes.body.data.status, 'RECEIVED');
    assert.equal(receiveRes.body.data.received_quantity, 1);
    assert.equal(receiveRes.body.data.condition_notes, 'All cold chain seals intact at 4C');

    // 4. Blood unit inventory status updated to ISSUED
    const unitCheck = await pool.query(`SELECT inventory_status FROM blood_units WHERE id = $1`, [unitId]);
    assert.equal(unitCheck.rows[0].inventory_status, 'ISSUED');

    // 5. Reservation updated to FULFILLED
    const resCheck = await pool.query(`SELECT status FROM inventory_reservations WHERE id = $1`, [resId]);
    assert.equal(resCheck.rows[0].status, 'FULFILLED');

    // 6. Attempt double receipt - must reject with 400
    const replayRes = await request(app)
      .post(`/api/v1/fulfillments/${fulfillmentId}/receive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        receivedQuantity: 1,
      });
    assert.equal(replayRes.status, 400);
  });

  it('M3-10: cancels request and releases active reservations safely back to IN_STOCK', async () => {
    // 1. Create a request to cancel
    const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();
    const reqRes = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        hospitalId: hospitalAId,
        urgency: 'ROUTINE',
        neededBy: futureDate,
        items: [{ bloodTypeCode: 'B+', componentCode: 'RBC', unitsRequested: 1 }],
      });
    assert.equal(reqRes.status, 201);
    const cancelReqId = reqRes.body.data.id;

    // Attach an active reservation
    const unitId = await createTestBloodUnit(bloodBankId, bankStaffUser.id, 'B+', 'RBC', 'RESERVED');

    const itemRes = await pool.query(`SELECT id FROM request_items WHERE request_id = $1`, [cancelReqId]);
    await pool.query(
      `INSERT INTO inventory_reservations (request_item_id, blood_unit_id, status, reserved_by)
       VALUES ($1, $2, 'ACTIVE', $3)`,
      [itemRes.rows[0].id, unitId, bankStaffUser.id],
    );

    // Cancel request via API
    const cancelRes = await request(app)
      .post(`/api/v1/requests/${cancelReqId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Patient discharged before transfusion' });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');

    // Verify unit released back to IN_STOCK
    const unitCheck = await pool.query(`SELECT inventory_status FROM blood_units WHERE id = $1`, [unitId]);
    assert.equal(unitCheck.rows[0].inventory_status, 'IN_STOCK');

    // Verify reservation status is CANCELLED
    const resCheck = await pool.query(`SELECT status FROM inventory_reservations WHERE request_item_id = $1`, [itemRes.rows[0].id]);
    assert.equal(resCheck.rows[0].status, 'CANCELLED');
  });

  it('M3-11: queries available network stock for hospital with blood bank and component breakdown', async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/available-stock?hospitalId=${hospitalAId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });
});
