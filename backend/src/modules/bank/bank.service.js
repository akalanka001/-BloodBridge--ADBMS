import { bankRepository } from './bank.repository.js';
import { BadRequestError, ForbiddenError } from '../../infrastructure/errors.js';

export class BankService {
  async assertBankAccess(bankId, user) {

    if (user.role === 'ADMIN') {
      return bankId ? Number(bankId) : await bankRepository.getUserBankId(user.id);
    }
    if (user.role !== 'BANK_STAFF') {
      throw new ForbiddenError('Blood bank staff access required');
    }
    const userBankId = await bankRepository.getUserBankId(user.id);
    if (!userBankId) {
      throw new ForbiddenError('No active blood bank membership found');
    }
    if (bankId && Number(bankId) !== Number(userBankId)) {
      throw new ForbiddenError('Staff member not authorized for this blood bank');
    }
    return userBankId;
  }

  async getDashboard(bankId, user, componentCode = 'RBC') {
    const targetBankId = await this.assertBankAccess(bankId, user);
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getDashboardData(targetBankId, user.id, user.role, componentCode);
  }

  async getIncomingRequests(bankId, user) {
    const targetBankId = await this.assertBankAccess(bankId, user);
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getIncomingRequests(targetBankId, user.id, user.role);
  }

  async getUpcomingCamps(bankId, user) {
    const targetBankId = await this.assertBankAccess(bankId, user);
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getUpcomingCamps(targetBankId, user.id, user.role);
  }

  async getVerifiedBloodBanks(districtCode = null) {
    return bankRepository.listVerifiedBloodBanks(districtCode);
  }
}

export const bankService = new BankService();
