import { pool } from '../db.js';

export async function recordOutboxEvent(clientOrPool, eventType, aggregateType, aggregateId, payload) {
  const executor = clientOrPool || pool;
  const { rows } = await executor.query(
    `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING id, event_type, aggregate_type, aggregate_id, created_at`,
    [eventType, aggregateType, aggregateId.toString(), JSON.stringify(payload)],
  );
  return rows[0];
}

export async function processOutboxBatch(batchSize = 20) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: events } = await client.query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload
       FROM event_outbox
       WHERE status = 'PENDING'
       ORDER BY id ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize],
    );

    for (const ev of events) {
      await client.query(
        `UPDATE event_outbox
         SET status = 'PUBLISHED', published_at = now()
         WHERE id = $1`,
        [ev.id],
      );
    }
    await client.query('COMMIT');
    return events;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
