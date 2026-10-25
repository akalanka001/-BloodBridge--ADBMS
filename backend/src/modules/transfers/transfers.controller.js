import { createTransferSchema, receiveTransferSchema, transfersQuerySchema } from './transfers.validation.js';
import { transfersService } from './transfers.service.js';

export class TransfersController {
  async createTransfer(req, res, next) {
    try {
      const data = createTransferSchema.parse(req.body);
      const transfer = await transfersService.createTransfer(data, req.user);
      res.status(201).json({ message: 'Transfer request created', data: transfer });
    } catch (err) {
      next(err);
    }
  }

  async getTransfers(req, res, next) {
    try {
      const filters = transfersQuerySchema.parse(req.query);
      const result = await transfersService.getTransfers(filters.bankId || null, req.user, filters);
      res.json({ data: result.data, count: result.pagination.total, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  async getTransferById(req, res, next) {
    try {
      const data = await transfersService.getTransferById(req.params.id, req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async dispatchTransfer(req, res, next) {
    try {
      const transfer = await transfersService.dispatchTransfer(req.params.id, req.user);
      res.json({ message: 'Transfer successfully dispatched', data: transfer });
    } catch (err) {
      next(err);
    }
  }

  async receiveTransfer(req, res, next) {
    try {
      const { notes } = receiveTransferSchema.parse(req.body || {});
      const transfer = await transfersService.receiveTransfer(req.params.id, req.user, notes);
      res.json({ message: 'Transfer successfully received into inventory', data: transfer });
    } catch (err) {
      next(err);
    }
  }
}

export const transfersController = new TransfersController();
