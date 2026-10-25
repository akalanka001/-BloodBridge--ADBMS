export const PORTAL_NAV = {
  DONOR: { title: 'Donor portal', page: 'donor', menu: [
    ['overview', 'Overview', 'overview'], ['donations', 'My Donations', 'donations'],
    ['appointments', 'Appointments', 'calendar'], ['camps', 'Find Camps', 'camps'],
    ['account', 'My Account', 'account'],
  ], aliases: { banks: 'appointments', registrations: 'camps', profile: 'account', preferences: 'account', settings: 'account' } },
  HOSPITAL_STAFF: { title: 'Hospital portal', page: 'hospital', menu: [
    ['overview', 'Overview', 'overview'], ['requests', 'Blood Requests', 'requests'],
    ['donors', 'Find Donors', 'people'], ['banks', 'Blood Banks', 'institutions'], ['reports', 'Reports', 'reports'],
  ], aliases: { 'new-request': 'requests', details: 'requests', tracking: 'requests', emergency: 'requests', appeals: 'requests' } },
  BANK_STAFF: { title: 'Blood bank portal', page: 'bank', menu: [
    ['overview', 'Overview', 'overview'], ['intake', 'Donor Operations', 'people'],
    ['inventory', 'Inventory', 'inventory'], ['requests', 'Requests & Transfers', 'requests'], ['camps', 'Camps', 'camps'],
  ], aliases: { visits: 'intake', assessments: 'intake', donations: 'intake', processing: 'inventory', expiry: 'inventory', movements: 'inventory', stock: 'inventory', reservations: 'requests', transfers: 'requests' } },
  ADMIN: { title: 'Administration', page: 'admin', menu: [
    ['overview', 'Overview', 'overview'], ['people', 'People & Access', 'people'],
    ['institutions', 'Institutions & Locations', 'institutions'], ['operations', 'Operations', 'requests'],
    ['reports', 'Reports', 'reports'], ['system', 'System', 'system'],
  ], aliases: { users: 'people', 'camp-oversight': 'operations', 'camp-approvals': 'operations', analytics: 'reports', demand: 'reports', stock: 'reports', camps: 'reports', transfers: 'reports', benchmarks: 'system', etl: 'system', 'data-quality': 'system', 'audit-activity': 'system', 'notification-monitoring': 'system' } },
};

export function getPrimaryTab(role, tab) {
  const config = PORTAL_NAV[role] || PORTAL_NAV.DONOR;
  return config.aliases[tab] || tab;
}

export function readPortalQuery() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '');
}

export function updatePortalQuery(values, { replace = false } = {}) {
  const route = window.location.hash.slice(1).split('?')[0];
  const query = readPortalQuery();
  Object.entries(values).forEach(([key, value]) => {
    if (value == null || value === '') query.delete(key);
    else query.set(key, String(value));
  });
  const hash = `#${route}${query.size ? `?${query}` : ''}`;
  if (hash === window.location.hash) return;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new Event('hashchange'));
  } else window.location.hash = hash;
}
