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
  async getUserNotifications(userId, limit = 50) {
    const { rows } = await pool.query(
      `SELECT n.id, n.recipient_user_id, n.camp_id, c.title AS camp_title,
              n.request_id, n.title, n.message, n.channel, n.priority,
              n.category, n.status, n.created_at
       FROM notifications n
       LEFT JOIN donation_camps c ON c.id = n.camp_id
       WHERE n.recipient_user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS unread_count
       FROM notifications
       WHERE recipient_user_id = $1 AND status = 'UNREAD'`,
      [userId],
    );

    return {
      notifications: rows,
      unreadCount: countRows[0]?.unread_count || 0,
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

  async getDeliveryStatusLog(limit = 100, institutionScope = null) {
    const params = [];
    let idx = 1;
    let whereClause = '';

    if (institutionScope?.bloodBankId) {
      whereClause = `WHERE (c.blood_bank_id = $${idx++} OR nd.channel = 'IN_APP')`;
      params.push(institutionScope.bloodBankId);
    } else if (institutionScope?.hospitalId) {
      whereClause = `WHERE (br.hospital_id = $${idx++} OR nd.channel = 'IN_APP')`;
      params.push(institutionScope.hospitalId);
    }

    params.push(limit);

    const { rows } = await pool.query(
      `SELECT nd.id, nd.notification_id, nd.recipient_user_id, u.full_name AS recipient_name,
              nd.channel, nd.destination, nd.subject, nd.status, nd.attempts,
              nd.max_attempts, nd.last_attempt_at, nd.error_message, nd.provider_message_id,
              nd.created_at, nd.updated_at
       FROM notification_deliveries nd
       LEFT JOIN notifications n ON n.id = nd.notification_id
       LEFT JOIN donation_camps c ON c.id = n.camp_id
       LEFT JOIN blood_requests br ON br.id = n.request_id
       LEFT JOIN users u ON u.id = nd.recipient_user_id
       ${whereClause}
       ORDER BY nd.created_at DESC
       LIMIT $${idx}`,
      params,
    );

    return rows.map((r) => ({
      ...r,
      destination: maskDestination(r.destination),
    }));
  }
}

export const notificationsRepository = new NotificationsRepository();
