import React, { useEffect, useState } from 'react';
import {
  HeartHandshake, Hospital, Droplet, LayoutDashboard,
  LockKeyhole, ArrowRight,
} from 'lucide-react';
import { IconTile } from '../../components/ui/IconTile.jsx';
import { Badge, Heading } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/navigation.js';

import { DonorPortal } from '../donor/DonorPortal.jsx';
import { IntakePortal } from '../intake/IntakePortal.jsx';
import { TransfersPortal } from '../transfers/TransfersPortal.jsx';
import { AdminPortal } from '../admin/AdminPortal.jsx';
import { HospitalPortal } from '../hospital/HospitalPortal.jsx';

export function Portal({ type, session, token }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [inventoryStock, setInventoryStock] = useState([]);
  const [bankTab, setBankTab] = useState('intake'); // 'intake' | 'transfers' | 'inventory'

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

      {/* DONOR DOMAIN MODULE */}
      {type === 'donor' && authorized && (
        <DonorPortal
          profile={profile}
          token={token}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}

      {/* HOSPITAL DOMAIN MODULE */}
      {type === 'hospital' && authorized && (
        <HospitalPortal
          token={token}
          userHospitalId={session.user.hospitalId || 1}
        />
      )}

      {/* BLOOD BANK DOMAIN MODULE */}
      {type === 'bank' && authorized && (
        <div className="bank-portal-container" style={{ marginTop: '1.5rem' }}>
          <div className="bank-section-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            <button
              id="bank-tab-intake"
              className={bankTab === 'intake' ? 'primary' : 'outline'}
              onClick={() => setBankTab('intake')}
            >
              Donor Intake & Collections
            </button>
            <button
              id="bank-tab-transfers"
              className={bankTab === 'transfers' ? 'primary' : 'outline'}
              onClick={() => setBankTab('transfers')}
            >
              Inter-Bank Transfers
            </button>
            <button
              id="bank-tab-inventory"
              className={bankTab === 'inventory' ? 'primary' : 'outline'}
              onClick={() => setBankTab('inventory')}
            >
              Released Blood Stock
            </button>
          </div>

          {bankTab === 'intake' && (
            <IntakePortal token={token} userBankId={session.user.bloodBankId || 1} />
          )}

          {bankTab === 'transfers' && (
            <TransfersPortal token={token} userBankId={session.user.bloodBankId || 1} />
          )}

          {bankTab === 'inventory' && (
            <div className="surface-card">
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
          )}
        </div>
      )}

      {/* ADMINISTRATOR DOMAIN MODULE */}
      {type === 'admin' && authorized && (
        <div style={{ marginTop: '1.5rem' }}>
          <AdminPortal token={token} />
        </div>
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
