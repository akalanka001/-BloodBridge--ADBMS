import { pool } from '../../db.js';

// Deliberate, read-only projections. Do not expose donor contact/identity hashes or clinical notes.
export const oversightQueries = {
  donors: `SELECT d.id, COALESCE(d.full_name, u.full_name, 'Unnamed donor') AS full_name,
    d.registration_origin, (d.user_id IS NOT NULL) AS has_online_account,
    d.blood_type_code, d.district_code, dist.name AS district_name, d.ds_code, d.gn_code,
    d.available_for_contact, d.created_at,
    (SELECT count(*)::int FROM donations dn WHERE dn.donor_id = d.id) AS donation_count
    FROM donors d LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN districts dist ON dist.code = d.district_code`,
  requests: `SELECT br.id, h.name AS hospital_name, br.urgency, br.status, br.needed_by,
    br.created_at, (SELECT count(*)::int FROM request_items ri WHERE ri.request_id = br.id) AS item_count,
    (SELECT sum(ri.units_requested)::int FROM request_items ri WHERE ri.request_id = br.id) AS requested_units
    FROM blood_requests br JOIN hospitals h ON h.id = br.hospital_id`,
  'request-items': `SELECT ri.id, ri.request_id, h.name AS hospital_name, ri.blood_type_code,
    ri.component_code, ri.units_requested, br.status, br.created_at
    FROM request_items ri JOIN blood_requests br ON br.id = ri.request_id JOIN hospitals h ON h.id = br.hospital_id`,
  matches: `SELECT dm.id, ri.request_id, dm.request_item_id, dm.donor_id, dm.status,
    dm.matched_at AS created_at FROM donor_matches dm JOIN request_items ri ON ri.id = dm.request_item_id`,
  registrations: `SELECT cr.id, c.title AS camp_title, cr.camp_id, cr.donor_id,
    cr.status, cr.registered_at AS created_at FROM camp_registrations cr JOIN donation_camps c ON c.id = cr.camp_id`,
  organizers: `SELECT id, name, is_verified, NULL::timestamptz AS created_at FROM camp_organizers`,
  assessments: `SELECT da.id, da.donor_id, da.visit_id, da.status, da.assessed_at,
    da.created_at FROM donor_assessments da`,
  invitations: `SELECT si.id, si.role, COALESCE(h.name, bb.name) AS institution_name,
    CASE WHEN si.accepted_at IS NOT NULL THEN 'ACCEPTED' WHEN si.expires_at < now() THEN 'EXPIRED' ELSE 'PENDING' END AS status,
    si.expires_at, si.accepted_at, si.created_at FROM staff_invitations si
    LEFT JOIN hospitals h ON h.id = si.hospital_id LEFT JOIN blood_banks bb ON bb.id = si.blood_bank_id`,
  inventory: `SELECT bu.id, bb.name AS blood_bank_name, bu.blood_type_code, bu.component_code,
    bu.release_status, bu.inventory_status, bu.expires_at, bu.created_at
    FROM blood_units bu JOIN blood_banks bb ON bb.id = bu.blood_bank_id`,
  reservations: `SELECT ir.id, ir.request_item_id, ri.request_id, ir.blood_unit_id,
    bb.name AS blood_bank_name, ir.status, ir.reserved_at AS created_at
    FROM inventory_reservations ir JOIN request_items ri ON ri.id = ir.request_item_id
    JOIN blood_units bu ON bu.id = ir.blood_unit_id JOIN blood_banks bb ON bb.id = bu.blood_bank_id`,
  transfers: `SELECT t.id, src.name AS source_bank, dst.name AS destination_bank,
    t.status, t.created_at, (SELECT count(*)::int FROM transfer_units tu WHERE tu.transfer_id = t.id) AS unit_count
    FROM blood_bank_transfers t JOIN blood_banks src ON src.id = t.source_bank_id
    JOIN blood_banks dst ON dst.id = t.target_bank_id`,
  fulfillments: `SELECT f.id, f.request_id, bb.name AS blood_bank_name, f.status,
    f.fulfilled_at, f.received_at, f.received_quantity, f.created_at
    FROM fulfillments f JOIN blood_banks bb ON bb.id = f.blood_bank_id`,
  donations: `SELECT dn.id, dn.donor_id, bb.name AS blood_bank_name, dn.camp_id,
    dn.collected_at, dn.collected_volume_ml, dn.process_status, dn.created_at
    FROM donations dn JOIN blood_banks bb ON bb.id = dn.blood_bank_id`,
  visits: `SELECT v.id, v.donor_id, bb.name AS blood_bank_name, v.camp_id,
    v.status, v.visit_date AS created_at FROM donor_visits v
    LEFT JOIN blood_banks bb ON bb.id = v.blood_bank_id`,
  movements: `SELECT im.id, im.blood_unit_id, bb.name AS blood_bank_name,
    im.from_status, im.to_status, im.action, im.acted_at AS created_at
    FROM inventory_movements im JOIN blood_units bu ON bu.id = im.blood_unit_id
    JOIN blood_banks bb ON bb.id = bu.blood_bank_id`,
  appeals: `SELECT ea.id, ea.request_id, h.name AS hospital_name, ea.target_blood_type AS blood_type_code,
    ea.target_component_code AS component_code, ea.status, ea.created_at FROM emergency_appeals ea
    JOIN hospitals h ON h.id = ea.hospital_id`,
};

export async function listOversight(dataset, { search = '', limit = 20, offset = 0 } = {}, db = pool) {
  const source = oversightQueries[dataset];
  if (!source) throw new Error('Unknown administrative dataset');
  const params = [];
  let predicate = '';
  if (search) {
    params.push(`%${search}%`);
    predicate = ` WHERE row_to_json(record)::text ILIKE $1`;
  }
  const count = await db.query(`SELECT count(*)::int AS total FROM (${source}) record${predicate}`, params);
  const total = count.rows[0]?.total || 0;
  const pageParams = [...params, limit, offset];
  const { rows } = await db.query(`SELECT record.* FROM (${source}) record${predicate}
    ORDER BY record.created_at DESC NULLS LAST, record.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, pageParams);
  return { data: rows, pagination: {
    total, page: Math.floor(offset / limit) + 1, pageSize: limit,
    totalPages: Math.ceil(total / limit), limit, offset,
  } };
}
