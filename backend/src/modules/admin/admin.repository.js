import { pool, inTransaction } from '../../db.js';

export class AdminRepository {
  async getDashboardMetrics() {
    // 10 Database-backed KPI metrics
    const { rows: kpiRows } = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM donors) AS registered_donors,
        (SELECT count(*)::int FROM donors WHERE user_id IS NOT NULL) AS online_donors,
        (SELECT count(*)::int FROM donors WHERE user_id IS NULL) AS walkin_donors,
        (SELECT count(*)::int FROM hospitals WHERE is_verified = true) AS verified_hospitals,
        (SELECT count(*)::int FROM blood_banks WHERE is_verified = true) AS active_blood_banks,
        (SELECT count(*)::int FROM blood_requests WHERE status = 'OPEN') AS pending_requests,
        (SELECT count(*)::int FROM blood_units WHERE release_status = 'RELEASED' AND inventory_status = 'IN_STOCK' AND expires_at > now() AND expires_at <= now() + interval '7 days') AS stock_alerts,
        (SELECT count(*)::int FROM donor_account_claims WHERE status = 'PENDING') AS pending_claims,
        (SELECT count(*)::int FROM donation_camps WHERE status = 'PENDING') AS pending_camps,
        (SELECT count(*)::int FROM notification_deliveries WHERE status = 'FAILED') AS failed_notifications
    `);

    // Recent Audit Logs
    const { rows: recentAudit } = await pool.query(`
      SELECT al.id, al.entity_name, al.entity_id, al.action, al.occurred_at,
             u.full_name AS actor_name, u.role AS actor_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      ORDER BY al.occurred_at DESC
      LIMIT 8
    `);

    // Recent Camps
    const { rows: recentCamps } = await pool.query(`
      SELECT c.id, c.title, c.status, c.starts_at, c.ends_at, bb.name AS blood_bank_name
      FROM donation_camps c
      JOIN blood_banks bb ON bb.id = c.blood_bank_id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    // Pending Claims
    const { rows: pendingClaims } = await pool.query(`
      SELECT dac.id, dac.claimed_at, u.full_name AS claimant_name, d.full_name AS donor_name
      FROM donor_account_claims dac
      JOIN users u ON u.id = dac.user_id
      JOIN donors d ON d.id = dac.donor_id
      WHERE dac.status = 'PENDING'
      ORDER BY dac.claimed_at ASC
      LIMIT 5
    `);

    // Notification Warnings
    const { rows: notificationWarnings } = await pool.query(`
      SELECT nd.id, nd.channel, nd.status, nd.attempts, nd.error_message, nd.created_at
      FROM notification_deliveries nd
      WHERE nd.status = 'FAILED' OR nd.attempts > 1
      ORDER BY nd.created_at DESC
      LIMIT 5
    `);

    return {
      kpis: kpiRows[0] || {},
      recentAudit,
      recentCamps,
      pendingClaims,
      notificationWarnings,
      timestamp: new Date().toISOString(),
    };
  }

  async listClaims(status = 'PENDING', filters = {}) {
    let pagination;
    if (filters.limit) {
      const { rows } = await pool.query('SELECT count(*)::int AS total FROM donor_account_claims WHERE ($1::text IS NULL OR status = $1)', [status || null]);
      pagination = { total: rows[0]?.total || 0, pageSize: filters.limit,
        page: Math.floor((filters.offset || 0) / filters.limit) + 1 };
    }
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
       ORDER BY dac.claimed_at ASC, dac.id ASC${filters.limit ? ' LIMIT $2 OFFSET $3' : ''}`,
      filters.limit ? [status || null, filters.limit, filters.offset || 0] : [status || null],
    );
    return pagination ? { rows, pagination } : rows;
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
