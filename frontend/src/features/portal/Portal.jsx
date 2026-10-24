import React, { useEffect, useState } from 'react';
import {
  Droplet,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/navigation.js';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout.jsx';

import { DonorPortal } from '../donor/DonorPortal.jsx';
import { IntakePortal } from '../intake/IntakePortal.jsx';
import { TransfersPortal } from '../transfers/TransfersPortal.jsx';
import { AdminPortal } from '../admin/AdminPortal.jsx';
import { HospitalPortal } from '../hospital/HospitalPortal.jsx';

export function Portal({ type, session, token, onLogout = () => {} }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [inventoryStock, setInventoryStock] = useState([]);
  const [bankTab, setBankTab] = useState('inventory'); // 'inventory' | 'intake' | 'transfers'
  const [activeNavTab, setActiveNavTab] = useState('overview');

  const roleMapping = {
    donor: 'DONOR',
    hospital: 'HOSPITAL_STAFF',
    bank: 'BANK_STAFF',
    admin: 'ADMIN',
  };

  const userRole = session?.user?.role;
  const authorized = userRole === roleMapping[type];

  useEffect(() => {
    if (!token || !authorized) return;

    if (type === 'donor') {
      api('/donors/me', {}, token)
        .then((r) => setProfile(r.data))
        .catch((e) => setError(e.message));
    }

    if (type === 'bank') {
      api('/inventory/summary', {}, token)
        .then((r) => setInventoryStock(r.data || []))
        .catch((e) => setError(e.message));
    }
  }, [type, token, authorized]);

  // Headers per role matching the SVGs
  const headers = {
    donor: {
      title: `Good morning, ${profile?.fullName || profile?.full_name || session?.user?.fullName || 'Amara'}`,
      subtitle: 'Every donation starts with someone willing to help.',
      action: (
        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => navigate('camps')}
        >
          <span>Find a blood bank</span>
          <ArrowRight size={16} />
        </button>
      ),
    },
    hospital: {
      title: 'Hospital operations',
      subtitle: 'Manage requests and coordinate with the blood network.',
      action: null,
    },
    bank: {
      title: 'Inventory control',
      subtitle: 'Live stock visibility and accountable blood-unit management.',
      action: (
        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => setBankTab('intake')}
        >
          <span>Record donation</span>
          <ArrowRight size={16} />
        </button>
      ),
    },
    admin: {
      title: 'Platform overview',
      subtitle: 'Operations, historical analytics, and database performance.',
      action: (
        <div
          style={{
            background: '#E8F7F1',
            color: '#16A085',
            fontSize: 11,
            fontWeight: 750,
            padding: '7px 16px',
            borderRadius: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A085' }} />
          SYSTEM HEALTHY
        </div>
      ),
    },
  };

  const currentHeader = headers[type] || headers.donor;

  return (
    <DashboardLayout
      role={roleMapping[type] || 'DONOR'}
      user={session?.user}
      activeTab={activeNavTab}
      onTabChange={(tab) => {
        setActiveNavTab(tab);
        if (type === 'bank' && ['intake', 'transfers', 'inventory'].includes(tab)) {
          setBankTab(tab);
        }
      }}
      onLogout={onLogout}
      headerTitle={currentHeader.title}
      headerSubtitle={currentHeader.subtitle}
      headerAction={currentHeader.action}
    >
      {/* Fallback unauthorized notice if logged into wrong role */}
      {!authorized && (
        <div className="dash-priority-banner" style={{ background: '#FFF7ED', marginBottom: 24 }}>
          <div className="dash-priority-icon" style={{ background: '#FFEDD5', color: '#D97706' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="dash-priority-content">
            <h3 className="dash-priority-title">Role Permission Notice</h3>
            <p className="dash-priority-desc">
              Your logged-in role is <strong>{session?.user?.role || 'Guest'}</strong>. This section is
              configured for <strong>{roleMapping[type]}</strong> accounts.
            </p>
          </div>
        </div>
      )}

      {error && <div className="notice error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* 1. DONOR PORTAL */}
      {type === 'donor' && (
        <DonorPortal
          profile={profile}
          token={token}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}

      {/* 2. HOSPITAL PORTAL */}
      {type === 'hospital' && (
        <HospitalPortal
          token={token}
          userHospitalId={session?.user?.hospitalId || 1}
        />
      )}

      {/* 3. BLOOD BANK PORTAL (Matching 04-bloodbank-dashboard.svg) */}
      {type === 'bank' && (
        <div className="bank-portal-view">
          {/* 3 KPI Stat Cards */}
          <div className="dash-kpi-grid">
            <div className="dash-kpi-card">
              <div className="dash-kpi-top">
                <div className="dash-kpi-icon pink">
                  <Droplet size={22} />
                </div>
                <span className="dash-kpi-label">Available units</span>
              </div>
              <div className="dash-kpi-value">284</div>
              <div className="dash-kpi-note">Ready for allocation</div>
            </div>

            <div className="dash-kpi-card">
              <div className="dash-kpi-top">
                <div className="dash-kpi-icon yellow">
                  <Clock size={22} />
                </div>
                <span className="dash-kpi-label">Expiring soon</span>
              </div>
              <div className="dash-kpi-value">17</div>
              <div className="dash-kpi-note">Review expiry dates</div>
            </div>

            <div className="dash-kpi-card">
              <div className="dash-kpi-top">
                <div className="dash-kpi-icon pink">
                  <FileText size={22} />
                </div>
                <span className="dash-kpi-label">Incoming requests</span>
              </div>
              <div className="dash-kpi-value">09</div>
              <div className="dash-kpi-note">Waiting for a response</div>
            </div>
          </div>

          {/* Operational Sub-Navigation Tabs */}
          <div style={{ display: 'flex', gap: 10, margin: '20px 0' }}>
            <button
              id="bank-tab-inventory"
              type="button"
              className={bankTab === 'inventory' ? 'dash-btn-primary' : 'reg-btn-outline'}
              style={{ minHeight: 40, padding: '0 18px', fontSize: 13 }}
              onClick={() => setBankTab('inventory')}
            >
              Stock Overview
            </button>
            <button
              id="bank-tab-intake"
              type="button"
              className={bankTab === 'intake' ? 'dash-btn-primary' : 'reg-btn-outline'}
              style={{ minHeight: 40, padding: '0 18px', fontSize: 13 }}
              onClick={() => setBankTab('intake')}
            >
              Donor Intake & Collections
            </button>
            <button
              id="bank-tab-transfers"
              type="button"
              className={bankTab === 'transfers' ? 'dash-btn-primary' : 'reg-btn-outline'}
              style={{ minHeight: 40, padding: '0 18px', fontSize: 13 }}
              onClick={() => setBankTab('transfers')}
            >
              Inter-Bank Transfers
            </button>
          </div>

          {/* Tab 1: Stock Overview matching 04-bloodbank-dashboard.svg */}
          {bankTab === 'inventory' && (
            <>
              <div className="dash-two-col">
                {/* 8-Blood Group Grid Card */}
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">Blood group availability</h2>
                      <p className="dash-card-subtitle">Live stock values by blood type</p>
                    </div>
                    <span className="dash-pill-badge gray">Red cells</span>
                  </div>

                  <div className="dash-blood-grid">
                    {[
                      { type: 'O+', units: 56, pct: 90, color: '#16A085' },
                      { type: 'O-', units: 12, pct: 20, color: '#DB3654' },
                      { type: 'A+', units: 45, pct: 75, color: '#16A085' },
                      { type: 'A-', units: 8, pct: 15, color: '#DB3654' },
                      { type: 'B+', units: 37, pct: 60, color: '#16A085' },
                      { type: 'B-', units: 13, pct: 22, color: '#DB9B38' },
                      { type: 'AB+', units: 22, pct: 35, color: '#16A085' },
                      { type: 'AB-', units: 5, pct: 10, color: '#DB3654' },
                    ].map((g, i) => (
                      <div key={i} className="dash-blood-tile">
                        <div className="dash-blood-tile-top">
                          <span className="dash-blood-name">{g.type}</span>
                          <span className="dash-blood-units" style={{ color: g.color }}>
                            {g.units} units
                          </span>
                        </div>
                        <div className="dash-blood-bar-track">
                          <div
                            className="dash-blood-bar-fill"
                            style={{ width: `${g.pct}%`, background: g.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiry Watch Card */}
                <div className="dash-card">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-card-title">Expiry watch</h2>
                      <p className="dash-card-subtitle">First-expiring stock to review</p>
                    </div>
                    <span className="dash-pill-badge red">17 items</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                    {[
                      { id: 'BU-02081', comp: 'Platelets', days: '1 day left' },
                      { id: 'BU-02058', comp: 'Red cells', days: '2 days left' },
                      { id: 'BU-01971', comp: 'Red cells', days: '4 days left' },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingBottom: 10,
                          borderBottom: idx < 2 ? '1px solid #E8ECF2' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#FFF5E5',
                              color: '#D69B3D',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Clock size={18} />
                          </div>
                          <div>
                            <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>
                              {item.id}
                            </strong>
                            <small style={{ fontSize: 11, color: '#7A8B9E' }}>{item.comp}</small>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#C18328' }}>
                          {item.days}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Inventory Activity Table */}
              <div className="dash-card" style={{ marginTop: 24 }}>
                <div className="dash-card-header">
                  <div>
                    <h2 className="dash-card-title">Recent inventory activity</h2>
                    <p className="dash-card-subtitle">Accountable custody audit trail</p>
                  </div>
                  <span className="dash-pill-badge gray">See all</span>
                </div>

                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>UNIT / BATCH</th>
                        <th>COMPONENT</th>
                        <th>BLOOD GROUP</th>
                        <th>ACTIVITY</th>
                        <th>RECORDED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'BU-02089', comp: 'Red cells', group: 'O+', act: 'Collected', color: '#16A085', date: '19 Oct 2026' },
                        { id: 'BU-02088', comp: 'Platelets', group: 'A+', act: 'Reserved', color: '#B88535', date: '19 Oct 2026' },
                        { id: 'BU-02087', comp: 'Plasma', group: 'B+', act: 'Dispatched', color: '#437AB5', date: '18 Oct 2026' },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.id}</strong></td>
                          <td>{row.comp}</td>
                          <td>
                            <span
                              style={{
                                background: '#FFF0F2',
                                color: '#DB3654',
                                fontWeight: 700,
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 10,
                              }}
                            >
                              {row.group}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: row.color, fontSize: 12 }}>{row.act}</strong>
                          </td>
                          <td style={{ color: '#7A8B9E' }}>{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Tab 2: Donor Intake & Collections */}
          {bankTab === 'intake' && (
            <IntakePortal token={token} userBankId={session?.user?.bloodBankId || 1} />
          )}

          {/* Tab 3: Transfers */}
          {bankTab === 'transfers' && (
            <TransfersPortal token={token} userBankId={session?.user?.bloodBankId || 1} />
          )}
        </div>
      )}

      {/* 4. ADMIN PORTAL */}
      {type === 'admin' && <AdminPortal token={token} />}
    </DashboardLayout>
  );
}
