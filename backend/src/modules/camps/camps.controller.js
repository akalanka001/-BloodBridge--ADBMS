import { uuidParam, campQuerySchema, createCampSchema } from './camps.validation.js';
import { campsService } from './camps.service.js';

export class CampsController {
  async listCamps(req, res, next) {
    try {
      const { districtCode } = campQuerySchema.parse(req.query);
      const data = await campsService.listPublicCamps(districtCode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const data = await campsService.getCampById(id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createCamp(req, res, next) {
    try {
      const data = createCampSchema.parse(req.body);
      const camp = await campsService.createCamp(data, req.user.id);
      res.status(201).json({ data: camp });
    } catch (err) {
      next(err);
    }
  }

  async submitCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const camp = await campsService.submitCamp(id, req.user.id);
      res.json({ data: camp });
    } catch (err) {
      next(err);
    }
  }

  async approveCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      await campsService.approveCamp(id, req.user.id);
      res.json({ message: 'Camp approved' });
    } catch (err) {
      next(err);
    }
  }

  async registerDonor(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const reg = await campsService.registerDonor(id, req.user.id);
      res.status(201).json({ data: reg });
    } catch (err) {
      next(err);
    }
  }
}

export const campsController = new CampsController();
