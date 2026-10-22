import { pool } from '../db.js';
import {
  getIO,
  broadcastTransferStatus,
  broadcastEmergencyRequest,
  broadcastCampCapacity,
  broadcastLowStockAlert,
} from '../socket.js';

export async function recordOutboxEvent(clientOrPool, eventType, aggregateType, aggregateId, payload) {
  const executor = clientOrPool || pool;
  const { rows } = await executor.query(
    `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, status, updated_at)
     VALUES ($1, $2, $3, $4, 'PENDING', now())
     RETURNING id, event_type, aggregate_type, aggregate_id, created_at, updated_at`,
    [eventType, aggregateType, aggregateId.toString(), JSON.stringify(payload)],
  );
  return rows[0];
}

export async function deliverOutboxEvent(event) {
  const io = getIO();
  if (!io) {
    throw new Error('Delivery channel unavailable: Socket.IO server not initialized');
  }

  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

  switch (event.event_type) {
    case 'TRANSFER_DISPATCHED':
    case 'TRANSFER_RECEIVED':
      broadcastTransferStatus(payload);
      break;

    case 'EMERGENCY_REQUEST':
      broadcastEmergencyRequest(payload);
      break;

    case 'CAMP_CAPACITY_UPDATED':
      broadcastCampCapacity(payload);
      break;

    case 'STOCK_LOW_ALERT':
      broadcastLowStockAlert(payload);
      break;

    case 'DONATION_COLLECTED':
      if (payload.bloodBankId) io.to(`bank:${payload.bloodBankId}`).emit('donation:collected', payload);
      io.to('role:admin').emit('donation:collected', payload);
      break;

    case 'DONOR_ACCOUNT_LINKED':
      if (payload.userId) io.to(`user:${payload.userId}`).emit('donor:linked', payload);
      io.to('role:admin').emit('donor:linked', payload);
      break;

    default:
      io.to('role:admin').emit(`event:${event.event_type.toLowerCase()}`, payload);
      break;
  }
}

export async function processOutboxBatch(batchSize = 20) {
  const client = await pool.connect();
  let claimedEvents = [];

  try {
    await client.query('BEGIN');

    // 1. Interrupted worker recovery: recover stale PROCESSING events older than 2 minutes
    await client.query(
      `UPDATE event_outbox
       SET status = 'PENDING',
           retry_count = retry_count + 1,
           last_error = 'Recovered from interrupted worker (stale PROCESSING state)',
           updated_at = now()
       WHERE status = 'PROCESSING'
         AND updated_at < now() - interval '2 minutes'`,
    );

    // 2. Claim pending or eligible failed events
    const { rows: events } = await client.query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload, retry_count
       FROM event_outbox
       WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5)
       ORDER BY id ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize],
    );

    if (events.length > 0) {
      const eventIds = events.map((e) => e.id);
      await client.query(
        `UPDATE event_outbox
         SET status = 'PROCESSING',
             updated_at = now()
         WHERE id = ANY($1)`,
        [eventIds],
      );
    }
    await client.query('COMMIT');
    claimedEvents = events;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Delivery phase: verify delivery before setting PUBLISHED
  const results = [];
  for (const ev of claimedEvents) {
    try {
      await deliverOutboxEvent(ev);
      await pool.query(
        `UPDATE event_outbox
         SET status = 'PUBLISHED',
             published_at = now(),
             updated_at = now(),
             last_error = NULL
         WHERE id = $1`,
        [ev.id],
      );
      results.push({ id: ev.id, success: true });
    } catch (deliveryErr) {
      const nextRetry = (ev.retry_count || 0) + 1;
      const nextStatus = nextRetry >= 5 ? 'FAILED' : 'PENDING';
      await pool.query(
        `UPDATE event_outbox
         SET status = $1,
             retry_count = $2,
             last_error = $3,
             updated_at = now()
         WHERE id = $4`,
        [nextStatus, nextRetry, deliveryErr.message, ev.id],
      );
      results.push({ id: ev.id, success: false, error: deliveryErr.message });
    }
  }

  return results;
}
