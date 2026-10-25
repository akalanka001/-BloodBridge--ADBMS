import { Router } from 'express';
import { identityController } from './identity.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Public Authentication & Onboarding
router.post('/register-donor', (req, res, next) => identityController.registerDonor(req, res, next));
router.post('/login', (req, res, next) => identityController.login(req, res, next));
router.post('/refresh', (req, res, next) => identityController.refresh(req, res, next));
router.post('/logout', (req, res, next) => identityController.logout(req, res, next));

// Password Recovery & Email Verification
router.post('/forgot-password', (req, res, next) => identityController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => identityController.resetPassword(req, res, next));
router.post('/verify-email', (req, res, next) => identityController.verifyEmail(req, res, next));

// Staff Invitation Redemption
router.post('/accept-invite', (req, res, next) => identityController.acceptInvite(req, res, next));

// Authenticated Endpoints
router.get('/me', authenticate, (req, res, next) => identityController.getMe(req, res, next));
router.get('/memberships', authenticate, (req, res, next) => identityController.getMemberships(req, res, next));

// Administrator Staff Invitations
router.post('/invite-staff', authenticate, requireRole('ADMIN'), (req, res, next) =>
  identityController.inviteStaff(req, res, next),
);

export default router;
