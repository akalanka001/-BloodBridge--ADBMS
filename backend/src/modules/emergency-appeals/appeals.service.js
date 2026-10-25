import { appealsRepository } from './appeals.repository.js';
import { NotFoundError } from '../../infrastructure/errors.js';

export class AppealsService {
  async createAppeal(data, userId) {
    return appealsRepository.createAppeal(data, userId);
  }

  async getAppealById(appealId, userId) {
    const appeal = await appealsRepository.getAppealById(appealId, userId);
    if (!appeal) {
      throw new NotFoundError('Emergency appeal not found or unauthorized');
    }
    return appeal;
  }

  async listAppealsByHospital(hospitalId, userId, filters) {
    return appealsRepository.listAppealsByHospital(hospitalId, userId, filters);
  }

  async escalateAppeal(appealId, userId, targetStage) {
    return appealsRepository.escalateAppeal(appealId, userId, targetStage);
  }
}

export const appealsService = new AppealsService();
