import { pool, inTransaction } from '../../db.js';

export class DonorsRepository {
  async findDonorByUserId(userId) {
    const { rows } = await pool.query(
      `SELECT d.id, d.blood_type_code, d.district_code, d.ds_code,
              d.available_for_contact, d.camp_notifications_opt_in,
              d.registration_origin, d.created_at,
              COALESCE(u.full_name, d.full_name) AS full_name,
              COALESCE(u.email, d.email) AS email,
              COALESCE(u.phone, d.phone) AS phone,
              (SELECT count(*) FROM donations dn WHERE dn.donor_id = d.id)::int AS donation_count
       FROM donors d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1`,
      [userId],
    );
    return rows[0] || null;
  }

  async updateDonorPreferences(userId, availableForContact, campNotificationsOptIn) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE donors
         SET available_for_contact = $1, camp_notifications_opt_in = $2
         WHERE user_id = $3
         RETURNING id, available_for_contact, camp_notifications_opt_in`,
        [availableForContact, campNotificationsOptIn, userId],
      );
      if (!rows[0]) return null;

      // Update donor_consents which fires trg_log_donor_consent_change
      await client.query(
        `INSERT INTO donor_consents (donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (donor_id) DO UPDATE
         SET contact_allowed = EXCLUDED.contact_allowed,
             camp_notification_opt_in = EXCLUDED.camp_notification_opt_in,
             emergency_appeal_opt_in = EXCLUDED.emergency_appeal_opt_in,
             updated_at = now()`,
        [rows[0].id, availableForContact, campNotificationsOptIn, availableForContact],
      );

      return rows[0];
    });
  }

  async updateDonorProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.bloodTypeCode !== undefined) {
      fields.push(`blood_type_code = $${idx++}`);
      values.push(data.bloodTypeCode);
    }
    if (data.districtCode !== undefined) {
      fields.push(`district_code = $${idx++}`);
      values.push(data.districtCode);
    }
    if (data.dsCode !== undefined) {
      fields.push(`ds_code = $${idx++}`);
      values.push(data.dsCode);
    }

    if (fields.length === 0) return this.findDonorByUserId(userId);

    values.push(userId);
    const { rows } = await pool.query(
      `UPDATE donors
       SET ${fields.join(', ')}
       WHERE user_id = $${idx}
       RETURNING id, blood_type_code, district_code, ds_code`,
      values,
    );
    return rows[0] || null;
  }

  async createLinkClaim(userId, donorId, verificationNotes) {
    const { rows } = await pool.query(
      `INSERT INTO donor_account_claims (user_id, donor_id, verification_notes, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, user_id, donor_id, status, claimed_at`,
      [userId, donorId, verificationNotes || null],
    );
    return rows[0];
  }

  async listVisitsByDonorId(donorId) {
    const { rows } = await pool.query(
      `SELECT dv.id, dv.visit_date, dv.purpose, dv.status, dv.notes,
              bb.name AS blood_bank_name,
              c.title AS camp_title,
              da.status AS assessment_status,
              da.deferral_reason,
              da.deferral_until
       FROM donor_visits dv
       LEFT JOIN blood_banks bb ON bb.id = dv.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = dv.camp_id
       LEFT JOIN donor_assessments da ON da.visit_id = dv.id
       WHERE dv.donor_id = $1
       ORDER BY dv.visit_date DESC`,
      [donorId],
    );
    return rows;
  }

  async listDonationsByDonorId(donorId) {
    const { rows } = await pool.query(
      `SELECT dn.id, dn.collected_at, dn.collected_volume_ml, dn.process_status,
              bb.name AS blood_bank_name,
              c.title AS camp_title
       FROM donations dn
       LEFT JOIN blood_banks bb ON bb.id = dn.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = dn.camp_id
       WHERE dn.donor_id = $1
       ORDER BY dn.collected_at DESC`,
      [donorId],
    );
    return rows;
  }
}

export const donorsRepository = new DonorsRepository();
