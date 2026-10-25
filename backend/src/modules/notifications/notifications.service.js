import { notificationsRepository } from './notifications.repository.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../infrastructure/errors.js';
import { pool } from '../../db.js';

export class NotificationsService {
  async getUserNotifications(userId) {
    return notificationsRepository.getUserNotifications(userId);
  }

  async markAsRead(notificationId, userId) {
    const item = await notificationsRepository.markAsRead(notificationId, userId);
    if (!item) {
      throw new NotFoundError('Notification not found');
    }
    return item;
  }

  async markAllAsRead(userId) {
    return notificationsRepository.markAllAsRead(userId);
  }

  async sendNotification(data, senderUser) {
    // 1. Verify sender institutional authority
    let senderHospitalId = null;
    let senderBankId = null;

    if (senderUser.role !== 'ADMIN') {
      const { rows: mems } = await pool.query(
        'SELECT hospital_id, blood_bank_id FROM staff_memberships WHERE user_id = $1 AND is_active = true',
        [senderUser.id],
      );
      if (!mems.length) {
        throw new ForbiddenError('No active institutional membership found for sender');
      }
      senderHospitalId = mems.find((m) => m.hospital_id != null)?.hospital_id || null;
      senderBankId = mems.find((m) => m.blood_bank_id != null)?.blood_bank_id || null;
    }

    // 2. Validate event context and institutional ownership
    if (data.campId) {
      const { rows: campRows } = await pool.query(
        'SELECT id, blood_bank_id, status FROM donation_camps WHERE id = $1',
        [data.campId],
      );
      if (!campRows.length) {
        throw new NotFoundError('Referenced donation camp not found');
      }
      const camp = campRows[0];
      if (camp.status === 'CANCELLED') {
        throw new BadRequestError('Cannot send notifications for a cancelled camp');
      }
      if (senderUser.role === 'BANK_STAFF' && Number(camp.blood_bank_id) !== Number(senderBankId)) {
        throw new ForbiddenError('Staff member not authorized to message for this camp');
      }
      if (senderUser.role === 'HOSPITAL_STAFF') {
        throw new ForbiddenError('Hospital staff cannot dispatch camp notifications');
      }
    }

    if (data.requestId) {
      const { rows: reqRows } = await pool.query(
        'SELECT id, hospital_id, status FROM blood_requests WHERE id = $1',
        [data.requestId],
      );
      if (!reqRows.length) {
        throw new NotFoundError('Referenced blood request not found');
      }
      const request = reqRows[0];
      if (request.status === 'CANCELLED') {
        throw new BadRequestError('Cannot send notifications for a cancelled blood request');
      }
      if (senderUser.role === 'HOSPITAL_STAFF' && Number(request.hospital_id) !== Number(senderHospitalId)) {
        throw new ForbiddenError('Hospital staff not authorized to message for this request');
      }
    }

    // 3. Recipient authorization & basic contact verification
    const { rows: donorRows } = await pool.query(
      `SELECT d.id AS donor_id, d.available_for_contact, dc.contact_allowed
       FROM donors d
       LEFT JOIN donor_consents dc ON dc.donor_id = d.id
       WHERE d.user_id = $1`,
      [data.recipientUserId],
    );

    if (donorRows.length > 0) {
      const donor = donorRows[0];

      // Total contact opt-out prevents enqueueing
      if (donor.available_for_contact === false && donor.contact_allowed === false) {
        throw new ForbiddenError('Recipient donor has opted out of contact');
      }

      // Hospital staff cannot message arbitrary unrelated donors
      if (senderUser.role === 'HOSPITAL_STAFF') {
        const { rows: relRows } = await pool.query(
          `SELECT 1 FROM donor_invitations di
           WHERE di.donor_id = $1 AND di.hospital_id = $2
           UNION
           SELECT 1 FROM emergency_appeals ea
           WHERE ea.hospital_id = $2 AND ea.status = 'ACTIVE'`,
          [donor.donor_id, senderHospitalId],
        );
        if (!relRows.length) {
          throw new ForbiddenError('Unauthorized: hospital cannot message unrelated donors');
        }
      }
    }

    return notificationsRepository.createNotification(data, senderUser.id);
  }

  async getDeliveryStatusLog(limit = 100, user) {
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    let institutionScope = null;
    if (user.role === 'BANK_STAFF') {
      const { rows } = await pool.query(
        'SELECT blood_bank_id FROM staff_memberships WHERE user_id = $1 AND is_active = true AND blood_bank_id IS NOT NULL',
        [user.id],
      );
      if (!rows.length) throw new ForbiddenError('No active blood bank membership found');
      institutionScope = { bloodBankId: rows[0].blood_bank_id };
    } else if (user.role === 'HOSPITAL_STAFF') {
      const { rows } = await pool.query(
        'SELECT hospital_id FROM staff_memberships WHERE user_id = $1 AND is_active = true AND hospital_id IS NOT NULL',
        [user.id],
      );
      if (!rows.length) throw new ForbiddenError('No active hospital membership found');
      institutionScope = { hospitalId: rows[0].hospital_id };
    } else if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Access denied: role not authorized to view delivery logs');
    }

    return notificationsRepository.getDeliveryStatusLog(limit, institutionScope);
  }
}

export const notificationsService = new NotificationsService();
