import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { authApi } from '../../lib/authApi.js';
import { PORTAL_NAV, getPrimaryTab, readPortalQuery, updatePortalQuery } from '../../lib/portalNavigation.js';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout.jsx';
import { PortalErrorBoundary } from '../../components/ui/PortalErrorBoundary.jsx';
import { DonorPortal } from '../donor/DonorPortal.jsx';
import { AdminPortal } from '../admin/AdminPortal.jsx';
import { HospitalPortal } from '../hospital/HospitalPortal.jsx';
import { BankPortal } from '../bank/BankPortal.jsx';

function StaffAccount({ token, user }) {
  const [memberships, setMemberships] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { authApi.getMemberships(token).then(result => setMemberships(result.memberships || result.data?.memberships || [])).catch(e => setError(e.message)); }, [token]);
  return <section className="bb-account-section"><h1>My Account</h1><p>Your signed-in profile and institution assignments.</p><dl className="bb-definition"><dt>Name</dt><dd>{user.fullName || user.full_name}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{PORTAL_NAV[user.role]?.title}</dd></dl><h2>Institution assignments</h2>{error ? <p className="notice error" role="alert">{error}</p> : memberships.length ? <ul>{memberships.map(m => <li key={m.id}>{m.blood_bank_name || m.hospital_name}</li>)}</ul> : <p>{user.role === 'ADMIN' ? 'Administrative access is managed by your role.' : 'No active assignments.'}</p>}</section>;
}

export function Portal({ type, session, token, onLogout = () => {} }) {
  const role = session?.user?.role;
  const authorized = PORTAL_NAV[role]?.page === type;
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [activeNavTab, setTab] = useState(() => readPortalQuery().get('tab') || 'overview');
  useEffect(() => {
    const sync = () => setTab(readPortalQuery().get('tab') || 'overview');
    sync(); window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, [type]);
  const setActiveNavTab = useCallback(tab => {
    const current = readPortalQuery().get('tab') || 'overview';
    const changed = getPrimaryTab(role, current) !== getPrimaryTab(role, tab);
    const nestedKeys = ['section', 'record', 'page', 'h_view', 'h_list', 'h_candidates', 'h_request', 'campId', 'campSection', 'campSearch', 'campProvince', 'campDistrict', 'campDs', 'campGn', 'campSort', 'campPage', 'campSize'];
    const clearNested = changed ? Object.fromEntries(nestedKeys.map(key => [key, null])) : {};
    updatePortalQuery({ ...clearNested, tab: tab === 'overview' ? null : tab });
    setTab(tab);
  }, [role]);
  useEffect(() => {
    if (type !== 'donor' || !token || !authorized) return;
    let cancelled = false;
    api('/donors/me', {}, token).then(result => { if (!cancelled) { setProfile(result.data); setError(''); } }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [type, token, authorized]);

  return <DashboardLayout role={role || 'DONOR'} user={session?.user} activeTab={activeNavTab} onTabChange={setActiveNavTab} onLogout={onLogout}>
    {!authorized ? <section className="bb-empty" role="alert"><h1>Access restricted</h1><p>This portal requires its assigned account role.</p></section> : <PortalErrorBoundary resetKey={`${type}:${activeNavTab}`}>
      {error && <p className="notice error" role="alert">Could not load your profile: {error}</p>}
      {activeNavTab === 'account' && type !== 'donor' ? <StaffAccount token={token} user={session.user} /> : <>
        {type === 'donor' && <DonorPortal profile={profile} token={token} activeTab={activeNavTab} onTabChange={setActiveNavTab} onProfileUpdate={setProfile} />}
        {type === 'hospital' && <HospitalPortal token={token} activeTab={activeNavTab} onTabChange={setActiveNavTab} userHospitalId={session?.user?.hospitalId || null} />}
        {type === 'bank' && <BankPortal token={token} session={session} activeTab={activeNavTab} onTabChange={setActiveNavTab} />}
        {type === 'admin' && <AdminPortal token={token} activeTab={activeNavTab} onTabChange={setActiveNavTab} />}
      </>}
    </PortalErrorBoundary>}
  </DashboardLayout>;
}
