import { pool, inTransaction } from '../../db.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export class InstitutionsService {
  async listInstitutions(filters = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    let baseQuery = `
      SELECT h.id,
             'HOSPITAL' AS type,
             h.name,
             h.contact_phone,
             h.is_verified,
             l.id AS location_id,
             l.town,
             l.address_line,
             l.latitude,
             l.longitude,
             d.code AS district_code,
             d.name AS district_name,
             p.code AS province_code,
             p.name AS province_name,
             NULL::bigint AS associated_hospital_id,
             NULL::text AS associated_hospital_name,
             (SELECT count(*)::int FROM staff_memberships sm WHERE sm.hospital_id = h.id AND sm.is_active) AS active_staff_count
      FROM hospitals h
      JOIN locations l ON l.id = h.location_id
      JOIN districts d ON d.code = l.district_code
      JOIN provinces p ON p.code = d.province_code

      UNION ALL

      SELECT bb.id,
             'BLOOD_BANK' AS type,
             bb.name,
             bb.contact_phone,
             bb.is_verified,
             l.id AS location_id,
             l.town,
             l.address_line,
             l.latitude,
             l.longitude,
             d.code AS district_code,
             d.name AS district_name,
             p.code AS province_code,
             p.name AS province_name,
             bb.hospital_id AS associated_hospital_id,
             h.name AS associated_hospital_name,
             (SELECT count(*)::int FROM staff_memberships sm WHERE sm.blood_bank_id = bb.id AND sm.is_active) AS active_staff_count
      FROM blood_banks bb
      JOIN locations l ON l.id = bb.location_id
      JOIN districts d ON d.code = l.district_code
      JOIN provinces p ON p.code = d.province_code
      LEFT JOIN hospitals h ON h.id = bb.hospital_id
    `;

    let outerQuery = `SELECT * FROM (${baseQuery}) inst`;

    if (filters.type) {
      conditions.push(`inst.type = $${idx}`);
      params.push(filters.type);
      idx++;
    }

    if (filters.districtCode) {
      conditions.push(`inst.district_code = $${idx}`);
      params.push(filters.districtCode);
      idx++;
    }

    if (filters.provinceCode) {
      conditions.push(`inst.province_code = $${idx}`);
      params.push(filters.provinceCode);
      idx++;
    }

    if (filters.isVerified !== undefined) {
      conditions.push(`inst.is_verified = $${idx}`);
      params.push(filters.isVerified);
      idx++;
    }

    if (filters.search) {
      conditions.push(`(inst.name ILIKE $${idx} OR inst.town ILIKE $${idx} OR inst.district_name ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (conditions.length > 0) {
      outerQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    let pagination;
    if (filters.limit) {
      const count = await pool.query(`SELECT count(*)::int AS total FROM (${outerQuery}) matched`, params);
      pagination = { total: count.rows[0]?.total || 0, pageSize: filters.limit,
        page: Math.floor((filters.offset || 0) / filters.limit) + 1 };
    }
    outerQuery += ' ORDER BY inst.type, inst.name ASC, inst.id ASC';
    if (filters.limit) {
      outerQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(filters.limit, filters.offset || 0);
    }

    const { rows } = await pool.query(outerQuery, params);
    return pagination ? { rows, pagination } : rows;
  }

  async createInstitution(data, adminUser) {
    return inTransaction(async (client) => {
      // 1. Verify district existence
      const { rows: distRows } = await client.query(
        'SELECT code FROM districts WHERE code = $1',
        [data.location.districtCode],
      );
      if (distRows.length === 0) {
        throw new BadRequestError(`Invalid district code: ${data.location.districtCode}`);
      }

      // 2. If dsCode provided, verify it belongs to district
      if (data.location.dsCode) {
        const { rows: dsRows } = await client.query(
          'SELECT code FROM ds_divisions WHERE code = $1 AND district_code = $2',
          [data.location.dsCode, data.location.districtCode],
        );
        if (dsRows.length === 0) {
          throw new BadRequestError(`DS Division ${data.location.dsCode} does not belong to district ${data.location.districtCode}`);
        }
      }

      // 3. Insert location
      const { rows: locRows } = await client.query(
        `INSERT INTO locations (district_code, ds_code, town, address_line, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          data.location.districtCode,
          data.location.dsCode || null,
          data.location.town,
          data.location.addressLine || null,
          data.location.latitude || null,
          data.location.longitude || null,
        ],
      );
      const locationId = locRows[0].id;

      // 4. Insert Hospital or Blood Bank
      let institution;
      if (data.type === 'HOSPITAL') {
        const { rows } = await client.query(
          `INSERT INTO hospitals (name, location_id, contact_phone, is_verified)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [data.name, locationId, data.contactPhone || null, data.isVerified ?? false],
        );
        institution = { ...rows[0], type: 'HOSPITAL' };
      } else {
        if (data.hospitalId) {
          const { rows: hRows } = await client.query(
            'SELECT id FROM hospitals WHERE id = $1',
            [data.hospitalId],
          );
          if (hRows.length === 0) throw new NotFoundError('Associated hospital not found');
        }

        const { rows } = await client.query(
          `INSERT INTO blood_banks (name, location_id, hospital_id, contact_phone, is_verified)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            data.name,
            locationId,
            data.hospitalId || null,
            data.contactPhone || null,
            data.isVerified ?? false,
          ],
        );
        institution = { ...rows[0], type: 'BLOOD_BANK' };
      }

      // 5. Audit Log
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, $2, $3, 'CREATE_INSTITUTION')`,
        [adminUser.id, data.type === 'HOSPITAL' ? 'hospitals' : 'blood_banks', institution.id.toString()],
      );

      return institution;
    });
  }

  async updateInstitution(type, id, data, adminUser) {
    return inTransaction(async (client) => {
      const table = type === 'HOSPITAL' ? 'hospitals' : 'blood_banks';
      const { rows: existing } = await client.query(
        `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (existing.length === 0) {
        throw new NotFoundError(`${type} not found`);
      }

      const updates = [];
      const params = [id];
      let idx = 2;

      if (data.name !== undefined) {
        updates.push(`name = $${idx++}`);
        params.push(data.name);
      }
      if (data.contactPhone !== undefined) {
        updates.push(`contact_phone = $${idx++}`);
        params.push(data.contactPhone);
      }
      if (type === 'BLOOD_BANK' && data.hospitalId !== undefined) {
        updates.push(`hospital_id = $${idx++}`);
        params.push(data.hospitalId);
      }

      if (updates.length === 0) return { ...existing[0], type };

      const { rows } = await client.query(
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params,
      );

      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, $2, $3, 'UPDATE_INSTITUTION')`,
        [adminUser.id, table, id.toString()],
      );

      return { ...rows[0], type };
    });
  }

  async verifyInstitution(type, id, { isVerified, reason }, adminUser) {
    return inTransaction(async (client) => {
      const table = type === 'HOSPITAL' ? 'hospitals' : 'blood_banks';
      const { rows: existing } = await client.query(
        `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (existing.length === 0) {
        throw new NotFoundError(`${type} not found`);
      }

      const { rows } = await client.query(
        `UPDATE ${table} SET is_verified = $1 WHERE id = $2 RETURNING *`,
        [isVerified, id],
      );

      const action = isVerified ? 'VERIFY_INSTITUTION' : 'REVOKE_INSTITUTION_VERIFICATION';
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, $2, $3, $4)`,
        [
          adminUser.id,
          table,
          id.toString(),
          `${action}${reason ? `: ${reason}` : ''}`,
        ],
      );

      return { ...rows[0], type };
    });
  }
}

export const institutionsService = new InstitutionsService();
