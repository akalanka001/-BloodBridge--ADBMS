import React, { useState } from 'react';
import { Building2, MapPin, Droplet, Clock, Check, X, AlertCircle } from 'lucide-react';

export function InvitationCard({ invitation, onRespond }) {
  const [loading, setLoading] = useState(false);

  const isPending = invitation.status === 'PENDING';
  const urgencyClass =
    invitation.urgency === 'CRITICAL'
      ? 'urgency-critical'
      : invitation.urgency === 'URGENT'
      ? 'urgency-urgent'
      : 'urgency-routine';

  const handleAction = async (resp) => {
    setLoading(true);
    try {
      await onRespond(invitation.id, resp);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dStr) => {
    if (!dStr) return '';
    try {
      const dt = new Date(dStr);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className={`donor-invitation-card ${!isPending ? 'responded' : ''}`}>
      <div className="inv-card-header">
        <div className="inv-facility-wrap">
          <div className="inv-facility-icon">
            <Building2 size={18} className="text-rose-600" />
          </div>
          <div>
            <h4 className="inv-facility-name">
              {invitation.blood_bank_name || invitation.hospital_name || 'Blood Bank Network'}
            </h4>
            <div className="inv-area-row">
              <MapPin size={13} className="text-slate-400" />
              <span>{invitation.area_description || 'Regional Blood Center'}</span>
              <span className="dot-divider">•</span>
              <Clock size={13} className="text-slate-400" />
              <span>Expires {formatDate(invitation.expires_at)}</span>
            </div>
          </div>
        </div>

        <div className="inv-badges-wrap">
          {invitation.blood_type_code && (
            <span className="blood-type-pill">{invitation.blood_type_code}</span>
          )}
          <span className={`urgency-pill ${urgencyClass}`}>{invitation.urgency}</span>
        </div>
      </div>

      <div className="inv-body">
        <h5 className="inv-title">{invitation.title}</h5>
        <p className="inv-message">{invitation.message}</p>
      </div>

      <div className="inv-footer">
        {isPending ? (
          <div className="inv-actions-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction('INTERESTED')}
              className="btn-inv-interested"
            >
              <Check size={16} />
              Interested
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction('UNAVAILABLE')}
              className="btn-inv-unavailable"
            >
              Unavailable
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction('DISMISSED')}
              className="btn-inv-dismiss"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="inv-status-tag">
            <span className="tag-label">Status:</span>
            <strong className={`status-val status-${invitation.status.toLowerCase()}`}>
              {invitation.status}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
