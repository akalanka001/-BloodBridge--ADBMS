import { pool, inTransaction } from '../../db.js';

export class IdentityRepository {
  async findActiveUserByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, password_hash, role, is_active, email_verified
       FROM users
       WHERE LOWER(email) = LOWER($1) AND is_active = true`,
      [email.trim()],
    );
    return rows[0] || null;
  }

  async findUserById(id) {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role, phone, is_active, email_verified, created_at
       FROM users
       WHERE id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async getUserMemberships(userId) {
    const { rows } = await pool.query(
      `SELECT sm.id, sm.hospital_id, h.name AS hospital_name,
              sm.blood_bank_id, bb.name AS blood_bank_name, sm.is_active
       FROM staff_memberships sm
       LEFT JOIN hospitals h ON h.id = sm.hospital_id
       LEFT JOIN blood_banks bb ON bb.id = sm.blood_bank_id
       WHERE sm.user_id = $1 AND sm.is_active = true`,
      [userId],
    );
    return rows;
  }

  async getUserWithDetails(userId) {
    const user = await this.findUserById(userId);
    if (!user) return null;

    const memberships = await this.getUserMemberships(userId);

    let donor = null;
    if (user.role === 'DONOR') {
      const { rows } = await pool.query(
        `SELECT d.id, d.blood_type_code, d.district_code, d.ds_code, d.gn_code,
                d.town, d.birth_date, d.weight_kg, d.available_for_contact,
                d.camp_notifications_opt_in,
                p.name AS province_name, dist.name AS district_name,
                ds.name AS ds_name, gn.name AS gn_name
         FROM donors d
         LEFT JOIN districts dist ON dist.code = d.district_code
         LEFT JOIN provinces p ON p.code = dist.province_code
         LEFT JOIN ds_divisions ds ON ds.code = d.ds_code AND ds.district_code = d.district_code
         LEFT JOIN gn_divisions gn ON gn.code = d.gn_code AND gn.ds_code = d.ds_code AND gn.district_code = d.district_code
         WHERE d.user_id = $1`,
        [userId],
      );
      donor = rows[0] || null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      memberships,
      donor,
    };
  }

  async createUserWithDonor(data, passwordHash) {
    return inTransaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, 'DONOR', $4)
         RETURNING id, full_name, email, role`,
        [data.fullName, data.email.toLowerCase(), passwordHash, data.phone || null],
      );
      const user = userResult.rows[0];

      const donorResult = await client.query(
        `INSERT INTO donors (
           user_id, full_name, email, phone, blood_type_code,
           district_code, ds_code, gn_code, town, birth_date, weight_kg,
           available_for_contact, camp_notifications_opt_in, registration_origin
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ONLINE')
         RETURNING id`,
        [
          user.id,
          data.fullName,
          data.email.toLowerCase(),
          data.phone || null,
          data.bloodTypeCode ?? null,
          data.districtCode,
          data.dsCode || null,
          data.gnCode || null,
          data.town || null,
          data.birthDate || null,
          data.weightKg != null ? Number(data.weightKg) : null,
          Boolean(data.availableForContact),
          Boolean(data.campNotificationsOptIn),
        ],
      );
      const donor = donorResult.rows[0];

      // Record baseline consent in donor_consents
      await client.query(
        `INSERT INTO donor_consents (
           donor_id, contact_allowed, camp_notification_opt_in, emergency_appeal_opt_in
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (donor_id) DO UPDATE
         SET contact_allowed = EXCLUDED.contact_allowed,
             camp_notification_opt_in = EXCLUDED.camp_notification_opt_in,
             emergency_appeal_opt_in = EXCLUDED.emergency_appeal_opt_in,
             updated_at = now()`,
        [
          donor.id,
          Boolean(data.availableForContact),
          Boolean(data.campNotificationsOptIn),
          Boolean(data.emergencyAppealOptIn || data.availableForContact),
        ],
      );

      return user;
    });
  }

  async createAuthSession(userId, tokenHash, ipAddress, userAgent, expiresAt) {
    const { rows } = await pool.query(
      `INSERT INTO auth_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, expires_at, created_at`,
      [userId, tokenHash, ipAddress || null, userAgent || null, expiresAt],
    );
    return rows[0];
  }

  async findActiveSession(tokenHash) {
    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.token_hash, s.expires_at, s.revoked_at,
              u.role, u.email, u.full_name, u.is_active
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND u.is_active = true`,
      [tokenHash],
    );
    return rows[0] || null;
  }

  async rotateSession(oldTokenHash, newTokenHash, newExpiresAt) {
    return inTransaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE auth_sessions
         SET revoked_at = now()
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
         RETURNING id, user_id, ip_address, user_agent`,
        [oldTokenHash],
      );
      const prevSession = updateResult.rows[0];
      if (!prevSession) return null;

      const newResult = await client.query(
        `INSERT INTO auth_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, expires_at, created_at`,
        [prevSession.user_id, newTokenHash, prevSession.ip_address, prevSession.user_agent, newExpiresAt],
      );
      return newResult.rows[0];
    });
  }

  async revokeSession(tokenHash) {
    const { rowCount } = await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
    return rowCount > 0;
  }

  async revokeAllUserSessions(userId) {
    await pool.query('CALL sp_revoke_user_sessions($1)', [userId]);
  }

  async createPasswordResetToken(userId, tokenHash, expiresAt) {
    const { rows } = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, expires_at`,
      [userId, tokenHash, expiresAt],
    );
    return rows[0];
  }

  async findValidPasswordResetToken(tokenHash) {
    const { rows } = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > now()
         AND u.is_active = true`,
      [tokenHash],
    );
    return rows[0] || null;
  }

  async markPasswordResetTokenUsed(tokenId, userId, newPasswordHash) {
    return inTransaction(async (client) => {
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = now()
         WHERE id = $1 AND used_at IS NULL`,
        [tokenId],
      );
      await client.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2`,
        [newPasswordHash, userId],
      );
      // Revoke all existing login sessions for security
      await client.query(
        `UPDATE auth_sessions
         SET revoked_at = now()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
    });
  }

  async createEmailVerificationToken(userId, tokenHash, expiresAt) {
    const { rows } = await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, expires_at`,
      [userId, tokenHash, expiresAt],
    );
    return rows[0];
  }

  async findValidEmailVerificationToken(tokenHash) {
    const { rows } = await pool.query(
      `SELECT evt.id, evt.user_id, evt.expires_at, evt.used_at
       FROM email_verification_tokens evt
       JOIN users u ON u.id = evt.user_id
       WHERE evt.token_hash = $1
         AND evt.used_at IS NULL
         AND evt.expires_at > now()`,
      [tokenHash],
    );
    return rows[0] || null;
  }

  async markEmailVerified(tokenId, userId) {
    return inTransaction(async (client) => {
      await client.query(
        `UPDATE email_verification_tokens
         SET used_at = now()
         WHERE id = $1 AND used_at IS NULL`,
        [tokenId],
      );
      await client.query(
        `UPDATE users
         SET email_verified = true
         WHERE id = $1`,
        [userId],
      );
    });
  }

  async createStaffInvitation(adminUserId, email, role, hospitalId, bloodBankId, tokenHash, expiresAt) {
    const { rows } = await pool.query(
      `INSERT INTO staff_invitations (
         token_hash, email, role, hospital_id, blood_bank_id, invited_by, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role, hospital_id, blood_bank_id, expires_at, created_at`,
      [tokenHash, email.toLowerCase(), role, hospitalId || null, bloodBankId || null, adminUserId, expiresAt],
    );
    return rows[0];
  }

  async findValidStaffInvitation(tokenHash) {
    const { rows } = await pool.query(
      `SELECT id, email, role, hospital_id, blood_bank_id, invited_by, expires_at, accepted_at
       FROM staff_invitations
       WHERE token_hash = $1
         AND accepted_at IS NULL
         AND expires_at > now()`,
      [tokenHash],
    );
    return rows[0] || null;
  }

  async acceptStaffInvitation(invitationId, fullName, email, passwordHash, role, hospitalId, bloodBankId) {
    return inTransaction(async (client) => {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, email_verified)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, full_name, email, role`,
        [fullName, email.toLowerCase(), passwordHash, role],
      );
      const newUser = userResult.rows[0];

      // Create staff membership
      await client.query(
        `INSERT INTO staff_memberships (user_id, hospital_id, blood_bank_id, is_active)
         VALUES ($1, $2, $3, true)`,
        [newUser.id, hospitalId || null, bloodBankId || null],
      );

      // Mark invitation accepted
      await client.query(
        `UPDATE staff_invitations
         SET accepted_at = now()
         WHERE id = $1`,
        [invitationId],
      );

      return newUser;
    });
  }
}

export const identityRepository = new IdentityRepository();
