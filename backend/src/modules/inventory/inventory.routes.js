import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('BANK_STAFF', 'HOSPITAL_STAFF', 'ADMIN'));

router.get('/summary', (req, res, next) => inventoryController.getSummary(req, res, next));
router.get('/units', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.getUnits(req, res, next));
router.get('/units/:id', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.getUnitById(req, res, next));
router.post('/units/:id/release', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.releaseUnit(req, res, next));
router.post('/process-donation', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.processDonation(req, res, next));
router.get('/expiry-alerts', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.getExpiryAlerts(req, res, next));
router.get('/movements', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.getMovements(req, res, next));
router.post('/reservations', requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) => inventoryController.reserveUnit(req, res, next));

export default router;
