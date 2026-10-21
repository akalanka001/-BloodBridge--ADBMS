import { pool, inTransaction } from '../../db.js';

export class IdentityRepository {
  async findActiveUserByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, password_hash, role
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()],
    );
    return rows[0] || null;
  }

  async createUserWithDonor(data, passwordHash) {
    return inTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'DONOR')
         RETURNING id, full_name, email, role`,
        [data.fullName, data.email, passwordHash],
      );
      const user = userResult.rows[0];

      const donorResult = await client.query(
        `INSERT INTO donors (
           user_id, full_name, email, blood_type_code,
           district_code, ds_code, available_for_contact,
           camp_notifications_opt_in, registration_origin
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ONLINE')
         RETURNING id`,
        [
          user.id,
          data.fullName,
          data.email,
          data.bloodTypeCode ?? null,
          data.districtCode,
          data.dsCode || null,
          data.availableForContact,
          data.campNotificationsOptIn,
        ],
      );
      const donor = donorResult.rows[0];

      // Record baseline consent in donor_consents
      await client.query(
        `INSERT INTO donor_consents (
           donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (donor_id) DO UPDATE
         SET contact_allowed = EXCLUDED.contact_allowed,
             camp_notification_opt_in = EXCLUDED.camp_notification_opt_in,
             emergency_appeal_opt_in = EXCLUDED.emergency_appeal_opt_in,
             updated_at = now()`,
        [
          donor.id,
          data.availableForContact,
          data.campNotificationsOptIn,
          data.availableForContact,
        ],
      );

      return user;
    });
  }
}

export const identityRepository = new IdentityRepository();
