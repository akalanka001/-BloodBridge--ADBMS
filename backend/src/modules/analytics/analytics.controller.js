import { analyticsService } from './analytics.service.js';
import { analyticsFilterSchema, etlTriggerSchema, benchmarkRunSchema } from './analytics.validation.js';

export class AnalyticsController {
  async getSummary(req, res, next) {
    try {
      const scoping = {
        bloodBankId: req.user?.bloodBankId,
        hospitalId: req.user?.hospitalId,
      };
      const data = await analyticsService.getSummary(scoping);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getDashboard(req.user, filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDemandByGroup(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getDemandByGroup(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'demand_by_blood_group.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getRequestTrends(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getRequestTrends(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'request_trends.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDonationTrends(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getDonationTrends(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'donation_trends.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getStockTrends(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getStockTrends(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'component_stock_trends.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getCampPerformance(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getCampPerformance(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'camp_performance.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getTransfers(req, res, next) {
    try {
      const filters = analyticsFilterSchema.parse(req.query);
      const data = await analyticsService.getTransfers(req.user, filters);

      if (filters.format === 'csv') {
        return this.sendCsv(res, 'interbank_transfers.csv', data);
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getEtlRuns(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const data = await analyticsService.getEtlRuns(req.user, limit);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async triggerEtlRun(req, res, next) {
    try {
      const body = etlTriggerSchema.parse(req.body || {});
      const data = await analyticsService.triggerEtlRun(req.user, body);
      res.status(201).json({
        message: 'Warehouse ETL pipeline executed successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDataQuality(req, res, next) {
    try {
      const data = await analyticsService.getDataQuality(req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getBenchmarks(req, res, next) {
    try {
      const data = await analyticsService.getBenchmarks(req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async runBenchmark(req, res, next) {
    try {
      const body = benchmarkRunSchema.parse(req.body);
      const data = await analyticsService.runBenchmark(req.user, body);
      res.json({
        message: 'Benchmark experiment executed with live PostgreSQL query plan capture',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  sendCsv(res, filename, records) {
    if (!Array.isArray(records) || records.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('');
    }

    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(','),
      ...records.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvRows.join('\r\n'));
  }
}

export const analyticsController = new AnalyticsController();
