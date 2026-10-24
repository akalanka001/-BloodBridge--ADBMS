import React from 'react';
import { CheckCircle, XCircle, ShieldCheck, Loader2 } from 'lucide-react';

export function AvailabilityToggle({
  isAvailable,
  onToggle,
  loading = false,
  compact = false,
}) {
  return (
    <div className={`donor-availability-widget ${compact ? 'compact' : ''}`}>
      <div className="avail-header">
        <div className="avail-title-group">
          <span className="avail-card-title">Your donor availability</span>
          <p className="avail-card-subtitle">
            Choose whether blood-bank teams can send you new donation invitations.
          </p>
        </div>
        <span
          className={`avail-status-pill ${
            isAvailable ? 'status-pill-available' : 'status-pill-unavailable'
          }`}
        >
          {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
        </span>
      </div>

      <div className="avail-content-row">
        <div className="avail-info-box">
          <div className="avail-info-icon">
            {isAvailable ? (
              <CheckCircle className="icon-emerald" size={24} />
            ) : (
              <XCircle className="icon-slate" size={24} />
            )}
          </div>
          <div>
            <h4 className="avail-info-heading">
              {isAvailable ? 'Ready to help' : 'Temporarily paused'}
            </h4>
            <p className="avail-info-desc">
              {isAvailable
                ? 'Your status is visible to authorized blood-bank dispatchers in your district.'
                : 'You are paused from receiving routine donation appeals. Emergency contact consent remains separate.'}
            </p>
          </div>
        </div>

        <div className="avail-toggle-control">
          <span className="avail-label">Availability</span>
          <button
            type="button"
            role="switch"
            aria-checked={isAvailable}
            aria-label="Toggle donor availability"
            disabled={loading}
            onClick={() => onToggle(!isAvailable)}
            className={`toggle-switch-btn ${isAvailable ? 'active' : ''}`}
          >
            <span className="toggle-slider-knob">
              {loading && <Loader2 className="animate-spin text-slate-400" size={14} />}
            </span>
          </button>
          <span className="avail-subnote">
            {loading ? 'Saving preferences...' : 'Preferences recorded in audit log'}
          </span>
        </div>
      </div>
    </div>
  );
}
