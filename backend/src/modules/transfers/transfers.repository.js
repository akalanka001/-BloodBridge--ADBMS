import { pool, inTransaction } from '../../db.js';

export class TransfersRepository {
  async verifyUnitsBelongToBank(unitIds, bankId) {
    if (!unitIds || !unitIds.length) return true;
    const { rows } = await pool.query(
      `SELECT count(*)::int AS cnt FROM blood_units
       WHERE id = ANY($1::uuid[]) AND blood_bank_id = $2`,
      [unitIds, bankId],
    );
    return rows[0].cnt === unitIds.length;
  }

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

  async getTransferById(transferId) {
    const { rows } = await pool.query(
      `SELECT t.*,
              sb.name AS source_bank_name,
              tb.name AS target_bank_name,
              u_req.full_name AS requested_by_name,
              u_disp.full_name AS dispatched_by_name,
              u_rec.full_name AS received_by_name
       FROM blood_bank_transfers t
       JOIN blood_banks sb ON sb.id = t.source_bank_id
       JOIN blood_banks tb ON tb.id = t.target_bank_id
       LEFT JOIN users u_req ON u_req.id = t.requested_by
       LEFT JOIN users u_disp ON u_disp.id = t.dispatched_by
       LEFT JOIN users u_rec ON u_rec.id = t.received_by
       WHERE t.id = $1`,
      [transferId],
    );

    if (!rows.length) return null;
    const transfer = rows[0];

    const unitRows = await pool.query(
      `SELECT tu.blood_unit_id, bu.blood_type_code, bu.component_code,
              bu.release_status, bu.inventory_status, bu.expires_at, bu.volume_ml
       FROM transfer_units tu
       JOIN blood_units bu ON bu.id = tu.blood_unit_id
       WHERE tu.transfer_id = $1`,
      [transferId],
    );
    transfer.units = unitRows.rows;
    return transfer;
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
