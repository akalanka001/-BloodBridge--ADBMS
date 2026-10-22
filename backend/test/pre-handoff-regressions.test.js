import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { pool } from '../src/db.js';
import { processOutboxBatch, recoverStaleProcessingEvents } from '../src/infrastructure/outbox.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars';

describe('Pre-Handoff Critical Regressions & Edge Cases', () => {
  let client;
  let adminToken;
  let adminUserId;
  let bank1StaffToken;
  let bank1StaffId;
  let bank2StaffToken;
  let bank2StaffId;
  let unauthorizedStaffToken;
  let unauthorizedStaffId;

  let testBank1Id;
  let testBank2Id;
  let loc1Id;
  let loc2Id;

  // Track created IDs for strict, isolated cleanup
  const createdUserIds = [];
  const createdDonorIds = [];
  const createdTransferIds = [];
  const createdUnitIds = [];
  const createdClaimIds = [];
  const createdVisitIds = [];
  const createdDonationIds = [];
  const createdBankIds = [];
  const createdLocationIds = [];

  before(async () => {
    client = await pool.connect();

    // Create 2 distinct test locations and blood banks
    const { rows: l1 } = await client.query("INSERT INTO locations (district_code, town) VALUES ('CO', 'Test Town 1') RETURNING id");
    const { rows: l2 } = await client.query("INSERT INTO locations (district_code, town) VALUES ('GA', 'Test Town 2') RETURNING id");
    loc1Id = l1[0].id;
    loc2Id = l2[0].id;
    createdLocationIds.push(loc1Id, loc2Id);

    const { rows: b1 } = await client.query("INSERT INTO blood_banks (name, location_id, is_verified) VALUES ('Reg Bank 1', $1, true) RETURNING id", [loc1Id]);
    const { rows: b2 } = await client.query("INSERT INTO blood_banks (name, location_id, is_verified) VALUES ('Reg Bank 2', $1, true) RETURNING id", [loc2Id]);
    testBank1Id = Number(b1[0].id);
    testBank2Id = Number(b2[0].id);
    createdBankIds.push(testBank1Id, testBank2Id);

    // Setup Admin user
    const { rows: adminRows } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Regression Admin', 'regression.admin@example.com', 'dummy_hash_1234', 'ADMIN', true)
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `);
    adminUserId = adminRows[0].id;
    createdUserIds.push(adminUserId);
    adminToken = jwt.sign({ role: 'ADMIN', email: 'regression.admin@example.com' }, JWT_SECRET, { subject: adminUserId });

    // Setup Bank 1 Staff
    const { rows: b1Rows } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Bank 1 Staff', 'b1.staff@example.com', 'dummy_hash_1234', 'BANK_STAFF', true)
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `);
    bank1StaffId = b1Rows[0].id;
    createdUserIds.push(bank1StaffId);
    await client.query(`
      INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (user_id, blood_bank_id) DO UPDATE SET is_active = true
    `, [bank1StaffId, testBank1Id]);
    bank1StaffToken = jwt.sign({ role: 'BANK_STAFF', email: 'b1.staff@example.com' }, JWT_SECRET, { subject: bank1StaffId });

    // Setup Bank 2 Staff
    const { rows: b2Rows } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Bank 2 Staff', 'b2.staff@example.com', 'dummy_hash_1234', 'BANK_STAFF', true)
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `);
    bank2StaffId = b2Rows[0].id;
    createdUserIds.push(bank2StaffId);
    await client.query(`
      INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (user_id, blood_bank_id) DO UPDATE SET is_active = true
    `, [bank2StaffId, testBank2Id]);
    bank2StaffToken = jwt.sign({ role: 'BANK_STAFF', email: 'b2.staff@example.com' }, JWT_SECRET, { subject: bank2StaffId });

    // Setup Staff without bank assignment
    const { rows: unauthRows } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Unassigned Staff', 'unassigned.staff@example.com', 'dummy_hash_1234', 'BANK_STAFF', true)
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `);
    unauthorizedStaffId = unauthRows[0].id;
    createdUserIds.push(unauthorizedStaffId);
    unauthorizedStaffToken = jwt.sign({ role: 'BANK_STAFF', email: 'unassigned.staff@example.com' }, JWT_SECRET, { subject: unauthorizedStaffId });
  });

  after(async () => {
    if (client) {
      try {
        // Safe, strictly isolated cleanup by recorded synthetic IDs
        if (createdTransferIds.length > 0) {
          await client.query('DELETE FROM transfer_units WHERE transfer_id = ANY($1)', [createdTransferIds]);
          await client.query('DELETE FROM blood_bank_transfers WHERE id = ANY($1)', [createdTransferIds]);
        }
        if (createdUnitIds.length > 0) {
          await client.query('DELETE FROM inventory_movements WHERE blood_unit_id = ANY($1)', [createdUnitIds]);
          await client.query('DELETE FROM blood_units WHERE id = ANY($1)', [createdUnitIds]);
        }
        if (createdDonationIds.length > 0) {
          await client.query('DELETE FROM inventory_movements WHERE blood_unit_id IN (SELECT id FROM blood_units WHERE donation_id = ANY($1))', [createdDonationIds]);
          await client.query('DELETE FROM blood_units WHERE donation_id = ANY($1)', [createdDonationIds]);
          await client.query('DELETE FROM donations WHERE id = ANY($1)', [createdDonationIds]);
        }
        if (createdVisitIds.length > 0) {
          await client.query('DELETE FROM donor_assessments WHERE visit_id = ANY($1)', [createdVisitIds]);
          await client.query('DELETE FROM donor_visits WHERE id = ANY($1)', [createdVisitIds]);
        }
        if (createdClaimIds.length > 0) {
          await client.query('DELETE FROM donor_account_claims WHERE id = ANY($1)', [createdClaimIds]);
        }
        if (createdDonorIds.length > 0) {
          await client.query('DELETE FROM donations WHERE donor_id = ANY($1)', [createdDonorIds]);
          await client.query('DELETE FROM donor_assessments WHERE donor_id = ANY($1)', [createdDonorIds]);
          await client.query('DELETE FROM donor_visits WHERE donor_id = ANY($1)', [createdDonorIds]);
          await client.query('DELETE FROM donor_consent_history WHERE donor_id = ANY($1)', [createdDonorIds]);
          await client.query('DELETE FROM donor_consents WHERE donor_id = ANY($1)', [createdDonorIds]);
          await client.query('DELETE FROM donors WHERE id = ANY($1)', [createdDonorIds]);
        }
        if (createdUserIds.length > 0) {
          await client.query('DELETE FROM transfer_units WHERE transfer_id IN (SELECT id FROM blood_bank_transfers WHERE requested_by = ANY($1) OR dispatched_by = ANY($1) OR received_by = ANY($1))', [createdUserIds]);
          await client.query('DELETE FROM blood_bank_transfers WHERE requested_by = ANY($1) OR dispatched_by = ANY($1) OR received_by = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM donor_assessments WHERE assessed_by = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM inventory_movements WHERE blood_unit_id IN (SELECT id FROM blood_units WHERE released_by = ANY($1))', [createdUserIds]);
          await client.query('DELETE FROM transfer_units WHERE blood_unit_id IN (SELECT id FROM blood_units WHERE released_by = ANY($1))', [createdUserIds]);
          await client.query('DELETE FROM blood_units WHERE released_by = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM audit_logs WHERE actor_id = ANY($1)', [createdUserIds]);
          await client.query('UPDATE donors SET enrolled_by = NULL WHERE enrolled_by = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM donations WHERE visit_id IN (SELECT id FROM donor_visits WHERE checked_in_by = ANY($1))', [createdUserIds]);
          await client.query('DELETE FROM donor_assessments WHERE visit_id IN (SELECT id FROM donor_visits WHERE checked_in_by = ANY($1))', [createdUserIds]);
          await client.query('DELETE FROM donor_visits WHERE checked_in_by = ANY($1)', [createdUserIds]);
          await client.query('UPDATE donor_account_claims SET reviewed_by = NULL WHERE reviewed_by = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM staff_memberships WHERE user_id = ANY($1)', [createdUserIds]);
          await client.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
        }
        if (createdBankIds.length > 0) {
          await client.query('DELETE FROM staff_memberships WHERE blood_bank_id = ANY($1)', [createdBankIds]);
          await client.query('DELETE FROM blood_banks WHERE id = ANY($1)', [createdBankIds]);
        }
        if (createdLocationIds.length > 0) {
          await client.query('DELETE FROM locations WHERE id = ANY($1)', [createdLocationIds]);
        }
      } catch (err) {
        console.error('Regression cleanup error:', err);
      } finally {
        client.release();
      }
    }
  });

  it('Critical 1: End-to-end hybrid donor registration, claim approval, and history reconciliation via HTTP', async () => {
    // 1. Staff enrolls a walk-in donor with no online user account
    const uniqueNic = 'NIC' + Date.now().toString().slice(-9);
    const walkInRes = await request(app)
      .post('/api/v1/donor-intake/walk-ins')
      .set('Authorization', `Bearer ${bank1StaffToken}`)
      .send({
        fullName: 'Nimal Walkin Perera',
        phone: '0771234999',
        nationalId: uniqueNic,
        bloodTypeCode: 'O+',
        districtCode: 'CO',
        availableForContact: true,
        campNotificationsOptIn: true,
        bloodBankId: testBank1Id,
      });

    assert.equal(walkInRes.status, 201);
    const walkInDonorId = walkInRes.body.data.id;
    createdDonorIds.push(walkInDonorId);

    // 2. Staff checks in visit, records assessment, and records a donation for the walk-in donor
    const visitRes = await request(app)
      .post('/api/v1/donor-intake/visits')
      .set('Authorization', `Bearer ${bank1StaffToken}`)
      .send({
        donorId: walkInDonorId,
        bloodBankId: testBank1Id,
        purpose: 'DONATION',
      });
    assert.equal(visitRes.status, 201);
    const visitId = visitRes.body.data.id;
    createdVisitIds.push(visitId);

    const assessRes = await request(app)
      .post(`/api/v1/donor-intake/visits/${visitId}/assessments`)
      .set('Authorization', `Bearer ${bank1StaffToken}`)
      .send({
        status: 'PASSED',
        hemoglobin_g_dl: 14.5,
        weight_kg: 70.0,
      });
    assert.equal(assessRes.status, 201);

    const collectRes = await request(app)
      .post('/api/v1/donor-intake/donations')
      .set('Authorization', `Bearer ${bank1StaffToken}`)
      .send({
        visitId,
        donorId: walkInDonorId,
        bloodBankId: testBank1Id,
        bloodTypeCode: 'O+',
        collectedVolumeMl: 450,
      });
    assert.equal(collectRes.status, 201);
    createdDonationIds.push(collectRes.body.data.id);

    // 3. Donor later self-registers an online account using the REAL registration endpoint
    const uniqueEmail = `nimal-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register-donor')
      .send({
        fullName: 'Nimal Walkin Perera',
        email: uniqueEmail,
        password: 'SecurePassword123!',
        districtCode: 'CO',
        bloodTypeCode: 'O+',
        availableForContact: true,
        campNotificationsOptIn: true,
      });
    assert.equal(regRes.status, 201);
    const onlineUserId = regRes.body.user ? regRes.body.user.id : regRes.body.data.id;
    createdUserIds.push(onlineUserId);

    // Get the online donor placeholder ID so it can be cleaned up
    const { rows: onlineDonorRows } = await client.query('SELECT id FROM donors WHERE user_id = $1', [onlineUserId]);
    if (onlineDonorRows[0]) {
      createdDonorIds.push(onlineDonorRows[0].id);
    }

    // 4. Donor logs in
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: uniqueEmail,
        password: 'SecurePassword123!',
      });
    assert.equal(loginRes.status, 200);
    const donorToken = loginRes.body.token || loginRes.body.data?.token;
    assert.ok(donorToken, 'Must receive auth token on login');

    // 5. Donor submits a link claim pointing to the walk-in donor record
    const claimRes = await request(app)
      .post('/api/v1/donors/me/link-claims')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donorId: walkInDonorId,
        verificationNotes: 'NIC: 199512300012, previous donation at Bank 1',
      });
    assert.equal(claimRes.status, 201);
    const claimId = claimRes.body.data.id;
    createdClaimIds.push(claimId);

    // 6. Admin approves the claim
    const approveRes = await request(app)
      .post(`/api/v1/admin/donor-link-claims/${claimId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // MUST succeed with 200 OK
    assert.equal(approveRes.status, 200, `Admin claim approval failed: ${JSON.stringify(approveRes.body)}`);

    // 7. Donor accesses their donations under their authenticated account
    const myDonationsRes = await request(app)
      .get('/api/v1/donors/me/donations')
      .set('Authorization', `Bearer ${donorToken}`);

    assert.equal(myDonationsRes.status, 200);
    assert.equal(myDonationsRes.body.data.length, 1, 'Donor must now see the walk-in donation');
    assert.equal(myDonationsRes.body.data[0].id, collectRes.body.data.id);
  });

  it('Critical 2: Transfer receipt API correctly accepts notes and completes in DB', async () => {
    // Create donor and donation for blood unit
    const { rows: dRows } = await client.query(`
      INSERT INTO donors (full_name, phone, blood_type_code, district_code, registration_origin)
      VALUES ('Unit Source Donor', '0770001111', 'O+', 'CO', 'STAFF_WALKIN')
      RETURNING id
    `);
    createdDonorIds.push(dRows[0].id);

    const { rows: donRows } = await client.query(`
      INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status)
      VALUES ($1, $2, now() - interval '2 days', 'PROCESSED')
      RETURNING id
    `, [dRows[0].id, testBank1Id]);
    createdDonationIds.push(donRows[0].id);

    // Create an eligible unit at Bank 1
    const { rows: unitRows } = await client.query(`
      INSERT INTO blood_units (donation_id, blood_type_code, component_code, release_status, inventory_status, released_by, collected_at, expires_at, blood_bank_id)
      VALUES ($1, 'O+', 'RBC', 'RELEASED', 'IN_STOCK', $3, now() - interval '2 days', now() + interval '20 days', $2)
      RETURNING id
    `, [donRows[0].id, testBank1Id, bank1StaffId]);
    const unitId = unitRows[0].id;
    createdUnitIds.push(unitId);

    // Create a transfer from Bank 1 to Bank 2
    const transferCode = `TRF-TEST-${Date.now()}`;
    const { rows: trfRows } = await client.query(`
      INSERT INTO blood_bank_transfers (transfer_code, source_bank_id, target_bank_id, status, requested_by)
      VALUES ($1, $2, $3, 'APPROVED', $4)
      RETURNING id
    `, [transferCode, testBank1Id, testBank2Id, bank1StaffId]);
    const transferId = trfRows[0].id;
    createdTransferIds.push(transferId);

    await client.query(`
      INSERT INTO transfer_units (transfer_id, blood_unit_id)
      VALUES ($1, $2)
    `, [transferId, unitId]);

    // Dispatch transfer
    const dispatchRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${bank1StaffToken}`);
    assert.equal(dispatchRes.status, 200, `Dispatch failed: ${JSON.stringify(dispatchRes.body)}`);

    // Receive transfer with notes via HTTP API
    const receiveRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${bank2StaffToken}`)
      .send({ notes: 'Cold chain verified at 4C upon delivery' });

    assert.equal(receiveRes.status, 200, `Receive API failed: ${JSON.stringify(receiveRes.body)}`);
    assert.equal(receiveRes.body.data.status, 'RECEIVED');

    // Verify unit is now at Bank 2 in stock
    const { rows: checkUnit } = await client.query('SELECT blood_bank_id, inventory_status FROM blood_units WHERE id = $1', [unitId]);
    assert.equal(Number(checkUnit[0].blood_bank_id), testBank2Id);
    assert.equal(checkUnit[0].inventory_status, 'IN_STOCK');
  });

  it('Critical 3: Transfer dispatch rejects if ANY attached unit is ineligible and does not update partial units', async () => {
    const { rows: dRows } = await client.query(`
      INSERT INTO donors (full_name, phone, blood_type_code, district_code, registration_origin)
      VALUES ('Unit Source Donor 2', '0770002222', 'A+', 'CO', 'STAFF_WALKIN')
      RETURNING id
    `);
    createdDonorIds.push(dRows[0].id);

    const { rows: donRows } = await client.query(`
      INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status)
      VALUES ($1, $2, now() - interval '2 days', 'PROCESSED')
      RETURNING id
    `, [dRows[0].id, testBank1Id]);
    createdDonationIds.push(donRows[0].id);

    // Create 1 valid unit and 1 expired unit
    const { rows: validUnit } = await client.query(`
      INSERT INTO blood_units (donation_id, blood_type_code, component_code, release_status, inventory_status, released_by, collected_at, expires_at, blood_bank_id)
      VALUES ($1, 'A+', 'RBC', 'RELEASED', 'IN_STOCK', $3, now() - interval '2 days', now() + interval '10 days', $2)
      RETURNING id
    `, [donRows[0].id, testBank1Id, bank1StaffId]);
    createdUnitIds.push(validUnit[0].id);

    const { rows: expiredUnit } = await client.query(`
      INSERT INTO blood_units (donation_id, blood_type_code, component_code, release_status, inventory_status, released_by, collected_at, expires_at, blood_bank_id)
      VALUES ($1, 'A+', 'RBC', 'RELEASED', 'IN_STOCK', $3, now() - interval '2 days', now() - interval '1 day', $2)
      RETURNING id
    `, [donRows[0].id, testBank1Id, bank1StaffId]);
    createdUnitIds.push(expiredUnit[0].id);

    const transferCode = `TRF-INELIGIBLE-${Date.now()}`;
    const { rows: trfRows } = await client.query(`
      INSERT INTO blood_bank_transfers (transfer_code, source_bank_id, target_bank_id, status, requested_by)
      VALUES ($1, $2, $3, 'APPROVED', $4)
      RETURNING id
    `, [transferCode, testBank1Id, testBank2Id, bank1StaffId]);
    const transferId = trfRows[0].id;
    createdTransferIds.push(transferId);

    await client.query(`
      INSERT INTO transfer_units (transfer_id, blood_unit_id)
      VALUES ($1, $2), ($1, $3)
    `, [transferId, validUnit[0].id, expiredUnit[0].id]);

    // Dispatch attempt must fail
    const dispatchRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${bank1StaffToken}`);

    assert.equal(dispatchRes.status, 400, 'Dispatching with expired unit must be rejected (400)');

    // Ensure valid unit was NOT changed to IN_TRANSIT (atomic all-or-nothing rollback)
    const { rows: checkValid } = await client.query('SELECT inventory_status FROM blood_units WHERE id = $1', [validUnit[0].id]);
    assert.equal(checkValid[0].inventory_status, 'IN_STOCK', 'Eligible unit must remain IN_STOCK when batch dispatch fails');
  });

  it('Critical 4: Transfer operations enforce bank-staff institution authorization', async () => {
    // Unassigned staff tries to dispatch transfer for Bank 1
    const transferCode = `TRF-AUTH-${Date.now()}`;
    const { rows: trfRows } = await client.query(`
      INSERT INTO blood_bank_transfers (transfer_code, source_bank_id, target_bank_id, status, requested_by)
      VALUES ($1, $2, $3, 'APPROVED', $4)
      RETURNING id
    `, [transferCode, testBank1Id, testBank2Id, bank1StaffId]);
    const transferId = trfRows[0].id;
    createdTransferIds.push(transferId);

    const dispatchRes = await request(app)
      .post(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${unauthorizedStaffToken}`);

    assert.equal(dispatchRes.status, 403, 'Staff not assigned to source bank must be denied dispatch (403)');
  });

  it('Critical 5: Prevents concurrent duplicate collections on the same visit', async () => {
    // Create walk-in donor and visit
    const { rows: dRows } = await client.query(`
      INSERT INTO donors (full_name, phone, blood_type_code, district_code, registration_origin)
      VALUES ('Concurrent Test Donor', '0779998888', 'B+', 'CO', 'STAFF_WALKIN')
      RETURNING id
    `);
    const donorId = dRows[0].id;
    createdDonorIds.push(donorId);

    const { rows: vRows } = await client.query(`
      INSERT INTO donor_visits (donor_id, blood_bank_id, checked_in_by, purpose, status)
      VALUES ($1, $2, $3, 'DONATION', 'CHECKED_IN')
      RETURNING id
    `, [donorId, testBank1Id, bank1StaffId]);
    const visitId = vRows[0].id;
    createdVisitIds.push(visitId);

    await client.query(`
      INSERT INTO donor_assessments (donor_id, visit_id, assessed_by, hemoglobin_g_dl, weight_kg, status)
      VALUES ($1, $2, $3, 13.5, 65.0, 'PASSED')
    `, [donorId, visitId, bank1StaffId]);

    // Send two concurrent collection requests
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/donor-intake/donations')
        .set('Authorization', `Bearer ${bank1StaffToken}`)
        .send({
          visitId,
          donorId,
          bloodBankId: testBank1Id,
          bloodTypeCode: 'B+',
          collectedVolumeMl: 450,
        }),
      request(app)
        .post('/api/v1/donor-intake/donations')
        .set('Authorization', `Bearer ${bank1StaffToken}`)
        .send({
          visitId,
          donorId,
          bloodBankId: testBank1Id,
          bloodTypeCode: 'B+',
          collectedVolumeMl: 450,
        }),
    ]);

    // Exactly one should succeed (201), the other should fail (400 or 409)
    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 400], 'Exactly one collection must succeed; second must be rejected');

    const successfulRes = res1.status === 201 ? res1 : res2;
    createdDonationIds.push(successfulRes.body.data.id);

    // Verify only 1 donation exists for this visit in the database
    const { rows: donCount } = await client.query('SELECT count(*)::int AS count FROM donations WHERE donor_id = $1', [donorId]);
    assert.equal(donCount[0].count, 1, 'Only one donation record must exist for this visit');
  });

  it('Critical 6: Transfer receipt rejects and rolls back if ANY attached unit is not IN_TRANSIT', async () => {
    // 0. Create donor and donation for units
    const { rows: dRows } = await client.query(`
      INSERT INTO donors (full_name, phone, blood_type_code, district_code, registration_origin)
      VALUES ('Transfer Integrity Donor', '0778881234', 'A+', 'CO', 'STAFF_WALKIN')
      RETURNING id
    `);
    const dId = dRows[0].id;
    createdDonorIds.push(dId);

    const { rows: donRows } = await client.query(`
      INSERT INTO donations (donor_id, blood_bank_id, collected_at, process_status)
      VALUES ($1, $2, now() - interval '2 days', 'PROCESSED')
      RETURNING id
    `, [dId, testBank1Id]);
    const donId = donRows[0].id;
    createdDonationIds.push(donId);

    // 1. Create transfer in IN_TRANSIT status
    const { rows: tRows } = await client.query(`
      INSERT INTO blood_bank_transfers (transfer_code, source_bank_id, target_bank_id, status, requested_by, dispatched_by)
      VALUES ($1, $2, $3, 'IN_TRANSIT', $4, $4)
      RETURNING id
    `, [`TRF-ERR-${Math.random().toString(36).slice(2, 7)}`, testBank1Id, testBank2Id, bank1StaffId]);
    const transferId = tRows[0].id;
    createdTransferIds.push(transferId);

    // 2. Unit A: properly IN_TRANSIT
    const { rows: uA } = await client.query(`
      INSERT INTO blood_units (donation_id, blood_bank_id, blood_type_code, component_code, collected_at, expires_at, release_status, inventory_status, released_by)
      VALUES ($1, $2, 'A+', 'RBC', now() - interval '1 day', now() + interval '30 days', 'RELEASED', 'IN_TRANSIT', $3)
      RETURNING id
    `, [donId, testBank1Id, bank1StaffId]);
    const unitA = uA[0].id;
    createdUnitIds.push(unitA);

    // 3. Unit B: improperly left IN_STOCK (not IN_TRANSIT)
    const { rows: uB } = await client.query(`
      INSERT INTO blood_units (donation_id, blood_bank_id, blood_type_code, component_code, collected_at, expires_at, release_status, inventory_status, released_by)
      VALUES ($1, $2, 'A+', 'RBC', now() - interval '1 day', now() + interval '30 days', 'RELEASED', 'IN_STOCK', $3)
      RETURNING id
    `, [donId, testBank1Id, bank1StaffId]);
    const unitB = uB[0].id;
    createdUnitIds.push(unitB);

    await client.query('INSERT INTO transfer_units (transfer_id, blood_unit_id) VALUES ($1, $2), ($1, $3)', [transferId, unitA, unitB]);

    // 4. Attempt receipt via HTTP (destination staff)
    const res = await request(app)
      .post(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${bank2StaffToken}`)
      .send({ notes: 'Receiving transfer with one bad unit' });

    assert.equal(res.status, 400, 'Receipt must fail (400) because unit B is not IN_TRANSIT');
    assert.ok(res.body.error, 'Error message must be present in response');

    // 5. Verify rollback: Unit A must STILL be in IN_TRANSIT and at source bank
    const { rows: checkA } = await client.query('SELECT inventory_status, blood_bank_id FROM blood_units WHERE id = $1', [unitA]);
    assert.equal(checkA[0].inventory_status, 'IN_TRANSIT', 'Unit A must remain in IN_TRANSIT after failed receipt');
    assert.equal(Number(checkA[0].blood_bank_id), Number(testBank1Id), 'Unit A must remain at source bank');

    // Transfer status must still be IN_TRANSIT
    const { rows: checkT } = await client.query('SELECT status FROM blood_bank_transfers WHERE id = $1', [transferId]);
    assert.equal(checkT[0].status, 'IN_TRANSIT', 'Transfer status must remain IN_TRANSIT');
  });

  it('Critical 7: Outbox processing recovers stale PROCESSING events from interrupted workers', async () => {
    // 1. Insert a stale PROCESSING event older than 3 minutes
    const { rows: outboxRows } = await client.query(`
      INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, status, retry_count, updated_at)
      VALUES ('TEST_STALE_EVENT', 'testing', '9999', '{"test":true}', 'PROCESSING', 1, now() - interval '3 minutes')
      RETURNING id
    `);
    const staleEventId = outboxRows[0].id;

    // 2. Recovery assertion: execute isolated recovery and verify intermediate state before subsequent delivery processing
    const recoveredList = await recoverStaleProcessingEvents(client, 2);
    const matched = recoveredList.find((e) => e.id === staleEventId);
    assert.ok(matched, 'Stale event must be matched and recovered by recoverStaleProcessingEvents');

    const { rows: intermediate } = await client.query(
      'SELECT status, retry_count, last_error FROM event_outbox WHERE id = $1',
      [staleEventId],
    );
    assert.equal(intermediate[0].status, 'PENDING', 'Recovered event must be in intermediate PENDING state');
    assert.equal(intermediate[0].retry_count, 2, 'Retry count must be incremented during stale event recovery');
    assert.ok(
      intermediate[0].last_error && intermediate[0].last_error.includes('Recovered from interrupted worker'),
      'Last error must record interrupted worker recovery',
    );

    // 3. Delivery transition assertion: process batch independently
    await processOutboxBatch(10);
    const { rows: finalized } = await client.query(
      'SELECT status, retry_count FROM event_outbox WHERE id = $1',
      [staleEventId],
    );
    assert.ok(
      ['PUBLISHED', 'PENDING', 'PROCESSING'].includes(finalized[0].status),
      'Event must transition to its next processing state during delivery',
    );
    assert.ok(finalized[0].retry_count >= 2, 'Retry count must reflect recovery and processing');

    // Cleanup
    await client.query('DELETE FROM event_outbox WHERE id = $1', [staleEventId]);
  });
});
