import { queryWarehouse } from '../../warehouseDb.js';

export class WarehouseService {
  /**
   * Demand distribution across all 8 standard ABO/Rh blood groups.
   * Guarantees all 8 blood groups are returned even with zero requests.
   */
  async getDemandByBloodGroup(filters = {}) {
    await queryWarehouse('SELECT 1');

    const standardGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

    let sql = `
      SELECT bt.blood_type_code,
             coalesce(sum(fri.requested_units), 0)::bigint AS requested_units,
             coalesce(sum(fri.fulfilled_units), 0)::bigint AS fulfilled_units
      FROM dim_blood_type bt
      LEFT JOIN fact_request_items fri ON fri.type_key = bt.type_key
    `;

    const whereClauses = [];
    const params = [];

    if (filters.district) {
      params.push(filters.district);
      whereClauses.push(`fri.district_key IN (SELECT district_key FROM dim_district WHERE district_code = $${params.length})`);
    }

    if (filters.component) {
      params.push(filters.component);
      whereClauses.push(`fri.component_key IN (SELECT component_key FROM dim_component WHERE component_code = $${params.length})`);
    }

    if (filters.hospitalId) {
      params.push(filters.hospitalId);
      whereClauses.push(`fri.institution_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'HOSPITAL')`);
    }

    if (filters.urgency) {
      params.push(filters.urgency);
      whereClauses.push(`fri.urgency = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' AND ' + whereClauses.join(' AND ');
    }

    sql += ' GROUP BY bt.blood_type_code ORDER BY bt.blood_type_code';

    const { rows } = await queryWarehouse(sql, params);

    const map = new Map(rows.map((r) => [r.blood_type_code, r]));
    const totalRequestedAll = rows.reduce((sum, r) => sum + Number(r.requested_units), 0);

    return standardGroups.map((group) => {
      const data = map.get(group);
      const requested = data ? Number(data.requested_units) : 0;
      const fulfilled = data ? Number(data.fulfilled_units) : 0;
      const pct = totalRequestedAll > 0 ? Math.round((requested / totalRequestedAll) * 100) : 0;
      return {
        blood_type: group,
        requested_units: requested,
        fulfilled_units: fulfilled,
        percentage_of_total: pct,
        fill_rate_pct: requested > 0 ? Math.round((fulfilled / requested) * 100) : 0,
      };
    });
  }

  /**
   * Request trends aggregated by month over the past 6 or 12 months.
   */
  async getRequestTrends(filters = {}) {
    await queryWarehouse('SELECT 1');

    const monthsCount = filters.period === '12' ? 12 : 6;
    const params = [];
    const whereClauses = [];

    // Filter by district, hospital, blood group, component, urgency
    if (filters.district) {
      params.push(filters.district);
      whereClauses.push(`fri.district_key IN (SELECT district_key FROM dim_district WHERE district_code = $${params.length})`);
    }

    if (filters.hospitalId) {
      params.push(filters.hospitalId);
      whereClauses.push(`fri.institution_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'HOSPITAL')`);
    }

    if (filters.bloodGroup) {
      params.push(filters.bloodGroup);
      whereClauses.push(`fri.type_key IN (SELECT type_key FROM dim_blood_type WHERE blood_type_code = $${params.length})`);
    }

    if (filters.component) {
      params.push(filters.component);
      whereClauses.push(`fri.component_key IN (SELECT component_key FROM dim_component WHERE component_code = $${params.length})`);
    }

    if (filters.urgency) {
      params.push(filters.urgency);
      whereClauses.push(`fri.urgency = $${params.length}`);
    }

    const filterSql = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : '';

    const sql = `
      WITH recent_months AS (
        SELECT extract(year FROM m)::smallint AS year,
               extract(month FROM m)::smallint AS month,
               to_char(m, 'Mon') AS month_name,
               to_char(m, 'YYYY-MM') AS month_key
        FROM generate_series(
          date_trunc('month', now()) - (interval '1 month' * ${monthsCount - 1}),
          date_trunc('month', now()),
          '1 month'::interval
        ) m
      )
      SELECT rm.year,
             rm.month,
             rm.month_name,
             rm.month_key,
             coalesce(sum(fri.requested_units), 0)::bigint AS requested_units,
             coalesce(sum(fri.fulfilled_units), 0)::bigint AS fulfilled_units,
             count(fri.id)::bigint AS item_count
      FROM recent_months rm
      JOIN dim_date d ON d.year = rm.year AND d.month = rm.month
      LEFT JOIN fact_request_items fri ON fri.date_key = d.date_key ${filterSql}
      GROUP BY rm.year, rm.month, rm.month_name, rm.month_key
      ORDER BY rm.year, rm.month
    `;

    const { rows } = await queryWarehouse(sql, params);
    return rows;
  }

  /**
   * Monthly donation trends with cumulative curves and MoM growth.
   */
  async getDonationTrends(filters = {}) {
    await queryWarehouse('SELECT 1');

    const monthsCount = filters.period === '12' ? 12 : 6;
    const params = [];
    const whereClauses = [];

    if (filters.district) {
      params.push(filters.district);
      whereClauses.push(`fd.district_key IN (SELECT district_key FROM dim_district WHERE district_code = $${params.length})`);
    }

    if (filters.bloodBankId) {
      params.push(filters.bloodBankId);
      whereClauses.push(`fd.institution_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'BLOOD_BANK')`);
    }

    const filterSql = whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : '';

    const sql = `
      WITH recent_months AS (
        SELECT extract(year FROM m)::smallint AS year,
               extract(month FROM m)::smallint AS month,
               to_char(m, 'Mon') AS month_name,
               to_char(m, 'YYYY-MM') AS month_key
        FROM generate_series(
          date_trunc('month', now()) - (interval '1 month' * ${monthsCount - 1}),
          date_trunc('month', now()),
          '1 month'::interval
        ) m
      ),
      monthly_counts AS (
        SELECT rm.year,
               rm.month,
               rm.month_name,
               rm.month_key,
               coalesce(sum(fd.donation_count), 0)::bigint AS donations_count
        FROM recent_months rm
        JOIN dim_date d ON d.year = rm.year AND d.month = rm.month
        LEFT JOIN fact_donations fd ON fd.date_key = d.date_key ${filterSql}
        GROUP BY rm.year, rm.month, rm.month_name, rm.month_key
      )
      SELECT year,
             month,
             month_name,
             month_key,
             donations_count,
             lag(donations_count) OVER (ORDER BY year, month) AS prev_month_count,
             round(
               CASE 
                 WHEN lag(donations_count) OVER (ORDER BY year, month) IS NULL OR lag(donations_count) OVER (ORDER BY year, month) = 0 
                 THEN 0
                 ELSE ((donations_count - lag(donations_count) OVER (ORDER BY year, month))::numeric / 
                       lag(donations_count) OVER (ORDER BY year, month) * 100)
               END, 1
             ) AS mom_growth_pct,
             sum(donations_count) OVER (ORDER BY year, month) AS cumulative_donations
      FROM monthly_counts
      ORDER BY year, month
    `;

    const { rows } = await queryWarehouse(sql, params);
    return rows;
  }

  /**
   * Component inventory stock snapshot trends and expiry risk analysis.
   */
  async getStockTrends(filters = {}) {
    await queryWarehouse('SELECT 1');

    const params = [];
    const whereClauses = [];

    if (filters.bloodBankId) {
      params.push(filters.bloodBankId);
      whereClauses.push(`fis.institution_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'BLOOD_BANK')`);
    }

    if (filters.component) {
      params.push(filters.component);
      whereClauses.push(`ct.component_code = $${params.length}`);
    }

    if (filters.bloodGroup) {
      params.push(filters.bloodGroup);
      whereClauses.push(`bt.blood_type_code = $${params.length}`);
    }

    const filterSql = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    const sql = `
      SELECT d.full_date AS snapshot_date,
             inst.institution_name AS blood_bank_name,
             bt.blood_type_code,
             ct.component_code,
             sum(fis.available_units)::int AS available_units,
             sum(fis.quarantined_units)::int AS quarantined_units,
             sum(fis.reserved_units)::int AS reserved_units,
             sum(fis.expiring_7d_units)::int AS expiring_7d_units,
             sum(fis.expired_units)::int AS expired_units,
             sum(fis.total_units)::int AS total_units
      FROM fact_inventory_snapshot fis
      JOIN dim_date d ON d.date_key = fis.date_key
      JOIN dim_institution inst ON inst.institution_key = fis.institution_key
      JOIN dim_blood_type bt ON bt.type_key = fis.type_key
      JOIN dim_component ct ON ct.component_key = fis.component_key
      ${filterSql}
      GROUP BY d.full_date, inst.institution_name, bt.blood_type_code, ct.component_code
      ORDER BY d.full_date DESC, inst.institution_name, bt.blood_type_code
      LIMIT 100
    `;

    const { rows } = await queryWarehouse(sql, params);
    return rows;
  }

  /**
   * Camp performance: registrations vs attendance turnout by district/month.
   */
  async getCampPerformance(filters = {}) {
    await queryWarehouse('SELECT 1');

    const params = [];
    const whereClauses = [];

    if (filters.district) {
      params.push(filters.district);
      whereClauses.push(`di.district_code = $${params.length}`);
    }

    const filterSql = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    const sql = `
      SELECT di.district_code,
             di.district_name,
             coalesce(sum(fcr.registered_count), 0)::bigint AS registered_count,
             coalesce(sum(fcr.attended_count), 0)::bigint AS attended_count,
             round(
               coalesce(sum(fcr.attended_count), 0)::numeric / nullif(sum(fcr.registered_count), 0) * 100, 1
             ) AS attendance_turnout_pct
      FROM dim_district di
      LEFT JOIN fact_camp_registrations fcr ON fcr.district_key = di.district_key
      ${filterSql}
      GROUP BY di.district_code, di.district_name
      ORDER BY registered_count DESC, di.district_name
    `;

    const { rows } = await queryWarehouse(sql, params);
    return rows;
  }

  /**
   * Inter-bank transfers and movement trends.
   */
  async getTransferReports(filters = {}) {
    await queryWarehouse('SELECT 1');

    const params = [];
    const whereClauses = [];

    if (filters.bloodBankId) {
      params.push(filters.bloodBankId);
      whereClauses.push(`(
        ft.source_bank_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'BLOOD_BANK')
        OR
        ft.target_bank_key IN (SELECT institution_key FROM dim_institution WHERE source_institution_id = $${params.length} AND institution_type = 'BLOOD_BANK')
      )`);
    }

    const filterSql = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    const sql = `
      SELECT sb.institution_name AS source_bank_name,
             tb.institution_name AS target_bank_name,
             ft.status,
             count(*)::bigint AS transfer_count,
             sum(ft.units_transferred)::bigint AS total_units,
             round(avg(ft.transit_duration_minutes), 1) AS avg_duration_minutes
      FROM fact_transfers ft
      JOIN dim_institution sb ON sb.institution_key = ft.source_bank_key
      JOIN dim_institution tb ON tb.institution_key = ft.target_bank_key
      ${filterSql}
      GROUP BY sb.institution_name, tb.institution_name, ft.status
      ORDER BY transfer_count DESC
    `;

    const { rows } = await queryWarehouse(sql, params);
    return rows;
  }
}

export const warehouseService = new WarehouseService();
