import { Router } from 'express';
import { bankController } from './bank.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('BANK_STAFF', 'ADMIN'));

router.get('/dashboard', (req, res, next) => bankController.getDashboard(req, res, next));
router.get('/requests', (req, res, next) => bankController.getIncomingRequests(req, res, next));
router.get('/camps', (req, res, next) => bankController.getUpcomingCamps(req, res, next));

export default router;
