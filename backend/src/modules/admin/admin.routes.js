import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Enforce authentication & ADMIN role across all administrative endpoints
router.use(authenticate, requireRole('ADMIN'));

// 1. Dashboard summary
router.get('/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));

// 2. User management
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.get('/users/:id', (req, res, next) => adminController.getUserById(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.updateUserStatus(req, res, next));

// 3. Staff memberships
router.get('/staff-memberships', (req, res, next) => adminController.listStaffMemberships(req, res, next));
router.post('/staff-memberships', (req, res, next) => adminController.assignStaffMembership(req, res, next));
router.patch('/staff-memberships/:id', (req, res, next) => adminController.updateStaffMembership(req, res, next));

// 4. Institutions (Hospitals & Blood Banks)
router.get('/institutions', (req, res, next) => adminController.listInstitutions(req, res, next));
router.post('/institutions', (req, res, next) => adminController.createInstitution(req, res, next));
router.patch('/institutions/:type/:id', (req, res, next) => adminController.updateInstitution(req, res, next));
router.patch('/institutions/:type/:id/verify', (req, res, next) => adminController.verifyInstitution(req, res, next));

// 5. Audit logs
router.get('/audit-logs', (req, res, next) => adminController.listAuditLogs(req, res, next));

// 6. Donor account claims
router.get('/donor-link-claims', (req, res, next) => adminController.getClaims(req, res, next));
router.post('/donor-link-claims/:id/approve', (req, res, next) => adminController.approveClaim(req, res, next));
router.post('/donor-link-claims/:id/reject', (req, res, next) => adminController.rejectClaim(req, res, next));

export default router;
