import React, { useEffect, useState } from 'react';
import {
  HeartHandshake, Hospital, Droplet, LayoutDashboard,
  LockKeyhole, ArrowRight, CheckCircle2, UserCheck, Search,
  PlusCircle, RefreshCw, AlertCircle, FileCheck, Shield,
} from 'lucide-react';
import { IconTile } from '../../components/ui/IconTile.jsx';
import { Badge, Heading } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/navigation.js';

export function Portal({ type, session, token }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Bank staff state
  const [lookupQuery, setLookupQuery] = useState({ nationalId: '', phone: '', fullName: '' });
  const [lookupResults, setLookupResults] = useState([]);
  const [inventoryStock, setInventoryStock] = useState([]);
  const [walkinForm, setWalkinForm] = useState({
    fullName: '', phone: '', nationalId: '', bloodTypeCode: '', districtCode: 'CO',
  });

  // Admin state
  const [pendingClaims, setPendingClaims] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Donor claim state
  const [claimDonorId, setClaimDonorId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  const defs = {
    donor: {
      label: 'Donor Portal',
      title: 'Your donation journey',
      icon: HeartHandshake,
      description: 'A calm mobile-first space to manage your availability and discover approved camps.',
      metrics: [
        ['My availability', 'Contact preference'],
        ['Donation history', 'Verified records'],
        ['Donation camps', 'Nearby opportunities'],
      ],
    },
    hospital: {
      label: 'Hospital Portal',
      title: 'Coordinated emergency requests',
      icon: Hospital,
      description: 'Create component-specific requests, find released inventory and track fulfillment.',
      metrics: [
        ['Blood requests', 'Submitted by staff'],
        ['Matching', 'Potential candidates'],
        ['Fulfillment', 'Verified handover'],
      ],
    },
    bank: {
      label: 'Blood Bank Portal',
      title: 'Manage your blood bank',
      icon: Droplet,
      description: 'Track individual component units, approve donation camps and handle reservations.',
      metrics: [
        ['Inventory', 'Release status'],
        ['Requests', 'Pending allocation'],
        ['Camp approvals', 'Coordinating bank'],
      ],
    },
    admin: {
      label: 'Admin Portal',
      title: 'Operational insights',
      icon: LayoutDashboard,
      description: 'Manage institutional access and analyze database performance and warehouse trends.',
      metrics: [
        ['User management', 'Role and organization'],
        ['Analytics', 'Warehouse summaries'],
        ['Database lab', 'EXPLAIN / indexes'],
      ],
    },
  };

  const d = defs[type];
  const authorized =
    session?.user?.role ===
    { donor: 'DONOR', hospital: 'HOSPITAL_STAFF', bank: 'BANK_STAFF', admin: 'ADMIN' }[type];

  // Load data depending on role
  useEffect(() => {
    if (!token || !authorized) return;

    if (type === 'donor') {
      api('/donors/me', {}, token)
        .then((r) => setProfile(r.data))
        .catch((e) => setError(e.message));
    }

    if (type === 'bank') {
      api('/inventory/summary', {}, token)
        .then((r) => setInventoryStock(r.data))
        .catch((e) => setError(e.message));
    }

    if (type === 'admin') {
      api('/admin/donor-link-claims', {}, token)
        .then((r) => setPendingClaims(r.data))
        .catch((e) => setError(e.message));
      api('/analytics/summary', {}, token)
        .then((r) => setAnalyticsData(r.data))
        .catch((e) => setError(e.message));
    }
  }, [type, token, authorized]);

  const savePreference = async (key, val) => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const updated = { ...profile, [key]: val };
    try {
      const result = await api(
        '/donors/me/preferences',
        {
          method: 'PATCH',
          body: JSON.stringify({
            availableForContact: updated.available_for_contact,
            campNotificationsOptIn: updated.camp_notifications_opt_in,
          }),
        },
        token,
      );
      setProfile({ ...updated, ...result.data });
      setSuccess('Preferences updated and logged in PostgreSQL audit trail.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimDonorId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api(
        '/donors/me/link-claims',
        {
          method: 'POST',
          body: JSON.stringify({ donorId: claimDonorId, verificationNotes: claimNotes }),
        },
        token,
      );
      setSuccess('Identity claim submitted! An administrator will review your past donation records.');
      setClaimDonorId('');
      setClaimNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStaffLookup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api('/donor-intake/lookup', {
        method: 'POST',
        body: JSON.stringify(lookupQuery),
      }, token);
      setLookupResults(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWalkinEnroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/donor-intake/walk-ins', {
        method: 'POST',
        body: JSON.stringify({
          ...walkinForm,
          bloodBankId: 1, // Default primary blood bank for staff
        }),
      }, token);
      setSuccess(`Walk-in donor ${res.data.full_name} enrolled successfully without requiring online login!`);
      setWalkinForm({ fullName: '', phone: '', nationalId: '', bloodTypeCode: '', districtCode: 'CO' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClaimDecision = async (claimId, approve) => {
    setError('');
    setSuccess('');
    try {
      if (approve) {
        await api(`/admin/donor-link-claims/${claimId}/approve`, { method: 'POST' }, token);
        setSuccess('Donor identity claim approved and linked!');
      } else {
        await api(`/admin/donor-link-claims/${claimId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Verification documentation did not match' }),
        }, token);
        setSuccess('Donor identity claim rejected.');
      }
      const refreshed = await api('/admin/donor-link-claims', {}, token);
      setPendingClaims(refreshed.data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="view-section portal">
      <Heading tag={d.label} title={d.title} description={d.description} />
      {!authorized && (
        <div className="notice">
          <LockKeyhole size={18} />
          <span>
            This is the {d.label.toLowerCase()} design layout. Sign in with the appropriate role to
            access private data; no sample clinical or operational figures are presented.
          </span>
          <button className="text-link" onClick={() => navigate('login')}>
            Sign in <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="portal-heading">
        <IconTile Icon={d.icon} />
        <div>
          <strong>
            {authorized
              ? `Welcome, ${session.user.fullName || session.user.full_name || 'user'}`
              : 'Dashboard preview'}
          </strong>
          <p>Shared components · role-based authorization · responsive cards</p>
        </div>
      </div>
      <div className="three-grid">
        {d.metrics.map(([heading, desc]) => (
          <div className="surface-card stat-card" key={heading}>
            <span className="small-label">{heading}</span>
            <h3>—</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      {/* DONOR DASHBOARD FEATURES */}
      {type === 'donor' && authorized && profile && (
        <>
          <div className="surface-card settings-card">
            <h3>Donor preferences & Privacy</h3>
            <p>
              These preferences are saved directly to PostgreSQL. Availability and contact consent
              do not constitute medical fitness for donation.
            </p>
            <label className="toggle-row">
              <input
                type="checkbox"
                disabled={saving}
                checked={profile.available_for_contact}
                onChange={(e) => savePreference('available_for_contact', e.target.checked)}
              />
              <span>Available to be contacted for emergency outreach</span>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                disabled={saving}
                checked={profile.camp_notifications_opt_in}
                onChange={(e) => savePreference('camp_notifications_opt_in', e.target.checked)}
              />
              <span>Opt in to relevant donation camp notifications</span>
            </label>
          </div>

          <div className="surface-card" style={{ marginTop: '1.5rem' }}>
            <h3>Claim Existing Walk-in Donor Record</h3>
            <p>
              Did you donate at a blood bank or mobile camp prior to creating this online account?
              Submit your Donor ID to link your historical donations.
            </p>
            <form onSubmit={handleClaimSubmit} className="form-grid">
              <label>
                Offline Donor UUID
                <input
                  required
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={claimDonorId}
                  onChange={(e) => setClaimDonorId(e.target.value)}
                />
              </label>
              <label>
                Verification Notes (NIC or past donation venue)
                <input
                  placeholder="Notes for administrator review"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                />
              </label>
              <button className="primary" disabled={saving}>
                Submit Account Claim <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* BLOOD BANK STAFF FEATURES */}
      {type === 'bank' && authorized && (
        <>
          <div className="surface-card" style={{ marginTop: '1.5rem' }}>
            <h3>Donor Lookup & Walk-in Intake</h3>
            <p>
              Check whether an in-person visitor already has a record before enrolling to prevent
              duplicates.
            </p>
            <form onSubmit={handleStaffLookup} className="form-grid">
              <label>
                National ID / NIC (Privacy Hashed)
                <input
                  placeholder="NIC Number"
                  value={lookupQuery.nationalId}
                  onChange={(e) => setLookupQuery({ ...lookupQuery, nationalId: e.target.value })}
                />
              </label>
              <label>
                Phone Number
                <input
                  placeholder="Phone"
                  value={lookupQuery.phone}
                  onChange={(e) => setLookupQuery({ ...lookupQuery, phone: e.target.value })}
                />
              </label>
              <label>
                Full Name
                <input
                  placeholder="Name"
                  value={lookupQuery.fullName}
                  onChange={(e) => setLookupQuery({ ...lookupQuery, fullName: e.target.value })}
                />
              </label>
              <button className="primary">Search Donor Registry <Search size={16} /></button>
            </form>

            {lookupResults.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4>Search Results ({lookupResults.length})</h4>
                <div className="three-grid">
                  {lookupResults.map((d) => (
                    <div key={d.donor_id} className="surface-card">
                      <strong>{d.full_name}</strong>
                      <p>Blood Group: {d.blood_type_code || 'Unconfirmed'}</p>
                      <p>Phone: {d.phone || 'None'}</p>
                      <Badge>{d.registration_origin}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="surface-card" style={{ marginTop: '1.5rem' }}>
            <h3>Register Walk-in Donor</h3>
            <p>Enroll a visitor without forcing an email account or default password.</p>
            <form onSubmit={handleWalkinEnroll} className="form-grid">
              <label>
                Full Name
                <input
                  required
                  value={walkinForm.fullName}
                  onChange={(e) => setWalkinForm({ ...walkinForm, fullName: e.target.value })}
                />
              </label>
              <label>
                Phone Number
                <input
                  required
                  value={walkinForm.phone}
                  onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                />
              </label>
              <label>
                National ID / NIC
                <input
                  value={walkinForm.nationalId}
                  onChange={(e) => setWalkinForm({ ...walkinForm, nationalId: e.target.value })}
                />
              </label>
              <label>
                Blood Group (Optional)
                <select
                  value={walkinForm.bloodTypeCode}
                  onChange={(e) => setWalkinForm({ ...walkinForm, bloodTypeCode: e.target.value })}
                >
                  <option value="">Unknown / Pending Lab</option>
                  {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={saving}>
                Enroll Walk-in Donor <PlusCircle size={16} />
              </button>
            </form>
          </div>

          <div className="surface-card" style={{ marginTop: '1.5rem' }}>
            <h3>Current Released Component Stock</h3>
            <p>Live inventory queried directly from PostgreSQL view <code>v_available_blood_stock</code>.</p>
            {inventoryStock.length > 0 ? (
              <div className="three-grid">
                {inventoryStock.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="surface-card stat-card">
                    <span className="small-label">{item.blood_type_code} {item.component_code}</span>
                    <h3>{item.available_units} Units</h3>
                    <p>{item.blood_bank_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No available released units found in the local database.</p>
            )}
          </div>
        </>
      )}

      {/* ADMINISTRATOR FEATURES */}
      {type === 'admin' && authorized && (
        <>
          <div className="surface-card" style={{ marginTop: '1.5rem' }}>
            <h3>Pending Donor Account Link Claims</h3>
            <p>Authorized administrator review to link offline donor records to verified online accounts.</p>
            {pendingClaims.length > 0 ? (
              <div>
                {pendingClaims.map((claim) => (
                  <div key={claim.id} className="surface-card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>Online User:</strong> {claim.claimant_name} ({claim.claimant_email})<br />
                        <strong>Target Offline Record:</strong> {claim.donor_name} ({claim.donor_phone}) - Blood: {claim.blood_type_code || 'N/A'}<br />
                        <small>Notes: {claim.verification_notes || 'None'}</small>
                      </div>
                      <div>
                        <button
                          className="primary small"
                          style={{ marginRight: '0.5rem' }}
                          onClick={() => handleClaimDecision(claim.id, true)}
                        >
                          Approve Link
                        </button>
                        <button
                          className="outline small"
                          onClick={() => handleClaimDecision(claim.id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No pending account claims requiring review.</p>
            )}
          </div>

          {analyticsData?.metrics && (
            <div className="surface-card" style={{ marginTop: '1.5rem' }}>
              <h3>Operational Warehouse Metrics</h3>
              <div className="three-grid">
                <div className="surface-card stat-card">
                  <span className="small-label">Total Donors</span>
                  <h3>{analyticsData.metrics.total_donors}</h3>
                  <p>Registered in system</p>
                </div>
                <div className="surface-card stat-card">
                  <span className="small-label">Total Donations</span>
                  <h3>{analyticsData.metrics.total_donations}</h3>
                  <p>Completed collections</p>
                </div>
                <div className="surface-card stat-card">
                  <span className="small-label">Available Units</span>
                  <h3>{analyticsData.metrics.available_units}</h3>
                  <p>Released in stock</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="surface-card info-card" style={{ marginTop: '1.5rem' }}>
        <h3>Academic Demonstration Architecture</h3>
        <p>
          Connected to Express modular routes, PostgreSQL 16 advanced procedures, triggers, views,
          and Socket.io event channels. Real operational workflows with no hardcoded mock numbers.
        </p>
        <div className="chip-row">
          <Badge>Desktop: sidebar/table views</Badge>
          <Badge>Mobile: stacked cards</Badge>
          <Badge>Keyboard-accessible forms</Badge>
        </div>
      </div>
    </div>
  );
}
