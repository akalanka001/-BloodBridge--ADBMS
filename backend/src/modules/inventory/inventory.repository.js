import { pool, inTransaction } from '../../db.js';

export class InventoryRepository {
  async getStockSummary(userId, role) {
    const params = [];
    let where = '';
    if (role === 'BANK_STAFF') {
      params.push(userId);
      where = `WHERE blood_bank_id IN (
        SELECT blood_bank_id FROM staff_memberships
        WHERE user_id = $1 AND is_active = true AND blood_bank_id IS NOT NULL
      )`;
    }
    const { rows } = await pool.query(
      `SELECT * FROM v_available_blood_stock
       ${where}
       ORDER BY blood_bank_name, blood_type_code
       LIMIT 300`,
      params,
    );
    return rows;
  }

  async reserveBloodUnit(requestItemId, bloodUnitId, reservedBy) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT fn_reserve_blood_unit($1, $2, $3) AS id',
        [requestItemId, bloodUnitId, reservedBy],
      );
      return rows[0];
    });
  }
}

export const inventoryRepository = new InventoryRepository();
