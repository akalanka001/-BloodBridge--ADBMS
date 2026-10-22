import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('BANK_STAFF', 'HOSPITAL_STAFF', 'ADMIN'));

router.get('/summary', (req, res, next) => inventoryController.getSummary(req, res, next));
router.post('/reservations', requireRole('BANK_STAFF'), (req, res, next) => inventoryController.reserveUnit(req, res, next));

export default router;
