import { districtQuerySchema, dsQuerySchema, gnQuerySchema } from './geography.validation.js';
import { geographyService } from './geography.service.js';

export class GeographyController {
  async getProvinces(_req, res, next) {
    try {
      const data = await geographyService.getProvinces();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDistricts(req, res, next) {
    try {
      const { provinceCode } = districtQuerySchema.parse(req.query);
      const data = await geographyService.getDistricts(provinceCode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDsDivisions(req, res, next) {
    try {
      if (!req.query.districtCode) {
        return res.status(400).json({ error: 'districtCode is required' });
      }
      const { districtCode } = dsQuerySchema.parse(req.query);
      const data = await geographyService.getDsDivisions(districtCode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getGnDivisions(req, res, next) {
    try {
      const { dsCode } = gnQuerySchema.parse(req.query);
      const data = await geographyService.getGnDivisions(dsCode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const geographyController = new GeographyController();
