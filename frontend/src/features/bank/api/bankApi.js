import { api } from '../../../lib/api.js';

export const bankApi = {
  // Dashboard
  async getDashboard(bankId, componentCode = 'RBC', token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    if (componentCode) params.append('componentCode', componentCode);
    return api(`/bank/dashboard?${params.toString()}`, {}, token);
  },

  // Inventory
  async getInventorySummary(token) {
    return api('/inventory/summary', {}, token);
  },

  async getInventoryUnits(filters = {}, token) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, v);
      }
    });
    return api(`/inventory/units?${params.toString()}`, {}, token);
  },

  async getUnitById(id, token) {
    return api(`/inventory/units/${id}`, {}, token);
  },

  async releaseUnit(id, { releaseStatus, notes }, token) {
    return api(`/inventory/units/${id}/release`, {
      method: 'POST',
      body: JSON.stringify({ releaseStatus, notes }),
    }, token);
  },

  async processDonation({ donationId, components }, token) {
    return api('/inventory/process-donation', {
      method: 'POST',
      body: JSON.stringify({ donationId, components }),
    }, token);
  },

  async reserveUnit({ requestItemId, bloodUnitId }, token) {
    return api('/inventory/reservations', {
      method: 'POST',
      body: JSON.stringify({ requestItemId, bloodUnitId }),
    }, token);
  },

  async getExpiryAlerts(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/inventory/expiry-alerts?${params.toString()}`, {}, token);
  },

  async getMovements(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/inventory/movements?${params.toString()}`, {}, token);
  },

  // Transfers
  async getTransfers(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/transfers?${params.toString()}`, {}, token);
  },

  async getTransferById(id, token) {
    return api(`/transfers/${id}`, {}, token);
  },

  async createTransfer(payload, token) {
    return api('/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  async dispatchTransfer(id, token) {
    return api(`/transfers/${id}/dispatch`, {
      method: 'POST',
    }, token);
  },

  async receiveTransfer(id, { notes }, token) {
    return api(`/transfers/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }, token);
  },

  // Donor Intake
  async lookupDonors(query, token) {
    return api('/donor-intake/lookup', {
      method: 'POST',
      body: JSON.stringify(query),
    }, token);
  },

  async registerWalkIn(data, token) {
    return api('/donor-intake/walk-ins', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  async checkInVisit(data, token) {
    return api('/donor-intake/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  async getVisits(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/donor-intake/visits?${params.toString()}`, {}, token);
  },

  async getVisitById(id, token) {
    return api(`/donor-intake/visits/${id}`, {}, token);
  },

  async recordAssessment(visitId, data, token) {
    return api(`/donor-intake/visits/${visitId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  async recordCollection(data, token) {
    return api('/donor-intake/donations', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  async getDonations(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/donor-intake/donations?${params.toString()}`, {}, token);
  },

  // Incoming Requests for Bank Allocation
  async getBankRequests(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/bank/requests?${params.toString()}`, {}, token);
  },

  async getUpcomingCamps(bankId, token) {
    const params = new URLSearchParams();
    if (bankId) params.append('bankId', bankId);
    return api(`/bank/camps?${params.toString()}`, {}, token);
  },

  async getHospitalRequests(filters = {}, token) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });
    return api(`/requests?${params.toString()}`, {}, token);
  },
};
