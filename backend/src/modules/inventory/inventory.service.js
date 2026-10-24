import { inventoryRepository } from './inventory.repository.js';
import { bankRepository } from '../bank/bank.repository.js';
import { NotFoundError } from '../../infrastructure/errors.js';

export class InventoryService {
  async getStockSummary(userId, role, bankId = null) {
    return inventoryRepository.getStockSummary(userId, role, bankId);
  }

  async getInventoryUnits(filters, user) {
    let targetBankId = filters.bloodBankId;
    if (!targetBankId && user.role === 'BANK_STAFF') {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    return inventoryRepository.getInventoryUnits(filters, user, targetBankId);
  }

  async getUnitById(unitId) {
    const unit = await inventoryRepository.getUnitById(unitId);
    if (!unit) {
      throw new NotFoundError('Blood unit not found');
    }
    return unit;
  }

  async releaseBloodUnit(unitId, staffUser, data) {
    return inventoryRepository.releaseBloodUnit(unitId, staffUser.id, data.releaseStatus, data.notes);
  }

  async processDonation(staffUser, data) {
    return inventoryRepository.processDonationComponents(data.donationId, staffUser.id, data.components);
  }

  async reserveBloodUnit(requestItemId, bloodUnitId, reservedBy) {
    return inventoryRepository.reserveBloodUnit(requestItemId, bloodUnitId, reservedBy);
  }

  async getExpiryAlerts(user, bankId = null) {
    let targetBankId = bankId;
    if (!targetBankId && user.role === 'BANK_STAFF') {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    return inventoryRepository.getExpiryAlerts(targetBankId);
  }

  async getInventoryMovements(user, bankId = null) {
    let targetBankId = bankId;
    if (!targetBankId && user.role === 'BANK_STAFF') {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    return inventoryRepository.getInventoryMovements(targetBankId);
  }
}

export const inventoryService = new InventoryService();
