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
import { BankPortal } from '../bank/BankPortal.jsx';

export function Portal({ type, session, token, onLogout = () => {} }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
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
          onClick={() => setActiveNavTab('intake')}
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
          activeTab={activeNavTab}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}

      {/* 2. HOSPITAL PORTAL */}
      {type === 'hospital' && (
        <HospitalPortal
          token={token}
          activeTab={activeNavTab}
          userHospitalId={session?.user?.hospitalId || null}
        />
      )}

      {/* 3. BLOOD BANK PORTAL */}
      {type === 'bank' && (
        <BankPortal
          token={token}
          session={session}
          activeTab={activeNavTab}
          onTabChange={setActiveNavTab}
        />
      )}

      {/* 4. ADMIN PORTAL */}
      {type === 'admin' && <AdminPortal token={token} activeTab={activeNavTab} />}
    </DashboardLayout>
  );
}
