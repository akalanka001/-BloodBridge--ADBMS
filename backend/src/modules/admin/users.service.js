import { pool, inTransaction } from '../../db.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export class UsersService {
  async listUsers(filters = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.role) {
      conditions.push(`u.role = $${idx}`);
      params.push(filters.role);
      idx++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`u.is_active = $${idx}`);
      params.push(filters.isActive);
      idx++;
    }

    if (filters.isEmailVerified !== undefined) {
      conditions.push(`u.email_verified = $${idx}`);
      params.push(filters.isEmailVerified);
      idx++;
    }

    if (filters.institutionId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM staff_memberships sm
        WHERE sm.user_id = u.id AND (sm.hospital_id::text = $${idx} OR sm.blood_bank_id::text = $${idx})
      )`);
      params.push(filters.institutionId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT count(*)::int AS total FROM users u ${whereClause}`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    const dataQuery = `
      SELECT u.id,
             u.full_name,
             u.email,
             u.phone,
             u.role,
             u.is_active,
             u.email_verified,
             u.created_at,
             d.id AS donor_profile_id,
             d.blood_type_code,
             d.registration_origin,
             coalesce(
               json_agg(
                 json_build_object(
                   'id', sm.id,
                   'hospital_id', sm.hospital_id,
                   'hospital_name', h.name,
                   'blood_bank_id', sm.blood_bank_id,
                   'blood_bank_name', bb.name,
                   'is_active', sm.is_active
                 )
               ) FILTER (WHERE sm.id IS NOT NULL),
               '[]'::json
             ) AS memberships
      FROM users u
      LEFT JOIN donors d ON d.user_id = u.id
      LEFT JOIN staff_memberships sm ON sm.user_id = u.id
      LEFT JOIN hospitals h ON h.id = sm.hospital_id
      LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
      ${whereClause}
      GROUP BY u.id, d.id, d.blood_type_code, d.registration_origin
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    params.push(filters.limit || 20, filters.offset || 0);
    const { rows } = await pool.query(dataQuery, params);

    return {
      users: rows,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getUserById(userId) {
    const { rows } = await pool.query(
      `SELECT u.id,
              u.full_name,
              u.email,
              u.phone,
              u.role,
              u.is_active,
              u.email_verified,
              u.created_at,
              d.id AS donor_profile_id,
              d.blood_type_code,
              d.registration_origin,
              d.available_for_contact,
              d.camp_notifications_opt_in
       FROM users u
       LEFT JOIN donors d ON d.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = rows[0];

    // Memberships
    const { rows: memberships } = await pool.query(
      `SELECT sm.id,
              sm.hospital_id,
              h.name AS hospital_name,
              sm.blood_bank_id,
              bb.name AS blood_bank_name,
              sm.is_active
       FROM staff_memberships sm
       LEFT JOIN hospitals h ON h.id = sm.hospital_id
       LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
       WHERE sm.user_id = $1`,
      [userId],
    );

    // Recent audit logs
    const { rows: auditLogs } = await pool.query(
      `SELECT id, entity_name, entity_id, action, occurred_at
       FROM audit_logs
       WHERE actor_id = $1 OR entity_id = $1::text
       ORDER BY occurred_at DESC
       LIMIT 10`,
      [userId],
    );

    return {
      ...user,
      memberships,
      auditLogs,
    };
  }

  async updateUserStatus(userId, { isActive, reason }, adminUser) {
    return inTransaction(async (client) => {
      const { rows: targetRows } = await client.query(
        'SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE',
        [userId],
      );

      if (targetRows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const target = targetRows[0];

      // Safeguard: Prevent deactivation of the last active system administrator
      if (target.role === 'ADMIN' && !isActive) {
        const { rows: adminCountRows } = await client.query(
          'SELECT count(*)::int AS count FROM users WHERE role = \'ADMIN\' AND is_active = true AND id != $1',
          [userId],
        );
        const remainingAdmins = adminCountRows[0]?.count || 0;
        if (remainingAdmins === 0) {
          throw new BadRequestError('Cannot deactivate the last active system administrator');
        }
      }

      // Update active status
      const { rows: updatedRows } = await client.query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, full_name, email, role, is_active, created_at',
        [isActive, userId],
      );

      // Invalidate active auth sessions when deactivated
      if (!isActive) {
        await client.query(
          'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
          [userId],
        );
      }

      // Audit log
      const action = isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED';
      await client.query(
        `INSERT INTO audit_logs (actor_id, entity_name, entity_id, action)
         VALUES ($1, 'users', $2, $3)`,
        [adminUser.id, userId.toString(), `${action}${reason ? `: ${reason}` : ''}`],
      );

      return updatedRows[0];
    });
  }
}

export const usersService = new UsersService();
