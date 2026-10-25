import { notificationsService } from './notifications.service.js';
import { sendNotificationSchema, notificationsQuerySchema, deliveryQuerySchema } from './notifications.validation.js';

export class NotificationsController {
  async getMyNotifications(req, res, next) {
    try {
      const filters = notificationsQuerySchema.parse(req.query);
      const data = await notificationsService.getUserNotifications(req.user.id, filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const data = await notificationsService.markAsRead(req.params.id, req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const count = await notificationsService.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read', count });
    } catch (err) {
      next(err);
    }
  }

  async sendNotification(req, res, next) {
    try {
      const parsed = sendNotificationSchema.parse(req.body);
      const data = await notificationsService.sendNotification(parsed, req.user);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDeliveryStatus(req, res, next) {
    try {
      const filters = deliveryQuerySchema.parse(req.query);
      const result = await notificationsService.getDeliveryStatusLog(filters, req.user);
      res.json({ data: result.data, count: result.pagination.total, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
