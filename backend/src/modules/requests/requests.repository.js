import { pool, inTransaction } from '../../db.js';

export class RequestsRepository {
  async listRequestsByStaff(userId) {
    const { rows } = await pool.query(
      `SELECT br.id, br.hospital_id, br.urgency, br.status, br.needed_by, br.created_at,
              h.name AS hospital_name
       FROM blood_requests br
       JOIN hospitals h ON h.id = br.hospital_id
       JOIN staff_memberships sm ON sm.hospital_id = br.hospital_id
       WHERE sm.user_id = $1 AND sm.is_active = true
       ORDER BY br.created_at DESC
       LIMIT 100`,
      [userId],
    );
    return rows;
  }

  async isStaffAtHospital(userId, hospitalId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM staff_memberships WHERE user_id = $1 AND hospital_id = $2 AND is_active = true',
      [userId, hospitalId],
    );
    return rows.length > 0;
  }

  async createBloodRequest(data, createdBy) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO blood_requests (hospital_id, created_by, urgency, needed_by, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, status, created_at`,
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

      return request;
    });
  }
}

export const requestsRepository = new RequestsRepository();
