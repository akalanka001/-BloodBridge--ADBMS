import { inventoryRepository } from './inventory.repository.js';
import { bankRepository } from '../bank/bank.repository.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../infrastructure/errors.js';

export class InventoryService {
  async assertBankStaffAuthorization(user, targetBankId = null) {
    if (user.role === 'ADMIN') {
      return targetBankId ? Number(targetBankId) : null;
    }
    if (user.role !== 'BANK_STAFF') {
      throw new ForbiddenError('Blood bank staff access required');
    }
    const userBankId = await bankRepository.getUserBankId(user.id);
    if (!userBankId) {
      throw new ForbiddenError('No active blood bank membership found');
    }
    if (targetBankId && Number(targetBankId) !== Number(userBankId)) {
      throw new ForbiddenError('Staff member not authorized for this blood bank (Forbidden: unauthorized blood bank scope)');
    }
    return userBankId;
  }

  async getStockSummary(user, bankId = null) {
    let resolvedBankId = null;
    if (user.role === 'BANK_STAFF') {
      resolvedBankId = await this.assertBankStaffAuthorization(user, bankId);
    } else if (bankId) {
      resolvedBankId = Number(bankId);
    }
    return inventoryRepository.getStockSummary(user.id, user.role, resolvedBankId);
  }

  async getInventoryUnits(filters, user) {
    const requestedBankId = filters.bloodBankId || filters.bankId;
    const targetBankId = await this.assertBankStaffAuthorization(user, requestedBankId);
    return inventoryRepository.getInventoryUnits({ ...filters, bloodBankId: targetBankId }, user, targetBankId);
  }

  async getUnitById(unitId, user) {
    const unit = await inventoryRepository.getUnitById(unitId);
    if (!unit) {
      throw new NotFoundError('Blood unit not found');
    }
    if (user && user.role === 'BANK_STAFF') {
      const userBankId = await bankRepository.getUserBankId(user.id);
      if (!userBankId || Number(unit.blood_bank_id) !== Number(userBankId)) {
        throw new ForbiddenError('Staff member not authorized to release units from this blood bank (unauthorized blood bank scope)');
      }
    }
    return unit;
  }

  async releaseBloodUnit(unitId, staffUser, data) {
    const unit = await this.getUnitById(unitId, staffUser);
    // Explicit clinical release policy: Only active bank staff at the unit's blood bank may release
    const isStaff = await bankRepository.isStaffAtBank(staffUser.id, unit.blood_bank_id);
    if (!isStaff) {
      throw new ForbiddenError('Staff member not authorized to release units from this blood bank (requires active clinical staff membership)');
    }
    return inventoryRepository.releaseBloodUnit(unitId, staffUser.id, data.releaseStatus, data.notes);
  }

  async processDonation(staffUser, data) {
    const donation = await inventoryRepository.getDonationById(data.donationId);
    if (!donation) {
      throw new NotFoundError('Donation record not found');
    }
    const isStaff = await bankRepository.isStaffAtBank(staffUser.id, donation.blood_bank_id);
    if (!isStaff) {
      throw new ForbiddenError('Staff member not authorized for this blood bank');
    }
    return inventoryRepository.processDonationComponents(data.donationId, staffUser.id, data.components);
  }

  async reserveBloodUnit(requestItemId, bloodUnitId, user) {
    const unit = await inventoryRepository.getUnitById(bloodUnitId);
    if (!unit) {
      throw new NotFoundError('Blood unit not found');
    }
    if (user.role === 'BANK_STAFF') {
      const isStaff = await bankRepository.isStaffAtBank(user.id, unit.blood_bank_id);
      if (!isStaff) {
        throw new ForbiddenError('Staff member not authorized to reserve units from this blood bank');
      }
    }
    return inventoryRepository.reserveBloodUnit(requestItemId, bloodUnitId, user.id);
  }

  async getExpiryAlerts(user, bankId = null) {
    const targetBankId = await this.assertBankStaffAuthorization(user, bankId);
    return inventoryRepository.getExpiryAlerts(targetBankId);
  }

  async getInventoryMovements(user, bankId = null) {
    const targetBankId = await this.assertBankStaffAuthorization(user, bankId);
    return inventoryRepository.getInventoryMovements(targetBankId);
  }
}

export const inventoryService = new InventoryService();
