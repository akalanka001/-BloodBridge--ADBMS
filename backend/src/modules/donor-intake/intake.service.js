import crypto from 'node:crypto';
import { pool } from '../../db.js';
import { intakeRepository } from './intake.repository.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../infrastructure/errors.js';

export function hashNationalId(nationalId) {
  if (!nationalId) return null;
  const normalized = nationalId.trim().toUpperCase();
  const secret = process.env.NIC_HMAC_SECRET || process.env.JWT_SECRET || 'bloodbridge_dev_secret_key_change_me_to_random_32_characters_minimum';
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

export async function assertStaffBankAuthorization(userId, userRole, bloodBankId, campId = null) {
  if (userRole === 'ADMIN') return;

  let targetBankId = bloodBankId;
  if (!targetBankId && campId) {
    const { rows: campRows } = await pool.query(
      'SELECT blood_bank_id FROM donation_camps WHERE id = $1',
      [campId],
    );
    if (!campRows[0]) throw new NotFoundError('Associated donation camp not found');
    targetBankId = campRows[0].blood_bank_id;
  }

  if (!targetBankId) {
    throw new BadRequestError('Institution bloodBankId or campId must be specified');
  }

  const { rows } = await pool.query(
    `SELECT id FROM staff_memberships
     WHERE user_id = $1 AND blood_bank_id = $2 AND is_active = true`,
    [userId, targetBankId],
  );

  if (rows.length === 0) {
    throw new ForbiddenError(`User is not an authorized active staff member of blood bank ${targetBankId}`);
  }
}

export class IntakeService {
  async lookupDonors({ nationalId, phone, fullName }) {
    const nationalIdHash = nationalId ? hashNationalId(nationalId) : null;
    return intakeRepository.lookupDonors({ nationalIdHash, phone, fullName });
  }

  async registerWalkIn(data, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : 'BANK_STAFF';
    await assertStaffBankAuthorization(userId, userRole, data.bloodBankId, data.campId);

    const nationalIdHash = data.nationalId ? hashNationalId(data.nationalId) : null;
    return intakeRepository.createWalkInDonor({ ...data, nationalIdHash }, userId);
  }

  async checkInVisit(data, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : 'BANK_STAFF';
    await assertStaffBankAuthorization(userId, userRole, data.bloodBankId, data.campId);

    return intakeRepository.createVisit({ ...data, checkedInBy: userId });
  }

  async getVisit(visitId) {
    const visit = await intakeRepository.getVisitById(visitId);
    if (!visit) throw new NotFoundError('Donor visit not found');
    return visit;
  }

  async recordAssessment(visitId, user, data) {
    const userId = user ? (typeof user === 'string' ? user : user.id) : (data?.assessedBy || null);
    const userRole = user && typeof user === 'object' ? user.role : 'BANK_STAFF';

    const visit = await intakeRepository.getVisitById(visitId);
    if (!visit) throw new NotFoundError('Donor visit not found');
    if (visit.status === 'COLLECTION_COMPLETED') {
      throw new BadRequestError('Cannot assess a visit that has already completed donation');
    }

    if (visit.blood_bank_id && userId) {
      await assertStaffBankAuthorization(userId, userRole, visit.blood_bank_id);
    }

    const assessment = await intakeRepository.recordAssessment(visitId, userId, data);
    return assessment;
  }

  async recordCollection(data, user = null) {
    const userId = user ? (typeof user === 'string' ? user : user.id) : (data?.collectorId || null);
    const userRole = user && typeof user === 'object' ? user.role : 'BANK_STAFF';

    if (userId) {
      await assertStaffBankAuthorization(userId, userRole, data.bloodBankId, data.campId);
    }
    return intakeRepository.recordCollection(data, userId);
  }

  async listVisits(bankId = null) {
    return intakeRepository.listVisits(bankId);
  }

  async listDonations(bankId = null) {
    return intakeRepository.listDonations(bankId);
  }
}

export const intakeService = new IntakeService();
