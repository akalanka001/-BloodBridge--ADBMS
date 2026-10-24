import { apiClient } from '../../../lib/api.js';

export const campsApi = {
  listPublicCamps: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/camps${query ? `?${query}` : ''}`);
    return res.data;
  },

  listManagedCamps: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/camps/managed${query ? `?${query}` : ''}`);
    return res.data;
  },

  getCamp: async (id) => {
    const res = await apiClient.get(`/camps/${id}`);
    return res.data;
  },

  createCamp: async (data) => {
    const res = await apiClient.post('/camps', data);
    return res.data;
  },

  updateCamp: async (id, data) => {
    const res = await apiClient.patch(`/camps/${id}`, data);
    return res.data;
  },

  submitCamp: async (id) => {
    const res = await apiClient.post(`/camps/${id}/submit`);
    return res.data;
  },

  approveCamp: async (id) => {
    const res = await apiClient.post(`/camps/${id}/approve`);
    return res.data;
  },

  cancelCamp: async (id, reason) => {
    const res = await apiClient.post(`/camps/${id}/cancel`, { reason });
    return res.data;
  },

  registerDonor: async (campId) => {
    const res = await apiClient.post(`/camps/${campId}/registrations`);
    return res.data;
  },

  cancelRegistration: async (campId) => {
    const res = await apiClient.delete(`/camps/${campId}/registrations`);
    return res.data;
  },

  getMyRegistrations: async () => {
    const res = await apiClient.get('/camps/registrations/me');
    return res.data;
  },

  listRegistrations: async (campId) => {
    const res = await apiClient.get(`/camps/${campId}/registrations`);
    return res.data;
  },

  checkInDonor: async (campId, { donorId, status, notes }) => {
    const res = await apiClient.post(`/camps/${campId}/check-ins`, { donorId, status, notes });
    return res.data;
  },

  attachMedia: async (campId, mediaPayload) => {
    const res = await apiClient.post(`/camps/${campId}/media`, mediaPayload);
    return res.data;
  },

  removeMedia: async (campId, mediaId) => {
    const res = await apiClient.delete(`/camps/${campId}/media/${mediaId}`);
    return res.data;
  },

  listOrganizers: async () => {
    const res = await apiClient.get('/camps/organizers');
    return res.data;
  },
};
