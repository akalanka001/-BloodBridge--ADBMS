import { pool, inTransaction } from '../../db.js';

export class CampsRepository {
  async listPublicCamps(filters = {}) {
    const conditions = ['1 = 1'];
    const params = [];
    let idx = 1;

    if (filters.districtCode) {
      conditions.push(`district_code = $${idx++}`);
      params.push(filters.districtCode);
    }

    if (filters.search) {
      conditions.push(`(title ILIKE $${idx} OR town ILIKE $${idx} OR venue_address ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const sql = `
      SELECT * FROM v_public_donation_camps
      WHERE ${conditions.join(' AND ')}
      ORDER BY starts_at ASC
      LIMIT 100
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async listManagedCamps({ bankId, status, districtCode, search, userRole, userId }) {
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

    if (districtCode) {
      conditions.push(`district_code = $${idx++}`);
      params.push(districtCode);
    }

    if (search) {
      conditions.push(`(title ILIKE $${idx} OR town ILIKE $${idx} OR venue_address ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const sql = `
      SELECT * FROM v_camp_management_detail
      WHERE ${conditions.join(' AND ')}
      ORDER BY starts_at ASC
      LIMIT 100
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
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
    const { rows } = await pool.query(
      `INSERT INTO camp_registrations (camp_id, donor_id)
       SELECT $1, d.id FROM donors d WHERE d.user_id = $2
       RETURNING id, camp_id, status, registered_at`,
      [campId, userId],
    );
    return rows[0] || null;
  }

  async cancelDonorRegistration(campId, userId) {
    const { rows } = await pool.query(
      `UPDATE camp_registrations cr
       SET status = 'CANCELLED'
       FROM donors d
       WHERE cr.camp_id = $1 AND cr.donor_id = d.id AND d.user_id = $2
         AND cr.status = 'REGISTERED'
       RETURNING cr.id, cr.status`,
      [campId, userId],
    );
    return rows[0] || null;
  }

  async getDonorRegistrations(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM v_donor_camp_registrations
       WHERE user_id = $1
       ORDER BY starts_at ASC`,
      [userId],
    );
    return rows;
  }

  async listCampRegistrations(campId) {
    const { rows } = await pool.query(
      `SELECT cr.id AS registration_id, cr.camp_id, cr.donor_id,
              d.full_name, d.phone, d.blood_type_code, d.district_code,
              cr.status AS registration_status, cr.registered_at,
              cr.checked_in_at, cr.checked_in_by, cr.attendance_notes,
              u.full_name AS checked_in_by_name
       FROM camp_registrations cr
       JOIN donors d ON d.id = cr.donor_id
       LEFT JOIN users u ON u.id = cr.checked_in_by
       WHERE cr.camp_id = $1
       ORDER BY cr.registered_at ASC`,
      [campId],
    );
    return rows;
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
