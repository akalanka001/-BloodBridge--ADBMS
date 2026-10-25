import { pool } from '../../db.js';
import { analyticsRepository } from './analytics.repository.js';
import { warehouseService } from './warehouse.service.js';
import { etlService } from './etl.service.js';
import { benchmarksService } from './benchmarks.service.js';
import { ForbiddenError, UnauthorizedError } from '../../infrastructure/errors.js';

export class AnalyticsService {
  /**
   * Compatibility summary endpoint
   */
  async getSummary(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    const metrics = await analyticsRepository.getOperationalMetrics(scoping);
    const distribution = await analyticsRepository.getBloodTypeStockDistribution(scoping.bloodBankId);
    return {
      metrics,
      distribution,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Full admin & institutional dashboard overview
   */
  async getDashboard(user, filters = {}) {
    this.assertAuthorized(user);

    const scoping = await this.getScoping(user, filters);
    const metrics = await analyticsRepository.getOperationalMetrics(scoping);
    const demandByGroup = await warehouseService.getDemandByBloodGroup(scoping);
    const requestTrends = await warehouseService.getRequestTrends({ ...scoping, period: '6' });
    const etlRuns = await etlService.getEtlRuns(1);
    const benchmarkTemplates = benchmarksService.getTemplates();

    return {
      metrics: {
        total_donors: metrics.total_donors,
        online_donors: metrics.online_donors,
        walkin_donors: metrics.walkin_donors,
        active_hospitals: metrics.active_hospitals,
        requests_this_month: metrics.requests_this_month,
        stock_alerts: metrics.stock_alerts,
        available_units: metrics.available_units,
        collections_this_month: metrics.collections_this_month,
        active_transfers: metrics.active_transfers,
        active_camps: metrics.active_camps,
        pending_claims: metrics.pending_claims,
      },
      demandByGroup,
      requestTrends,
      etlPipeline: {
        latestRun: etlRuns[0] || null,
        dataFreshness: etlRuns[0]?.finished_at || 'Never run',
        status: etlRuns[0]?.status || 'IDLE',
      },
      benchmarks: {
        templates: benchmarkTemplates,
      },
      userScope: {
        role: user.role,
        institutionId: scoping.bloodBankId || scoping.hospitalId || 'SYSTEM_WIDE',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDemandByGroup(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getDemandByBloodGroup(scoping);
  }

  async getRequestTrends(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getRequestTrends(scoping);
  }

  async getDonationTrends(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getDonationTrends(scoping);
  }

  async getStockTrends(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getStockTrends(scoping);
  }

  async getCampPerformance(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getCampPerformance(scoping);
  }

  async getTransfers(user, filters = {}) {
    this.assertAuthorized(user);
    const scoping = await this.getScoping(user, filters);
    return warehouseService.getTransferReports(scoping);
  }

  async getEtlRuns(user, limit = 20) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Only system administrators may inspect warehouse ETL jobs');
    }
    return etlService.getEtlRuns(limit);
  }

  async triggerEtlRun(user, options = {}) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Only system administrators may trigger warehouse ETL execution');
    }
    return etlService.runEtl({
      ...options,
      requestedBy: user.email || user.fullName || 'ADMIN',
    });
  }

  async getDataQuality(user) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Only system administrators may access data quality reconciliation audits');
    }
    return etlService.getReconciliationAudit();
  }

  async getBenchmarks(user) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Only system administrators may access performance benchmark lab');
    }
    return benchmarksService.getTemplates();
  }

  async runBenchmark(user, options = {}) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Only system administrators may execute query optimization experiments');
    }
    return benchmarksService.runBenchmark(options);
  }

  /**
   * Enforces role authorization.
   * DONOR role is strictly forbidden from warehouse / aggregate analytics.
   */
  assertAuthorized(user) {
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (user.role === 'DONOR') {
      throw new ForbiddenError('Access denied. Analytics reporting is restricted to authorized personnel.');
    }
  }

  /**
   * Applies institutional scoping according to role.
   */
  async getScoping(user, filters = {}) {
    const scoping = { ...filters };
    if (user.role === 'BANK_STAFF') {
      const { rows } = await pool.query(
        'SELECT blood_bank_id FROM staff_memberships WHERE user_id = $1 AND is_active = true AND blood_bank_id IS NOT NULL',
        [user.id],
      );
      if (!rows.length) {
        throw new ForbiddenError('No active blood bank membership found');
      }
      const userBankId = rows[0].blood_bank_id;
      if (filters.bloodBankId && String(filters.bloodBankId) !== String(userBankId)) {
        throw new ForbiddenError('Forbidden: unauthorized blood bank scope');
      }
      scoping.bloodBankId = userBankId;
      delete scoping.hospitalId;
    } else if (user.role === 'HOSPITAL_STAFF') {
      const { rows } = await pool.query(
        'SELECT hospital_id FROM staff_memberships WHERE user_id = $1 AND is_active = true AND hospital_id IS NOT NULL',
        [user.id],
      );
      if (!rows.length) {
        throw new ForbiddenError('No active hospital membership found');
      }
      const userHospitalId = rows[0].hospital_id;
      if (filters.hospitalId && String(filters.hospitalId) !== String(userHospitalId)) {
        throw new ForbiddenError('Forbidden: unauthorized hospital scope');
      }
      scoping.hospitalId = userHospitalId;
      delete scoping.bloodBankId;
    } else if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Access denied. Role not authorized for analytics.');
    }
    return scoping;
  }
}

export const analyticsService = new AnalyticsService();
