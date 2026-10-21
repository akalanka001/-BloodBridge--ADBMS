import { pool, inTransaction } from '../../db.js';

export class TransfersRepository {
  async createTransfer({ transferCode, sourceBankId, targetBankId, requestedBy, unitIds, notes }) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO blood_bank_transfers (
           transfer_code, source_bank_id, target_bank_id, requested_by, status, notes
         )
         VALUES ($1, $2, $3, $4, 'REQUESTED', $5)
         RETURNING id, transfer_code, source_bank_id, target_bank_id, status, created_at`,
        [transferCode, sourceBankId, targetBankId, requestedBy, notes || null],
      );
      const transfer = rows[0];

      for (const unitId of unitIds) {
        await client.query(
          `INSERT INTO transfer_units (transfer_id, blood_unit_id) VALUES ($1, $2)`,
          [transfer.id, unitId],
        );
      }

      return transfer;
    });
  }

  async listTransfers(bankId = null) {
    const { rows } = await pool.query(
      `SELECT t.*,
              sb.name AS source_bank_name,
              tb.name AS target_bank_name,
              (SELECT count(*) FROM transfer_units tu WHERE tu.transfer_id = t.id)::int AS unit_count
       FROM blood_bank_transfers t
       JOIN blood_banks sb ON sb.id = t.source_bank_id
       JOIN blood_banks tb ON tb.id = t.target_bank_id
       WHERE ($1::bigint IS NULL OR t.source_bank_id = $1 OR t.target_bank_id = $1)
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [bankId || null],
    );
    return rows;
  }

  async dispatchTransfer(transferId, actorId) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_dispatch_blood_transfer($1, $2)', [transferId, actorId]);
      const { rows } = await client.query(
        'SELECT * FROM blood_bank_transfers WHERE id = $1',
        [transferId],
      );
      return rows[0];
    });
  }

  async receiveTransfer(transferId, actorId, notes = null) {
    return inTransaction(async (client) => {
      await client.query('CALL sp_receive_blood_transfer($1, $2, $3)', [transferId, actorId, notes]);
      const { rows } = await client.query(
        'SELECT * FROM blood_bank_transfers WHERE id = $1',
        [transferId],
      );
      return rows[0];
    });
  }
}

export const transfersRepository = new TransfersRepository();
