import {
  reservationSchema,
  unitReleaseSchema,
  processDonationSchema,
  inventoryQuerySchema,
} from './inventory.validation.js';
import { inventoryService } from './inventory.service.js';

export class InventoryController {
  async getSummary(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const data = await inventoryService.getStockSummary(req.user, bankId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getUnits(req, res, next) {
    try {
      const filters = inventoryQuerySchema.parse(req.query);
      const data = await inventoryService.getInventoryUnits(filters, req.user);
      res.json({ data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  async getUnitById(req, res, next) {
    try {
      const data = await inventoryService.getUnitById(req.params.id, req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async releaseUnit(req, res, next) {
    try {
      const body = unitReleaseSchema.parse(req.body);
      const data = await inventoryService.releaseBloodUnit(req.params.id, req.user, body);
      res.json({ message: `Unit release status updated to ${data.release_status}`, data });
    } catch (err) {
      next(err);
    }
  }

  async processDonation(req, res, next) {
    try {
      const body = processDonationSchema.parse(req.body);
      const data = await inventoryService.processDonation(req.user, body);
      res.status(201).json({ message: 'Donation processed into component units', data });
    } catch (err) {
      next(err);
    }
  }

  async reserveUnit(req, res, next) {
    try {
      const { requestItemId, bloodUnitId } = reservationSchema.parse(req.body);
      const data = await inventoryService.reserveBloodUnit(requestItemId, bloodUnitId, req.user);
      res.status(201).json({ message: 'Blood unit reserved', data });
    } catch (err) {
      next(err);
    }
  }

  async getExpiryAlerts(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const data = await inventoryService.getExpiryAlerts(req.user, bankId);
      res.json({ data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  async getMovements(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const data = await inventoryService.getInventoryMovements(req.user, bankId);
      res.json({ data, count: data.length });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
