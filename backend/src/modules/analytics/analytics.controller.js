import { analyticsService } from './analytics.service.js';

export class AnalyticsController {
  async getSummary(_req, res, next) {
    try {
      const data = await analyticsService.getSummary();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
