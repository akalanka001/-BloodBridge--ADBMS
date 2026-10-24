import React, { useState } from 'react';
import {
  Heart,
  CheckCircle,
  Bell,
  MapPin,
  Calendar,
  Building,
  User,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/navigation.js';

export function DonorPortal({ profile, token, onProfileUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [claimDonorId, setClaimDonorId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);

  const isAvailable = Boolean(profile?.available_for_contact);
  const isCampOptIn = Boolean(profile?.camp_notifications_opt_in);
  const bloodType = profile?.blood_type_code || 'O+';
  const donorName = profile?.fullName || profile?.full_name || 'Donor';

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
      if (onProfileUpdate) onProfileUpdate({ ...updated, ...result.data });
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
          body: JSON.stringify({ donorId: claimDonorId.trim(), verificationNotes: claimNotes.trim() }),
        },
        token,
      );
      setSuccess('Identity claim submitted! An administrator will review your past donation records.');
      setClaimDonorId('');
      setClaimNotes('');
      setShowClaimForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="donor-portal-view">
      {/* Feedback alerts */}
      {error && <div className="notice error" style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="notice success" style={{ marginBottom: 20 }}>{success}</div>}

      {/* 3 KPI Stat Cards matching 02-donor-dashboard.svg */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <Heart size={22} />
            </div>
            <span className="dash-kpi-label">Your donations</span>
          </div>
          <div className="dash-kpi-value">06</div>
          <div className="dash-kpi-note">A meaningful contribution</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle size={22} />
            </div>
            <span className="dash-kpi-label">Donation status</span>
          </div>
          <div className="dash-kpi-value" style={{ color: isAvailable ? '#16A085' : '#7A8B9E' }}>
            {isAvailable ? 'Available' : 'Paused'}
          </div>
          <div className="dash-kpi-note">You control your availability</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <Bell size={22} />
            </div>
            <span className="dash-kpi-label">Donation invitations</span>
          </div>
          <div className="dash-kpi-value">02</div>
          <div className="dash-kpi-note">New invitations to review</div>
        </div>
      </div>

      {/* Row 2: Availability Control & New Invitation */}
      <div className="dash-two-col">
        {/* Availability Control Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Your donor availability</h2>
              <p className="dash-card-subtitle">
                Choose whether blood-bank teams can send you new invitations.
              </p>
            </div>
            <span className={`dash-pill-badge ${isAvailable ? 'green' : 'gray'}`}>
              {isAvailable ? 'AVAILABLE' : 'PAUSED'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F6FAFB',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid #E8ECF2',
              marginTop: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: isAvailable ? '#E6F8F2' : '#F1F4F7',
                  color: isAvailable ? '#16A085' : '#7A8B9E',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CheckCircle size={22} />
              </div>
              <div>
                <strong style={{ fontSize: 16, color: '#1D3043' }}>
                  {isAvailable ? 'Ready to help' : 'Availability Paused'}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7A8B9E' }}>
                  {isAvailable
                    ? 'Your status is visible to authorized medical teams.'
                    : 'Medical teams will not contact you for routine donations.'}
                </p>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
              <input
                id="donor-consent-contact"
                type="checkbox"
                disabled={saving}
                checked={isAvailable}
                onChange={(e) => savePreference('available_for_contact', e.target.checked)}
                style={{
                  width: 22,
                  height: 22,
                  accentColor: '#16A085',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1D3043' }}>
                {isAvailable ? 'Active' : 'Off'}
              </span>
            </label>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#41566D', cursor: 'pointer' }}>
              <input
                id="donor-consent-camps"
                type="checkbox"
                disabled={saving}
                checked={isCampOptIn}
                onChange={(e) => savePreference('camp_notifications_opt_in', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#DB3654' }}
              />
              <span>Notify me about approved local donation camps in my district</span>
            </label>
          </div>
        </div>

        {/* New Donation Invitation Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">New donation invitation</h2>
              <p className="dash-card-subtitle">Urgent hospital request match</p>
            </div>
            <span className="dash-pill-badge red">NEW</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#FFF0F2',
                color: '#DB3654',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Building size={20} />
            </div>
            <div>
              <strong style={{ fontSize: 15, color: '#1D3043', display: 'block' }}>City Blood Center</strong>
              <span style={{ fontSize: 12, color: '#7A8B9E' }}>Colombo District · 4.2 km away</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <span
              style={{
                background: '#FFF0F2',
                color: '#DB3654',
                fontWeight: 700,
                fontSize: 13,
                padding: '4px 14px',
                borderRadius: 20,
              }}
            >
              {bloodType}
            </span>
            <span style={{ fontSize: 13, color: '#7A8B9E' }}>Compatible for whole blood support</span>
          </div>

          <button
            type="button"
            className="dash-btn-primary"
            style={{ width: '100%', justifyContent: 'center', minHeight: 40, borderRadius: 10 }}
            onClick={() => navigate('camps')}
          >
            <span>View invitation details</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Row 3: Donation Journey Timeline & Profile Card */}
      <div className="dash-two-col">
        {/* Donation Journey Timeline Chart */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Your donation journey</h2>
              <p className="dash-card-subtitle">A timeline of your recorded contributions.</p>
            </div>
            <span className="dash-pill-badge gray">This year</span>
          </div>

          {/* SVG Animated Timeline Chart */}
          <div style={{ width: '100%', height: 180, position: 'relative', marginTop: 10 }}>
            <svg viewBox="0 0 600 160" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="donorChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DA3755" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#DA3755" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="30" x2="560" y2="30" stroke="#EAF0F3" strokeWidth="1" />
              <line x1="40" y1="75" x2="560" y2="75" stroke="#EAF0F3" strokeWidth="1" />
              <line x1="40" y1="120" x2="560" y2="120" stroke="#EAF0F3" strokeWidth="1" />

              {/* Shaded Area */}
              <path
                d="M 40,110 L 140,85 L 240,95 L 340,40 L 440,65 L 560,20 L 560,120 L 40,120 Z"
                fill="url(#donorChartGrad)"
              />

              {/* Line curve */}
              <path
                d="M 40,110 L 140,85 L 240,95 L 340,40 L 440,65 L 560,20"
                fill="none"
                stroke="#DB3654"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Circular Data Nodes */}
              {[
                { x: 40, y: 110, label: 'Jan', val: '1' },
                { x: 140, y: 85, label: 'Mar', val: '2' },
                { x: 240, y: 95, label: 'May', val: '3' },
                { x: 340, y: 40, label: 'Jul', val: '4' },
                { x: 440, y: 65, label: 'Sep', val: '5' },
                { x: 560, y: 20, label: 'Oct', val: '6' },
              ].map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#DB3654" strokeWidth="3" />
                  <text
                    x={pt.x}
                    y="142"
                    fontSize="11"
                    fontWeight="500"
                    fill="#7A8B9E"
                    textAnchor="middle"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Profile & Past Walk-in Claim Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Your donor profile</h2>
              <p className="dash-card-subtitle">Verified platform credentials</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#FDECEF',
                color: '#DB3654',
                fontSize: 24,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
              }}
            >
              {donorName.slice(0, 2).toUpperCase()}
            </div>
            <strong style={{ fontSize: 18, color: '#1D3043', display: 'block' }}>{donorName}</strong>
            <div style={{ display: 'inline-block', margin: '6px 0 14px' }}>
              <span
                style={{
                  background: '#FFF0F2',
                  color: '#DB3654',
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '3px 12px',
                  borderRadius: 14,
                }}
              >
                Blood Group: {bloodType}
              </span>
            </div>
          </div>

          {/* Walk-in Donor Claim Form */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E8ECF2',
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#1D3043' }}>
                Claim Past Walk-in Donor Record
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#7A8B9E' }}>
                Enter your previous offline donor ID to link historical donations.
              </p>
              <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#41566D', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Offline Donor UUID</span>
                  <input
                    id="claim-donor-id"
                    required
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={claimDonorId}
                    onChange={(e) => setClaimDonorId(e.target.value)}
                    style={{
                      height: 38,
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '0 10px',
                      fontSize: 12,
                    }}
                  />
                </label>

                <label style={{ fontSize: 12, fontWeight: 600, color: '#41566D', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Verification Notes</span>
                  <input
                    id="claim-notes"
                    placeholder="Notes for administrator review"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    style={{
                      height: 38,
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '0 10px',
                      fontSize: 12,
                    }}
                  />
                </label>

                <button
                  id="btn-submit-claim"
                  type="submit"
                  disabled={saving}
                  className="dash-btn-primary"
                  style={{ minHeight: 38, padding: '8px 16px', fontSize: 13, alignSelf: 'flex-start' }}
                >
                  {saving ? 'Submitting…' : 'Submit Claim'}
                </button>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}
