import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db.js';

describe('PostgreSQL Advanced Concepts & Business Logic Integration', () => {
  let client;

  before(async () => {
    client = await pool.connect();
  });

  after(async () => {
    if (client) client.release();
    await pool.end();
  });

  it('verifies catalog installation of advanced database objects (views, functions, procedures, triggers)', async () => {
    const { rows: views } = await client.query(
      "SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname IN ('v_available_blood_stock', 'v_public_donation_camps')"
    );
    assert.equal(views.length, 2, 'Required operational views must exist');

    const { rows: procs } = await client.query(
      "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname = 'sp_approve_donation_camp'"
    );
    assert.equal(procs.length, 1, 'sp_approve_donation_camp procedure must exist');

    const { rows: funcs } = await client.query(
      "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proname = 'fn_reserve_blood_unit'"
    );
    assert.equal(funcs.length, 1, 'fn_reserve_blood_unit function must exist');

    const { rows: triggers } = await client.query(
      "SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_check_camp_registration', 'trg_log_blood_unit_status') AND NOT tgisinternal"
    );
    assert.equal(triggers.length, 2, 'Registration and inventory triggers must be installed');
  });

  it('enforces foreign key and geographical constraints', async () => {
    // 1. Mismatched DS division and district code
    await assert.rejects(
      async () => {
        await client.query(
          "INSERT INTO locations(district_code, ds_code, town) VALUES ('CO', 'NON_EXISTENT_DS', 'Test Town')"
        );
      },
      (err) => err.code === '23503',
      'Location must reject invalid ds_code for district'
    );

    // 2. Coordinate pair check: latitude without longitude
    await assert.rejects(
      async () => {
        await client.query(
          "INSERT INTO locations(district_code, town, latitude, longitude) VALUES ('CO', 'Test Town', 6.9271, NULL)"
        );
      },
      (err) => err.code === '23514',
      'Coordinate pair check constraint must require both lat and lon or neither'
    );
  });

  it('executes donation camp approval via sp_approve_donation_camp and verifies audit log', async () => {
    await client.query('BEGIN');
    try {
      // 1. Setup synthetic location, organizer, bank, and staff user
      const loc = (await client.query(
        "INSERT INTO locations(district_code, town) VALUES ('CO', 'Test Camp Town') RETURNING id"
      )).rows[0];
      const org = (await client.query(
        "INSERT INTO camp_organizers(name, is_verified) VALUES ('Test Organizer', true) RETURNING id"
      )).rows[0];
      const bank = (await client.query(
        "INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Test Coordinating Bank', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];
      const staffUser = (await client.query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES ('Bank Staff User', 'staff-audit@bloodbridge.test', 'hash', 'BANK_STAFF') RETURNING id"
      )).rows[0];
      await client.query(
        'INSERT INTO staff_memberships(user_id, blood_bank_id, is_active) VALUES ($1, $2, true)',
        [staffUser.id, bank.id]
      );

      // 2. Create pending camp
      const camp = (await client.query(
        `INSERT INTO donation_camps(title, organizer_id, blood_bank_id, location_id, proposed_by, starts_at, ends_at, capacity, status)
         VALUES ('Annual Test Camp', $1, $2, $3, $4, now() + interval '2 days', now() + interval '2 days 6 hours', 50, 'PENDING')
         RETURNING id, status`,
        [org.id, bank.id, loc.id, staffUser.id]
      )).rows[0];

      assert.equal(camp.status, 'PENDING');

      // 3. Call stored procedure
      await client.query('CALL sp_approve_donation_camp($1, $2)', [camp.id, staffUser.id]);

      // 4. Verify camp status updated
      const approvedCamp = (await client.query(
        'SELECT status, approved_by FROM donation_camps WHERE id = $1',
        [camp.id]
      )).rows[0];
      assert.equal(approvedCamp.status, 'APPROVED');
      assert.equal(approvedCamp.approved_by, staffUser.id);

      // 5. Verify audit log entry
      const audit = (await client.query(
        "SELECT action, entity_name, entity_id FROM audit_logs WHERE actor_id = $1 AND entity_id = $2::text",
        [staffUser.id, camp.id]
      )).rows[0];
      assert.ok(audit, 'Audit log row must be recorded');
      assert.equal(audit.action, 'APPROVE');
      assert.equal(audit.entity_name, 'donation_camps');
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('rejects unauthorized camp approval from non-assigned staff (SQLSTATE 42501)', async () => {
    await client.query('BEGIN');
    try {
      const loc = (await client.query(
        "INSERT INTO locations(district_code, town) VALUES ('CO', 'Test Camp Town') RETURNING id"
      )).rows[0];
      const org = (await client.query(
        "INSERT INTO camp_organizers(name, is_verified) VALUES ('Test Organizer', true) RETURNING id"
      )).rows[0];
      const bankA = (await client.query(
        "INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Bank A', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];
      const bankB = (await client.query(
        "INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Bank B', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];

      // Staff belongs to Bank B, not Bank A
      const otherStaff = (await client.query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES ('Other Staff', 'other-bank@bloodbridge.test', 'hash', 'BANK_STAFF') RETURNING id"
      )).rows[0];
      await client.query(
        'INSERT INTO staff_memberships(user_id, blood_bank_id, is_active) VALUES ($1, $2, true)',
        [otherStaff.id, bankB.id]
      );

      const campA = (await client.query(
        `INSERT INTO donation_camps(title, organizer_id, blood_bank_id, location_id, starts_at, ends_at, capacity, status)
         VALUES ('Camp Under Bank A', $1, $2, $3, now() + interval '2 days', now() + interval '2 days 6 hours', 50, 'PENDING')
         RETURNING id`,
        [org.id, bankA.id, loc.id]
      )).rows[0];

      await assert.rejects(
        async () => {
          await client.query('CALL sp_approve_donation_camp($1, $2)', [campA.id, otherStaff.id]);
        },
        (err) => err.code === '42501',
        'sp_approve_donation_camp must reject staff from another bank with 42501'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('enforces camp registration capacity via trigger trg_check_camp_registration', async () => {
    await client.query('BEGIN');
    try {
      const loc = (await client.query(
        "INSERT INTO locations(district_code, town) VALUES ('CO', 'Camp Town') RETURNING id"
      )).rows[0];
      const org = (await client.query(
        "INSERT INTO camp_organizers(name, is_verified) VALUES ('Test Organizer', true) RETURNING id"
      )).rows[0];
      const bank = (await client.query(
        "INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Camp Bank', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];
      const staff = (await client.query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES ('Staff', 'staff-cap@test', 'h', 'BANK_STAFF') RETURNING id"
      )).rows[0];

      // Create APPROVED camp with capacity = 1
      const camp = (await client.query(
        `INSERT INTO donation_camps(title, organizer_id, blood_bank_id, location_id, starts_at, ends_at, capacity, status, approved_by)
         VALUES ('Limited Capacity Camp', $1, $2, $3, now() + interval '3 days', now() + interval '3 days 4 hours', 1, 'APPROVED', $4)
         RETURNING id`,
        [org.id, bank.id, loc.id, staff.id]
      )).rows[0];

      // Create two synthetic donors
      const u1 = (await client.query("INSERT INTO users(full_name, email, password_hash, role) VALUES ('D1', 'd1@test', 'h', 'DONOR') RETURNING id")).rows[0];
      const donor1 = (await client.query("INSERT INTO donors(user_id, district_code) VALUES ($1, 'CO') RETURNING id", [u1.id])).rows[0];

      const u2 = (await client.query("INSERT INTO users(full_name, email, password_hash, role) VALUES ('D2', 'd2@test', 'h', 'DONOR') RETURNING id")).rows[0];
      const donor2 = (await client.query("INSERT INTO donors(user_id, district_code) VALUES ($1, 'CO') RETURNING id", [u2.id])).rows[0];

      // First registration succeeds
      const reg1 = await client.query(
        'INSERT INTO camp_registrations(camp_id, donor_id) VALUES ($1, $2) RETURNING id, status',
        [camp.id, donor1.id]
      );
      assert.equal(reg1.rows[0].status, 'REGISTERED');

      // Second registration exceeds capacity (1) and must be blocked by trigger
      await assert.rejects(
        async () => {
          await client.query(
            'INSERT INTO camp_registrations(camp_id, donor_id) VALUES ($1, $2)',
            [camp.id, donor2.id]
          );
        },
        (err) => err.code === '23514',
        'Trigger trg_check_camp_registration must reject registrations exceeding capacity with 23514'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('performs atomic blood-unit reservation, inventory trigger audit, and double-allocation prevention', async () => {
    await client.query('BEGIN');
    try {
      const loc = (await client.query(
        "INSERT INTO locations(district_code, town) VALUES ('CO', 'Bank Town') RETURNING id"
      )).rows[0];
      const bank = (await client.query(
        "INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Inventory Bank', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];
      const hospital = (await client.query(
        "INSERT INTO hospitals(name, location_id, is_verified) VALUES ('Test Hospital', $1, true) RETURNING id",
        [loc.id]
      )).rows[0];

      const bankStaff = (await client.query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES ('Bank Staff', 'bank-inv@test', 'h', 'BANK_STAFF') RETURNING id"
      )).rows[0];
      await client.query(
        'INSERT INTO staff_memberships(user_id, blood_bank_id, is_active) VALUES ($1, $2, true)',
        [bankStaff.id, bank.id]
      );

      const doctor = (await client.query(
        "INSERT INTO users(full_name, email, password_hash, role) VALUES ('Doctor', 'doc-inv@test', 'h', 'HOSPITAL_STAFF') RETURNING id"
      )).rows[0];

      // Create blood request and request item for 1 unit of O- RBC
      const req = (await client.query(
        `INSERT INTO blood_requests(hospital_id, created_by, urgency, needed_by, status)
         VALUES ($1, $2, 'URGENT', now() + interval '1 day', 'OPEN') RETURNING id`,
        [hospital.id, doctor.id]
      )).rows[0];

      const item = (await client.query(
        `INSERT INTO request_items(request_id, blood_type_code, component_code, units_requested)
         VALUES ($1, 'O-', 'RBC', 1) RETURNING id`,
        [req.id]
      )).rows[0];

      // Create donor, donation, and released blood unit
      const donorUser = (await client.query("INSERT INTO users(full_name, email, password_hash, role) VALUES ('Donor', 'donor-inv@test', 'h', 'DONOR') RETURNING id")).rows[0];
      const donor = (await client.query("INSERT INTO donors(user_id, district_code, blood_type_code) VALUES ($1, 'CO', 'O-') RETURNING id", [donorUser.id])).rows[0];

      const donation = (await client.query(
        `INSERT INTO donations(donor_id, blood_bank_id, collected_at, process_status)
         VALUES ($1, $2, now() - interval '2 days', 'PROCESSED') RETURNING id`,
        [donor.id, bank.id]
      )).rows[0];

      const unit = (await client.query(
        `INSERT INTO blood_units(donation_id, blood_bank_id, blood_type_code, component_code, collected_at, expires_at, release_status, inventory_status, released_by)
         VALUES ($1, $2, 'O-', 'RBC', now() - interval '2 days', now() + interval '30 days', 'RELEASED', 'IN_STOCK', $3)
         RETURNING id, inventory_status`,
        [donation.id, bank.id, bankStaff.id]
      )).rows[0];

      assert.equal(unit.inventory_status, 'IN_STOCK');

      // Execute fn_reserve_blood_unit
      const reserveResult = await client.query(
        'SELECT fn_reserve_blood_unit($1, $2, $3) AS reservation_id',
        [item.id, unit.id, bankStaff.id]
      );
      const resId = reserveResult.rows[0].reservation_id;
      assert.ok(resId, 'Reservation UUID must be returned');

      // Verify blood unit inventory_status updated to RESERVED
      const updatedUnit = (await client.query(
        'SELECT inventory_status FROM blood_units WHERE id = $1',
        [unit.id]
      )).rows[0];
      assert.equal(updatedUnit.inventory_status, 'RESERVED');

      // Verify trigger trg_log_blood_unit_status inserted movement audit row
      const movement = (await client.query(
        'SELECT from_status, to_status, action, acted_by FROM inventory_movements WHERE blood_unit_id = $1 ORDER BY id DESC LIMIT 1',
        [unit.id]
      )).rows[0];
      assert.ok(movement, 'Inventory movement audit record must be generated by trigger');
      assert.equal(movement.from_status, 'IN_STOCK');
      assert.equal(movement.to_status, 'RESERVED');
      assert.equal(movement.action, 'STATUS_CHANGE');
      assert.equal(movement.acted_by, bankStaff.id);

      // Verify double-reservation fails because unit is no longer IN_STOCK and request item is fully allocated
      await assert.rejects(
        async () => {
          await client.query(
            'SELECT fn_reserve_blood_unit($1, $2, $3)',
            [item.id, unit.id, bankStaff.id]
          );
        },
        (err) => err.code === '23514',
        'Double reservation of same unit or fully allocated item must fail with 23514'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('guarantees transaction rollback leaves inventory unchanged upon error', async () => {
    // 1. Setup fixture outside transaction
    const loc = (await client.query("INSERT INTO locations(district_code, town) VALUES ('CO', 'Rollback Town') RETURNING id")).rows[0];
    const bank = (await client.query("INSERT INTO blood_banks(name, location_id, is_verified) VALUES ('Rollback Bank', $1, true) RETURNING id", [loc.id])).rows[0];
    const staff = (await client.query("INSERT INTO users(full_name, email, password_hash, role) VALUES ('Staff Rollback', 'staff-rb@test', 'h', 'BANK_STAFF') RETURNING id")).rows[0];
    await client.query('INSERT INTO staff_memberships(user_id, blood_bank_id, is_active) VALUES ($1, $2, true)', [staff.id, bank.id]);
    const donorUser = (await client.query("INSERT INTO users(full_name, email, password_hash, role) VALUES ('Donor RB', 'donor-rb@test', 'h', 'DONOR') RETURNING id")).rows[0];
    const donor = (await client.query("INSERT INTO donors(user_id, district_code, blood_type_code) VALUES ($1, 'CO', 'A+') RETURNING id", [donorUser.id])).rows[0];
    const donation = (await client.query("INSERT INTO donations(donor_id, blood_bank_id, collected_at, process_status) VALUES ($1, $2, now() - interval '1 day', 'PROCESSED') RETURNING id", [donor.id, bank.id])).rows[0];
    const unit = (await client.query(
      `INSERT INTO blood_units(donation_id, blood_bank_id, blood_type_code, component_code, collected_at, expires_at, release_status, inventory_status, released_by)
       VALUES ($1, $2, 'A+', 'RBC', now() - interval '1 day', now() + interval '30 days', 'RELEASED', 'IN_STOCK', $3) RETURNING id`,
      [donation.id, bank.id, staff.id]
    )).rows[0];

    // 2. Perform transaction that modifies status and then rolls back
    try {
      await client.query('BEGIN');
      await client.query("UPDATE blood_units SET inventory_status = 'RESERVED' WHERE id = $1", [unit.id]);
      // Force an intentional rollback
      throw new Error('Simulated application failure');
    } catch {
      await client.query('ROLLBACK');
    }

    // 3. Assert status is still IN_STOCK and no movement or reservation persisted
    const checkUnit = (await client.query('SELECT inventory_status FROM blood_units WHERE id = $1', [unit.id])).rows[0];
    assert.equal(checkUnit.inventory_status, 'IN_STOCK', 'Blood unit status must roll back to IN_STOCK');

    const movements = (await client.query('SELECT count(*) FROM inventory_movements WHERE blood_unit_id = $1', [unit.id])).rows[0];
    assert.equal(Number(movements.count), 0, 'No movement rows must persist after rollback');

    // Clean up test records
    await client.query('DELETE FROM blood_units WHERE id = $1', [unit.id]);
    await client.query('DELETE FROM donations WHERE id = $1', [donation.id]);
    await client.query('DELETE FROM donors WHERE id = $1', [donor.id]);
    await client.query('DELETE FROM staff_memberships WHERE user_id = $1', [staff.id]);
    await client.query('DELETE FROM users WHERE id IN ($1, $2)', [staff.id, donorUser.id]);
    await client.query('DELETE FROM blood_banks WHERE id = $1', [bank.id]);
    await client.query('DELETE FROM locations WHERE id = $1', [loc.id]);
  });
});
