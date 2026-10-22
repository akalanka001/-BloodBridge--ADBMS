import { pool, inTransaction } from '../../db.js';

export class AdminRepository {
  async listClaims(status = 'PENDING') {
    const { rows } = await pool.query(
      `SELECT dac.id, dac.user_id, dac.donor_id, dac.status,
              dac.verification_notes, dac.claimed_at, dac.reviewed_at,
              u.full_name AS claimant_name, u.email AS claimant_email,
              d.full_name AS donor_name, d.phone AS donor_phone, d.blood_type_code,
              d.registration_origin
       FROM donor_account_claims dac
       JOIN users u ON u.id = dac.user_id
       JOIN donors d ON d.id = dac.donor_id
       WHERE ($1::text IS NULL OR dac.status = $1)
       ORDER BY dac.claimed_at ASC`,
      [status || null],
    );
    return rows;
  }

  async approveClaim(claimId, reviewerId) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_approve_donor_account_claim($1, $2)', [claimId, reviewerId]);
      const { rows } = await client.query(
        'SELECT * FROM donor_account_claims WHERE id = $1',
        [claimId],
      );
      return rows[0];
    });
  }

  async rejectClaim(claimId, reviewerId, reason) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_reject_donor_account_claim($1, $2, $3)', [claimId, reviewerId, reason]);
      const { rows } = await client.query(
        'SELECT * FROM donor_account_claims WHERE id = $1',
        [claimId],
      );
      return rows[0];
    });
  }
}

export const adminRepository = new AdminRepository();
