import { Router } from 'express';
import { campsController } from './camps.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.get('/', (req, res, next) => campsController.listCamps(req, res, next));
router.get('/:id', (req, res, next) => campsController.getCamp(req, res, next));
router.post('/', authenticate, requireRole('BANK_STAFF'), (req, res, next) => campsController.createCamp(req, res, next));
router.post('/:id/submit', authenticate, requireRole('BANK_STAFF'), (req, res, next) => campsController.submitCamp(req, res, next));
router.post('/:id/approve', authenticate, requireRole('BANK_STAFF'), (req, res, next) => campsController.approveCamp(req, res, next));
router.post('/:id/registrations', authenticate, requireRole('DONOR'), (req, res, next) => campsController.registerDonor(req, res, next));

export default router;
