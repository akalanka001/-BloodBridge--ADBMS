// Canonical synthetic demo fixtures for all 4 BloodBridge roles.
// Run explicitly; NEVER used in production or with real donor/patient records.
import bcrypt from 'bcryptjs';
import { pool, inTransaction } from '../src/db.js';

const password = process.env.DEMO_PASSWORD || 'BloodBridge2026!';
console.log(`[seed] Seeding role fixtures with common password "${password}"...`);
const hash = await bcrypt.hash(password, 12);

async function ensure(client, table, name, args) {
  const current = await client.query(`SELECT id FROM ${table} WHERE name = $1 LIMIT 1`, [name]);
  if (current.rows[0]) return current.rows[0].id;
  const created = await client.query(args.sql, args.values);
  return created.rows[0].id;
}

try {
  const result = await inTransaction(async (client) => {
    // 1. Ensure reference location exists
    const town = await client.query(
      `SELECT id FROM locations WHERE district_code = 'CO' AND town = 'DEMO Maharagama' LIMIT 1`,
    );
    const locationId =
      town.rows[0]?.id ||
      (
        await client.query(
          `INSERT INTO locations(district_code, ds_code, town, address_line)
           VALUES('CO', 'MAH', 'DEMO Maharagama', 'Fictional demo venue — academic prototype')
           RETURNING id`,
        )
      ).rows[0].id;

    // 2. Ensure Demo Hospital and Blood Bank exist
    const hospitalId = await ensure(client, 'hospitals', 'DEMO Teaching Hospital', {
      sql: `INSERT INTO hospitals(name, location_id, is_verified) VALUES($1, $2, true) RETURNING id`,
      values: ['DEMO Teaching Hospital', locationId],
    });

    const bloodBankId = await ensure(client, 'blood_banks', 'DEMO Blood Bank', {
      sql: `INSERT INTO blood_banks(name, location_id, hospital_id, is_verified) VALUES($1, $2, $3, true) RETURNING id`,
      values: ['DEMO Blood Bank', locationId, hospitalId],
    });

    let organizerId = (
      await client.query("SELECT id FROM camp_organizers WHERE name = 'DEMO Volunteer Society' LIMIT 1")
    ).rows[0]?.id;
    if (!organizerId) {
      organizerId = (
        await client.query(
          "INSERT INTO camp_organizers(name, is_verified) VALUES('DEMO Volunteer Society', true) RETURNING id",
        )
      ).rows[0].id;
    }

    // Upsert user helper
    const upsertUser = async (email, role, fullName, phone = null) => {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await client.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [normalizedEmail]);
      let userId;
      if (existing.rows[0]) {
        userId = existing.rows[0].id;
        await client.query(
          `UPDATE users 
           SET full_name = $1, password_hash = $2, role = $3, phone = COALESCE($4, phone), 
               email_verified = true, is_active = true
           WHERE id = $5`,
          [fullName, hash, role, phone, userId],
        );
      } else {
        const created = await client.query(
          `INSERT INTO users(full_name, email, password_hash, role, phone, email_verified, is_active)
           VALUES($1, $2, $3, $4, $5, true, true)
           RETURNING id`,
          [fullName, normalizedEmail, hash, role, phone],
        );
        userId = created.rows[0].id;
      }
      return userId;
    };

    // 3. Seed Canonical 4 Roles (@bloodbridge.lk)
    const adminId = await upsertUser('admin@bloodbridge.lk', 'ADMIN', 'System Administrator', '0701122334');
    const hospitalStaffId = await upsertUser(
      'hospital@bloodbridge.lk',
      'HOSPITAL_STAFF',
      'Dr. Dilani Jayawardena',
      '0714567890',
    );
    const bankStaffId = await upsertUser(
      'bank@bloodbridge.lk',
      'BANK_STAFF',
      'Kasun Wickramasinghe',
      '0723456789',
    );
    const donorId = await upsertUser('donor@bloodbridge.lk', 'DONOR', 'Nimal Perera', '0771234567');

    // Also support/refresh legacy test aliases
    await upsertUser('demo-admin@bloodbridge.test', 'ADMIN', 'DEMO Administrator');
    await upsertUser('demo-hospital@bloodbridge.test', 'HOSPITAL_STAFF', 'DEMO Hospital Staff');
    await upsertUser('demo-bank@bloodbridge.test', 'BANK_STAFF', 'DEMO Blood Bank Staff');

    // 4. Link Staff Memberships
    await client.query(
      `INSERT INTO staff_memberships(user_id, hospital_id, is_active)
       VALUES($1, $2, true)
       ON CONFLICT(user_id, hospital_id) DO UPDATE SET is_active = true`,
      [hospitalStaffId, hospitalId],
    );

    const legacyHospital = (await client.query(`SELECT id FROM users WHERE email = 'demo-hospital@bloodbridge.test'`)).rows[0]?.id;
    if (legacyHospital) {
      await client.query(
        `INSERT INTO staff_memberships(user_id, hospital_id, is_active)
         VALUES($1, $2, true)
         ON CONFLICT(user_id, hospital_id) DO UPDATE SET is_active = true`,
        [legacyHospital, hospitalId],
      );
    }

    await client.query(
      `INSERT INTO staff_memberships(user_id, blood_bank_id, is_active)
       VALUES($1, $2, true)
       ON CONFLICT(user_id, blood_bank_id) DO UPDATE SET is_active = true`,
      [bankStaffId, bloodBankId],
    );

    const legacyBank = (await client.query(`SELECT id FROM users WHERE email = 'demo-bank@bloodbridge.test'`)).rows[0]?.id;
    if (legacyBank) {
      await client.query(
        `INSERT INTO staff_memberships(user_id, blood_bank_id, is_active)
         VALUES($1, $2, true)
         ON CONFLICT(user_id, blood_bank_id) DO UPDATE SET is_active = true`,
        [legacyBank, bloodBankId],
      );
    }

    // 5. Ensure Donor Profile for donor@bloodbridge.lk (Age 30, 68kg, O+, Colombo)
    const existingDonor = await client.query(`SELECT id FROM donors WHERE user_id = $1`, [donorId]);
    if (existingDonor.rows[0]) {
      await client.query(
        `UPDATE donors
         SET blood_type_code = 'O+', district_code = 'CO', ds_code = 'MAH',
             birth_date = '1996-05-15', weight_kg = 68.0, town = 'Maharagama',
             available_for_contact = true, camp_notifications_opt_in = true
         WHERE id = $1`,
        [existingDonor.rows[0].id],
      );
    } else {
      await client.query(
        `INSERT INTO donors(user_id, blood_type_code, district_code, ds_code, birth_date, weight_kg, town, available_for_contact, camp_notifications_opt_in)
         VALUES($1, 'O+', 'CO', 'MAH', '1996-05-15', 68.0, 'Maharagama', true, true)`,
        [donorId],
      );
    }

    // 6. Ensure at least one approved upcoming donation camp
    let camp = await client.query("SELECT id FROM donation_camps WHERE title = 'DEMO Community Donation Camp' LIMIT 1");
    let campId = camp.rows[0]?.id;
    if (!campId) {
      const created = await client.query(
        `INSERT INTO donation_camps(title, organizer_id, blood_bank_id, location_id, proposed_by, starts_at, ends_at, capacity, status)
         VALUES('DEMO Community Donation Camp', $1, $2, $3, $4, now() + interval '21 days', now() + interval '21 days 5 hours', 80, 'PENDING')
         RETURNING id`,
        [organizerId, bloodBankId, locationId, bankStaffId],
      );
      campId = created.rows[0].id;
      await client.query('CALL sp_approve_donation_camp($1, $2)', [campId, bankStaffId]);
    }

    return {
      adminId,
      hospitalStaffId,
      bankStaffId,
      donorId,
      hospitalId,
      bloodBankId,
      campId,
    };
  });

  console.log(
    JSON.stringify(
      {
        message: 'All 4 role demonstration accounts successfully seeded and verified!',
        password,
        roles: [
          { role: 'ADMIN', email: 'admin@bloodbridge.lk', name: 'System Administrator' },
          { role: 'DONOR', email: 'donor@bloodbridge.lk', name: 'Nimal Perera', bloodType: 'O+', district: 'Colombo' },
          { role: 'HOSPITAL_STAFF', email: 'hospital@bloodbridge.lk', name: 'Dr. Dilani Jayawardena', hospital: 'DEMO Teaching Hospital' },
          { role: 'BANK_STAFF', email: 'bank@bloodbridge.lk', name: 'Kasun Wickramasinghe', bloodBank: 'DEMO Blood Bank' },
        ],
        dbIds: result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('[seed] Error seeding roles:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
