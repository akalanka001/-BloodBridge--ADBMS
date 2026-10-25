import { api } from '../../../lib/api.js';

export const donorApi = {
  getProfile: (token) => api('/donors/me', { method: 'GET' }, token),
  getDashboardSummary: (token) => api('/donors/me/dashboard', { method: 'GET' }, token),
  getNextReview: (token) => api('/donors/me/next-donation-review', { method: 'GET' }, token),
  getDonations: (token) => api('/donors/me/donations', { method: 'GET' }, token),
  getVisits: (token) => api('/donors/me/visits', { method: 'GET' }, token),
  updateProfile: (data, token) =>
    api('/donors/me', { method: 'PATCH', body: JSON.stringify(data) }, token),
  updatePreferences: (data, token) =>
    api('/donors/me/preferences', { method: 'PATCH', body: JSON.stringify(data) }, token),
  getInvitations: (token) => api('/donors/me/invitations', { method: 'GET' }, token),
  respondInvitation: (id, response, token) =>
    api(`/donors/me/invitations/${id}/respond`, { method: 'POST', body: JSON.stringify({ response }) }, token),
  getAppointments: (token) => api('/donors/me/appointments', { method: 'GET' }, token),
  bookAppointment: (data, token) =>
    api('/donors/me/appointments', { method: 'POST', body: JSON.stringify(data) }, token),
  cancelAppointment: (id, token) =>
    api(`/donors/me/appointments/${id}/cancel`, { method: 'PATCH' }, token),
  getClaims: (token) => api('/donors/me/link-claims', { method: 'GET' }, token),
  submitClaim: (data, token) =>
    api('/donors/me/link-claims', { method: 'POST', body: JSON.stringify(data) }, token),
  getBloodBanks: (token) => api('/blood-banks', { method: 'GET' }, token),
  getCamps: (params = '', token) => api(`/camps${params ? '?' + params : ''}`, { method: 'GET' }, token),
  registerCamp: (campId, token) =>
    api(`/camps/${campId}/registrations`, { method: 'POST' }, token),
};
