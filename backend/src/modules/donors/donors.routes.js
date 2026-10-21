import { Router } from 'express';
import { donorsController } from './donors.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('DONOR'));

router.get('/me', (req, res, next) => donorsController.getMyProfile(req, res, next));
router.patch('/me', (req, res, next) => donorsController.updateProfile(req, res, next));
router.patch('/me/preferences', (req, res, next) => donorsController.updatePreferences(req, res, next));
router.post('/me/link-claims', (req, res, next) => donorsController.submitLinkClaim(req, res, next));
router.get('/me/visits', (req, res, next) => donorsController.getMyVisits(req, res, next));
router.get('/me/donations', (req, res, next) => donorsController.getMyDonations(req, res, next));

export default router;
