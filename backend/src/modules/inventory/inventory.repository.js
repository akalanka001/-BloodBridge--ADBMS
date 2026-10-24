import { pool, inTransaction } from '../../db.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../infrastructure/errors.js';

export class InventoryRepository {
  async getStockSummary(userId, role, bankId = null) {
    const params = [];
    let where = '';
    if (bankId) {
      params.push(bankId);
      where = `WHERE blood_bank_id = $1`;
    } else if (role === 'BANK_STAFF') {
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

  async getInventoryUnits(filters = {}, user, bankId = null) {
    const conditions = [];
    const params = [];
    let idx = 1;

    // Scope to bank
    const targetBankId = bankId || filters.bloodBankId;
    if (targetBankId) {
      conditions.push(`bu.blood_bank_id = $${idx++}`);
      params.push(targetBankId);
    } else if (user.role === 'BANK_STAFF') {
      conditions.push(`bu.blood_bank_id IN (
        SELECT blood_bank_id FROM staff_memberships
        WHERE user_id = $${idx++} AND is_active = true AND blood_bank_id IS NOT NULL
      )`);
      params.push(user.id);
    }

    if (filters.bloodTypeCode) {
      conditions.push(`bu.blood_type_code = $${idx++}`);
      params.push(filters.bloodTypeCode);
    }

    if (filters.componentCode) {
      conditions.push(`bu.component_code = $${idx++}`);
      params.push(filters.componentCode);
    }

    if (filters.releaseStatus) {
      conditions.push(`bu.release_status = $${idx++}`);
      params.push(filters.releaseStatus);
    }

    if (filters.inventoryStatus) {
      conditions.push(`bu.inventory_status = $${idx++}`);
      params.push(filters.inventoryStatus);
    }

    if (filters.search) {
      conditions.push(`(bu.id::text ILIKE $${idx} OR bu.blood_bank_name ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT bu.*
      FROM v_blood_bank_inventory_units bu
      ${whereClause}
      ORDER BY bu.created_at DESC
      LIMIT 200
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async getUnitById(unitId) {
    const { rows } = await pool.query(
      `SELECT * FROM v_blood_bank_inventory_units WHERE id = $1`,
      [unitId],
    );
    return rows[0] || null;
  }

  async releaseBloodUnit(unitId, staffUserId, releaseStatus, notes) {
    return inTransaction(async (client) => {
      await client.query(
        'CALL sp_release_blood_unit($1::uuid, $2::uuid, $3::text, $4::text)',
        [unitId, staffUserId, releaseStatus, notes || null],
      );

      const { rows } = await client.query(
        'SELECT * FROM v_blood_bank_inventory_units WHERE id = $1',
        [unitId],
      );
      return rows[0];
    });
  }

  async processDonationComponents(donationId, staffUserId, components) {
    return inTransaction(async (client) => {
      await client.query(
        'CALL sp_process_donation_components($1::uuid, $2::uuid, $3::jsonb)',
        [donationId, staffUserId, JSON.stringify(components)],
      );

      const { rows } = await client.query(
        'SELECT * FROM v_blood_bank_inventory_units WHERE donation_id = $1 ORDER BY component_code',
        [donationId],
      );
      return rows;
    });
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

  async getExpiryAlerts(bankId) {
    const params = [];
    let where = `WHERE bu.release_status = 'RELEASED' AND bu.inventory_status = 'IN_STOCK'`;

    if (bankId) {
      params.push(bankId);
      where += ` AND bu.blood_bank_id = $1`;
    }

    const { rows } = await pool.query(
      `SELECT bu.*,
              CASE
                WHEN bu.expires_at <= now() THEN 'EXPIRED'
                WHEN bu.expires_at <= now() + interval '48 hours' THEN 'CRITICAL'
                WHEN bu.expires_at <= now() + interval '7 days' THEN 'WARNING'
                ELSE 'NORMAL'
              END AS alert_urgency
       FROM v_blood_bank_inventory_units bu
       ${where}
       AND bu.expires_at <= now() + interval '7 days'
       ORDER BY bu.expires_at ASC
       LIMIT 100`,
      params,
    );
    return rows;
  }

  async getInventoryMovements(bankId = null, limit = 50) {
    const params = [limit];
    let where = '';
    if (bankId) {
      params.push(bankId);
      where = 'WHERE blood_bank_id = $2';
    }

    const { rows } = await pool.query(
      `SELECT * FROM v_inventory_movements_detail
       ${where}
       ORDER BY acted_at DESC
       LIMIT $1`,
      params,
    );
    return rows;
  }
}

export const inventoryRepository = new InventoryRepository();
