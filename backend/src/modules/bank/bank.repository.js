import { pool } from '../../db.js';
import { ForbiddenError, NotFoundError } from '../../infrastructure/errors.js';

export class BankRepository {
  async isStaffAtBank(userId, bankId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM staff_memberships sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.user_id = $1 AND sm.blood_bank_id = $2
         AND sm.is_active = true AND u.is_active = true`,
      [userId, bankId],
    );
    return rows.length > 0;
  }

  async getUserBankId(userId) {
    const { rows } = await pool.query(
      `SELECT blood_bank_id FROM staff_memberships
       WHERE user_id = $1 AND is_active = true AND blood_bank_id IS NOT NULL
       LIMIT 1`,
      [userId],
    );
    return rows[0]?.blood_bank_id || null;
  }

  async getDashboardData(bankId, userId, userRole, componentCode = 'RBC') {
    if (userRole !== 'ADMIN') {
      const isStaff = await this.isStaffAtBank(userId, bankId);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized for this blood bank');
      }
    }

    // 1. KPIs
    const kpiRes = await pool.query(
      `SELECT * FROM v_blood_bank_dashboard_kpis WHERE blood_bank_id = $1`,
      [bankId],
    );

    const kpis = kpiRes.rows[0] || {
      blood_bank_id: bankId,
      blood_bank_name: 'Blood Bank',
      available_units: 0,
      expiring_soon: 0,
      incoming_requests: 0,
      today_collections: 0,
      in_transit_transfers: 0,
      upcoming_camps: 0,
    };

    // 2. Blood group availability (8 standard groups)
    const stockRes = await pool.query(
      `SELECT blood_type_code, count(*)::int AS units
       FROM blood_units
       WHERE blood_bank_id = $1
         AND release_status = 'RELEASED'
         AND inventory_status = 'IN_STOCK'
         AND expires_at > now()
         AND component_code = $2
       GROUP BY blood_type_code`,
      [bankId, componentCode],
    );

    const stockMap = {};
    stockRes.rows.forEach((r) => {
      stockMap[r.blood_type_code] = r.units;
    });

    const standardGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const targetQuota = 50; // benchmark target units per type
    const bloodGroupAvailability = standardGroups.map((type) => {
      const units = stockMap[type] || 0;
      const pct = Math.min(100, Math.round((units / targetQuota) * 100));
      let color = '#16A085'; // green: good stock
      let status = 'ADEQUATE';
      if (units <= 10) {
        color = '#DB3654'; // red: critical shortage
        status = 'CRITICAL';
      } else if (units <= 20) {
        color = '#DB9B38'; // amber: moderate
        status = 'WARNING';
      }
      return { type, units, pct, color, status };
    });

    // 3. Expiry Watch: Next 5 units to expire
    const expiryRes = await pool.query(
      `SELECT id, component_code, blood_type_code, expires_at, days_left, hours_left
       FROM v_blood_bank_inventory_units
       WHERE blood_bank_id = $1
         AND release_status = 'RELEASED'
         AND inventory_status = 'IN_STOCK'
         AND expires_at > now()
       ORDER BY expires_at ASC
       LIMIT 5`,
      [bankId],
    );

    // 4. Recent Inventory Activity
    const activityRes = await pool.query(
      `SELECT id, blood_unit_id, component_code, blood_type_code, from_status,
              to_status, action, actor_name, acted_at
       FROM v_inventory_movements_detail
       WHERE blood_bank_id = $1
       ORDER BY acted_at DESC
       LIMIT 10`,
      [bankId],
    );

    return {
      kpis,
      bloodGroupAvailability,
      selectedComponent: componentCode,
      expiryWatch: expiryRes.rows,
      recentActivity: activityRes.rows,
    };
  }

  async getIncomingRequests(bankId, userId, userRole) {
    if (userRole !== 'ADMIN') {
      const isStaff = await this.isStaffAtBank(userId, bankId);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized for this blood bank');
      }
    }

    const { rows } = await pool.query(
      `SELECT br.id, br.hospital_id, h.name AS hospital_name, h.district_id,
              br.urgency, br.status, br.needed_by, br.notes, br.created_at,
              json_agg(
                json_build_object(
                  'id', ri.id,
                  'blood_type_code', ri.blood_type_code,
                  'component_code', ri.component_code,
                  'units_requested', ri.units_requested,
                  'units_fulfilled', ri.units_fulfilled
                )
              ) AS items
       FROM blood_requests br
       JOIN hospitals h ON h.id = br.hospital_id
       JOIN request_items ri ON ri.request_id = br.id
       WHERE br.status IN ('OPEN', 'PARTIALLY_FILLED')
       GROUP BY br.id, br.hospital_id, h.name, h.district_id, br.urgency, br.status, br.needed_by, br.notes, br.created_at
       ORDER BY 
         CASE br.urgency 
           WHEN 'CRITICAL' THEN 1 
           WHEN 'URGENT' THEN 2 
           ELSE 3 
         END,
         br.needed_by ASC`,
    );
    return rows;
  }

  async getUpcomingCamps(bankId, userId, userRole) {
    if (userRole !== 'ADMIN') {
      const isStaff = await this.isStaffAtBank(userId, bankId);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized for this blood bank');
      }
    }

    const { rows } = await pool.query(
      `SELECT dc.id, dc.name, dc.venue_name, dc.starts_at, dc.ends_at,
              dc.target_units, dc.status, dc.blood_bank_id,
              COALESCE(count(d.id)::int, 0) AS actual_collections
       FROM donation_camps dc
       LEFT JOIN donations d ON d.camp_id = dc.id
       WHERE dc.blood_bank_id = $1
       GROUP BY dc.id, dc.name, dc.venue_name, dc.starts_at, dc.ends_at, dc.target_units, dc.status, dc.blood_bank_id
       ORDER BY dc.starts_at ASC`,
      [bankId],
    );
    return rows;
  }

  async listVerifiedBloodBanks(districtCode = null) {
    let query = `
      SELECT bb.id, bb.name, bb.contact_phone, bb.is_verified,
             loc.district_code, dist.name AS district_name,
             loc.ds_code, loc.town, loc.address_line,
             COALESCE(loc.address_line, loc.town, dist.name, 'Sri Lanka') AS address,
             loc.latitude, loc.longitude
      FROM blood_banks bb
      LEFT JOIN locations loc ON loc.id = bb.location_id
      LEFT JOIN districts dist ON dist.code = loc.district_code
      WHERE bb.is_verified = TRUE
    `;
    const params = [];
    if (districtCode && districtCode !== 'ALL') {
      query += ` AND loc.district_code = $1`;
      params.push(districtCode);
    }
    query += ` ORDER BY bb.name ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }
}

export const bankRepository = new BankRepository();
