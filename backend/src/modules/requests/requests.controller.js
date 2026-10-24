import {
  bloodRequestSchema,
  cancelRequestSchema,
  requestFiltersSchema,
  receiveFulfillmentSchema,
} from './requests.validation.js';
import { requestsService } from './requests.service.js';

export class RequestsController {
  async getRequests(req, res, next) {
    try {
      const filters = requestFiltersSchema.parse(req.query);
      const data = await requestsService.getHospitalRequests(req.user.id, filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req, res, next) {
    try {
      const data = bloodRequestSchema.parse(req.body);
      const created = await requestsService.createRequest(data, req.user.id);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const data = await requestsService.getRequestDetails(req.params.id, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getRequestProgress(req, res, next) {
    try {
      const data = await requestsService.getRequestProgress(req.params.id, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getMatchingSummary(req, res, next) {
    try {
      const data = await requestsService.getMatchingSummary(req.params.id, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async cancelRequest(req, res, next) {
    try {
      const { reason } = cancelRequestSchema.parse(req.body || {});
      const cancelled = await requestsService.cancelRequest(req.params.id, req.user.id, reason);
      res.json({ data: cancelled, message: 'Blood request cancelled successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const hospitalId = req.query.hospitalId ? Number(req.query.hospitalId) : undefined;
      const data = await requestsService.getHospitalDashboard(hospitalId, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getAvailableStock(req, res, next) {
    try {
      const hospitalId = req.query.hospitalId ? Number(req.query.hospitalId) : undefined;
      const data = await requestsService.getAvailableStock(hospitalId, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async receiveFulfillment(req, res, next) {
    try {
      const data = receiveFulfillmentSchema.parse(req.body);
      const result = await requestsService.confirmFulfillmentReceipt(req.params.id, req.user.id, data);
      res.json({ data: result, message: 'Fulfillment receipt confirmed successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const requestsController = new RequestsController();
