import { pool } from '../../db.js';

export class AnalyticsRepository {
  /**
   * Genuine PostgreSQL-backed operational KPIs for Admin dashboard overview.
   * Completely replaces version1 illustrative values with live database counts.
   */
  async getOperationalMetrics(scoping = {}) {
    const { bloodBankId, hospitalId } = scoping;

    const { rows: totals } = await pool.query(`
      SELECT
        -- Registered Donors breakdown
        (SELECT count(*) FROM donors)::int AS total_donors,
        (SELECT count(*) FROM donors WHERE user_id IS NOT NULL)::int AS online_donors,
        (SELECT count(*) FROM donors WHERE user_id IS NULL)::int AS walkin_donors,

        -- Active Hospitals verified
        (SELECT count(*) FROM hospitals WHERE is_verified = TRUE)::int AS active_hospitals,

        -- Requests This Month (current calendar month)
        (
          SELECT count(*) FROM blood_requests
          WHERE created_at >= date_trunc('month', now())
          ${hospitalId ? 'AND hospital_id = ' + Number(hospitalId) : ''}
        )::int AS requests_this_month,

        -- Available Component Units (Released, In-Stock, Unexpired)
        (
          SELECT count(*) FROM blood_units
          WHERE inventory_status = 'IN_STOCK'
            AND release_status = 'RELEASED'
            AND expires_at > now()
            ${bloodBankId ? 'AND blood_bank_id = ' + Number(bloodBankId) : ''}
        )::int AS available_units,

        -- Stock Alerts (Expiring in <= 7 days while in-stock and released)
        (
          SELECT count(*) FROM blood_units
          WHERE inventory_status = 'IN_STOCK'
            AND release_status = 'RELEASED'
            AND expires_at > now()
            AND expires_at <= now() + interval '7 days'
            ${bloodBankId ? 'AND blood_bank_id = ' + Number(bloodBankId) : ''}
        )::int AS stock_alerts,

        -- Collections This Month
        (
          SELECT count(*) FROM donations
          WHERE collected_at >= date_trunc('month', now())
          ${bloodBankId ? 'AND blood_bank_id = ' + Number(bloodBankId) : ''}
        )::int AS collections_this_month,

        -- Active inter-bank transfers
        (
          SELECT count(*) FROM blood_bank_transfers
          WHERE status IN ('REQUESTED', 'DISPATCHED', 'IN_TRANSIT')
        )::int AS active_transfers,

        -- Active approved donation camps
        (
          SELECT count(*) FROM donation_camps
          WHERE status = 'APPROVED' AND ends_at > now()
        )::int AS active_camps,

        -- Pending donor account claims
        (
          SELECT count(*) FROM donor_account_claims
          WHERE status = 'PENDING'
        )::int AS pending_claims
    `);

    return totals[0] || {};
  }

  /**
   * Blood type and component distribution from operational view v_available_blood_stock
   */
  async getBloodTypeStockDistribution(bloodBankId = null) {
    let sql = `
      SELECT blood_type_code,
             component_code,
             sum(available_units)::int AS total_available,
             count(DISTINCT blood_bank_id)::int AS bank_count
      FROM v_available_blood_stock
    `;

    const params = [];
    if (bloodBankId) {
      params.push(bloodBankId);
      sql += ' WHERE blood_bank_id = $1';
    }

    sql += ' GROUP BY blood_type_code, component_code ORDER BY blood_type_code, component_code';

    const { rows } = await pool.query(sql, params);
    return rows;
  }
}

export const analyticsRepository = new AnalyticsRepository();
