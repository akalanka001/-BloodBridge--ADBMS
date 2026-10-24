import { Router } from 'express';
import { requestsController } from '../requests/requests.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.post('/:id/receive', (req, res, next) => requestsController.receiveFulfillment(req, res, next));

export default router;
