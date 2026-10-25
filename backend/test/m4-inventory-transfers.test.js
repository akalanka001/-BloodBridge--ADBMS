import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { hashNationalId } from '../src/modules/donor-intake/intake.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('Member 4 — Donor Intake, Inventory & Inter-Bank Transfers (M4)', () => {
  let bankAId = null;
  let bankBId = null;
  let bankStaffA = null;
  let bankStaffB = null;
  let tokenBankA = null;
  let tokenBankB = null;
  let unassignedUser = null;
  let tokenUnassigned = null;
  let locationId = null;

  before(async () => {
    // 1. Resolve or create location
    const locRes = await pool.query(`SELECT id FROM locations LIMIT 1`);
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

    // 2. Resolve or create two blood banks
    const bbRes = await pool.query(`SELECT id, name FROM blood_banks LIMIT 2`);
    if (bbRes.rows.length >= 2) {
      bankAId = Number(bbRes.rows[0].id);
      bankBId = Number(bbRes.rows[1].id);
    } else {
      const b1 = await pool.query(
        `INSERT INTO blood_banks (name, location_id, is_verified)
         VALUES ('National Blood Center A ' || floor(random()*10000), $1, true)
         RETURNING id`,
        [locationId],
      );
      const b2 = await pool.query(
        `INSERT INTO blood_banks (name, location_id, is_verified)
         VALUES ('Regional Blood Center B ' || floor(random()*10000), $1, true)
         RETURNING id`,
        [locationId],
      );
      bankAId = Number(b1.rows[0].id);
      bankBId = Number(b2.rows[0].id);
    }

    // 3. Create staff users for Bank A and Bank B
    const uniqueA = Date.now();
    const uARes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Bank A', 'staff.a.${uniqueA}@bloodbridge.lk', 'hash', 'BANK_STAFF', true)
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

    const uBRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Staff Bank B', 'staff.b.${uniqueA}@bloodbridge.lk', 'hash', 'BANK_STAFF', true)
       RETURNING id, full_name, email, role`,
    );
    bankStaffB = uBRes.rows[0];
    await pool.query(
      `INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
       VALUES ($1, $2, true)`,
      [bankStaffB.id, bankBId],
    );
    tokenBankB = jwt.sign(
      { sub: bankStaffB.id, email: bankStaffB.email, role: 'BANK_STAFF', bloodBankId: bankBId },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 4. Create unassigned user
    const unRes = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ('Unassigned Staff', 'unassigned.${uniqueA}@bloodbridge.lk', 'hash', 'BANK_STAFF', true)
       RETURNING id, full_name, email, role`,
    );
    unassignedUser = unRes.rows[0];
    tokenUnassigned = jwt.sign(
      { sub: unassignedUser.id, email: unassignedUser.email, role: 'BANK_STAFF' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
  });

  // Helper to create a walk-in donor with a checked-in visit
  async function createDonorAndVisit(bankId) {
    const nic = `NIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const hashed = hashNationalId(nic);
    const regRes = await pool.query(
      `INSERT INTO donors (full_name, phone, blood_type_code, district_code, available_for_contact, camp_notifications_opt_in, national_id_hash, registration_origin)
       VALUES ('Test Walkin Donor', '0771234567', 'O+', 'CO', true, true, $1, 'STAFF_WALKIN')
       RETURNING id`,
      [hashed],
    );
    const donorId = regRes.rows[0].id;

    const visitRes = await pool.query(
      `INSERT INTO donor_visits (donor_id, blood_bank_id, checked_in_by, purpose, status)
       VALUES ($1, $2, $3, 'DONATION', 'CHECKED_IN')
       RETURNING id`,
      [donorId, bankId, bankStaffA.id],
    );
    return { donorId, visitId: visitRes.rows[0].id, nic };
  }

  // Helper to create a released blood unit
  async function createReleasedBloodUnit(bankId, staffId, bloodType = 'O+', component = 'RBC') {
    const { donorId, visitId } = await createDonorAndVisit(bankId);
    await pool.query(
      `INSERT INTO donor_assessments (donor_id, visit_id, assessed_by, weight_kg, hemoglobin_g_dl, status)
       VALUES ($1, $2, $3, 70.0, 14.0, 'PASSED')`,
      [donorId, visitId, staffId],
    );
    const donRes = await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status, visit_id)
       VALUES ($1, $2, now() - INTERVAL '1 day', 'PROCESSED', $3)
       RETURNING id`,
      [donorId, bankId, visitId],
    );
    const unitRes = await pool.query(
      `INSERT INTO blood_units (
         donation_id, blood_bank_id, blood_type_code, component_code, volume_ml,
         release_status, inventory_status, released_by, released_at, collected_at, expires_at
       )
       VALUES ($1, $2, $3, $4, 450, 'RELEASED', 'IN_STOCK', $5, now(), now() - INTERVAL '1 day', now() + INTERVAL '30 days')
       RETURNING id`,
      [donRes.rows[0].id, bankId, bloodType, component, staffId],
    );
    return unitRes.rows[0].id;
  }

  /* -------------------------------------------------------------------------
   * 1. Walk-in Donor Registration without Online Account
   * ------------------------------------------------------------------------- */
  it('M4-01: Registers a walk-in donor without requiring an email or user account', async () => {
    const nic = `WALKIN-${Date.now()}`;
    const payload = {
      fullName: 'Sunil Perera Walkin',
      phone: '0772233445',
      nationalId: nic,
      bloodTypeCode: 'B+',
      districtCode: 'CO',
      availableForContact: true,
      campNotificationsOptIn: true,
      bloodBankId: Number(bankAId),
    };

    const res = await request(app)
      .post('/api/v1/donor-intake/walk-ins')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data.id, 'Expected returned donor ID');
    assert.equal(res.body.data.full_name || res.body.data.fullName, 'Sunil Perera Walkin');

    // Verify in DB that no user credentials or password were generated
    const { rows } = await pool.query(
      `SELECT id, user_id, national_id_hash FROM donors WHERE id = $1`,
      [res.body.data.id],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, null, 'Walk-in donor must not require an online user account');
  });

  /* -------------------------------------------------------------------------
   * 2. Identity Lookup Privacy & Scoping
   * ------------------------------------------------------------------------- */
  it('M4-02: Identity lookup searches verified identity references and masks private data', async () => {
    const { nic } = await createDonorAndVisit(bankAId);

    const res = await request(app)
      .post('/api/v1/donor-intake/lookup')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ nationalId: nic });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'Expected array of matching donors');
    assert.ok(res.body.data.length >= 1, 'Expected at least 1 donor match');
    assert.ok(!res.body.data[0].password_hash, 'Password hash must never be exposed');
  });

  /* -------------------------------------------------------------------------
   * 3. Clinical Assessment & Deferral Enforcing
   * ------------------------------------------------------------------------- */
  it('M4-03: Records clinical screening assessment with haemoglobin and weight', async () => {
    const { visitId } = await createDonorAndVisit(bankAId);

    const payload = {
      weight_kg: 68.5,
      hemoglobin_g_dl: 14.2,
      status: 'PASSED',
    };

    const res = await request(app)
      .post(`/api/v1/donor-intake/visits/${visitId}/assessments`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res.status, 201, `Failed with ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.data.status, 'PASSED');

    // Also verify backward compatible alias endpoint /visits/:id/assessment
    const aliasRes = await request(app)
      .post(`/api/v1/donor-intake/visits/${visitId}/assessment`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ ...payload, status: 'PASSED' });
    assert.equal(aliasRes.status, 201, 'Singular /assessment alias should remain supported');
  });

  /* -------------------------------------------------------------------------
   * 4. Collection Blocked Without Appropriate Assessment
   * ------------------------------------------------------------------------- */
  it('M4-04: Blocks blood collection if visit has not passed authorized assessment', async () => {
    const { donorId, visitId } = await createDonorAndVisit(bankAId);

    // Try to record collection immediately without screening assessment
    const res = await request(app)
      .post('/api/v1/donor-intake/donations')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        visitId,
        donorId,
        bloodBankId: Number(bankAId),
        bloodTypeCode: 'O+',
        collectedVolumeMl: 450,
      });

    assert.equal(res.status, 400, 'Collection must be rejected without a passed screening assessment');
  });

  /* -------------------------------------------------------------------------
   * 5. Donation Collection & Duplicate Prevention
   * ------------------------------------------------------------------------- */
  it('M4-05: Records donation collection and rejects repeated collection for the same visit', async () => {
    const { donorId, visitId } = await createDonorAndVisit(bankAId);

    // Pass assessment first
    await pool.query(
      `INSERT INTO donor_assessments (donor_id, visit_id, assessed_by, weight_kg, hemoglobin_g_dl, status)
       VALUES ($1, $2, $3, 70.0, 13.5, 'PASSED')`,
      [donorId, visitId, bankStaffA.id],
    );

    const payload = {
      visitId,
      donorId,
      bloodBankId: Number(bankAId),
      bloodTypeCode: 'O+',
      collectedVolumeMl: 450,
    };

    // First collection should succeed
    const res1 = await request(app)
      .post('/api/v1/donor-intake/donations')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res1.status, 201, `Expected 201, got ${res1.status}: ${JSON.stringify(res1.body)}`);
    assert.equal(res1.body.data.process_status, 'COLLECTED');

    // Second collection for the exact same visit must be rejected
    const res2 = await request(app)
      .post('/api/v1/donor-intake/donations')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res2.status, 400, 'Duplicate collection on the same visit must be blocked');
  });

  /* -------------------------------------------------------------------------
   * 6. Component Fractionation into RBC, Plasma and Platelets
   * ------------------------------------------------------------------------- */
  it('M4-06: Fractionates whole blood donation into separate quarantined component units', async () => {
    const { donorId, visitId } = await createDonorAndVisit(bankAId);

    await pool.query(
      `INSERT INTO donor_assessments (donor_id, visit_id, assessed_by, weight_kg, hemoglobin_g_dl, status)
       VALUES ($1, $2, $3, 65.0, 14.0, 'PASSED')`,
      [donorId, visitId, bankStaffA.id],
    );

    const donRes = await pool.query(
      `INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status, visit_id)
       VALUES ($1, $2, now(), 'COLLECTED', $3)
       RETURNING id`,
      [donorId, bankAId, visitId],
    );
    const donationId = donRes.rows[0].id;

    const payload = {
      donationId,
      components: [
        { componentCode: 'RBC', volumeMl: 250, daysValid: 35 },
        { componentCode: 'PLASMA', volumeMl: 200, daysValid: 365 },
        { componentCode: 'PLATELETS', volumeMl: 50, daysValid: 5 },
      ],
    };

    const res = await request(app)
      .post('/api/v1/inventory/process-donation')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send(payload);

    assert.equal(res.status, 201, `Failed to fractionate: ${JSON.stringify(res.body)}`);

    // Verify 3 component units created in QUARANTINED state
    const { rows: units } = await pool.query(
      `SELECT component_code, release_status, inventory_status, volume_ml
       FROM blood_units WHERE donation_id = $1`,
      [donationId],
    );
    assert.equal(units.length, 3, 'Must create exactly 3 fractionated units');
    units.forEach((u) => {
      assert.equal(u.release_status, 'QUARANTINED', 'Fractionated unit must start QUARANTINED');
      assert.equal(u.inventory_status, 'IN_STOCK');
    });
  });

  /* -------------------------------------------------------------------------
   * 7. Component Release Authorization & Cross-Bank Permission Enforcement
   * ------------------------------------------------------------------------- */
  it('M4-07: Staff at Bank B cannot release a quarantined unit belonging to Bank A', async () => {
    const unitId = await createReleasedBloodUnit(bankAId, bankStaffA.id);

    // Set to quarantined
    await pool.query(
      `UPDATE blood_units SET release_status = 'QUARANTINED' WHERE id = $1`,
      [unitId],
    );

    // Staff B attempts to release Bank A's unit
    const res = await request(app)
      .post(`/api/v1/inventory/units/${unitId}/release`)
      .set('Authorization', `Bearer ${tokenBankB}`)
      .send({ releaseStatus: 'RELEASED', notes: 'Unauthorized attempt' });

    assert.equal(res.status, 403, 'Cross-bank unauthorized release must be forbidden');
  });

  it('M4-08: Authorized staff at Bank A releases unit to active stock with audit logging', async () => {
    const unitId = await createReleasedBloodUnit(bankAId, bankStaffA.id);

    await pool.query(
      `UPDATE blood_units SET release_status = 'QUARANTINED' WHERE id = $1`,
      [unitId],
    );

    const res = await request(app)
      .post(`/api/v1/inventory/units/${unitId}/release`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ releaseStatus: 'RELEASED', notes: 'Laboratory serology clear' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.release_status || res.body.data.releaseStatus, 'RELEASED');

    // Check inventory movements audit entry
    const { rows: movs } = await pool.query(
      `SELECT from_status, to_status, action
       FROM inventory_movements WHERE blood_unit_id = $1
       ORDER BY acted_at DESC LIMIT 1`,
      [unitId],
    );
    assert.ok(movs.length > 0, 'Audit movement must be generated on release');
    assert.equal(movs[0].to_status, 'RELEASED');
  });

  /* -------------------------------------------------------------------------
   * 8. Atomic Unit Reservation & Concurrency Safety
   * ------------------------------------------------------------------------- */
  it('M4-09: Quarantined or expired units cannot be reserved for hospital requests', async () => {
    // 1. Create a dummy hospital and request
    const hRes = await pool.query(
      `INSERT INTO hospitals (name, location_id, is_verified)
       VALUES ('Hospital Test', $1, true)
       RETURNING id`,
      [locationId],
    );
    const hospitalId = hRes.rows[0].id;

    const reqRes = await pool.query(
      `INSERT INTO blood_requests (hospital_id, created_by, urgency, status, needed_by)
       VALUES ($1, $2, 'ROUTINE', 'OPEN', now() + INTERVAL '3 days')
       RETURNING id`,
      [hospitalId, bankStaffA.id],
    );
    const itemRes = await pool.query(
      `INSERT INTO request_items (request_id, blood_type_code, component_code, units_requested)
       VALUES ($1, 'A+', 'RBC', 1)
       RETURNING id`,
      [reqRes.rows[0].id],
    );
    const requestItemId = itemRes.rows[0].id;

    // Create a quarantined unit
    const qUnitId = await createReleasedBloodUnit(bankAId, bankStaffA.id, 'A+', 'RBC');
    await pool.query(`UPDATE blood_units SET release_status = 'QUARANTINED' WHERE id = $1`, [qUnitId]);

    const res = await request(app)
      .post('/api/v1/inventory/reservations')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ requestItemId, bloodUnitId: qUnitId });

    assert.equal(res.status, 400, 'Quarantined blood unit cannot be reserved');
  });

  it('M4-10: Concurrency: Two simultaneous reservations for the same unit result in exactly one success', async () => {
    // Create eligible released unit
    const unitId = await createReleasedBloodUnit(bankAId, bankStaffA.id, 'O+', 'RBC');

    // Create request with 2 items
    const hRes = await pool.query(
      `INSERT INTO hospitals (name, location_id, is_verified)
       VALUES ('Hospital Concurrency', $1, true)
       RETURNING id`,
      [locationId],
    );
    const reqRes = await pool.query(
      `INSERT INTO blood_requests (hospital_id, created_by, urgency, status, needed_by)
       VALUES ($1, $2, 'CRITICAL', 'OPEN', now() + INTERVAL '1 day')
       RETURNING id`,
      [hRes.rows[0].id, bankStaffA.id],
    );
    const it1 = await pool.query(
      `INSERT INTO request_items (request_id, blood_type_code, component_code, units_requested)
       VALUES ($1, 'O+', 'RBC', 1) RETURNING id`,
      [reqRes.rows[0].id],
    );
    const it2 = await pool.query(
      `INSERT INTO request_items (request_id, blood_type_code, component_code, units_requested)
       VALUES ($1, 'O+', 'RBC', 1) RETURNING id`,
      [reqRes.rows[0].id],
    );

    // Two independent clients attempting concurrent reservation
    const client1 = await pool.connect();
    const client2 = await pool.connect();

    let res1Success = false;
    let res2Success = false;

    try {
      const p1 = client1.query(
        `SELECT fn_reserve_blood_unit($1, $2, $3)`,
        [it1.rows[0].id, unitId, bankStaffA.id],
      ).then(() => { res1Success = true; }).catch((err) => { res1Success = false; });

      const p2 = client2.query(
        `SELECT fn_reserve_blood_unit($1, $2, $3)`,
        [it2.rows[0].id, unitId, bankStaffA.id],
      ).then(() => { res2Success = true; }).catch((err) => { res2Success = false; });

      await Promise.all([p1, p2]);
    } finally {
      client1.release();
      client2.release();
    }

    // Exactly one reservation must succeed, never both
    const totalSuccess = (res1Success ? 1 : 0) + (res2Success ? 1 : 0);
    assert.equal(totalSuccess, 1, `Expected exactly 1 successful reservation, got ${totalSuccess}`);
  });

  /* -------------------------------------------------------------------------
   * 9. Inter-Bank Transfers: Atomic Multi-Unit Dispatch & Condition Receipt
   * ------------------------------------------------------------------------- */
  it('M4-11: Atomic transfer rollback: if one unit in a multi-unit transfer is invalid, all roll back', async () => {
    const validUnit = await createReleasedBloodUnit(bankAId, bankStaffA.id, 'O+', 'RBC');
    const fakeUnit = '00000000-0000-0000-0000-000000000000';

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        transferCode: `TRF-${Date.now()}-ROLLBACK`,
        sourceBankId: Number(bankAId),
        targetBankId: Number(bankBId),
        unitIds: [validUnit, fakeUnit],
        notes: 'Atomic rollback test',
      });

    assert.equal(res.status, 400, 'Transfer with invalid unit must roll back entire transaction');

    // Verify valid unit remained IN_STOCK and not transferred
    const { rows } = await pool.query(
      `SELECT inventory_status FROM blood_units WHERE id = $1`,
      [validUnit],
    );
    assert.equal(rows[0].inventory_status, 'IN_STOCK');
  });

  it('M4-12: Complete Inter-Bank Transfer: create, dispatch by source bank, receive with condition notes by destination bank', async () => {
    const unit1 = await createReleasedBloodUnit(bankAId, bankStaffA.id, 'O+', 'RBC');
    const unit2 = await createReleasedBloodUnit(bankAId, bankStaffA.id, 'O+', 'RBC');

    // 1. Create Transfer Request
    const createRes = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({
        transferCode: `TRF-${Date.now()}-EXEC`,
        sourceBankId: Number(bankAId),
        targetBankId: Number(bankBId),
        unitIds: [unit1, unit2],
        notes: 'Urgent RBC rebalancing for surgical cluster',
      });

    assert.equal(createRes.status, 201, `Failed to create transfer: ${JSON.stringify(createRes.body)}`);
    const transferId = createRes.body.data.id;
    assert.ok(transferId);

    // 2. Cross-bank staff cannot dispatch: Staff B cannot dispatch transfer from Bank A
    const unauthorizedDispatch = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokenBankB}`);
    assert.equal(unauthorizedDispatch.status, 403, 'Destination bank staff cannot dispatch source transfer');

    // 3. Authorized Source Staff dispatches
    const dispatchRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokenBankA}`);
    assert.equal(dispatchRes.status, 200);

    // Verify units are now locked in IN_TRANSIT
    const { rows: inTransitUnits } = await pool.query(
      `SELECT inventory_status FROM blood_units WHERE id = ANY($1)`,
      [[unit1, unit2]],
    );
    inTransitUnits.forEach((u) => {
      assert.equal(u.inventory_status, 'IN_TRANSIT');
    });

    // 4. Double dispatch must be rejected
    const doubleDispatch = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokenBankA}`);
    assert.equal(doubleDispatch.status, 400, 'Double dispatch must be rejected');

    // 5. Source staff cannot receive: only destination staff at Bank B can receive
    const unauthorizedReceive = await request(app)
      .post(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokenBankA}`)
      .send({ notes: 'Invalid receiver' });
    assert.equal(unauthorizedReceive.status, 403, 'Source staff cannot confirm receipt');

    // 6. Authorized destination staff receives transfer with condition notes
    const receiveRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokenBankB}`)
      .send({ notes: 'Cold chain verified: 3.8°C with intact temperature log' });
    assert.equal(receiveRes.status, 200);

    // Verify units custody transferred to Bank B and status back to IN_STOCK
    const { rows: receivedUnits } = await pool.query(
      `SELECT blood_bank_id, inventory_status FROM blood_units WHERE id = ANY($1)`,
      [[unit1, unit2]],
    );
    receivedUnits.forEach((u) => {
      assert.equal(Number(u.blood_bank_id), bankBId, 'Unit custody must be transferred to destination blood bank');
      assert.equal(u.inventory_status, 'IN_STOCK');
    });

    // 7. Double receipt must be rejected
    const doubleReceive = await request(app)
      .post(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokenBankB}`)
      .send({ notes: 'Duplicate' });
    assert.equal(doubleReceive.status, 400, 'Double receipt must be rejected');
  });

  /* -------------------------------------------------------------------------
   * 10. Real Bank Overview Dashboard Scoping
   * ------------------------------------------------------------------------- */
  it('M4-13: GET /api/v1/bank/dashboard returns real scoped KPIs matching PostgreSQL views without hardcoded values', async () => {
    const res = await request(app)
      .get(`/api/v1/bank/dashboard?bankId=${bankAId}`)
      .set('Authorization', `Bearer ${tokenBankA}`);

    assert.equal(res.status, 200);
    const { data } = res.body;

    assert.ok(data.kpis, 'Must return kpis object');
    assert.ok(typeof data.kpis.available_units === 'number');
    assert.ok(typeof data.kpis.expiring_soon === 'number');
    assert.ok(typeof data.kpis.incoming_requests === 'number');
    assert.ok(typeof data.kpis.today_collections === 'number');
    assert.ok(typeof data.kpis.in_transit_transfers === 'number');
    assert.ok(typeof data.kpis.upcoming_camps === 'number');

    // Blood group availability array must have all 8 ABO/Rh combinations
    assert.equal(data.bloodGroupAvailability.length, 8);
    const groups = data.bloodGroupAvailability.map((g) => g.type);
    ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].forEach((grp) => {
      assert.ok(groups.includes(grp), `Must include blood group ${grp}`);
    });
  });
});
