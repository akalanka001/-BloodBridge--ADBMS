import { pool, inTransaction } from '../../db.js';

export class IntakeRepository {
  async lookupDonors({ nationalIdHash, phone, fullName }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (nationalIdHash) {
      conditions.push(`d.national_id_hash = $${idx++}`);
      params.push(nationalIdHash);
    }
    if (phone) {
      conditions.push(`(d.phone = $${idx} OR u.phone = $${idx})`);
      params.push(phone);
      idx++;
    }
    if (fullName) {
      conditions.push(`(d.full_name ILIKE $${idx} OR u.full_name ILIKE $${idx})`);
      params.push(`%${fullName}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
    const sql = `
      SELECT d.id AS donor_id,
             COALESCE(d.full_name, u.full_name) AS full_name,
             COALESCE(d.phone, u.phone) AS phone,
             COALESCE(d.email, u.email) AS email,
             d.blood_type_code,
             d.district_code,
             d.ds_code,
             d.registration_origin,
             d.available_for_contact,
             d.camp_notifications_opt_in,
             d.user_id,
             (d.user_id IS NOT NULL) AS is_online_account,
             recent.last_donation_date,
             assess.latest_assessment_status,
             assess.deferral_until
      FROM donors d
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN LATERAL (
        SELECT max(don.collected_at) AS last_donation_date
        FROM donations don
        WHERE don.donor_id = d.id
      ) recent ON true
      LEFT JOIN LATERAL (
        SELECT da.status AS latest_assessment_status, da.deferral_until
        FROM donor_assessments da
        WHERE da.donor_id = d.id
        ORDER BY da.assessed_at DESC
        LIMIT 1
      ) assess ON true
      ${whereClause}
      ORDER BY full_name ASC
      LIMIT 20
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async createWalkInDonor(data, enrolledByUserId) {
    return inTransaction(async (client) => {
      const origin = data.campId ? 'CAMP_WALKIN' : 'STAFF_WALKIN';
      const { rows } = await client.query(
        `INSERT INTO donors (
           user_id, full_name, phone, email, national_id_hash,
           blood_type_code, district_code, ds_code,
           available_for_contact, camp_notifications_opt_in,
           registration_origin, enrolled_by, enrolled_at_bank_id, enrolled_at_camp_id
         )
         VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, full_name, phone, blood_type_code, registration_origin, created_at`,
        [
          data.fullName,
          data.phone,
          data.email || null,
          data.nationalIdHash || null,
          data.bloodTypeCode || null,
          data.districtCode,
          data.dsCode || null,
          data.availableForContact ?? false,
          data.campNotificationsOptIn ?? false,
          origin,
          enrolledByUserId,
          data.bloodBankId || null,
          data.campId || null,
        ],
      );
      const donor = rows[0];

      const contactAllowed = data.availableForContact ?? false;
      const campOptIn = data.campNotificationsOptIn ?? false;

      // Insert consent record
      await client.query(
        `INSERT INTO donor_consents (donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in)
         VALUES ($1, $2, $3, $4)`,
        [donor.id, contactAllowed, campOptIn, contactAllowed],
      );

      return donor;
    });
  }

  async createVisit({ donorId, bloodBankId, campId, checkedInBy, purpose, notes }) {
    const { rows } = await pool.query(
      `INSERT INTO donor_visits (donor_id, blood_bank_id, camp_id, checked_in_by, purpose, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'CHECKED_IN', $6)
       RETURNING id, donor_id, blood_bank_id, camp_id, purpose, status, visit_date, notes`,
      [donorId, bloodBankId || null, campId || null, checkedInBy, purpose, notes || null],
    );
    return rows[0];
  }

  async getVisitById(visitId) {
    const { rows } = await pool.query(
      `SELECT dv.*,
              COALESCE(d.full_name, u.full_name) AS donor_name,
              d.blood_type_code,
              bb.name AS blood_bank_name,
              c.title AS camp_title,
              da.id AS assessment_id,
              da.status AS assessment_status,
              da.hemoglobin_g_dl,
              da.weight_kg,
              da.deferral_reason,
              da.deferral_until
       FROM donor_visits dv
       JOIN donors d ON d.id = dv.donor_id
       LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN blood_banks bb ON bb.id = dv.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = dv.camp_id
       LEFT JOIN donor_assessments da ON da.visit_id = dv.id
       WHERE dv.id = $1`,
      [visitId],
    );
    return rows[0] || null;
  }

  async recordAssessment(visitId, assessedBy, data) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `CALL sp_record_donor_assessment($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
        [
          visitId,
          assessedBy,
          data.hemoglobin_g_dl || null,
          data.weight_kg || null,
          data.status,
          data.deferralReason || null,
          data.deferralUntil || null,
          data.notes || null,
        ],
      );
      const assessmentId = rows[0]?.p_assessment_id;
      const { rows: resultRows } = await client.query(
        'SELECT * FROM donor_assessments WHERE id = $1',
        [assessmentId],
      );
      return resultRows[0] || { id: assessmentId, status: data.status, visit_id: visitId };
    });
  }

  async recordCollection({ visitId, donorId, bloodBankId, campId, bloodTypeCode, collectedVolumeMl }, collectorId) {
    return inTransaction(async (client) => {
      const { rows } = await client.query(
        `CALL sp_record_donation_collection($1, $2, $3, $4, $5, $6, $7, NULL)`,
        [
          visitId,
          donorId,
          bloodBankId,
          campId || null,
          bloodTypeCode || null,
          collectedVolumeMl || 450,
          collectorId,
        ],
      );
      const donationId = rows[0]?.p_donation_id;
      const { rows: donRows } = await client.query(
        'SELECT id, donor_id, blood_bank_id, collected_at, collected_volume_ml, process_status FROM donations WHERE id = $1',
        [donationId],
      );
      return donRows[0] || { id: donationId, donor_id: donorId, blood_bank_id: bloodBankId };
    });
  }

  async listVisits(bankId = null, limit = 50) {
    const params = [limit];
    let where = '';
    if (bankId) {
      params.push(bankId);
      where = 'WHERE dv.blood_bank_id = $2';
    }
    const { rows } = await pool.query(
      `SELECT dv.*,
              COALESCE(d.full_name, u.full_name) AS donor_name,
              d.blood_type_code,
              bb.name AS blood_bank_name,
              da.status AS assessment_status
       FROM donor_visits dv
       JOIN donors d ON d.id = dv.donor_id
       LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN blood_banks bb ON bb.id = dv.blood_bank_id
       LEFT JOIN donor_assessments da ON da.visit_id = dv.id
       ${where}
       ORDER BY dv.visit_date DESC
       LIMIT $1`,
      params,
    );
    return rows;
  }

  async listDonations(bankId = null, limit = 50) {
    const params = [limit];
    let where = '';
    if (bankId) {
      params.push(bankId);
      where = 'WHERE don.blood_bank_id = $2';
    }
    const { rows } = await pool.query(
      `SELECT don.*,
              COALESCE(d.full_name, u.full_name) AS donor_name,
              d.blood_type_code,
              bb.name AS blood_bank_name
       FROM donations don
       JOIN donors d ON d.id = don.donor_id
       LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN blood_banks bb ON bb.id = don.blood_bank_id
       ${where}
       ORDER BY don.collected_at DESC
       LIMIT $1`,
      params,
    );
    return rows;
  }
}

export const intakeRepository = new IntakeRepository();
