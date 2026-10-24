import { transfersRepository } from './transfers.repository.js';
import { NotFoundError } from '../../infrastructure/errors.js';

export class TransfersService {
  async createTransfer(data, requestedBy) {
    return transfersRepository.createTransfer({ ...data, requestedBy });
  }

  async getTransfers(bankId) {
    return transfersRepository.listTransfers(bankId);
  }

  async getTransferById(transferId) {
    const transfer = await transfersRepository.getTransferById(transferId);
    if (!transfer) {
      throw new NotFoundError('Inter-bank transfer not found');
    }
    return transfer;
  }

  async dispatchTransfer(transferId, actorId) {
    return transfersRepository.dispatchTransfer(transferId, actorId);
  }

  async receiveTransfer(transferId, actorId, notes) {
    return transfersRepository.receiveTransfer(transferId, actorId, notes);
  }
}

export const transfersService = new TransfersService();
