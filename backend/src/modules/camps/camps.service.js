import { campsRepository } from './camps.repository.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../infrastructure/errors.js';
import { broadcastCampCapacity } from '../../socket.js';

export class CampsService {
  async listPublicCamps(districtCode) {
    return campsRepository.listPublicCamps(districtCode);
  }

  async getCampById(id) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('No public camp found');
    return camp;
  }

  async createCamp(data, userId) {
    const isStaff = await campsRepository.isStaffAtBank(userId, data.bloodBankId);
    if (!isStaff) throw new ForbiddenError('Not assigned to this blood bank');
    return campsRepository.createCamp(data, userId);
  }

  async submitCamp(id, userId) {
    const camp = await campsRepository.submitCamp(id, userId);
    if (!camp) throw new ConflictError('Camp is unavailable or not owned by this bank');
    return camp;
  }

  async approveCamp(id, userId) {
    return campsRepository.approveCamp(id, userId);
  }

  async registerDonor(campId, userId) {
    const reg = await campsRepository.registerDonorForCamp(campId, userId);
    if (!reg) throw new NotFoundError('Donor profile missing');

    try {
      const registeredCount = await campsRepository.getCampRegistrationCount(campId);
      broadcastCampCapacity({
        campId,
        registeredCount,
        status: 'APPROVED',
      });
    } catch {}

    return reg;
  }
}

export const campsService = new CampsService();
