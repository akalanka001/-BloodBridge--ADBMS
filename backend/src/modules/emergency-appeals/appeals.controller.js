import { createAppealSchema, escalateAppealSchema } from './appeals.validation.js';
import { appealsService } from './appeals.service.js';
import { requestFiltersSchema } from '../requests/requests.validation.js';

export class AppealsController {
  async createAppeal(req, res, next) {
    try {
      const data = createAppealSchema.parse(req.body);
      const appeal = await appealsService.createAppeal(data, req.user.id);
      res.status(201).json({ data: appeal });
    } catch (err) {
      next(err);
    }
  }

  async getAppealById(req, res, next) {
    try {
      const appeal = await appealsService.getAppealById(req.params.id, req.user.id);
      res.json({ data: appeal });
    } catch (err) {
      next(err);
    }
  }

  async getAppealsByHospital(req, res, next) {
    try {
      const hospitalId = Number(req.params.hospitalId);
      const filters = requestFiltersSchema.parse({ ...req.query, hospitalId: req.params.hospitalId });
      const result = await appealsService.listAppealsByHospital(filters.hospitalId, req.user.id, filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async escalateAppeal(req, res, next) {
    try {
      const { targetStage } = escalateAppealSchema.parse(req.body || {});
      const escalated = await appealsService.escalateAppeal(req.params.id, req.user.id, targetStage);
      res.json({ data: escalated, message: 'Emergency appeal escalated to next tier' });
    } catch (err) {
      next(err);
    }
  }
}

export const appealsController = new AppealsController();
