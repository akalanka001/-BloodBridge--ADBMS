import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/donor-link-claims', (req, res, next) => adminController.getClaims(req, res, next));
router.post('/donor-link-claims/:id/approve', (req, res, next) => adminController.approveClaim(req, res, next));
router.post('/donor-link-claims/:id/reject', (req, res, next) => adminController.rejectClaim(req, res, next));

export default router;
