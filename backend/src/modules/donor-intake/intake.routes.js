import { Router } from 'express';
import { intakeController } from './intake.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('BANK_STAFF', 'ADMIN'));

router.post('/lookup', (req, res, next) => intakeController.lookupDonors(req, res, next));
router.post('/walk-ins', (req, res, next) => intakeController.registerWalkIn(req, res, next));
router.post('/visits', (req, res, next) => intakeController.checkInVisit(req, res, next));
router.get('/visits/:id', (req, res, next) => intakeController.getVisit(req, res, next));
router.post('/visits/:id/assessments', (req, res, next) => intakeController.recordAssessment(req, res, next));
router.post('/donations', (req, res, next) => intakeController.recordCollection(req, res, next));

export default router;
