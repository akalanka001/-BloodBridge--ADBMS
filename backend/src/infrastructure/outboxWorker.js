import { pool } from '../db.js';
import { sendEmail } from './emailProvider.js';
import { sendSms } from './smsProvider.js';

export async function recoverStaleDeliveries(clientOrPool = pool, staleMinutes = 2) {
  const executor = clientOrPool || pool;
  const { rows } = await executor.query(
    `UPDATE notification_deliveries
     SET status = 'PENDING',
         attempts = attempts + 1,
         error_message = 'Recovered from interrupted delivery worker',
         updated_at = now()
     WHERE status = 'PROCESSING'
       AND updated_at < now() - ($1 || ' minutes')::interval
     RETURNING id`,
    [staleMinutes],
  );
  return rows;
}

export async function processNotificationDeliveries(batchSize = 20) {
  const client = await pool.connect();
  const processed = [];

  try {
    await client.query('BEGIN');

    // 1. Recover stale processing entries
    await recoverStaleDeliveries(client, 2);

    // 2. Claim pending or retryable deliveries with row-level locks
    const { rows: deliveries } = await client.query(
      `SELECT nd.*,
              d.id AS donor_id,
              dc.sms_alerts,
              dc.email_alerts,
              dc.camp_notification_opt_in,
              dc.emergency_appeal_opt_in,
              dc.contact_allowed
       FROM notification_deliveries nd
       LEFT JOIN donors d ON d.user_id = nd.recipient_user_id
       LEFT JOIN donor_consents dc ON dc.donor_id = d.id
       WHERE nd.status = 'PENDING'
          OR (nd.status = 'FAILED' AND nd.attempts < nd.max_attempts)
       ORDER BY nd.created_at ASC
       LIMIT $1
       FOR UPDATE OF nd SKIP LOCKED`,
      [batchSize],
    );

    if (deliveries.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    // Mark as PROCESSING
    const ids = deliveries.map(d => d.id);
    await client.query(
      `UPDATE notification_deliveries
       SET status = 'PROCESSING', updated_at = now()
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    await client.query('COMMIT');

    // 3. Dispatch outside transaction to prevent holding locks during network I/O
    for (const item of deliveries) {
      try {
        // Consent check for donors
        if (item.donor_id) {
          if (item.contact_allowed === false) {
            await pool.query(
              `UPDATE notification_deliveries
               SET status = 'FAILED', attempts = max_attempts, error_message = 'Donor opted out of contact', updated_at = now()
               WHERE id = $1`,
              [item.id],
            );
            processed.push({ id: item.id, status: 'SKIPPED_NO_CONSENT' });
            continue;
          }

          if (item.channel === 'SMS' && item.sms_alerts === false) {
            await pool.query(
              `UPDATE notification_deliveries
               SET status = 'FAILED', attempts = max_attempts, error_message = 'Donor opted out of SMS alerts', updated_at = now()
               WHERE id = $1`,
              [item.id],
            );
            processed.push({ id: item.id, status: 'SKIPPED_NO_SMS_CONSENT' });
            continue;
          }

          if (item.channel === 'EMAIL' && item.email_alerts === false) {
            await pool.query(
              `UPDATE notification_deliveries
               SET status = 'FAILED', attempts = max_attempts, error_message = 'Donor opted out of Email alerts', updated_at = now()
               WHERE id = $1`,
              [item.id],
            );
            processed.push({ id: item.id, status: 'SKIPPED_NO_EMAIL_CONSENT' });
            continue;
          }
        }

        // Suppress delivery if related event (camp or request) was cancelled
        const { rows: evtRows } = await pool.query(
          `SELECT n.camp_id, n.request_id,
                  c.status AS camp_status,
                  br.status AS request_status
           FROM notifications n
           LEFT JOIN donation_camps c ON c.id = n.camp_id
           LEFT JOIN blood_requests br ON br.id = n.request_id
           WHERE n.id = $1`,
          [item.notification_id],
        );
        if (evtRows.length > 0) {
          const evt = evtRows[0];
          if (evt.camp_status === 'CANCELLED' || evt.request_status === 'CANCELLED') {
            await pool.query(
              `UPDATE notification_deliveries
               SET status = 'FAILED', attempts = max_attempts,
                   error_message = 'Cancelled event - delivery suppressed', updated_at = now()
               WHERE id = $1`,
              [item.id],
            );
            processed.push({ id: item.id, status: 'SKIPPED_CANCELLED_EVENT' });
            continue;
          }
        }

        let dispatchResult;
        if (item.channel === 'EMAIL') {
          dispatchResult = await sendEmail({
            to: item.destination,
            subject: item.subject || 'BloodBridge Alert',
            body: item.body,
            metadata: item.metadata,
          });
        } else if (item.channel === 'SMS') {
          dispatchResult = await sendSms({
            to: item.destination,
            message: item.body,
            metadata: item.metadata,
          });
        } else {
          // IN_APP channel is fulfilled automatically
          dispatchResult = { success: true, messageId: `inapp-${item.id}` };
        }

        await pool.query(
          `UPDATE notification_deliveries
           SET status = 'DELIVERED',
               provider_message_id = $1,
               last_attempt_at = now(),
               updated_at = now()
           WHERE id = $2`,
          [dispatchResult.messageId, item.id],
        );
        processed.push({ id: item.id, status: 'DELIVERED' });
      } catch (err) {
        const nextAttempts = (item.attempts || 0) + 1;
        const nextStatus = nextAttempts >= (item.max_attempts || 3) ? 'FAILED' : 'PENDING';
        await pool.query(
          `UPDATE notification_deliveries
           SET status = $1,
               attempts = $2,
               error_message = $3,
               last_attempt_at = now(),
               updated_at = now()
           WHERE id = $4`,
          [nextStatus, nextAttempts, err.message || 'Dispatch failure', item.id],
        );
        processed.push({ id: item.id, status: nextStatus, error: err.message });
      }
    }

    return processed;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
