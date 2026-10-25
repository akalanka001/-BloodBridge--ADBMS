import { pool, inTransaction } from '../../db.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../infrastructure/errors.js';

export class DonorsRepository {
  async findDonorByUserId(userId, client = pool) {
    const { rows } = await client.query(
      `SELECT d.id, d.user_id, d.blood_type_code, d.district_code, dist.name AS district_name,
              d.ds_code, ds.name AS ds_name, d.gn_code, d.town, d.birth_date::text AS birth_date, d.weight_kg,
              dist.province_code, u.email_verified,
              d.available_for_contact, d.camp_notifications_opt_in,
              d.registration_origin, d.created_at,
              COALESCE(u.full_name, d.full_name) AS full_name,
              COALESCE(u.email, d.email) AS email,
              COALESCE(u.phone, d.phone) AS phone,
              COALESCE(cons.sms_alerts, FALSE) AS sms_alerts,
              COALESCE(cons.email_alerts, FALSE) AS email_alerts,
              COALESCE(cons.in_app_alerts, TRUE) AS in_app_alerts,
              COALESCE(cons.newsletter_opt_in, FALSE) AS newsletter_opt_in,
              COALESCE(cons.contact_allowed, FALSE) AS contact_allowed,
              COALESCE(cons.emergency_appeal_opt_in, FALSE) AS emergency_appeal_opt_in,
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
      const donorRes = await client.query(`SELECT id, available_for_contact, camp_notifications_opt_in FROM donors WHERE user_id = $1 FOR UPDATE`, [userId]);
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
        contact_allowed: donorRes.rows[0].available_for_contact,
        camp_notification_opt_in: donorRes.rows[0].camp_notifications_opt_in,
        emergency_appeal_opt_in: false,
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

  async listVerifiedDonations(donorId, filters = {}) {
    const params = [donorId];
    const conditions = ['donor_id = $1'];
    if (filters.search) { params.push(`%${filters.search}%`); conditions.push(`(location_name ILIKE $${params.length} OR blood_bank_name ILIKE $${params.length} OR camp_title ILIKE $${params.length})`); }
    if (filters.year) { params.push(Number(filters.year)); conditions.push(`EXTRACT(YEAR FROM collected_at) = $${params.length}`); }
    const where = conditions.join(' AND ');
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total FROM v_verified_donation_history WHERE ${where}`, params);
    const total = countRows[0]?.total || 0;
    const { rows } = await pool.query(
      `SELECT * FROM v_verified_donation_history WHERE ${where}
       ORDER BY collected_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return { data: rows, pagination: { limit, offset, total, totalPages: Math.ceil(total / limit) } };
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
    const validResponses = ['INTERESTED', 'UNAVAILABLE', 'DISMISSED'];
    if (!validResponses.includes(response)) {
      throw new BadRequestError(`Invalid response: ${response}. Must be one of ${validResponses.join(', ')}`);
    }

    return inTransaction(async (client) => {
      // 1. Fetch invitation with row lock to serialize concurrent responses
      const { rows } = await client.query(
        `SELECT di.*, ea.status AS appeal_status, ea.expires_at AS appeal_expires_at
         FROM donor_invitations di
         LEFT JOIN emergency_appeals ea ON ea.id = di.request_id
         WHERE di.id = $1 AND di.donor_id = $2
         FOR UPDATE OF di`,
        [invitationId, donorId],
      );

      if (!rows.length) {
        throw new NotFoundError('Invitation not found for this donor');
      }

      const inv = rows[0];

      // 2. Reject if already answered (not PENDING)
      if (inv.status !== 'PENDING') {
        throw new ConflictError(`Invitation has already been answered with status: ${inv.status}`);
      }

      // 3. Reject if expired
      if (inv.expires_at && new Date(inv.expires_at) <= new Date()) {
        throw new BadRequestError('Invitation has expired and can no longer be accepted');
      }

      // 4. If linked to an appeal, check appeal state
      if (inv.appeal_status && (inv.appeal_status === 'CANCELLED' || inv.appeal_status === 'EXPIRED')) {
        throw new BadRequestError(`Associated emergency appeal is ${inv.appeal_status}`);
      }

      // 5. Atomic conditional update with server-generated timestamp
      const updateRes = await client.query(
        `UPDATE donor_invitations
         SET status = $1, responded_at = now()
         WHERE id = $2 AND donor_id = $3 AND status = 'PENDING'
         RETURNING id, status, responded_at, donor_id, title`,
        [response, invitationId, donorId],
      );

      if (!updateRes.rows.length) {
        throw new ConflictError('Concurrent modification detected on invitation response');
      }

      // Audit outbox event
      await client.query(
        `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [
          'donor_invitation:responded',
          'donor_invitations',
          invitationId.toString(),
          JSON.stringify({
            invitationId,
            donorId,
            response,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      return updateRes.rows[0];
    });
  }

  async listAppointments(donorId, filters = {}) {
    const conditions = ['da.donor_id = $1'];
    const params = [donorId];
    if (filters.search) { params.push(`%${filters.search}%`); conditions.push(`(bb.name ILIKE $${params.length} OR c.title ILIKE $${params.length})`); }
    const where = conditions.join(' AND ');
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;
    const joins = `FROM donor_appointments da
       LEFT JOIN blood_banks bb ON bb.id = da.blood_bank_id
       LEFT JOIN donation_camps c ON c.id = da.camp_id`;
    const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total ${joins} WHERE ${where}`, params);
    const total = countRows[0]?.total || 0;
    const { rows } = await pool.query(
      `SELECT da.id, da.appointment_date, da.time_slot, da.donation_type, da.status,
              da.notes, da.created_at,
              bb.id AS blood_bank_id,
              bb.name AS blood_bank_name,
              c.id AS camp_id,
              c.title AS camp_title
       ${joins}
       WHERE ${where}
       ORDER BY da.appointment_date DESC, da.created_at DESC, da.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return { data: rows, pagination: { limit, offset, total, totalPages: Math.ceil(total / limit) } };
  }

  async createAppointment(donorId, data) {
    return inTransaction(async (client) => {
      // 1. Validate appointment date is in future / today
      const todayStr = new Date().toISOString().split('T')[0];
      if (data.appointmentDate < todayStr) {
        throw new BadRequestError('Appointment date cannot be in the past');
      }

      // 2. Validate facility/session exists and is verified/approved
      let facilityName = 'Blood Bank';
      let maxSlotCapacity = 5;

      if (data.bloodBankId) {
        const bankRes = await client.query(
          `SELECT id, name, is_verified FROM blood_banks WHERE id = $1`,
          [data.bloodBankId],
        );
        if (!bankRes.rows.length) {
          throw new NotFoundError('Selected blood bank not found');
        }
        if (!bankRes.rows[0].is_verified) {
          throw new BadRequestError('Selected blood bank is not verified for appointment bookings');
        }
        facilityName = bankRes.rows[0].name;
      } else if (data.campId) {
        const campRes = await client.query(
          `SELECT id, title, status, starts_at, ends_at, capacity FROM donation_camps WHERE id = $1`,
          [data.campId],
        );
        if (!campRes.rows.length) {
          throw new NotFoundError('Selected donation camp not found');
        }
        const camp = campRes.rows[0];
        if (camp.status !== 'APPROVED') {
          throw new BadRequestError(`Cannot book appointment for a camp with status ${camp.status}`);
        }
        const appDate = new Date(data.appointmentDate);
        const campStart = new Date(camp.starts_at);
        const campEnd = new Date(camp.ends_at);
        campStart.setHours(0, 0, 0, 0);
        campEnd.setHours(23, 59, 59, 999);
        if (appDate < campStart || appDate > campEnd) {
          throw new BadRequestError('Appointment date is outside the approved camp dates');
        }
        facilityName = camp.title;
        if (camp.capacity) {
          maxSlotCapacity = Math.max(1, Math.min(maxSlotCapacity, Math.ceil(camp.capacity / 8)));
        }
      } else {
        throw new BadRequestError('Either bloodBankId or campId must be specified');
      }

      // 3. Prevent duplicate active booking by the same donor on the same date
      const dupRes = await client.query(
        `SELECT id FROM donor_appointments
         WHERE donor_id = $1
           AND appointment_date = $2
           AND status IN ('BOOKED', 'CONFIRMED')`,
        [donorId, data.appointmentDate],
      );
      if (dupRes.rows.length > 0) {
        throw new ConflictError('You already have an active appointment scheduled on this date');
      }

      // 4. Enforce capacity transactionally
      const countRes = await client.query(
        `SELECT count(*)::int AS booked_count
         FROM donor_appointments
         WHERE (($1::bigint IS NOT NULL AND blood_bank_id = $1) OR ($2::uuid IS NOT NULL AND camp_id = $2))
           AND appointment_date = $3
           AND time_slot = $4
           AND status IN ('BOOKED', 'CONFIRMED')`,
        [data.bloodBankId || null, data.campId || null, data.appointmentDate, data.timeSlot],
      );
      const bookedCount = countRes.rows[0]?.booked_count || 0;
      if (bookedCount >= maxSlotCapacity) {
        throw new ConflictError(
          `The selected time slot '${data.timeSlot}' has reached full capacity (${maxSlotCapacity} bookings). Please select a different time slot.`,
        );
      }

      // 5. Insert appointment
      const { rows } = await client.query(
        `INSERT INTO donor_appointments (
           donor_id, blood_bank_id, camp_id, appointment_date, time_slot, donation_type, notes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'BOOKED')
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

      const appt = rows[0];
      appt.facility_name = facilityName;
      appt.medical_clearance_notice =
        'Appointment booking does not constitute medical eligibility or clinical clearance. In-person medical screening will be conducted by healthcare staff.';
      return appt;
    });
  }

  async cancelAppointment(donorId, appointmentId) {
    return inTransaction(async (client) => {
      const { rows: existing } = await client.query(
        `SELECT id, donor_id, status FROM donor_appointments WHERE id = $1 FOR UPDATE`,
        [appointmentId],
      );

      if (!existing.length) {
        throw new NotFoundError('Appointment not found');
      }

      if (existing[0].donor_id !== donorId) {
        throw new ForbiddenError('Unauthorized: You cannot cancel an appointment belonging to another donor');
      }

      if (existing[0].status === 'CANCELLED') {
        throw new BadRequestError('Appointment is already cancelled');
      }

      if (existing[0].status !== 'BOOKED' && existing[0].status !== 'CONFIRMED') {
        throw new BadRequestError(`Cannot cancel appointment with status ${existing[0].status}`);
      }

      const { rows } = await client.query(
        `UPDATE donor_appointments
         SET status = 'CANCELLED', updated_at = now()
         WHERE id = $1 AND donor_id = $2
         RETURNING id, status, updated_at`,
        [appointmentId, donorId],
      );

      return rows[0] || null;
    });
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
