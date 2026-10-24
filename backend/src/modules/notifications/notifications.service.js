import { notificationsRepository } from './notifications.repository.js';
import { NotFoundError } from '../../infrastructure/errors.js';

export class NotificationsService {
  async getUserNotifications(userId) {
    return notificationsRepository.getUserNotifications(userId);
  }

  async markAsRead(notificationId, userId) {
    const item = await notificationsRepository.markAsRead(notificationId, userId);
    if (!item) {
      throw new NotFoundError('Notification not found');
    }
    return item;
  }

  async markAllAsRead(userId) {
    return notificationsRepository.markAllAsRead(userId);
  }

  async sendNotification(data) {
    return notificationsRepository.createNotification(data);
  }

  async getDeliveryStatusLog(limit) {
    return notificationsRepository.getDeliveryStatusLog(limit);
  }
}

export const notificationsService = new NotificationsService();
