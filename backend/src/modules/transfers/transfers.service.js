import { transfersRepository } from './transfers.repository.js';
import { bankRepository } from '../bank/bank.repository.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../infrastructure/errors.js';

export class TransfersService {
  async assertBankStaff(user, targetBankId) {
    if (user.role === 'ADMIN') return true;
    const isStaff = await bankRepository.isStaffAtBank(user.id, targetBankId);
    if (!isStaff) {
      throw new ForbiddenError('Staff member not authorized for this blood bank');
    }
    return true;
  }

  async createTransfer(data, user) {
    if (user.role === 'BANK_STAFF') {
      const userBankId = await bankRepository.getUserBankId(user.id);
      if (!userBankId || (Number(data.sourceBankId) !== Number(userBankId) && Number(data.targetBankId) !== Number(userBankId))) {
        throw new ForbiddenError('Forbidden: staff must belong to source or target blood bank');
      }
    }
    const unitsEligible = await transfersRepository.verifyUnitsBelongToBank(data.unitIds, data.sourceBankId);
    if (!unitsEligible) {
      throw new BadRequestError('One or more blood units do not belong to the source blood bank');
    }
    return transfersRepository.createTransfer({ ...data, requestedBy: user.id });
  }

  async getTransfers(bankId, user) {
    let targetBankId = bankId;
    if (user.role === 'BANK_STAFF') {
      const userBankId = await bankRepository.getUserBankId(user.id);
      if (!userBankId) {
        throw new ForbiddenError('No active blood bank membership found');
      }
      if (bankId && Number(bankId) !== Number(userBankId)) {
        throw new ForbiddenError('Forbidden: unauthorized blood bank scope');
      }
      targetBankId = userBankId;
    }
    return transfersRepository.listTransfers(targetBankId);
  }

  async getTransferById(transferId, user) {
    const transfer = await transfersRepository.getTransferById(transferId);
    if (!transfer) {
      throw new NotFoundError('Inter-bank transfer not found');
    }
    if (user.role === 'BANK_STAFF') {
      const isSource = await bankRepository.isStaffAtBank(user.id, transfer.source_bank_id);
      const isTarget = await bankRepository.isStaffAtBank(user.id, transfer.target_bank_id);
      if (!isSource && !isTarget) {
        throw new ForbiddenError('Forbidden: unauthorized blood bank scope');
      }
    }
    return transfer;
  }

  async dispatchTransfer(transferId, user) {
    const transfer = await transfersRepository.getTransferById(transferId);
    if (!transfer) {
      throw new NotFoundError('Inter-bank transfer not found');
    }
    await this.assertBankStaff(user, transfer.source_bank_id);
    return transfersRepository.dispatchTransfer(transferId, user.id);
  }

  async receiveTransfer(transferId, user, notes) {
    const transfer = await transfersRepository.getTransferById(transferId);
    if (!transfer) {
      throw new NotFoundError('Inter-bank transfer not found');
    }
    await this.assertBankStaff(user, transfer.target_bank_id);
    return transfersRepository.receiveTransfer(transferId, user.id, notes);
  }
}

export const transfersService = new TransfersService();
