import { pool, inTransaction } from '../../db.js';

export class CampsRepository {
  async listPublicCamps(districtCode = null) {
    const { rows } = await pool.query(
      `SELECT * FROM v_public_donation_camps
       WHERE ($1::text IS NULL OR district_code = $1)
       ORDER BY starts_at ASC
       LIMIT 100`,
      [districtCode || null],
    );
    return rows;
  }

  async getCampById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM v_public_donation_camps WHERE camp_id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async isStaffAtBank(userId, bloodBankId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM staff_memberships WHERE user_id = $1 AND blood_bank_id = $2 AND is_active = true',
      [userId, bloodBankId],
    );
    return rows.length > 0;
  }

  async createCamp(data, proposedBy) {
    const { rows } = await pool.query(
      `INSERT INTO donation_camps (
         title, organizer_id, blood_bank_id, location_id,
         proposed_by, starts_at, ends_at, capacity, public_contact
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, status, starts_at, ends_at`,
      [
        data.title,
        data.organizerId,
        data.bloodBankId,
        data.locationId,
        proposedBy,
        data.startsAt,
        data.endsAt,
        data.capacity ?? null,
        data.publicContact ?? null,
      ],
    );
    return rows[0];
  }

  async submitCamp(id, userId) {
    const { rows } = await pool.query(
      `UPDATE donation_camps c
       SET status = 'PENDING'
       WHERE c.id = $1 AND c.status = 'DRAFT' AND c.starts_at > now()
         AND EXISTS (
           SELECT 1 FROM staff_memberships sm
           WHERE sm.user_id = $2 AND sm.blood_bank_id = c.blood_bank_id AND sm.is_active
         )
       RETURNING c.id, c.status`,
      [id, userId],
    );
    return rows[0] || null;
  }

  async approveCamp(id, userId) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_approve_donation_camp($1, $2)', [id, userId]);
    });
  }

  async registerDonorForCamp(campId, userId) {
    const { rows } = await pool.query(
      `INSERT INTO camp_registrations (camp_id, donor_id)
       SELECT $1, d.id FROM donors d WHERE d.user_id = $2
       RETURNING id, camp_id, status, registered_at`,
      [campId, userId],
    );
    return rows[0] || null;
  }

  async getCampRegistrationCount(campId) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS count FROM camp_registrations WHERE camp_id = $1 AND status = 'REGISTERED'",
      [campId],
    );
    return rows[0]?.count || 0;
  }
}

export const campsRepository = new CampsRepository();
