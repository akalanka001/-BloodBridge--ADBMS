import { pool, inTransaction } from '../../db.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../infrastructure/errors.js';

function paging(filters = {}) {
  const limit = filters.pageSize || filters.limit || 10;
  const offset = filters.page ? (filters.page - 1) * limit : (filters.offset || 0);
  return { limit, offset };
}

async function paginated(sql, params, filters, orderBy) {
  const { limit, offset } = paging(filters);
  const { rows: totals } = await pool.query(`SELECT count(*)::int AS total FROM (${sql}) filtered`, params);
  const total = totals[0].total;
  const { rows } = await pool.query(`${sql} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  return { data: rows, pagination: { page: Math.floor(offset / limit) + 1, pageSize: limit, total, totalPages: Math.ceil(total / limit) } };
}

function areaConditions(filters, params, alias = 'loc') {
  const conditions = [];
  for (const [key, column] of [['provinceCode', 'dist.province_code'], ['districtCode', `${alias}.district_code`], ['dsCode', `${alias}.ds_code`], ['gnCode', `${alias}.gn_code`]]) {
    if (filters[key]) {
      params.push(filters[key]);
      conditions.push(`${column} = $${params.length}`);
    }
  }
  return conditions;
}

// The existing public view remains the discovery base. Extra fields are a
// deliberate public-safe projection; no approval actors or private contacts.
const publicCampSql = `SELECT pc.*, c.status, c.description, c.blood_bank_id,
  co.name AS organizer_name, dist.province_code, pr.name AS province_name,
  loc.gn_code, ds.name AS ds_name, gn.name AS gn_name,
  (SELECT count(*)::int FROM camp_registrations r WHERE r.camp_id = c.id AND r.status = 'REGISTERED') AS registered_count,
  media.storage_path AS primary_poster_url, media.alt_text AS primary_poster_alt
  FROM v_public_donation_camps pc
  JOIN donation_camps c ON c.id = pc.camp_id
  JOIN locations loc ON loc.id = c.location_id
  JOIN districts dist ON dist.code = loc.district_code
  JOIN provinces pr ON pr.code = dist.province_code
  JOIN camp_organizers co ON co.id = c.organizer_id
  LEFT JOIN ds_divisions ds ON ds.code = loc.ds_code AND ds.district_code = loc.district_code
  LEFT JOIN gn_divisions gn ON gn.code = loc.gn_code AND gn.ds_code = loc.ds_code AND gn.district_code = loc.district_code
  LEFT JOIN LATERAL (
    SELECT ma.storage_path, ma.alt_text FROM camp_media cm
    JOIN media_assets ma ON ma.id = cm.media_id
    WHERE cm.camp_id = c.id ORDER BY cm.is_primary DESC, cm.display_order ASC, cm.id ASC LIMIT 1
  ) media ON true`;

export class CampsRepository {
  async listPublicCamps(filters = {}, userId = null) {
    const conditions = ['c.starts_at > now()'];
    const params = [];
    conditions.push(...areaConditions(filters, params));
    if (filters.campId) { params.push(filters.campId); conditions.push(`c.id = $${params.length}`); }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(pc.title ILIKE $${params.length} OR pc.town ILIKE $${params.length} OR pc.venue_address ILIKE $${params.length} OR co.name ILIKE $${params.length})`);
    }
    let select = 'public_camp.*';
    let donorJoin = '';
    let savedArea = null;
    if (userId) {
      const profile = await pool.query(`SELECT d.district_code, d.ds_code, d.gn_code, dist.province_code FROM donors d JOIN districts dist ON dist.code = d.district_code WHERE d.user_id = $1`, [userId]);
      savedArea = profile.rows[0];
      if (!savedArea) throw new NotFoundError('Donor profile missing');
      params.push(userId);
      donorJoin = `LEFT JOIN donors donor ON donor.user_id = $${params.length}
        LEFT JOIN camp_registrations registration ON registration.camp_id = public_camp.camp_id AND registration.donor_id = donor.id`;
      const areaParams = [savedArea.district_code, savedArea.ds_code, savedArea.gn_code, savedArea.province_code].map(value => { params.push(value); return `$${params.length}`; });
      select += `, registration.status AS registration_status,
        CASE WHEN public_camp.district_code = ${areaParams[0]} AND public_camp.ds_code = ${areaParams[1]} AND public_camp.gn_code = ${areaParams[2]} THEN 0
        WHEN public_camp.district_code = ${areaParams[0]} AND public_camp.ds_code = ${areaParams[1]} THEN 1
        WHEN public_camp.district_code = ${areaParams[0]} THEN 2
        WHEN public_camp.province_code = ${areaParams[3]} THEN 3 ELSE 4 END AS nearby_rank`;
    }
    const filtered = `${publicCampSql} WHERE ${conditions.join(' AND ')}`;
    const sql = `SELECT ${select} FROM (${filtered}) public_camp ${donorJoin}`;
    // Parameters are bound across the complete query, including donor context.
    let orderBy = 'starts_at ASC, camp_id ASC';
    if (userId && filters.sort === 'nearby') {
      orderBy = 'nearby_rank ASC, starts_at ASC, camp_id ASC';
    } else if (filters.sort === 'availability') {
      orderBy = `CASE
        WHEN public_camp.capacity IS NOT NULL AND public_camp.registered_count < public_camp.capacity THEN 0
        WHEN public_camp.capacity IS NULL THEN 1
        ELSE 2 END ASC,
        (COALESCE(public_camp.capacity, 999999) - COALESCE(public_camp.registered_count, 0)) DESC,
        starts_at ASC, camp_id ASC`;
    }
    const result = await paginated(sql, params, filters, orderBy);
    return { ...result, ...(userId ? { savedArea } : {}) };
  }

  async listManagedCamps({ bankId, status, search, userRole, userId, ...filters }) {
    const conditions = ['1 = 1'];
    const params = [];
    let idx = 1;

    // Scope to authorized bank if BANK_STAFF
    if (bankId) {
      conditions.push(`blood_bank_id = $${idx++}`);
      params.push(bankId);
    } else if (userRole === 'BANK_STAFF') {
      conditions.push(`blood_bank_id IN (
        SELECT blood_bank_id FROM staff_memberships
        WHERE user_id = $${idx++} AND is_active = true AND blood_bank_id IS NOT NULL
      )`);
      params.push(userId);
    }

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    conditions.push(...areaConditions(filters, params));
    idx = params.length + 1;

    if (search) {
      conditions.push(`(c.title ILIKE $${idx} OR c.town ILIKE $${idx} OR c.venue_address ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const sql = `
      SELECT c.*, loc.gn_code FROM v_camp_management_detail c
      JOIN locations loc ON loc.id = c.location_id
      JOIN districts dist ON dist.code = loc.district_code
      WHERE ${conditions.join(' AND ')}
    `;
    return paginated(sql, params, filters, 'starts_at ASC, camp_id ASC');
  }

  async getPublicCampById(id) {
    const { rows } = await pool.query(`${publicCampSql} WHERE c.id = $1 AND c.starts_at > now()`, [id]);
    return rows[0] || null;
  }

  async validateGeography(filters) {
    const { rows } = await pool.query(`SELECT
      ($1::text IS NULL OR EXISTS (SELECT 1 FROM provinces WHERE code = $1)) AND
      ($2::text IS NULL OR EXISTS (SELECT 1 FROM districts WHERE code = $2 AND ($1::text IS NULL OR province_code = $1))) AND
      ($3::text IS NULL OR EXISTS (SELECT 1 FROM ds_divisions WHERE code = $3 AND district_code = $2)) AND
      ($4::text IS NULL OR EXISTS (SELECT 1 FROM gn_divisions WHERE code = $4 AND ds_code = $3 AND district_code = $2)) AS valid`,
    [filters.provinceCode || null, filters.districtCode || null, filters.dsCode || null, filters.gnCode || null]);
    if (!rows[0].valid) throw new BadRequestError('Select a valid province, district, DS and GN hierarchy');
  }

  async getCampById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM v_camp_management_detail WHERE camp_id = $1',
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
    return inTransaction(async (client) => {
      let locationId = data.locationId;

      // If custom location is provided, create a locations record
      if (!locationId && data.customLocation) {
        const { rows: locRows } = await client.query(
          `INSERT INTO locations (
             district_code, ds_code, town, address_line, latitude, longitude
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            data.customLocation.districtCode,
            data.customLocation.dsCode || null,
            data.customLocation.town,
            data.customLocation.addressLine || null,
            data.customLocation.latitude || null,
            data.customLocation.longitude || null,
          ],
        );
        locationId = locRows[0].id;
      }

      const { rows } = await client.query(
        `INSERT INTO donation_camps (
           title, description, organizer_id, blood_bank_id, location_id,
           proposed_by, starts_at, ends_at, capacity, public_contact, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
         RETURNING id, title, status, starts_at, ends_at, capacity, blood_bank_id`,
        [
          data.title,
          data.description || null,
          data.organizerId,
          data.bloodBankId,
          locationId,
          proposedBy,
          data.startsAt,
          data.endsAt,
          data.capacity ?? null,
          data.publicContact ?? null,
        ],
      );

      const camp = rows[0];

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, 'donation_camps', $2, 'CREATE_DRAFT_CAMP')`,
        [proposedBy, camp.id.toString()],
      );

      return camp;
    });
  }

  async updateCamp(id, data, userId) {
    return inTransaction(async (client) => {
      const { rows: existing } = await client.query(
        'SELECT * FROM donation_camps WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!existing[0]) return null;

      const camp = existing[0];
      if (camp.status !== 'DRAFT') {
        throw new Error('Only DRAFT camps can be modified');
      }

      const updates = [];
      const params = [id];
      let idx = 2;

      if (data.title !== undefined) {
        updates.push(`title = $${idx++}`);
        params.push(data.title);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${idx++}`);
        params.push(data.description);
      }
      if (data.organizerId !== undefined) {
        updates.push(`organizer_id = $${idx++}`);
        params.push(data.organizerId);
      }
      if (data.locationId !== undefined) {
        updates.push(`location_id = $${idx++}`);
        params.push(data.locationId);
      }
      if (data.startsAt !== undefined) {
        updates.push(`starts_at = $${idx++}`);
        params.push(data.startsAt);
      }
      if (data.endsAt !== undefined) {
        updates.push(`ends_at = $${idx++}`);
        params.push(data.endsAt);
      }
      if (data.capacity !== undefined) {
        updates.push(`capacity = $${idx++}`);
        params.push(data.capacity);
      }
      if (data.publicContact !== undefined) {
        updates.push(`public_contact = $${idx++}`);
        params.push(data.publicContact);
      }

      if (updates.length === 0) return camp;

      const { rows } = await client.query(
        `UPDATE donation_camps
         SET ${updates.join(', ')}
         WHERE id = $1
         RETURNING *`,
        params,
      );

      return rows[0];
    });
  }

  async submitCamp(id, userId) {
    const { rows } = await pool.query(
      `UPDATE donation_camps c
       SET status = 'PENDING'
       WHERE c.id = $1 AND c.status = 'DRAFT' AND c.starts_at > now()
         AND (
           EXISTS (
             SELECT 1 FROM staff_memberships sm
             WHERE sm.user_id = $2 AND sm.blood_bank_id = c.blood_bank_id AND sm.is_active
           )
           OR EXISTS (SELECT 1 FROM users u WHERE u.id = $2 AND u.role = 'ADMIN')
         )
       RETURNING c.id, c.status`,
      [id, userId],
    );
    return rows[0] || null;
  }

  async approveCamp(id, userId) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_approve_donation_camp($1, $2)', [id, userId]);
      const { rows } = await client.query('SELECT * FROM v_camp_management_detail WHERE camp_id = $1', [id]);
      return rows[0];
    });
  }

  async cancelCamp(id, userId, reason) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_cancel_donation_camp($1, $2, $3)', [id, userId, reason]);
      const { rows } = await client.query('SELECT * FROM v_camp_management_detail WHERE camp_id = $1', [id]);
      return rows[0];
    });
  }

  async registerDonorForCamp(campId, userId) {
    return inTransaction(async (client) => {
      // Lock the same parent as the capacity trigger before inspecting rows.
      // Concurrent first registrations and reactivations therefore serialize.
      const { rows: camps } = await client.query('SELECT status, starts_at > now() AS upcoming, capacity FROM donation_camps WHERE id = $1 FOR UPDATE', [campId]);
      const camp = camps[0];
      if (!camp) throw new NotFoundError('Camp not found');
      const { rows: donors } = await client.query('SELECT id FROM donors WHERE user_id = $1', [userId]);
      if (!donors[0]) throw new NotFoundError('Donor profile missing');
      const donorId = donors[0].id;
      const { rows: existing } = await client.query('SELECT id, status FROM camp_registrations WHERE camp_id = $1 AND donor_id = $2 FOR UPDATE', [campId, donorId]);
      if (existing[0]?.status === 'REGISTERED') throw new ConflictError('Already registered for this camp');
      if (existing[0] && existing[0].status !== 'CANCELLED') throw new ConflictError('Attendance history cannot be registered again');
      if (camp.status !== 'APPROVED' || !camp.upcoming) throw new ConflictError('Registration is closed for this camp');
      if (camp.capacity !== null) {
        const { rows: counts } = await client.query("SELECT count(*)::int AS count FROM camp_registrations WHERE camp_id = $1 AND status = 'REGISTERED'", [campId]);
        if (counts[0].count >= camp.capacity) throw new ConflictError('This camp is full');
      }
      const result = existing[0]
        ? await client.query("UPDATE camp_registrations SET status = 'REGISTERED', registered_at = now() WHERE id = $1 RETURNING id, camp_id, status, registered_at", [existing[0].id])
        : await client.query('INSERT INTO camp_registrations (camp_id, donor_id) VALUES ($1, $2) RETURNING id, camp_id, status, registered_at', [campId, donorId]);
      return result.rows[0];
    });
  }

  async cancelDonorRegistration(campId, userId) {
    return inTransaction(async (client) => {
      const { rows: camps } = await client.query('SELECT starts_at > now() AS upcoming FROM donation_camps WHERE id = $1 FOR UPDATE', [campId]);
      if (!camps[0]) throw new NotFoundError('Camp not found');
      if (!camps[0].upcoming) throw new ConflictError('Registration can only be cancelled before the camp starts');
      const { rows } = await client.query(
      `UPDATE camp_registrations cr
       SET status = 'CANCELLED'
       FROM donors d
       WHERE cr.camp_id = $1 AND cr.donor_id = d.id AND d.user_id = $2
         AND cr.status = 'REGISTERED'
       RETURNING cr.id, cr.camp_id, cr.status`,
      [campId, userId],
    );
      return rows[0] || null;
    });
  }

  async getDonorRegistrations(userId, filters = {}) {
    const params = [userId];
    const conditions = ['r.user_id = $1'];
    if (filters.status) { params.push(filters.status); conditions.push(`r.registration_status = $${params.length}`); }
    if (filters.search) { params.push(`%${filters.search}%`); conditions.push(`(r.camp_title ILIKE $${params.length} OR r.town ILIKE $${params.length})`); }
    if (filters.period === 'upcoming') conditions.push("r.starts_at > now() AND r.registration_status = 'REGISTERED' AND r.camp_status = 'APPROVED'");
    if (filters.period === 'history') conditions.push("(r.starts_at <= now() OR r.registration_status <> 'REGISTERED' OR r.camp_status <> 'APPROVED')");
    return paginated(`SELECT r.*, loc.district_code, dist.province_code, loc.ds_code, loc.gn_code,
      (r.starts_at > now() AND r.registration_status = 'REGISTERED') AS can_cancel
      FROM v_donor_camp_registrations r JOIN donation_camps c ON c.id = r.camp_id
      JOIN locations loc ON loc.id = c.location_id JOIN districts dist ON dist.code = loc.district_code
      WHERE ${conditions.join(' AND ')}`, params, filters, 'starts_at ASC, registration_id ASC');
  }

  async listCampRegistrations(campId, filters = {}) {
    const params = [campId];
    const conditions = ['cr.camp_id = $1'];
    if (filters.status) { params.push(filters.status); conditions.push(`cr.status = $${params.length}`); }
    if (filters.search) { params.push(`%${filters.search}%`); conditions.push(`(d.full_name ILIKE $${params.length} OR d.phone ILIKE $${params.length} OR d.blood_type_code ILIKE $${params.length})`); }
    return paginated(
      `SELECT cr.id AS registration_id, cr.camp_id, cr.donor_id,
              d.full_name, d.phone, d.blood_type_code, d.district_code,
              cr.status AS registration_status, cr.registered_at,
              cr.checked_in_at, cr.checked_in_by, cr.attendance_notes,
              u.full_name AS checked_in_by_name
       FROM camp_registrations cr
       JOIN donors d ON d.id = cr.donor_id
       LEFT JOIN users u ON u.id = cr.checked_in_by
       WHERE ${conditions.join(' AND ')}`,
      params, filters, 'registered_at ASC, registration_id ASC',
    );
  }

  async checkInDonor(campId, donorId, staffId, status, notes) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_checkin_camp_donor($1, $2, $3, $4, $5)', [
        campId,
        donorId,
        staffId,
        status,
        notes || null,
      ]);
      const { rows } = await client.query(
        `SELECT cr.*, d.full_name, d.blood_type_code
         FROM camp_registrations cr
         JOIN donors d ON d.id = cr.donor_id
         WHERE cr.camp_id = $1 AND cr.donor_id = $2`,
        [campId, donorId],
      );
      return rows[0];
    });
  }

  async attachCampMedia(campId, mediaId, isPrimary = true) {
    return inTransaction(async (client) => {
      if (isPrimary) {
        await client.query('UPDATE camp_media SET is_primary = false WHERE camp_id = $1', [campId]);
      }
      const { rows } = await client.query(
        `INSERT INTO camp_media (camp_id, media_id, is_primary)
         VALUES ($1, $2, $3)
         ON CONFLICT (camp_id, media_id)
         DO UPDATE SET is_primary = EXCLUDED.is_primary
         RETURNING *`,
        [campId, mediaId, isPrimary],
      );
      return rows[0];
    });
  }

  async removeCampMedia(campId, mediaId) {
    const { rows } = await pool.query(
      'DELETE FROM camp_media WHERE camp_id = $1 AND media_id = $2 RETURNING *',
      [campId, mediaId],
    );
    return rows[0] || null;
  }

  async listCampMedia(campId) {
    const { rows } = await pool.query(
      `SELECT cm.id, cm.camp_id, cm.media_id, cm.is_primary, cm.attached_at,
              ma.file_name, ma.mime_type, ma.file_size_bytes, ma.storage_path, ma.alt_text
       FROM camp_media cm
       JOIN media_assets ma ON ma.id = cm.media_id
       WHERE cm.camp_id = $1
       ORDER BY cm.is_primary DESC, cm.display_order ASC`,
      [campId],
    );
    return rows;
  }

  async listOrganizers() {
    const { rows } = await pool.query(
      'SELECT id, name, phone, email, is_verified FROM camp_organizers ORDER BY name ASC',
    );
    return rows;
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
