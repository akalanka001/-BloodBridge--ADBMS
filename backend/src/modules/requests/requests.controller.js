import { bloodRequestSchema } from './requests.validation.js';
import { requestsService } from './requests.service.js';

export class RequestsController {
  async getRequests(req, res, next) {
    try {
      const data = await requestsService.getHospitalRequests(req.user.id);
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
}

export const requestsController = new RequestsController();
