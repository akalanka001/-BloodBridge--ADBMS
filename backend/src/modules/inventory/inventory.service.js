import { inventoryRepository } from './inventory.repository.js';

export class InventoryService {
  async getStockSummary(userId, role) {
    return inventoryRepository.getStockSummary(userId, role);
  }

  async reserveBloodUnit(requestItemId, bloodUnitId, reservedBy) {
    return inventoryRepository.reserveBloodUnit(requestItemId, bloodUnitId, reservedBy);
  }
}

export const inventoryService = new InventoryService();
