import { Router } from 'express';
import { requestsController } from '../requests/requests.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.get('/dashboard', (req, res, next) => requestsController.getDashboard(req, res, next));
router.get('/available-stock', (req, res, next) => requestsController.getAvailableStock(req, res, next));

export default router;
