import { reservationSchema } from './inventory.validation.js';
import { inventoryService } from './inventory.service.js';

export class InventoryController {
  async getSummary(req, res, next) {
    try {
      const data = await inventoryService.getStockSummary(req.user.id, req.user.role);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async reserveUnit(req, res, next) {
    try {
      const data = reservationSchema.parse(req.body);
      const result = await inventoryService.reserveBloodUnit(data.requestItemId, data.bloodUnitId, req.user.id);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
