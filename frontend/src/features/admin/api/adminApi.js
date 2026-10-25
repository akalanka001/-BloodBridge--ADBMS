import { api } from '../../../lib/api.js';

export function normalizeAdminCamp(camp) {
  return { ...camp, id: camp.id || camp.camp_id || '',
    blood_bank_name: camp.blood_bank_name || camp.coordinating_bank_name || null,
    registered_donors: camp.registered_donors ?? camp.registered_count ?? 0 };
}

/**
 * Admin Portal API Client
 */

export async function getAdminDashboard(token) {
  const res = await fetch('/api/v1/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch admin dashboard');
  return res.json();
}

export async function getUsers(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set('search', filters.search);
  if (filters.role) query.set('role', filters.role);
  if (filters.isActive !== undefined && filters.isActive !== '') query.set('isActive', String(filters.isActive));
  if (filters.isEmailVerified !== undefined && filters.isEmailVerified !== '') query.set('isEmailVerified', String(filters.isEmailVerified));
  if (filters.institutionId) query.set('institutionId', filters.institutionId);
  if (filters.limit) query.set('limit', String(filters.limit));
  if (filters.offset) query.set('offset', String(filters.offset));

  const res = await fetch(`/api/v1/admin/users?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch users');
  return res.json();
}

export async function getUserById(token, id) {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch user details');
  return res.json();
}

export async function updateUserStatus(token, id, data) {
  const res = await fetch(`/api/v1/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update user status');
  return res.json();
}

export async function getStaffMemberships(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.userId) query.set('userId', filters.userId);
  if (filters.role) query.set('role', filters.role);
  if (filters.hospitalId) query.set('hospitalId', String(filters.hospitalId));
  if (filters.bloodBankId) query.set('bloodBankId', String(filters.bloodBankId));
  if (filters.isActive !== undefined && filters.isActive !== '') query.set('isActive', String(filters.isActive));
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.offset != null) query.set('offset', filters.offset);

  const res = await fetch(`/api/v1/admin/staff-memberships?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch staff memberships');
  return res.json();
}

export async function assignStaffMembership(token, data) {
  const res = await fetch('/api/v1/admin/staff-memberships', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to assign staff membership');
  return res.json();
}

export async function updateStaffMembership(token, id, data) {
  const res = await fetch(`/api/v1/admin/staff-memberships/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update staff membership');
  return res.json();
}

export async function inviteStaff(token, data) {
  const res = await fetch('/api/v1/auth/invite-staff', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to send staff invitation');
  return res.json();
}

export async function getInstitutions(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.type) query.set('type', filters.type);
  if (filters.districtCode) query.set('districtCode', filters.districtCode);
  if (filters.provinceCode) query.set('provinceCode', filters.provinceCode);
  if (filters.isVerified !== undefined && filters.isVerified !== '') query.set('isVerified', String(filters.isVerified));
  if (filters.search) query.set('search', filters.search);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.offset != null) query.set('offset', filters.offset);

  const res = await fetch(`/api/v1/admin/institutions?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch institutions');
  return res.json();
}

export async function createInstitution(token, data) {
  const res = await fetch('/api/v1/admin/institutions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to create institution');
  return res.json();
}

export async function updateInstitution(token, type, id, data) {
  const res = await fetch(`/api/v1/admin/institutions/${type}/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update institution');
  return res.json();
}

export async function verifyInstitution(token, type, id, data) {
  const res = await fetch(`/api/v1/admin/institutions/${type}/${id}/verify`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to verify institution');
  return res.json();
}

export async function getAuditLogs(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.actorId) query.set('actorId', filters.actorId);
  if (filters.entityName) query.set('entityName', filters.entityName);
  if (filters.action) query.set('action', filters.action);
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.limit) query.set('limit', String(filters.limit));
  if (filters.offset) query.set('offset', String(filters.offset));

  const res = await fetch(`/api/v1/admin/audit-logs?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch audit logs');
  return res.json();
}

export async function getDonorClaims(token, status = '', filters = {}) {
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.offset != null) query.set('offset', filters.offset);
  const res = await fetch(`/api/v1/admin/donor-link-claims?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch donor claims');
  return res.json();
}

export async function approveDonorClaim(token, id) {
  const res = await fetch(`/api/v1/admin/donor-link-claims/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve donor claim');
  return res.json();
}

export async function rejectDonorClaim(token, id, reason) {
  const res = await fetch(`/api/v1/admin/donor-link-claims/${id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to reject donor claim');
  return res.json();
}

export async function getCamps(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.districtCode) query.set('districtCode', filters.districtCode);
  if (filters.bloodBankId) query.set('bloodBankId', String(filters.bloodBankId));
  if (filters.search) query.set('search', filters.search);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.offset != null) query.set('offset', filters.offset);
  const result = await api(`/camps/managed?${query}`, {}, token);
  return { ...result, data: (result.data || []).map(normalizeAdminCamp) };
}

export async function getCampDetails(token, id) {
  const result = await api(`/camps/managed/${encodeURIComponent(id)}`, {}, token);
  return { ...result, data: normalizeAdminCamp(result.data) };
}

export async function approveCamp(token, id) {
  const res = await fetch(`/api/v1/camps/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve donation camp');
  return res.json();
}

export async function rejectCamp(token, id, reason) {
  const res = await fetch(`/api/v1/camps/${id}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to reject donation camp');
  return res.json();
}

export async function getNotificationDeliveries(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, value); });
  const res = await fetch(`/api/v1/notifications/delivery-status?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch delivery status');
  return res.json();
}

export async function getProvinces() {
  const res = await fetch('/api/v1/locations/provinces');
  if (!res.ok) throw new Error('Failed to fetch provinces');
  return res.json();
}

export async function getDistricts(provinceCode) {
  const url = provinceCode ? `/api/v1/locations/districts?provinceCode=${provinceCode}` : '/api/v1/locations/districts';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch districts');
  return res.json();
}

export async function getDsDivisions(districtCode) {
  if (!districtCode) return { data: [] };
  const res = await fetch(`/api/v1/locations/ds-divisions?districtCode=${districtCode}`);
  if (!res.ok) throw new Error('Failed to fetch DS divisions');
  return res.json();
}
