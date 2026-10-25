import { Router } from 'express';
import { donorsController } from './donors.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('DONOR'));

router.get('/me', (req, res, next) => donorsController.getMyProfile(req, res, next));
router.get('/me/dashboard', (req, res, next) => donorsController.getDashboardSummary(req, res, next));
router.get('/me/next-donation-review', (req, res, next) => donorsController.getNextReviewDate(req, res, next));
router.patch('/me', (req, res, next) => donorsController.updateProfile(req, res, next));
router.patch('/me/preferences', (req, res, next) => donorsController.updatePreferences(req, res, next));
router.get('/me/donations', (req, res, next) => donorsController.getMyDonations(req, res, next));
router.get('/me/visits', (req, res, next) => donorsController.getMyVisits(req, res, next));
router.get('/me/invitations', (req, res, next) => donorsController.listInvitations(req, res, next));
router.post('/me/invitations/:id/respond', (req, res, next) => donorsController.respondToInvitation(req, res, next));
router.get('/me/appointments', (req, res, next) => donorsController.listAppointments(req, res, next));
router.post('/me/appointments', (req, res, next) => donorsController.createAppointment(req, res, next));
router.patch('/me/appointments/:id/cancel', (req, res, next) => donorsController.cancelAppointment(req, res, next));
router.get('/me/link-claims', (req, res, next) => donorsController.listLinkClaims(req, res, next));
router.post('/me/link-claims', (req, res, next) => donorsController.submitLinkClaim(req, res, next));

export default router;
