import { apiClient } from '../../../lib/api.js';

export const notificationsApi = {
  getMyNotifications: async (filters = {}) => {
    const res = await apiClient.get('/notifications/me', { params: filters });
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data;
  },

  getDeliveryStatus: async () => {
    const res = await apiClient.get('/notifications/delivery-status');
    return res.data;
  },

  sendNotification: async (payload) => {
    const res = await apiClient.post('/notifications/send', payload);
    return res.data;
  },
};
