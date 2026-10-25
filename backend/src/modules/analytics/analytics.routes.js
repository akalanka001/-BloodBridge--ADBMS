import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Staff & Admin Analytics Summary (restricted by service.assertAuthorized & getScoping)
router.get('/summary', authenticate, (req, res, next) => analyticsController.getSummary(req, res, next));

// Dashboard overview with 6 genuine PostgreSQL KPIs, demand charts, and pipeline cards
router.get('/dashboard', authenticate, (req, res, next) => analyticsController.getDashboard(req, res, next));

// Star Schema Analytics
router.get('/demand-by-group', authenticate, (req, res, next) => analyticsController.getDemandByGroup(req, res, next));
router.get('/request-trends', authenticate, (req, res, next) => analyticsController.getRequestTrends(req, res, next));
router.get('/donation-trends', authenticate, (req, res, next) => analyticsController.getDonationTrends(req, res, next));
router.get('/stock-trends', authenticate, (req, res, next) => analyticsController.getStockTrends(req, res, next));
router.get('/camp-performance', authenticate, (req, res, next) => analyticsController.getCampPerformance(req, res, next));
router.get('/transfers', authenticate, (req, res, next) => analyticsController.getTransfers(req, res, next));

// Warehouse ETL Pipeline & Auditing (Admin restricted)
router.get('/etl-runs', authenticate, requireRole('ADMIN'), (req, res, next) => analyticsController.getEtlRuns(req, res, next));
router.post('/etl-runs', authenticate, requireRole('ADMIN'), (req, res, next) => analyticsController.triggerEtlRun(req, res, next));
router.get('/data-quality', authenticate, requireRole('ADMIN'), (req, res, next) => analyticsController.getDataQuality(req, res, next));

// Database Performance Lab & Query Benchmarks (Admin restricted)
router.get('/benchmarks', authenticate, requireRole('ADMIN'), (req, res, next) => analyticsController.getBenchmarks(req, res, next));
router.post('/benchmarks', authenticate, requireRole('ADMIN'), (req, res, next) => analyticsController.runBenchmark(req, res, next));

export default router;
