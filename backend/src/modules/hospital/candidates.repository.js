import { pool } from '../../db.js';

/** Reuse the database's potential-matching foundation; never return donor rows to callers. */
export async function countPotentialCandidates(filters, db = pool) {
  const { rows } = await db.query(`
    SELECT count(DISTINCT candidate.donor_id)::int AS count
    FROM fn_match_potential_donors($1::text, $2::text, $3::text, 120) candidate
    JOIN donors d ON d.id = candidate.donor_id
    JOIN districts district ON district.code = d.district_code
    JOIN donor_consents consent ON consent.donor_id = d.id
    WHERE consent.contact_allowed = TRUE
      AND consent.emergency_appeal_opt_in = TRUE
      AND ($4::text IS NULL OR district.province_code = $4)
      AND ($5::text IS NULL OR d.gn_code = $5)
      AND NOT EXISTS (
        SELECT 1 FROM donor_invitations invitation
        WHERE invitation.donor_id = d.id AND invitation.status = 'PENDING'
          AND (invitation.expires_at IS NULL OR invitation.expires_at > now())
      )`, [filters.bloodTypeCode, filters.districtCode || null, filters.dsCode || null,
    filters.provinceCode || null, filters.gnCode || null]);
  return Number(rows[0]?.count ?? 0);
}

export class HospitalCandidatesRepository {
  constructor(db = pool) { this.db = db; }

  async memberships(userId) {
    const { rows } = await this.db.query(`
      SELECT h.id AS "hospitalId", h.name AS "hospitalName", district.province_code AS "provinceCode",
        p.name AS "provinceName", loc.district_code AS "districtCode", district.name AS "districtName",
        loc.ds_code AS "dsCode", ds.name AS "dsName", loc.gn_code AS "gnCode", gn.name AS "gnName"
      FROM staff_memberships sm JOIN hospitals h ON h.id = sm.hospital_id
      JOIN locations loc ON loc.id = h.location_id
      JOIN districts district ON district.code = loc.district_code
      JOIN provinces p ON p.code = district.province_code
      LEFT JOIN ds_divisions ds ON ds.code = loc.ds_code AND ds.district_code = loc.district_code
      LEFT JOIN gn_divisions gn ON gn.code = loc.gn_code AND gn.ds_code = loc.ds_code
      WHERE sm.user_id = $1 AND sm.is_active = TRUE
      ORDER BY h.name, h.id`, [userId]);
    return rows.map(row => ({ ...row, hospitalId: Number(row.hospitalId) }));
  }

  async validGeography(filters) {
    const { rows } = await this.db.query(`SELECT
      ($1::text IS NULL OR EXISTS (SELECT 1 FROM provinces WHERE code = $1))
      AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM districts WHERE code = $2 AND ($1::text IS NULL OR province_code = $1)))
      AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM ds_divisions WHERE code = $3 AND district_code = $2))
      AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM gn_divisions WHERE code = $4 AND ds_code = $3 AND district_code = $2)) AS valid`,
    [filters.provinceCode || null, filters.districtCode || null, filters.dsCode || null, filters.gnCode || null]);
    return rows[0]?.valid === true;
  }

  async requestItem(requestId, itemId, hospitalId) {
    const { rows } = await this.db.query(`SELECT ri.id AS "requestItemId", br.id AS "requestId",
      ri.blood_type_code AS "bloodTypeCode", ri.component_code AS "componentCode", ri.units_requested AS "unitsRequested"
      FROM request_items ri JOIN blood_requests br ON br.id = ri.request_id
      WHERE br.id = $1 AND ri.id = $2 AND br.hospital_id = $3`, [requestId, itemId, hospitalId]);
    return rows[0] || null;
  }

  count(filters) { return countPotentialCandidates(filters, this.db); }

  async reports(hospitalId) {
    const { rows } = await this.db.query(`SELECT count(*)::int AS total_requests,
      count(*) FILTER (WHERE status = 'FULFILLED')::int AS fulfilled_requests,
      count(*) FILTER (WHERE urgency = 'CRITICAL')::int AS critical_requests,
      count(*) FILTER (WHERE urgency = 'URGENT')::int AS urgent_requests,
      count(*) FILTER (WHERE urgency = 'ROUTINE')::int AS routine_requests
      FROM blood_requests WHERE hospital_id = $1`, [hospitalId]);
    return { ...rows[0], queriedAt: new Date().toISOString() };
  }

  async deliveries(hospitalId, { limit = 10, offset = 0 } = {}) {
    const count = await this.db.query('SELECT count(*)::int AS total FROM fulfillments f JOIN blood_requests br ON br.id = f.request_id WHERE br.hospital_id = $1', [hospitalId]);
    const { rows } = await this.db.query(`SELECT f.id, f.request_id, f.status, f.created_at, f.fulfilled_at,
      f.received_at, f.received_quantity, f.condition_notes, bb.name AS blood_bank_name,
      u.full_name AS receiver_name,
      (SELECT count(*)::int FROM fulfillment_units fu WHERE fu.fulfillment_id = f.id) AS units_count
      FROM fulfillments f JOIN blood_requests br ON br.id = f.request_id
      JOIN blood_banks bb ON bb.id = f.blood_bank_id LEFT JOIN users u ON u.id = f.received_by
      WHERE br.hospital_id = $1 ORDER BY f.created_at DESC, f.id DESC LIMIT $2 OFFSET $3`, [hospitalId, limit, offset]);
    return { data: rows, pagination: { total: Number(count.rows[0]?.total ?? 0), limit, offset } };
  }
}

export const hospitalCandidatesRepository = new HospitalCandidatesRepository();
