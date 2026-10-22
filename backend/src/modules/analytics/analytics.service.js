import { analyticsRepository } from './analytics.repository.js';

export class AnalyticsService {
  async getSummary() {
    const metrics = await analyticsRepository.getOperationalMetrics();
    const distribution = await analyticsRepository.getBloodTypeStockDistribution();
    return {
      metrics,
      distribution,
      timestamp: new Date().toISOString(),
    };
  }
}

export const analyticsService = new AnalyticsService();
