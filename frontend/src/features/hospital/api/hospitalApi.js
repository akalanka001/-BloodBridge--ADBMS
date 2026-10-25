import { api } from '../../../lib/api.js';

export const hospitalApi = {
  getContext: (hospitalId, token) => api('/hospital/context' + (hospitalId ? `?hospitalId=${hospitalId}` : ''), {}, token),
  getDonorCandidates: (filters, token) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
    return api(`/hospital/donor-candidates?${params}`, {}, token);
  },
  getReports: (hospitalId, token) => api(`/hospital/reports?hospitalId=${hospitalId}`, {}, token),
  getDeliveries: (hospitalId, filters, token) => api(`/hospital/deliveries?${new URLSearchParams({ hospitalId, ...filters })}`, {}, token),
  getDashboard: (hospitalId, token) => {
    const qs = hospitalId ? `?hospitalId=${hospitalId}` : '';
    return api(`/hospital/dashboard${qs}`, {}, token);
  },

  getRequests: (filters = {}, token) => {
    const cleanParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams.append(k, v);
      }
    });
    const qs = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
    return api(`/requests${qs}`, {}, token);
  },

  getRequestById: (id, token) => api(`/requests/${id}`, {}, token),

  getRequestProgress: (id, token) => api(`/requests/${id}/progress`, {}, token),
  getMatchingSummary: (id, requestItemId, token) => api(`/requests/${id}/matching-summary${requestItemId ? `?requestItemId=${requestItemId}` : ''}`, {}, token),

  createRequest: (data, token) =>
    api('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  cancelRequest: (id, reason, token) =>
    api(`/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, token),

  getAvailableStock: (hospitalId, token) => {
    const qs = hospitalId ? `?hospitalId=${hospitalId}` : '';
    return api(`/hospital/available-stock${qs}`, {}, token);
  },

  getEmergencyAppeals: (hospitalId, token, filters = {}) =>
    api(`/emergency-appeals/hospital/${hospitalId}?${new URLSearchParams(filters)}`, {}, token),

  getEmergencyAppealById: (id, token) =>
    api(`/emergency-appeals/${id}`, {}, token),

  createEmergencyAppeal: (data, token) =>
    api('/emergency-appeals', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  escalateEmergencyAppeal: (id, targetStage, token) =>
    api(`/emergency-appeals/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ targetStage }),
    }, token),

  receiveFulfillment: (fulfillmentId, data, token) =>
    api(`/fulfillments/${fulfillmentId}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
};
