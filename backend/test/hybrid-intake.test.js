import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';
import { intakeService, hashNationalId } from '../src/modules/donor-intake/intake.service.js';
import { donorsService } from '../src/modules/donors/donors.service.js';
import { adminService } from '../src/modules/admin/admin.service.js';

describe('BloodBridge Hybrid Donor Registration & Intake Integration', () => {
  let client;
  let bankStaffUserId;
  let testBankId;
  let onlineUserId;
  let onlineDonorId;
  let walkInDonorId;
  let testVisitId;

  before(async () => {
    client = await pool.connect();

    // Fetch an existing active blood bank
    const { rows: banks } = await client.query('SELECT id FROM blood_banks LIMIT 1');
    testBankId = banks[0].id;

    // Create a staff user for testing
    const { rows: staffUser } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Staff Tester', 'staff.intake.test@example.com', 'hashed_pw_test_123', 'BANK_STAFF')
      ON CONFLICT (email) DO UPDATE SET is_active = true
      RETURNING id
    `);
    bankStaffUserId = staffUser[0].id;

    await client.query(`
      INSERT INTO staff_memberships (user_id, blood_bank_id, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (user_id, blood_bank_id) DO NOTHING
    `, [bankStaffUserId, testBankId]);
  });

  after(async () => {
    if (client) {
      try {
        // Cleanup test-created records
        if (onlineDonorId || walkInDonorId) {
          const donorIds = [onlineDonorId, walkInDonorId].filter(Boolean);
          await client.query('DELETE FROM event_outbox WHERE aggregate_type IN (\'donors\', \'donations\')');
          await client.query('DELETE FROM audit_logs WHERE entity_name = \'donor_account_claims\'');
          await client.query('DELETE FROM donor_account_claims WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donations WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donor_assessments WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donor_visits WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donor_consent_history WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donor_consents WHERE donor_id = ANY($1)', [donorIds]);
          await client.query('DELETE FROM donors WHERE id = ANY($1)', [donorIds]);
        }
        await client.query('DELETE FROM staff_memberships WHERE user_id = $1', [bankStaffUserId]);
        await client.query('DELETE FROM users WHERE email IN (\'staff.intake.test@example.com\', \'online.hybrid.test@example.com\', \'online.claimant.test@example.com\')');
      } catch (err) {
        console.error('Test cleanup error:', err);
      }
      client.release();
    }
  });

  it('Path A: registers online donor with user account and initial consents', async () => {
    const email = 'online.hybrid.test@example.com';
    const { rows: userRows } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Sunil Online', $1, 'hashed_test_pw_12345', 'DONOR')
      RETURNING id
    `, [email]);
    onlineUserId = userRows[0].id;

    const { rows: donorRows } = await client.query(`
      INSERT INTO donors (user_id, full_name, email, blood_type_code, district_code, registration_origin, available_for_contact, camp_notifications_opt_in)
      VALUES ($1, 'Sunil Online', $2, 'O+', 'CO', 'ONLINE', true, true)
      RETURNING id, registration_origin
    `, [onlineUserId, email]);
    onlineDonorId = donorRows[0].id;

    assert.equal(donorRows[0].registration_origin, 'ONLINE');

    // Insert baseline consent and verify
    await client.query(`
      INSERT INTO donor_consents (donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in)
      VALUES ($1, true, true, true)
    `, [onlineDonorId]);

    const profile = await donorsService.getMyProfile(onlineUserId);
    assert.equal(profile.email, email);
    assert.equal(profile.blood_type_code, 'O+');
    assert.equal(profile.available_for_contact, true);
  });

  it('rejects duplicate online email at database constraint level', async () => {
    await assert.rejects(
      async () => {
        await client.query(`
          INSERT INTO users (full_name, email, password_hash, role)
          VALUES ('Duplicate Sunil', 'online.hybrid.test@example.com', 'hashed_test_pw_12345', 'DONOR')
        `);
      },
      (err) => err.code === '23505',
      'Should reject duplicate email with unique constraint violation',
    );
  });

  it('Path B: enrolls staff-assisted walk-in donor with NO user account or password', async () => {
    const walkInNic = '200012345678';
    const nicHash = hashNationalId(walkInNic);

    const donor = await intakeService.registerWalkIn({
      fullName: 'Kamal Walkin',
      phone: '0771234567',
      nationalId: walkInNic,
      bloodTypeCode: 'A+',
      districtCode: 'CO',
      availableForContact: true,
      campNotificationsOptIn: true,
      bloodBankId: testBankId,
    }, bankStaffUserId);

    walkInDonorId = donor.id;
    assert.ok(donor.id);
    assert.equal(donor.registration_origin, 'STAFF_WALKIN');

    // Verify in database: user_id MUST BE NULL
    const { rows } = await client.query('SELECT user_id, national_id_hash FROM donors WHERE id = $1', [donor.id]);
    assert.equal(rows[0].user_id, null, 'Walk-in donor must not have a fake user account');
    assert.equal(rows[0].national_id_hash, nicHash, 'National ID must be stored as normalized hash');
  });

  it('locates existing walk-in donor via privacy-preserving lookup', async () => {
    const results = await intakeService.lookupDonors({ nationalId: '200012345678' });
    assert.ok(results.length >= 1, 'Lookup must find the walk-in donor by nationalId');
    assert.equal(results[0].donor_id, walkInDonorId);
    assert.equal(results[0].full_name, 'Kamal Walkin');
    assert.equal(results[0].is_online_account, false);
  });

  it('prevents registering duplicate walk-in donor with same national ID hash', async () => {
    await assert.rejects(
      async () => {
        await intakeService.registerWalkIn({
          fullName: 'Kamal Duplicate Attempt',
          phone: '0779999999',
          nationalId: '200012345678', // Same NIC
          districtCode: 'CO',
          bloodBankId: testBankId,
        }, bankStaffUserId);
      },
      (err) => err.code === '23505',
      'Database unique index uq_donors_national_id_hash must reject duplicate identity registration',
    );
  });

  it('creates in-person donor visit without automatically creating a donation', async () => {
    const visit = await intakeService.checkInVisit({
      donorId: walkInDonorId,
      bloodBankId: testBankId,
      purpose: 'DONATION',
      notes: 'Routine walk-in check-in',
    }, bankStaffUserId);

    testVisitId = visit.id;
    assert.ok(visit.id);
    assert.equal(visit.status, 'CHECKED_IN');

    // Confirm no donation has been created
    const { rows: donations } = await client.query('SELECT count(*)::int AS count FROM donations WHERE donor_id = $1', [walkInDonorId]);
    assert.equal(donations[0].count, 0, 'A visit must not create a donation automatically');
  });

  it('records clinical assessment and updates visit status', async () => {
    const assessment = await intakeService.recordAssessment(testVisitId, bankStaffUserId, {
      status: 'PASSED',
      hemoglobin_g_dl: 14.5,
      weight_kg: 68.0,
      notes: 'Eligible for whole blood collection',
    });

    assert.ok(assessment.id);
    assert.equal(assessment.status, 'PASSED');

    const updatedVisit = await intakeService.getVisit(testVisitId);
    assert.equal(updatedVisit.status, 'ASSESSMENT_PENDING', 'Visit status must advance to ASSESSMENT_PENDING after passing');
  });

  it('records collection event for assessed visit and updates status to COLLECTION_COMPLETED', async () => {
    const donation = await intakeService.recordCollection({
      visitId: testVisitId,
      donorId: walkInDonorId,
      bloodBankId: testBankId,
      bloodTypeCode: 'A+',
      collectedVolumeMl: 450,
    });

    assert.ok(donation.id);
    assert.equal(donation.process_status, 'COLLECTED');

    const completedVisit = await intakeService.getVisit(testVisitId);
    assert.equal(completedVisit.status, 'COLLECTION_COMPLETED');
  });

  it('records consent changes into donor_consent_history via database trigger', async () => {
    // Update preferences for online donor
    await donorsService.updatePreferences(onlineUserId, false, false);

    const { rows: history } = await client.query(
      'SELECT * FROM donor_consent_history WHERE donor_id = $1 ORDER BY id DESC LIMIT 1',
      [onlineDonorId],
    );
    assert.ok(history.length > 0, 'Trigger trg_log_donor_consent_change must write to donor_consent_history');
    assert.equal(history[0].contact_allowed, false);
    assert.equal(history[0].camp_notification_opt_in, false);
  });

  it('excludes donor from outreach matching when contact_allowed is false', async () => {
    const { rows: candidates } = await client.query(
      'SELECT donor_id FROM fn_match_potential_donors($1, $2)',
      ['O+', 'CO'],
    );
    const matched = candidates.find(c => c.donor_id === onlineDonorId);
    assert.equal(matched, undefined, 'Donor with contact_allowed = false must be excluded from potential matching');
  });

  it('handles online account claim for walk-in donor and atomic administrative approval', async () => {
    // Create new online user who wants to claim the walk-in record
    const { rows: claimantUser } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Kamal Claimant', 'online.claimant.test@example.com', 'hashed_test_pw_123', 'DONOR')
      RETURNING id
    `);
    const claimantUserId = claimantUser[0].id;

    // Submit claim
    const claim = await donorsService.submitLinkClaim(claimantUserId, walkInDonorId, 'I previously donated as walk-in under NIC 200012345678');
    assert.ok(claim.id);
    assert.equal(claim.status, 'PENDING');

    // Admin reviews and approves the claim
    const approvedClaim = await adminService.approveClaim(claim.id, bankStaffUserId);
    assert.equal(approvedClaim.status, 'APPROVED');

    // Verify donor record is now linked to claimantUserId
    const { rows: updatedDonor } = await client.query('SELECT user_id FROM donors WHERE id = $1', [walkInDonorId]);
    assert.equal(updatedDonor[0].user_id, claimantUserId, 'Donor must now be linked to claimant user');

    // Verify existing completed donation is still intact and attached to the same donor
    const { rows: donorDonations } = await client.query('SELECT count(*)::int AS count FROM donations WHERE donor_id = $1', [walkInDonorId]);
    assert.equal(donorDonations[0].count, 1, 'Previous donation must remain intact after identity linkage');
  });

  it('rejects claim when donor is already linked to another user account', async () => {
    // Attempting to submit or approve another claim on the now-linked walk-in donor
    const { rows: anotherUser } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Second Claimant', 'second.claimant.test@example.com', 'hashed_test_pw_123', 'DONOR')
      RETURNING id
    `);
    const secondUserId = anotherUser[0].id;

    try {
      const secondClaim = await donorsService.submitLinkClaim(secondUserId, walkInDonorId, 'Trying duplicate link');
      await assert.rejects(
        async () => {
          await adminService.approveClaim(secondClaim.id, bankStaffUserId);
        },
        (err) => err.code === '23505',
        'Procedure sp_approve_donor_account_claim must reject linking if donor is already linked',
      );
    } finally {
      await client.query('DELETE FROM donor_account_claims WHERE user_id = $1', [secondUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [secondUserId]);
    }
  });

  it('atomically rejects an invalid claim via sp_reject_donor_account_claim', async () => {
    const { rows: rejectUser } = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ('Reject Claimant', 'reject.claimant.test@example.com', 'hashed_test_pw_123', 'DONOR')
      RETURNING id
    `);
    const rejectUserId = rejectUser[0].id;

    try {
      const claim = await donorsService.submitLinkClaim(rejectUserId, onlineDonorId, 'Unverified claim');
      const rejectedClaim = await adminService.rejectClaim(claim.id, bankStaffUserId, 'Identity documents did not match');
      assert.equal(rejectedClaim.status, 'REJECTED');
      assert.ok(rejectedClaim.verification_notes.includes('Identity documents did not match'));
    } finally {
      await client.query('DELETE FROM donor_account_claims WHERE user_id = $1', [rejectUserId]);
      await client.query('DELETE FROM users WHERE id = $1', [rejectUserId]);
    }
  });
});
