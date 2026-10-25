import { pool } from '../../db.js';

export class AuditService {
  async listAuditLogs(filters = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.actorId) {
      conditions.push(`al.actor_id = $${idx}`);
      params.push(filters.actorId);
      idx++;
    }

    if (filters.entityName) {
      conditions.push(`al.entity_name = $${idx}`);
      params.push(filters.entityName);
      idx++;
    }

    if (filters.action) {
      conditions.push(`al.action ILIKE $${idx}`);
      params.push(`%${filters.action}%`);
      idx++;
    }

    if (filters.startDate) {
      conditions.push(`al.occurred_at >= $${idx}`);
      params.push(filters.startDate);
      idx++;
    }

    if (filters.endDate) {
      conditions.push(`al.occurred_at <= $${idx}`);
      params.push(filters.endDate);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT count(*)::int AS total FROM audit_logs al ${whereClause}`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = countRows[0]?.total || 0;

    const query = `
      SELECT al.id,
             al.actor_id,
             u.full_name AS actor_name,
             u.email AS actor_email,
             u.role AS actor_role,
             al.entity_name,
             al.entity_id,
             al.action,
             al.occurred_at
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      ${whereClause}
      ORDER BY al.occurred_at DESC, al.id DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    params.push(filters.limit || 50, filters.offset || 0);
    const { rows } = await pool.query(query, params);

    return {
      logs: rows,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }
}

export const auditService = new AuditService();
