import { Router } from 'express';
import { requestsController } from './requests.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('HOSPITAL_STAFF'));

router.get('/', (req, res, next) => requestsController.getRequests(req, res, next));
router.post('/', (req, res, next) => requestsController.createRequest(req, res, next));

export default router;
