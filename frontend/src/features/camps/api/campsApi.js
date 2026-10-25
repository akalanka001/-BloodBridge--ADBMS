import { apiClient } from '../../../lib/api.js';

export function normalizeCamp(row = {}) {
  if (!row) return null;
  const id = row.camp_id || row.id || null;
  const capacity = row.capacity == null ? null : Number(row.capacity);
  const registered_count = row.registered_count != null
    ? Number(row.registered_count)
    : (row.registered_donors != null ? Number(row.registered_donors) : null);
  return {
    ...row,
    id,
    camp_id: id,
    title: row.title ?? row.camp_title ?? '',
    starts_at: row.starts_at ?? null,
    ends_at: row.ends_at ?? null,
    capacity,
    registered_count,
    registered_donors: registered_count,
    coordinating_blood_bank: row.coordinating_blood_bank ?? row.blood_bank_name ?? null,
    status: row.camp_status ?? row.status ?? null,
    primary_poster_url: row.primary_poster_url ?? row.poster_url ?? null,
  };
}

const campResult = (res) => ({ ...res, data: Array.isArray(res.data) ? res.data.map(normalizeCamp) : normalizeCamp(res.data) });
const queryString = (params) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
const requireId = (id) => { if (!id) throw new Error('This camp is unavailable. Refresh the list and try again.'); return encodeURIComponent(id); };

export const campsApi = {
  listPublicCamps: async (params = {}) => {
    const query = queryString(params);
    const res = await apiClient.get(`/camps${query ? `?${query}` : ''}`);
    return campResult(res);
  },

  discoverCamps: async (params = {}, token, signal) => {
    const query = queryString(params);
    return campResult(await apiClient.get(`/camps/discovery${query ? `?${query}` : ''}`, { token, signal }));
  },

  listManagedCamps: async (params = {}) => {
    const query = queryString(params);
    const res = await apiClient.get(`/camps/managed${query ? `?${query}` : ''}`);
    return campResult(res);
  },

  getCamp: async (id) => {
    const res = await apiClient.get(`/camps/managed/${requireId(id)}`);
    return campResult(res);
  },

  getPublicCamp: async (id, opts = {}) => campResult(await apiClient.get(`/camps/${requireId(id)}`, opts)),
  getDonorCamp: async (id, token, signal) => campResult(await apiClient.get(`/camps/discovery/${requireId(id)}`, { token, signal })),

  createCamp: async (data) => {
    const res = await apiClient.post('/camps', data);
    return campResult(res);
  },

  updateCamp: async (id, data) => {
    const res = await apiClient.patch(`/camps/${id}`, data);
    return campResult(res);
  },

  submitCamp: async (id) => {
    const res = await apiClient.post(`/camps/${id}/submit`);
    return res;
  },

  approveCamp: async (id) => {
    const res = await apiClient.post(`/camps/${id}/approve`);
    return res;
  },

  cancelCamp: async (id, reason) => {
    const res = await apiClient.post(`/camps/${id}/cancel`, { reason });
    return res;
  },

  registerDonor: async (campId, token) => {
    const res = await apiClient.post(`/camps/${requireId(campId)}/registrations`, undefined, { token });
    return res;
  },

  cancelRegistration: async (campId, token) => {
    const res = await apiClient.delete(`/camps/${requireId(campId)}/registrations`, { token });
    return res;
  },

  getMyRegistrations: async (params = {}, token, signal) => {
    const query = queryString(params);
    const res = await apiClient.get(`/camps/registrations/me${query ? `?${query}` : ''}`, { token, signal });
    return campResult(res);
  },

  listRegistrations: async (campId, params = {}, signal) => {
    const query = queryString(params);
    const res = await apiClient.get(`/camps/${requireId(campId)}/registrations${query ? `?${query}` : ''}`, { signal });
    return res;
  },

  listMedia: async (campId) => apiClient.get(`/camps/${requireId(campId)}/media`),

  checkInDonor: async (campId, { donorId, status, notes }) => {
    const res = await apiClient.post(`/camps/${campId}/check-ins`, { donorId, status, notes });
    return res;
  },

  attachMedia: async (campId, mediaPayload) => {
    const res = await apiClient.post(`/camps/${campId}/media`, mediaPayload);
    return res;
  },

  removeMedia: async (campId, mediaId) => {
    const res = await apiClient.delete(`/camps/${campId}/media/${mediaId}`);
    return res;
  },

  listOrganizers: async () => {
    const res = await apiClient.get('/camps/organizers');
    return res;
  },
};
