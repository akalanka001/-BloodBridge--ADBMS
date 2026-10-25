import { Router } from 'express';
import { requestsController } from './requests.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Only authenticated HOSPITAL_STAFF or ADMIN can access hospital request endpoints
router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.get('/dashboard', (req, res, next) => requestsController.getDashboard(req, res, next));
router.get('/available-stock', (req, res, next) => requestsController.getAvailableStock(req, res, next));
router.post('/fulfillments/:id/receive', (req, res, next) => requestsController.receiveFulfillment(req, res, next));

router.get('/', (req, res, next) => requestsController.getRequests(req, res, next));
router.post('/', (req, res, next) => requestsController.createRequest(req, res, next));
router.get('/:id', (req, res, next) => requestsController.getRequestById(req, res, next));
router.get('/:id/progress', (req, res, next) => requestsController.getRequestProgress(req, res, next));
router.get('/:id/matching-summary', (req, res, next) => requestsController.getMatchingSummary(req, res, next));
router.post('/:id/cancel', (req, res, next) => requestsController.cancelRequest(req, res, next));

export default router;
