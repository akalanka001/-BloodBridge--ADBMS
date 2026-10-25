import { bankRepository } from './bank.repository.js';
import { BadRequestError } from '../../infrastructure/errors.js';

export class BankService {
  async getDashboard(bankId, user, componentCode = 'RBC') {
    let targetBankId = bankId ? Number(bankId) : null;
    if (!targetBankId) {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getDashboardData(targetBankId, user.id, user.role, componentCode);
  }

  async getIncomingRequests(bankId, user) {
    let targetBankId = bankId ? Number(bankId) : null;
    if (!targetBankId) {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getIncomingRequests(targetBankId, user.id, user.role);
  }

  async getUpcomingCamps(bankId, user) {
    let targetBankId = bankId ? Number(bankId) : null;
    if (!targetBankId) {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    if (!targetBankId) {
      throw new BadRequestError('No blood bank associated with user or specified in request');
    }
    return bankRepository.getUpcomingCamps(targetBankId, user.id, user.role);
  }
}

export const bankService = new BankService();
