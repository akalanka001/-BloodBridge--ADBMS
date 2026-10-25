import { pool, inTransaction } from '../../db.js';

function maskDestination(dest) {
  if (!dest) return null;
  if (dest.includes('@')) {
    const [user, domain] = dest.split('@');
    return `${user.slice(0, 1)}***@${domain}`;
  }
  if (dest.length >= 7) {
    return `${dest.slice(0, 3)}****${dest.slice(-3)}`;
  }
  return '***';
}

export class NotificationsRepository {
  async getUserNotifications(userId, filters = {}) {
    const params = [userId];
    const conditions = ['n.recipient_user_id = $1'];
    if (filters.category) {
      params.push(filters.category);
      conditions.push(filters.category === 'EMERGENCY' ? `(n.category = $${params.length} OR n.priority = 'EMERGENCY')` : `n.category = $${params.length}`);
    }
    if (filters.status) { params.push(filters.status); conditions.push(`n.status = $${params.length}`); }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(n.title ILIKE $${params.length} OR n.message ILIKE $${params.length})`);
    }
    const where = conditions.join(' AND ');
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const { rows: totalRows } = await pool.query(
      `SELECT count(*)::int AS total FROM notifications n WHERE ${where}`,
      params,
    );
    const total = totalRows[0]?.total || 0;
    const { rows } = await pool.query(
      `SELECT n.id, n.recipient_user_id, n.camp_id, c.title AS camp_title,
              n.request_id, n.title, n.message, n.channel, n.priority,
              n.category, n.status, n.created_at
       FROM notifications n
       LEFT JOIN donation_camps c ON c.id = n.camp_id
       WHERE ${where}
       ORDER BY n.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS unread_count
       FROM notifications
       WHERE recipient_user_id = $1 AND status = 'UNREAD'`,
      [userId],
    );

    return {
      notifications: rows,
      total,
      unreadCount: countRows[0]?.unread_count || 0,
      pagination: { limit, offset, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(notificationId, userId) {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET status = 'READ'
       WHERE id = $1 AND recipient_user_id = $2
       RETURNING *`,
      [notificationId, userId],
    );
    return rows[0] || null;
  }

  async markAllAsRead(userId) {
    const { rowCount } = await pool.query(
      `UPDATE notifications
       SET status = 'READ'
       WHERE recipient_user_id = $1 AND status = 'UNREAD'`,
      [userId],
    );
    return rowCount;
  }

  async createNotification(data, senderUserId = null) {
    return inTransaction(async (client) => {
      // 1. Insert in-app notification
      const { rows } = await client.query(
        `INSERT INTO notifications (
           recipient_user_id, camp_id, request_id, title, message, channel, priority, category
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.recipientUserId,
          data.campId || null,
          data.requestId || null,
          data.title,
          data.message,
          data.channel || 'IN_APP',
          data.priority || 'ROUTINE',
          data.category || 'CAMP',
        ],
      );
      const notification = rows[0];

      // 2. If channel is SMS or EMAIL, enqueue in notification_deliveries
      if (['SMS', 'EMAIL'].includes(data.channel)) {
        let destination = data.destination;
        if (!destination) {
          const { rows: uRows } = await client.query(
            'SELECT email, phone FROM users WHERE id = $1',
            [data.recipientUserId],
          );
          if (uRows.length > 0) {
            destination = data.channel === 'EMAIL' ? uRows[0].email : uRows[0].phone;
          }
        }

        if (destination) {
          const idempotencyKey =
            data.idempotencyKey ||
            `${data.recipientUserId}:${data.category}:${data.channel}:${data.campId || data.requestId || notification.id}`;

          await client.query(
            `INSERT INTO notification_deliveries (
               notification_id, recipient_user_id, channel, destination,
               subject, body, idempotency_key
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (idempotency_key) DO NOTHING`,
            [
              notification.id,
              data.recipientUserId,
              data.channel,
              destination,
              data.title,
              data.message,
              idempotencyKey,
            ],
          );
        }
      }

      return notification;
    });
  }

  async getDeliveryStatusLog(filters = {}, institutionScope = null) {
    const params = [];
    const conditions = [];

    if (institutionScope?.bloodBankId) {
      params.push(institutionScope.bloodBankId);
      conditions.push(`(c.blood_bank_id = $${params.length} OR nd.channel = 'IN_APP')`);
    } else if (institutionScope?.hospitalId) {
      params.push(institutionScope.hospitalId);
      conditions.push(`(br.hospital_id = $${params.length} OR nd.channel = 'IN_APP')`);
    }

    if (filters.channel) { params.push(filters.channel); conditions.push(`nd.channel = $${params.length}`); }
    if (filters.status) { params.push(filters.status); conditions.push(`nd.status = $${params.length}`); }
    if (filters.search) { params.push(`%${filters.search}%`); conditions.push(`(u.full_name ILIKE $${params.length} OR nd.subject ILIKE $${params.length} OR nd.error_message ILIKE $${params.length})`); }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const joins = `FROM notification_deliveries nd
       LEFT JOIN notifications n ON n.id = nd.notification_id
       LEFT JOIN donation_camps c ON c.id = n.camp_id
       LEFT JOIN blood_requests br ON br.id = n.request_id
       LEFT JOIN users u ON u.id = nd.recipient_user_id`;
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total ${joins} ${whereClause}`, params);
    const total = countRows[0]?.total || 0;

    const { rows } = await pool.query(
      `SELECT nd.id, nd.notification_id, nd.recipient_user_id, u.full_name AS recipient_name,
              nd.channel, nd.destination, nd.subject, nd.status, nd.attempts,
              nd.max_attempts, nd.last_attempt_at, nd.error_message, nd.provider_message_id,
              nd.created_at, nd.updated_at
       ${joins}
       ${whereClause}
       ORDER BY nd.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return { data: rows.map((r) => ({
      ...r,
      destination: maskDestination(r.destination),
    })), pagination: { limit, offset, total, totalPages: Math.ceil(total / limit) } };
  }
}

export const notificationsRepository = new NotificationsRepository();
