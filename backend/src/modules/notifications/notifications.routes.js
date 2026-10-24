import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// Current authenticated user's inbox
router.get('/me', authenticate, (req, res, next) => notificationsController.getMyNotifications(req, res, next));
router.patch('/read-all', authenticate, (req, res, next) => notificationsController.markAllAsRead(req, res, next));
router.patch('/:id/read', authenticate, (req, res, next) => notificationsController.markAsRead(req, res, next));

// Delivery status monitoring for staff & admins
router.get('/delivery-status', authenticate, requireRole('BANK_STAFF', 'HOSPITAL_STAFF', 'ADMIN'), (req, res, next) =>
  notificationsController.getDeliveryStatus(req, res, next)
);

// Enqueue notification (staff and admins)
router.post('/send', authenticate, requireRole('BANK_STAFF', 'HOSPITAL_STAFF', 'ADMIN'), (req, res, next) =>
  notificationsController.sendNotification(req, res, next)
);

export default router;
