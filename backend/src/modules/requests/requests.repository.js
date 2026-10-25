import { pool, inTransaction } from '../../db.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../infrastructure/errors.js';

export class RequestsRepository {
  async listRequestsByStaff(userId, filters = {}) {
    const conditions = ['EXISTS (SELECT 1 FROM staff_memberships sm WHERE sm.hospital_id = br.hospital_id AND sm.user_id = $1 AND sm.is_active = true)'];
    const params = [userId];
    let paramIndex = 2;

    if (filters.hospitalId) {
      conditions.push(`br.hospital_id = $${paramIndex}`);
      params.push(filters.hospitalId);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`br.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.urgency) {
      conditions.push(`br.urgency = $${paramIndex}`);
      params.push(filters.urgency);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(br.id::text ILIKE $${paramIndex} OR br.hospital_name ILIKE $${paramIndex} OR br.notes ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.bloodTypeCode) {
      conditions.push(`EXISTS (
        SELECT 1 FROM request_items ri
        WHERE ri.request_id = br.id AND ri.blood_type_code = $${paramIndex}
      )`);
      params.push(filters.bloodTypeCode);
      paramIndex++;
    }

    if (filters.componentCode) {
      conditions.push(`EXISTS (
        SELECT 1 FROM request_items ri
        WHERE ri.request_id = br.id AND ri.component_code = $${paramIndex}
      )`);
      params.push(filters.componentCode);
      paramIndex++;
    }

    if (filters.fromDate) {
      conditions.push(`br.created_at >= $${paramIndex}`);
      params.push(filters.fromDate);
      paramIndex++;
    }

    if (filters.toDate) {
      conditions.push(`br.created_at <= $${paramIndex}`);
      params.push(filters.toDate);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const countResult = await pool.query(`SELECT count(*)::int AS total FROM v_hospital_requests_overview br WHERE ${where}`, params);
    const limit = filters.limit ?? 10;
    const offset = filters.offset ?? 0;
    const query = `
      SELECT br.*
      FROM v_hospital_requests_overview br
      WHERE ${where}
      ORDER BY br.created_at DESC, br.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const { rows } = await pool.query(query, [...params, limit, offset]);
    return { data: rows, pagination: { total: Number(countResult.rows[0]?.total ?? 0), limit, offset } };
  }

  async isStaffAtHospital(userId, hospitalId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM staff_memberships WHERE user_id = $1 AND hospital_id = $2 AND is_active = true',
      [userId, hospitalId],
    );
    return rows.length > 0;
  }

  async getUserHospitalId(userId) {
    const { rows } = await pool.query(
      'SELECT hospital_id FROM staff_memberships WHERE user_id = $1 AND is_active = true AND hospital_id IS NOT NULL LIMIT 1',
      [userId],
    );
    return rows[0]?.hospital_id || null;
  }

  async createBloodRequest(data, createdBy) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO blood_requests (hospital_id, created_by, urgency, needed_by, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, status, created_at, urgency, needed_by`,
        [data.hospitalId, createdBy, data.urgency, data.neededBy, data.notes ?? null],
      );
      const request = rows[0];

      for (const item of data.items) {
        await client.query(
          `INSERT INTO request_items (request_id, blood_type_code, component_code, units_requested)
           VALUES ($1, $2, $3, $4)`,
          [request.id, item.bloodTypeCode, item.componentCode, item.unitsRequested],
        );
      }

      // Record initial history
      await client.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, reason)
         VALUES ($1, NULL, 'OPEN', $2, 'Blood request submitted by hospital staff')`,
        [request.id, createdBy],
      );

      // Audit outbox event
      await client.query(
        `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          'blood_request:created',
          'blood_requests',
          request.id.toString(),
          JSON.stringify({
            requestId: request.id,
            hospitalId: data.hospitalId,
            urgency: data.urgency,
            neededBy: data.neededBy,
            itemCount: data.items.length,
          }),
        ],
      );

      return request;
    });
  }

  async getRequestById(requestId, userId) {
    const { rows } = await pool.query(
      `SELECT br.*
       FROM v_hospital_requests_overview br
       JOIN staff_memberships sm ON sm.hospital_id = br.hospital_id
       WHERE br.id = $1 AND sm.user_id = $2 AND sm.is_active = true`,
      [requestId, userId],
    );

    if (!rows.length) {
      return null;
    }

    const request = rows[0];

    // Status History
    const historyResult = await pool.query(
      `SELECT rsh.id, rsh.from_status, rsh.to_status, rsh.reason, rsh.changed_at,
              u.full_name AS changed_by_name
       FROM request_status_history rsh
       LEFT JOIN users u ON u.id = rsh.changed_by
       WHERE rsh.request_id = $1
       ORDER BY rsh.changed_at ASC`,
      [requestId],
    );
    request.history = historyResult.rows;

    // Fulfillments
    const fulfillmentsResult = await pool.query(
      `SELECT f.id, f.request_id, f.blood_bank_id, bb.name AS blood_bank_name,
              f.status, f.created_at, f.fulfilled_at, f.received_at, f.received_quantity,
              f.condition_notes, u.full_name AS receiver_name,
              (SELECT count(*)::int FROM fulfillment_units fu WHERE fu.fulfillment_id = f.id) AS units_count
       FROM fulfillments f
       JOIN blood_banks bb ON bb.id = f.blood_bank_id
       LEFT JOIN users u ON u.id = f.received_by
       WHERE f.request_id = $1
       ORDER BY f.created_at DESC`,
      [requestId],
    );
    request.fulfillments = fulfillmentsResult.rows;

    return request;
  }

  async getRequestProgress(requestId) {
    const { rows } = await pool.query(
      'SELECT fn_request_matching_summary($1) AS summary',
      [requestId],
    );
    return rows[0]?.summary || null;
  }

  async matchingStockForItem(item) {
    const { rows } = await pool.query(`SELECT count(DISTINCT blood_bank_id)::int AS facilities,
      count(*)::int AS units FROM blood_units
      WHERE blood_type_code = $1 AND component_code = $2 AND release_status = 'RELEASED'
      AND inventory_status = 'IN_STOCK' AND expires_at > now()`, [item.bloodTypeCode, item.componentCode]);
    return rows[0];
  }

  async cancelRequest(requestId, userId, reason) {
    return inTransaction(async (client) => {
      // Call procedure
      await client.query(
        'CALL sp_cancel_blood_request($1::uuid, $2::uuid, $3::text)',
        [requestId, userId, reason],
      );

      const { rows } = await client.query(
        'SELECT id, status FROM blood_requests WHERE id = $1',
        [requestId],
      );
      return rows[0];
    });
  }

  async getHospitalDashboard(hospitalId, userId) {
    const isStaff = await this.isStaffAtHospital(userId, hospitalId);
    if (!isStaff) {
      throw new ForbiddenError('Not assigned to requested hospital');
    }

    // 1. KPIs
    const kpiResult = await pool.query(
      `SELECT hospital_id, hospital_name, active_requests, critical_priority,
              fulfilled_this_month, active_appeals, total_requests
       FROM v_hospital_dashboard_kpis
       WHERE hospital_id = $1`,
      [hospitalId],
    );

    const kpis = kpiResult.rows[0] || {
      hospital_id: hospitalId,
      hospital_name: 'Hospital',
      active_requests: 0,
      critical_priority: 0,
      fulfilled_this_month: 0,
      active_appeals: 0,
      total_requests: 0,
    };

    // 2. Recent requests
    const recentResult = await pool.query(
      `SELECT br.*
       FROM v_hospital_requests_overview br
       WHERE br.hospital_id = $1
       ORDER BY br.created_at DESC
       LIMIT 5`,
      [hospitalId],
    );

    // 3. Urgent Shortages
    const urgentResult = await pool.query(
      `SELECT br.id, br.urgency, br.needed_by, ri.blood_type_code, ri.component_code,
              ri.units_requested, ri.id as item_id
       FROM blood_requests br
       JOIN request_items ri ON ri.request_id = br.id
       WHERE br.hospital_id = $1 AND br.status IN ('OPEN', 'PARTIALLY_FILLED') AND br.urgency IN ('CRITICAL', 'URGENT')
       ORDER BY (br.urgency = 'CRITICAL') DESC, br.needed_by ASC
       LIMIT 5`,
      [hospitalId],
    );

    // 4. Matching Overview for first active request
    let matchingOverview = null;
    const targetRequestId = urgentResult.rows[0]?.id || recentResult.rows[0]?.id;
    if (targetRequestId) {
      const summaryResult = await pool.query(
        'SELECT fn_request_matching_summary($1) AS summary',
        [targetRequestId],
      );
      matchingOverview = summaryResult.rows[0]?.summary || null;
    }

    return {
      kpis,
      recentRequests: recentResult.rows,
      urgentShortages: urgentResult.rows,
      matchingOverview,
    };
  }

  async getAvailableStockForHospital(hospitalId, userId) {
    const isStaff = await this.isStaffAtHospital(userId, hospitalId);
    if (!isStaff) {
      throw new ForbiddenError('Not assigned to requested hospital');
    }

    const { rows } = await pool.query(
      `SELECT bb.id AS blood_bank_id, bb.name AS blood_bank_name,
              loc.district_code, loc.town, bb.contact_phone,
              bu.blood_type_code, bu.component_code,
              COUNT(bu.id)::int AS available_units
       FROM blood_units bu
       JOIN blood_banks bb ON bb.id = bu.blood_bank_id
       JOIN locations loc ON loc.id = bb.location_id
       WHERE bu.release_status = 'RELEASED'
         AND bu.inventory_status = 'IN_STOCK'
         AND bu.expires_at > now()
       GROUP BY bb.id, bb.name, loc.district_code, loc.town, bb.contact_phone, bu.blood_type_code, bu.component_code
       ORDER BY bb.name, bu.blood_type_code, bu.component_code`,
    );

    return rows;
  }

  async confirmFulfillmentReceipt(fulfillmentId, userId, data) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT f.id, f.request_id, f.status, br.hospital_id
         FROM fulfillments f
         JOIN blood_requests br ON br.id = f.request_id
         WHERE f.id = $1
         FOR UPDATE OF f`,
        [fulfillmentId],
      );

      if (!rows.length) {
        throw new NotFoundError('Fulfillment delivery not found');
      }

      const fulfillment = rows[0];

      const membership = await client.query(
        `SELECT 1
         FROM staff_memberships sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.user_id = $1 AND sm.hospital_id = $2
           AND sm.is_active AND u.role = 'HOSPITAL_STAFF' AND u.is_active`,
        [userId, fulfillment.hospital_id],
      );
      if (!membership.rows[0]) {
        throw new ForbiddenError('Staff member not authorized for this hospital delivery');
      }

      if (fulfillment.status !== 'DISPATCHED') {
        throw new BadRequestError('Only dispatched fulfillments can be received');
      }

      await client.query(
        'CALL sp_receive_blood_fulfillment($1::uuid, $2::uuid, $3::integer, $4::text)',
        [fulfillmentId, userId, data.receivedQuantity, data.conditionNotes ?? null],
      );

      const updated = await client.query(
        `SELECT id, request_id, status, received_by, received_at,
                received_quantity, condition_notes
         FROM fulfillments WHERE id = $1`,
        [fulfillmentId],
      );
      return updated.rows[0];
    });
  }
}

export const requestsRepository = new RequestsRepository();
