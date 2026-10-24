import {
  uuidParam,
  campQuerySchema,
  createCampSchema,
  updateCampSchema,
  cancelCampSchema,
  checkInSchema,
  campMediaSchema,
} from './camps.validation.js';
import { campsService } from './camps.service.js';

export class CampsController {
  async listCamps(req, res, next) {
    try {
      const filters = campQuerySchema.parse(req.query);
      if (req.query.managed === 'true' && req.user && ['BANK_STAFF', 'ADMIN'].includes(req.user.role)) {
        const data = await campsService.listManagedCamps(filters, req.user);
        return res.json({ data });
      }
      const data = await campsService.listPublicCamps(filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listManagedCamps(req, res, next) {
    try {
      const filters = campQuerySchema.parse(req.query);
      const data = await campsService.listManagedCamps(filters, req.user);
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
      const camp = await campsService.createCamp(data, req.user);
      res.status(201).json({ data: camp });
    } catch (err) {
      next(err);
    }
  }

  async updateCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const data = updateCampSchema.parse(req.body);
      const camp = await campsService.updateCamp(id, data, req.user);
      res.json({ data: camp });
    } catch (err) {
      next(err);
    }
  }

  async submitCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const camp = await campsService.submitCamp(id, req.user);
      res.json({ data: camp });
    } catch (err) {
      next(err);
    }
  }

  async approveCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const camp = await campsService.approveCamp(id, req.user);
      res.json({ data: camp, message: 'Camp approved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async cancelCamp(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const { reason } = cancelCampSchema.parse(req.body);
      const camp = await campsService.cancelCamp(id, req.user, reason);
      res.json({ data: camp, message: 'Camp cancelled successfully' });
    } catch (err) {
      next(err);
    }
  }

  async registerDonor(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const reg = await campsService.registerDonor(id, req.user.id);
      res.status(201).json({ data: reg, message: 'Registration confirmed' });
    } catch (err) {
      next(err);
    }
  }

  async cancelRegistration(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const reg = await campsService.cancelDonorRegistration(id, req.user.id);
      res.json({ data: reg, message: 'Registration cancelled' });
    } catch (err) {
      next(err);
    }
  }

  async getMyRegistrations(req, res, next) {
    try {
      const data = await campsService.getDonorRegistrations(req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listRegistrations(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const data = await campsService.listCampRegistrations(id, req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async checkInDonor(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const { donorId, status, notes } = checkInSchema.parse(req.body);
      const data = await campsService.checkInDonor(id, donorId, req.user, status, notes);
      res.json({ data, message: `Donor status updated to ${status}` });
    } catch (err) {
      next(err);
    }
  }

  async attachMedia(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const data = campMediaSchema.parse(req.body);
      const media = await campsService.attachCampMedia(id, data, req.user);
      res.status(201).json({ data: media });
    } catch (err) {
      next(err);
    }
  }

  async removeMedia(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const mediaId = uuidParam.parse(req.params.mediaId);
      const result = await campsService.removeCampMedia(id, mediaId, req.user);
      res.json({ data: result, message: 'Media removed from camp' });
    } catch (err) {
      next(err);
    }
  }

  async listMedia(req, res, next) {
    try {
      const id = uuidParam.parse(req.params.id);
      const data = await campsService.listCampMedia(id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listOrganizers(_req, res, next) {
    try {
      const data = await campsService.listOrganizers();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const campsController = new CampsController();
