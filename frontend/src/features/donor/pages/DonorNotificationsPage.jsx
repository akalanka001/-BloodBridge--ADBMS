import React, { useState } from 'react';
import { Bell, ShieldCheck, Filter, Inbox } from 'lucide-react';
import { InvitationCard } from '../components/InvitationCard.jsx';

export function DonorNotificationsPage({
  invitations = [],
  onRespondInvitation,
  loading = false,
}) {
  const [filter, setFilter] = useState('ALL');

  const filtered = invitations.filter((inv) => {
    if (filter === 'PENDING') return inv.status === 'PENDING';
    if (filter === 'RESPONDED') return inv.status !== 'PENDING';
    return true;
  });

  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="donor-notifications-page">
      <div className="notifications-header-row">
        <div>
          <h2 className="page-heading">Notifications & Emergency Invitations</h2>
          <p className="page-subheading">
            Direct dispatch appeals from verified hospital blood banks matched with your blood group and location.
          </p>
        </div>
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({invitations.length})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setFilter('PENDING')}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filter === 'RESPONDED' ? 'active' : ''}`}
            onClick={() => setFilter('RESPONDED')}
          >
            Responded ({invitations.length - pendingCount})
          </button>
        </div>
      </div>

      <div className="privacy-assurance-banner mb-6">
        <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-950 leading-relaxed">
          <strong>Privacy Assured:</strong> BloodBridge invitation dispatches never reveal recipient patient identities or private institutional records.
          Responding "Interested" notifies staff that you intend to present at the specified center.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-notifications-card text-center py-12 bg-white rounded-xl border border-slate-200">
          <Inbox size={36} className="text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-navy mt-3">No invitations in this view</h4>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            You will receive instant alerts here whenever a blood bank in your district requires your specific blood type.
          </p>
        </div>
      ) : (
        <div className="notifications-cards-grid">
          {filtered.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              onRespond={onRespondInvitation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
