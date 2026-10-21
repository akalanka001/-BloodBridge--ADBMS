import crypto from 'node:crypto';
import { intakeRepository } from './intake.repository.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export function hashNationalId(nationalId) {
  if (!nationalId) return null;
  const normalized = nationalId.trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export class IntakeService {
  async lookupDonors({ nationalId, phone, fullName }) {
    const nationalIdHash = nationalId ? hashNationalId(nationalId) : null;
    return intakeRepository.lookupDonors({ nationalIdHash, phone, fullName });
  }

  async registerWalkIn(data, enrolledByUserId) {
    const nationalIdHash = data.nationalId ? hashNationalId(data.nationalId) : null;
    return intakeRepository.createWalkInDonor({ ...data, nationalIdHash }, enrolledByUserId);
  }

  async checkInVisit(data, checkedInBy) {
    return intakeRepository.createVisit({ ...data, checkedInBy });
  }

  async getVisit(visitId) {
    const visit = await intakeRepository.getVisitById(visitId);
    if (!visit) throw new NotFoundError('Donor visit not found');
    return visit;
  }

  async recordAssessment(visitId, assessedBy, data) {
    const visit = await intakeRepository.getVisitById(visitId);
    if (!visit) throw new NotFoundError('Donor visit not found');
    if (visit.status === 'COLLECTION_COMPLETED') {
      throw new BadRequestError('Cannot assess a visit that has already completed donation');
    }
    const assessment = await intakeRepository.recordAssessment(visitId, assessedBy, data);
    return assessment;
  }

  async recordCollection(data) {
    return intakeRepository.recordCollection(data);
  }
}

export const intakeService = new IntakeService();
