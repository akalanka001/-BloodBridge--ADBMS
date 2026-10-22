import { pool } from '../../db.js';

export class AnalyticsRepository {
  async getOperationalMetrics() {
    const { rows: totals } = await pool.query(`
      SELECT
        (SELECT count(*) FROM donors)::int AS total_donors,
        (SELECT count(*) FROM donations)::int AS total_donations,
        (SELECT count(*) FROM blood_units WHERE inventory_status = 'IN_STOCK' AND release_status = 'RELEASED')::int AS available_units,
        (SELECT count(*) FROM blood_bank_transfers WHERE status IN ('REQUESTED', 'DISPATCHED', 'IN_TRANSIT'))::int AS active_transfers,
        (SELECT count(*) FROM donation_camps WHERE status = 'APPROVED' AND ends_at > now())::int AS active_camps,
        (SELECT count(*) FROM donor_account_claims WHERE status = 'PENDING')::int AS pending_claims
    `);
    return totals[0] || {};
  }

  async getBloodTypeStockDistribution() {
    const { rows } = await pool.query(`
      SELECT blood_type_code,
             component_code,
             sum(available_units)::int AS total_available,
             count(DISTINCT blood_bank_id)::int AS bank_count
      FROM v_available_blood_stock
      GROUP BY blood_type_code, component_code
      ORDER BY blood_type_code, component_code
    `);
    return rows;
  }
}

export const analyticsRepository = new AnalyticsRepository();
