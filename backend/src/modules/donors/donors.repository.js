import { pool, inTransaction } from '../../db.js';

export class DonorsRepository {
  async findDonorByUserId(userId, client = pool) {
    const { rows } = await client.query(
      `SELECT d.id, d.user_id, d.blood_type_code, d.district_code, dist.name AS district_name,
              d.ds_code, ds.name AS ds_name, d.gn_code, d.town, d.birth_date, d.weight_kg,
              d.available_for_contact, d.camp_notifications_opt_in,
              d.registration_origin, d.created_at,
              COALESCE(u.full_name, d.full_name) AS full_name,
              COALESCE(u.email, d.email) AS email,
              COALESCE(u.phone, d.phone) AS phone,
              COALESCE(cons.sms_alerts, FALSE) AS sms_alerts,
              COALESCE(cons.email_alerts, FALSE) AS email_alerts,
              COALESCE(cons.in_app_alerts, TRUE) AS in_app_alerts,
              COALESCE(cons.newsletter_opt_in, FALSE) AS newsletter_opt_in,
              (SELECT count(*)::int FROM donations dn WHERE dn.donor_id = d.id AND dn.process_status <> 'REJECTED') AS donation_count,
              (SELECT (count(*) > 0) FROM donations dn WHERE dn.donor_id = d.id AND dn.process_status = 'PROCESSED') AS is_medically_verified
       FROM donors d
       LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN districts dist ON dist.code = d.district_code
       LEFT JOIN ds_divisions ds ON ds.code = d.ds_code AND ds.district_code = d.district_code
       LEFT JOIN donor_consents cons ON cons.donor_id = d.id
       WHERE d.user_id = $1`,
      [userId],
    );
    return rows[0] || null;
  }

  async getDashboardSummary(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM v_donor_dashboard_summary WHERE user_id = $1`,
      [userId],
    );
    return rows[0] || null;
  }

  async getDonationJourney(donorId) {
    const { rows } = await pool.query(
      `SELECT to_char(collected_at, 'Mon') AS month,
              date_trunc('month', collected_at) AS month_date,
              count(*)::int AS count,
              sum(COALESCE(collected_volume_ml, 450))::int AS total_volume_ml
       FROM donations
       WHERE donor_id = $1 AND process_status <> 'REJECTED'
       GROUP BY 1, 2
       ORDER BY month_date ASC`,
      [donorId],
    );
    return rows;
  }

  async updateDonorPreferences(userId, prefs) {
    return inTransaction(async (client) => {
      const donorRes = await client.query(`SELECT id FROM donors WHERE user_id = $1`, [userId]);
      if (!donorRes.rows[0]) return null;
      const donorId = donorRes.rows[0].id;

      // Update donors base availability and camp notification opt-in
      const updateFields = [];
      const updateVals = [];
      let idx = 1;

      if (prefs.availableForContact !== undefined) {
        updateFields.push(`available_for_contact = $${idx++}`);
        updateVals.push(prefs.availableForContact);
      }
      if (prefs.campNotificationsOptIn !== undefined) {
        updateFields.push(`camp_notifications_opt_in = $${idx++}`);
        updateVals.push(prefs.campNotificationsOptIn);
      }

      if (updateFields.length > 0) {
        updateVals.push(donorId);
        await client.query(
          `UPDATE donors SET ${updateFields.join(', ')} WHERE id = $${idx}`,
          updateVals,
        );
      }

      // Upsert donor_consents with granular preferences (fires trg_log_donor_consent_change)
      const existingConsent = await client.query(
        `SELECT contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in,
                sms_alerts, email_alerts, in_app_alerts, newsletter_opt_in
         FROM donor_consents WHERE donor_id = $1`,
        [donorId],
      );

      const cur = existingConsent.rows[0] || {
        contact_allowed: true,
        camp_notification_opt_in: true,
        emergency_appeal_opt_in: true,
        sms_alerts: false,
        email_alerts: false,
        in_app_alerts: true,
        newsletter_opt_in: false,
      };

      const contactAllowed = prefs.availableForContact !== undefined ? prefs.availableForContact : cur.contact_allowed;
      const campOptIn = prefs.campNotificationsOptIn !== undefined ? prefs.campNotificationsOptIn : cur.camp_notification_opt_in;
      const emergencyOptIn = prefs.emergencyAppealOptIn !== undefined ? prefs.emergencyAppealOptIn : cur.emergency_appeal_opt_in;
      const smsAlerts = prefs.smsAlerts !== undefined ? prefs.smsAlerts : cur.sms_alerts;
      const emailAlerts = prefs.emailAlerts !== undefined ? prefs.emailAlerts : cur.email_alerts;
      const inAppAlerts = prefs.inAppAlerts !== undefined ? prefs.inAppAlerts : cur.in_app_alerts;
      const newsletterOptIn = prefs.newsletterOptIn !== undefined ? prefs.newsletterOptIn : cur.newsletter_opt_in;

      const consentRes = await client.query(
        `INSERT INTO donor_consents (
           donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in,
           sms_alerts, email_alerts, in_app_alerts, newsletter_opt_in, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (donor_id) DO UPDATE
         SET contact_allowed = EXCLUDED.contact_allowed,
             camp_notification_opt_in = EXCLUDED.camp_notification_opt_in,
             emergency_appeal_opt_in = EXCLUDED.emergency_appeal_opt_in,
             sms_alerts = EXCLUDED.sms_alerts,
             email_alerts = EXCLUDED.email_alerts,
             in_app_alerts = EXCLUDED.in_app_alerts,
             newsletter_opt_in = EXCLUDED.newsletter_opt_in,
             updated_at = now()
         RETURNING contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in,
                   sms_alerts, email_alerts, in_app_alerts, newsletter_opt_in`,
        [donorId, contactAllowed, campOptIn, emergencyOptIn, smsAlerts, emailAlerts, inAppAlerts, newsletterOptIn],
      );

      return {
        donorId,
        availableForContact: contactAllowed,
        campNotificationsOptIn: campOptIn,
        ...consentRes.rows[0],
      };
    });
  }

  async updateDonorProfile(userId, data) {
    return inTransaction(async (client) => {
      const donorRes = await client.query(
        `SELECT d.id, d.blood_type_code,
                (SELECT count(*) FROM donations WHERE donor_id = d.id AND process_status = 'PROCESSED') AS verified_count
         FROM donors d WHERE d.user_id = $1`,
        [userId],
      );
      if (!donorRes.rows[0]) return null;
      const donor = donorRes.rows[0];

      // Update user account details if name or phone provided
      if (data.fullName !== undefined || data.phone !== undefined) {
        await client.query(
          `UPDATE users
           SET full_name = COALESCE($1, full_name),
               phone = COALESCE($2, phone)
           WHERE id = $3`,
          [data.fullName || null, data.phone || null, userId],
        );
      }

      // Update donor record fields
      const fields = [];
      const values = [];
      let idx = 1;

      // Protection: Do not allow user input to overwrite a medically verified blood group
      if (data.bloodTypeCode !== undefined) {
        const isMedicallyVerified = Number(donor.verified_count) > 0;
        if (!isMedicallyVerified || donor.blood_type_code == null) {
          fields.push(`blood_type_code = $${idx++}`);
          values.push(data.bloodTypeCode);
        }
      }

      if (data.districtCode !== undefined) {
        fields.push(`district_code = $${idx++}`);
        values.push(data.districtCode);
      }
      if (data.dsCode !== undefined) {
        fields.push(`ds_code = $${idx++}`);
        values.push(data.dsCode);
      }
      if (data.gnCode !== undefined) {
        fields.push(`gn_code = $${idx++}`);
        values.push(data.gnCode);
      }
      if (data.town !== undefined) {
        fields.push(`town = $${idx++}`);
        values.push(data.town);
      }
      if (data.birthDate !== undefined) {
        fields.push(`birth_date = $${idx++}`);
        values.push(data.birthDate);
      }
      if (data.weightKg !== undefined) {
        fields.push(`weight_kg = $${idx++}`);
        values.push(data.weightKg);
      }

      if (fields.length > 0) {
        values.push(donor.id);
        await client.query(
          `UPDATE donors SET ${fields.join(', ')} WHERE id = $${idx}`,
          values,
        );
      }

      return this.findDonorByUserId(userId, client);
    });
  }

  async getNextReviewDate(donorId) {
    const { rows } = await pool.query(
      `SELECT fn_donor_next_review_date($1) AS review_info`,
      [donorId],
    );
    return rows[0]?.review_info || null;
  }

  async listVerifiedDonations(donorId) {
    const { rows } = await pool.query(
      `SELECT * FROM v_verified_donation_history WHERE donor_id = $1`,
      [donorId],
    );
    return rows;
  }

  async listInvitations(donorId) {
    const { rows } = await pool.query(
      `SELECT di.id, di.title, di.message, di.area_description, di.blood_type_code,
              di.urgency, di.status, di.expires_at, di.responded_at, di.created_at,
              bb.name AS blood_bank_name,
              h.name AS hospital_name
       FROM donor_invitations di
       LEFT JOIN blood_banks bb ON bb.id = di.blood_bank_id
       LEFT JOIN hospitals h ON h.id = di.hospital_id
       WHERE di.donor_id = $1
       ORDER BY di.created_at DESC`,
      [donorId],
    );
    return rows;
  }

  async respondToInvitation(donorId, invitationId, response) {
    const { rows } = await pool.query(
      `UPDATE donor_invitations
       SET status = $1, responded_at = now()
       WHERE id = $2 AND donor_id = $3
       RETURNING id, status, responded_at`,
      [response, invitationId, donorId],
    );
    return rows[0] || null;
  }

  async listAppointments(donorId) {
    const { rows } = await pool.query(
      `SELECT da.id, da.appointment_date, da.time_slot, da.donation_type, da.status,
              da.notes, da.created_at,
              bb.id AS blood_bank_id,
              bb.name AS blood_bank_name,
              c.id AS camp_id,
              c.title AS camp_title
       FROM donor_appointments da
       LEFT JOIN blood_banks bb ON bb.id = da.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = da.camp_id
       WHERE da.donor_id = $1
       ORDER BY da.appointment_date DESC, da.created_at DESC`,
      [donorId],
    );
    return rows;
  }

  async createAppointment(donorId, data) {
    const { rows } = await pool.query(
      `INSERT INTO donor_appointments (
         donor_id, blood_bank_id, camp_id, appointment_date, time_slot, donation_type, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, donor_id, blood_bank_id, camp_id, appointment_date, time_slot, donation_type, status, notes, created_at`,
      [
        donorId,
        data.bloodBankId || null,
        data.campId || null,
        data.appointmentDate,
        data.timeSlot,
        data.donationType || 'WHOLE_BLOOD',
        data.notes || null,
      ],
    );
    return rows[0];
  }

  async cancelAppointment(donorId, appointmentId) {
    const { rows } = await pool.query(
      `UPDATE donor_appointments
       SET status = 'CANCELLED', updated_at = now()
       WHERE id = $1 AND donor_id = $2 AND status = 'BOOKED'
       RETURNING id, status, updated_at`,
      [appointmentId, donorId],
    );
    return rows[0] || null;
  }

  async createLinkClaim(userId, donorId, verificationNotes) {
    const { rows } = await pool.query(
      `INSERT INTO donor_account_claims (user_id, donor_id, verification_notes, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, user_id, donor_id, status, claimed_at`,
      [userId, donorId, verificationNotes || null],
    );
    return rows[0];
  }

  async listLinkClaims(userId) {
    const { rows } = await pool.query(
      `SELECT dac.id, dac.donor_id, dac.status, dac.verification_notes, dac.claimed_at, dac.reviewed_at,
              d.blood_type_code, d.district_code, dist.name AS district_name
       FROM donor_account_claims dac
       LEFT JOIN donors d ON d.id = dac.donor_id
       LEFT JOIN districts dist ON dist.code = d.district_code
       WHERE dac.user_id = $1
       ORDER BY dac.claimed_at DESC`,
      [userId],
    );
    return rows;
  }

  async listVisitsByDonorId(donorId) {
    const { rows } = await pool.query(
      `SELECT dv.id, dv.visit_date, dv.purpose, dv.status, dv.notes,
              bb.name AS blood_bank_name,
              c.title AS camp_title,
              da.status AS assessment_status,
              da.deferral_reason,
              da.deferral_until
       FROM donor_visits dv
       LEFT JOIN blood_banks bb ON bb.id = dv.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = dv.camp_id
       LEFT JOIN donor_assessments da ON da.visit_id = dv.id
       WHERE dv.donor_id = $1
       ORDER BY dv.visit_date DESC`,
      [donorId],
    );
    return rows;
  }
}

export const donorsRepository = new DonorsRepository();
