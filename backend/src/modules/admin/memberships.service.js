import { pool, inTransaction } from '../../db.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export class MembershipsService {
  async listMemberships(filters = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`sm.user_id = $${idx}`);
      params.push(filters.userId);
      idx++;
    }

    if (filters.role) {
      conditions.push(`u.role = $${idx}`);
      params.push(filters.role);
      idx++;
    }

    if (filters.hospitalId) {
      conditions.push(`sm.hospital_id = $${idx}`);
      params.push(filters.hospitalId);
      idx++;
    }

    if (filters.bloodBankId) {
      conditions.push(`sm.blood_bank_id = $${idx}`);
      params.push(filters.bloodBankId);
      idx++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`sm.is_active = $${idx}`);
      params.push(filters.isActive);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let query = `
      SELECT sm.id,
             sm.user_id,
             u.full_name AS user_name,
             u.email AS user_email,
             u.role AS user_role,
             sm.hospital_id,
             h.name AS hospital_name,
             h.is_verified AS hospital_verified,
             sm.blood_bank_id,
             bb.name AS blood_bank_name,
             bb.is_verified AS blood_bank_verified,
             sm.is_active,
             CASE
               WHEN sm.hospital_id IS NOT NULL THEN 'HOSPITAL'
               ELSE 'BLOOD_BANK'
             END AS institution_type,
             coalesce(h.name, bb.name) AS institution_name
      FROM staff_memberships sm
      JOIN users u ON u.id = sm.user_id
      LEFT JOIN hospitals h ON h.id = sm.hospital_id
      LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
      ${whereClause}
      ORDER BY sm.id DESC
    `;

    let pagination;
    if (filters.limit) {
      const count = await pool.query(`SELECT count(*)::int AS total FROM (${query}) matching`, params);
      pagination = { total: count.rows[0]?.total || 0, pageSize: filters.limit,
        page: Math.floor((filters.offset || 0) / filters.limit) + 1 };
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(filters.limit, filters.offset || 0);
    }
    const { rows } = await pool.query(query, params);
    return pagination ? { rows, pagination } : rows;
  }

  async assignMembership({ userId, role, hospitalId, bloodBankId, isActive = true, reason }, adminUser) {
    return inTransaction(async (client) => {
      // 1. Verify user exists
      const { rows: userRows } = await client.query(
        'SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE',
        [userId],
      );
      if (userRows.length === 0) {
        throw new NotFoundError('User not found');
      }

      // 2. Validate institution existence and verification
      if (role === 'HOSPITAL_STAFF') {
        if (!hospitalId) throw new BadRequestError('Hospital ID is required for HOSPITAL_STAFF');
        const { rows: hRows } = await client.query(
          'SELECT id, name, is_verified FROM hospitals WHERE id = $1',
          [hospitalId],
        );
        if (hRows.length === 0) throw new NotFoundError('Hospital not found');
      } else if (role === 'BANK_STAFF') {
        if (!bloodBankId) throw new BadRequestError('Blood Bank ID is required for BANK_STAFF');
        const { rows: bRows } = await client.query(
          'SELECT id, name, is_verified FROM blood_banks WHERE id = $1',
          [bloodBankId],
        );
        if (bRows.length === 0) throw new NotFoundError('Blood bank not found');
      }

      // 3. Align user role if needed (cannot downgrade an ADMIN, but upgrades/switches staff role)
      if (userRows[0].role !== 'ADMIN' && userRows[0].role !== role) {
        await client.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          [role, userId],
        );
      }

      // 4. Upsert membership
      let membershipRow;
      if (hospitalId) {
        const { rows } = await client.query(
          `INSERT INTO staff_memberships (user_id, hospital_id, blood_bank_id, is_active)
           VALUES ($1, $2, NULL, $3)
           ON CONFLICT (user_id, hospital_id) DO UPDATE
           SET is_active = EXCLUDED.is_active
           RETURNING *`,
          [userId, hospitalId, isActive],
        );
        membershipRow = rows[0];
      } else {
        const { rows } = await client.query(
          `INSERT INTO staff_memberships (user_id, hospital_id, blood_bank_id, is_active)
           VALUES ($1, NULL, $2, $3)
           ON CONFLICT (user_id, blood_bank_id) DO UPDATE
           SET is_active = EXCLUDED.is_active
           RETURNING *`,
          [userId, bloodBankId, isActive],
        );
        membershipRow = rows[0];
      }

      // 5. Audit Log
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, 'staff_memberships', $2, $3)`,
        [
          adminUser.id,
          membershipRow.id.toString(),
          `ASSIGN_STAFF_MEMBERSHIP:${role}:${hospitalId || bloodBankId}${reason ? ` - ${reason}` : ''}`,
        ],
      );

      return membershipRow;
    });
  }

  async updateMembershipStatus(membershipId, { isActive, reason }, adminUser) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM staff_memberships WHERE id = $1 FOR UPDATE',
        [membershipId],
      );
      if (rows.length === 0) {
        throw new NotFoundError('Staff membership not found');
      }

      const { rows: updatedRows } = await client.query(
        'UPDATE staff_memberships SET is_active = $1 WHERE id = $2 RETURNING *',
        [isActive, membershipId],
      );

      // Audit Log
      const action = isActive ? 'REACTIVATE_STAFF_MEMBERSHIP' : 'REVOKE_STAFF_MEMBERSHIP';
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, 'staff_memberships', $2, $3)`,
        [
          adminUser.id,
          membershipId.toString(),
          `${action}${reason ? `: ${reason}` : ''}`,
        ],
      );

      return updatedRows[0];
    });
  }
}

export const membershipsService = new MembershipsService();
