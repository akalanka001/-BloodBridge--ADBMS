import { Router } from 'express';
import { appealsController } from './appeals.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.post('/', (req, res, next) => appealsController.createAppeal(req, res, next));
router.get('/:id', (req, res, next) => appealsController.getAppealById(req, res, next));
router.get('/hospital/:hospitalId', (req, res, next) => appealsController.getAppealsByHospital(req, res, next));
router.post('/:id/escalate', (req, res, next) => appealsController.escalateAppeal(req, res, next));

export default router;
