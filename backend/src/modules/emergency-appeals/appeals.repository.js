import { pool, inTransaction } from '../../db.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../infrastructure/errors.js';

const STAGE_ORDER = {
  GN_DIVISION: 1,
  DS_DIVISION: 2,
  DISTRICT: 3,
  PROVINCE: 4,
  NATIONAL: 5,
};

const NEXT_STAGE = {
  GN_DIVISION: 'DS_DIVISION',
  DS_DIVISION: 'DISTRICT',
  DISTRICT: 'PROVINCE',
  PROVINCE: 'NATIONAL',
};

export class AppealsRepository {
  async isStaffAtHospital(userId, hospitalId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM staff_memberships WHERE user_id = $1 AND hospital_id = $2 AND is_active = true',
      [userId, hospitalId],
    );
    return rows.length > 0;
  }

  async countCandidates(bloodTypeCode, geoContext, stageName, appealId = null) {
    const geo = typeof geoContext === 'string' ? { districtCode: geoContext } : (geoContext || {});
    const districtCode = geo.districtCode;
    const dsCode = geo.dsCode;
    const gnCode = geo.gnCode;

    // Strict clinical outreach criteria:
    // 1. Exact target blood group (avoid blanket O- outreach fallback across components)
    // 2. Active contact availability & explicit emergency outreach consent
    // 3. Exclude active deferrals (permanent or active temporary)
    // 4. Exclude recent donations within 120-day interval
    // 5. Exclude donors with active pending invitations
    let query = `
      SELECT COUNT(DISTINCT d.id)::int AS count
      FROM donors d
      JOIN donor_consents dc ON dc.donor_id = d.id
      WHERE d.blood_type_code = $1
        AND d.available_for_contact = TRUE
        AND dc.contact_allowed = TRUE
        AND dc.emergency_appeal_opt_in = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM donor_assessments da
          WHERE da.donor_id = d.id
            AND (
              da.status = 'PERMANENT_DEFERRAL'
              OR (da.status = 'TEMPORARY_DEFERRAL' AND da.deferral_until >= CURRENT_DATE)
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM donations dn
          WHERE dn.donor_id = d.id
            AND dn.process_status <> 'REJECTED'
            AND dn.collected_at >= (CURRENT_DATE - INTERVAL '120 days')
        )
        AND NOT EXISTS (
          SELECT 1 FROM donor_invitations di
          WHERE di.donor_id = d.id
            AND di.status = 'PENDING'
            AND (di.expires_at IS NULL OR di.expires_at > now())
        )
    `;
    const params = [bloodTypeCode];
    let paramIdx = 2;

    if (stageName === 'GN_DIVISION') {
      if (gnCode) {
        query += ` AND d.gn_code = $${paramIdx++}`;
        params.push(gnCode);
      } else if (dsCode) {
        query += ` AND d.ds_code = $${paramIdx++} AND d.gn_code IS NOT NULL`;
        params.push(dsCode);
      }
      if (districtCode) {
        query += ` AND d.district_code = $${paramIdx++}`;
        params.push(districtCode);
      }
    } else if (stageName === 'DS_DIVISION') {
      if (dsCode) {
        query += ` AND d.ds_code = $${paramIdx++}`;
        params.push(dsCode);
      }
      if (districtCode) {
        query += ` AND d.district_code = $${paramIdx++}`;
        params.push(districtCode);
      }
    } else if (stageName === 'DISTRICT') {
      if (districtCode) {
        query += ` AND d.district_code = $${paramIdx++}`;
        params.push(districtCode);
      }
    } else if (stageName === 'PROVINCE') {
      if (districtCode) {
        query += ` AND d.district_code IN (
          SELECT d2.code FROM districts d2
          WHERE d2.province_code = (SELECT d1.province_code FROM districts d1 WHERE d1.code = $${paramIdx++})
        )`;
        params.push(districtCode);
      }
    }
    // NATIONAL scope has no geographical restriction

    const { rows } = await pool.query(query, params);
    return rows[0]?.count || 0;
  }

  async createAppeal(data, userId) {
    return inTransaction(async (client) => {
      // 1. Verify hospital staff membership
      const isStaff = await this.isStaffAtHospital(userId, data.hospitalId);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized for this hospital');
      }

      // 2. Verify request & item exist and belong to hospital
      const itemResult = await client.query(
        `SELECT ri.id, ri.blood_type_code, ri.component_code, ri.units_requested,
                br.hospital_id, br.status AS request_status,
                loc.district_code, loc.ds_code, loc.gn_code
         FROM request_items ri
         JOIN blood_requests br ON br.id = ri.request_id
         JOIN hospitals h ON h.id = br.hospital_id
         LEFT JOIN locations loc ON loc.id = h.location_id
         WHERE ri.id = $1 AND br.id = $2 AND br.hospital_id = $3
         FOR UPDATE OF br`,
        [data.requestItemId, data.requestId, data.hospitalId],
      );

      if (!itemResult.rows.length) {
        throw new NotFoundError('Request item not found for this hospital');
      }

      const item = itemResult.rows[0];
      if (item.request_status === 'CANCELLED' || item.request_status === 'FULFILLED') {
        throw new BadRequestError(`Cannot appeal a ${item.request_status} request`);
      }

      // 3. Count candidates in initial stage
      const geoContext = {
        districtCode: item.district_code,
        dsCode: item.ds_code,
        gnCode: item.gn_code,
      };
      const candidateCount = await this.countCandidates(
        item.blood_type_code,
        geoContext,
        data.escalationLevel,
      );

      // 4. Insert emergency appeal
      const appealResult = await client.query(
        `INSERT INTO emergency_appeals (
           request_id, request_item_id, hospital_id, created_by,
           shortage_units, reason, escalation_level, status,
           target_blood_type, target_component_code, approved_by, approved_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, $4, now())
         RETURNING *`,
        [
          data.requestId,
          data.requestItemId,
          data.hospitalId,
          userId,
          data.shortageUnits,
          data.reason,
          data.escalationLevel,
          item.blood_type_code,
          item.component_code,
        ],
      );
      const appeal = appealResult.rows[0];

      // 5. Insert initial escalation step
      await client.query(
        `INSERT INTO appeal_escalation_steps (
           appeal_id, stage_order, stage_name, geo_code, candidates_identified, invitations_sent
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          appeal.id,
          STAGE_ORDER[data.escalationLevel] || 1,
          data.escalationLevel,
          item.district_code || 'LK',
          candidateCount,
          Math.min(candidateCount, data.shortageUnits * 4), // safe outreach ratio
        ],
      );

      // 6. Record in outbox
      await client.query(
        `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          'emergency_appeal:created',
          'emergency_appeals',
          appeal.id.toString(),
          JSON.stringify({
            appealId: appeal.id,
            requestId: data.requestId,
            hospitalId: data.hospitalId,
            shortageUnits: data.shortageUnits,
            bloodType: item.blood_type_code,
            candidatesFound: candidateCount,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      return appeal;
    });
  }

  async getAppealById(appealId, userId) {
    const { rows } = await pool.query(
      `SELECT ea.*, h.name AS hospital_name, loc.district_code AS hospital_district,
              u.full_name AS created_by_name
       FROM emergency_appeals ea
       JOIN hospitals h ON h.id = ea.hospital_id
       LEFT JOIN locations loc ON loc.id = h.location_id
       LEFT JOIN users u ON u.id = ea.created_by
       WHERE ea.id = $1`,
      [appealId],
    );

    if (!rows.length) {
      return null;
    }

    const appeal = rows[0];

    // Check staff access
    const isStaff = await this.isStaffAtHospital(userId, appeal.hospital_id);
    if (!isStaff) {
      throw new ForbiddenError('Staff member not authorized to view this appeal');
    }

    // Get escalation steps
    const stepsResult = await pool.query(
      `SELECT * FROM appeal_escalation_steps
       WHERE appeal_id = $1
       ORDER BY stage_order ASC`,
      [appealId],
    );
    appeal.steps = stepsResult.rows;

    return appeal;
  }

  async listAppealsByHospital(hospitalId, userId) {
    const isStaff = await this.isStaffAtHospital(userId, hospitalId);
    if (!isStaff) {
      throw new ForbiddenError('Staff member not authorized for this hospital');
    }

    const { rows } = await pool.query(
      `SELECT ea.*,
              COALESCE(
                (SELECT json_agg(s ORDER BY s.stage_order ASC)
                 FROM appeal_escalation_steps s
                 WHERE s.appeal_id = ea.id), '[]'::json
              ) AS steps
       FROM emergency_appeals ea
       WHERE ea.hospital_id = $1
       ORDER BY ea.created_at DESC`,
      [hospitalId],
    );

    return rows;
  }

  async escalateAppeal(appealId, userId, requestedTargetStage) {
    return inTransaction(async (client) => {
      // 1. Fetch appeal with lock
      const { rows } = await client.query(
        `SELECT ea.*, loc.district_code, loc.ds_code, loc.gn_code
         FROM emergency_appeals ea
         JOIN hospitals h ON h.id = ea.hospital_id
         LEFT JOIN locations loc ON loc.id = h.location_id
         WHERE ea.id = $1
         FOR UPDATE OF ea`,
        [appealId],
      );

      if (!rows.length) {
        throw new NotFoundError('Emergency appeal not found');
      }

      const appeal = rows[0];
      const isStaff = await this.isStaffAtHospital(userId, appeal.hospital_id);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized to escalate this appeal');
      }

      if (appeal.status !== 'ACTIVE') {
        throw new BadRequestError(`Cannot escalate appeal with status ${appeal.status}`);
      }

      if (appeal.expires_at && new Date(appeal.expires_at) <= new Date()) {
        await client.query(`UPDATE emergency_appeals SET status = 'EXPIRED', updated_at = now() WHERE id = $1`, [appeal.id]);
        throw new BadRequestError('Cannot escalate an expired emergency appeal');
      }

      // Determine next stage
      const nextStage = requestedTargetStage || NEXT_STAGE[appeal.escalation_level];
      if (!nextStage || STAGE_ORDER[nextStage] <= STAGE_ORDER[appeal.escalation_level]) {
        throw new BadRequestError(
          `Cannot escalate beyond current level: ${appeal.escalation_level}`,
        );
      }

      // Count new candidates
      const geoContext = {
        districtCode: appeal.district_code,
        dsCode: appeal.ds_code,
        gnCode: appeal.gn_code,
      };
      const candidateCount = await this.countCandidates(
        appeal.target_blood_type,
        geoContext,
        nextStage,
        appeal.id,
      );

      // Insert step
      await client.query(
        `INSERT INTO appeal_escalation_steps (
           appeal_id, stage_order, stage_name, geo_code, candidates_identified, invitations_sent
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          appeal.id,
          STAGE_ORDER[nextStage],
          nextStage,
          appeal.district_code || 'LK',
          candidateCount,
          Math.min(candidateCount, appeal.shortage_units * 6),
        ],
      );

      // Update appeal
      const updateResult = await client.query(
        `UPDATE emergency_appeals
         SET escalation_level = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [nextStage, appeal.id],
      );

      // Outbox
      await client.query(
        `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          'emergency_appeal:escalated',
          'emergency_appeals',
          appeal.id.toString(),
          JSON.stringify({
            appealId: appeal.id,
            escalatedStage: nextStage,
            candidatesFound: candidateCount,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      const updated = updateResult.rows[0];
      const steps = await client.query(
        'SELECT * FROM appeal_escalation_steps WHERE appeal_id = $1 ORDER BY stage_order ASC',
        [appeal.id],
      );
      updated.steps = steps.rows;
      return updated;
    });
  }
}

export const appealsRepository = new AppealsRepository();
