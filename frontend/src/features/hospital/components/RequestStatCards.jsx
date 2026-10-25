import React from 'react';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';

export function RequestStatCards({ kpis = {}, onCardClick = () => {} }) {
  const activeCount = kpis.active_requests ?? 0;
  const criticalCount = kpis.critical_priority ?? 0;
  const fulfilledCount = kpis.fulfilled_this_month ?? 0;

  return (
    <div className="dash-kpi-grid three-col" id="section-hospital-kpis">
      {/* 1. Active Requests */}
      <div
        className="dash-kpi-card"
        onClick={() => onCardClick('requests')}
        style={{ cursor: 'pointer' }}
      >
        <div className="dash-kpi-top">
          <div className="dash-kpi-icon pink">
            <FileText size={22} />
          </div>
          <span className="dash-kpi-label">Active requests</span>
        </div>
        <div className="dash-kpi-value" data-testid="kpi-active-requests">
          {String(activeCount).padStart(2, '0')}
        </div>
        <div className="dash-kpi-note">Across your hospital</div>
      </div>

      {/* 2. Critical Priority */}
      <div
        className="dash-kpi-card"
        onClick={() => onCardClick('requests', { urgency: 'CRITICAL' })}
        style={{ cursor: 'pointer' }}
      >
        <div className="dash-kpi-top">
          <div className="dash-kpi-icon yellow">
            <AlertTriangle size={22} />
          </div>
          <span className="dash-kpi-label">Critical priority</span>
        </div>
        <div className="dash-kpi-value" data-testid="kpi-critical-priority" style={{ color: criticalCount > 0 ? '#DB3654' : '#1D3043' }}>
          {String(criticalCount).padStart(2, '0')}
        </div>
        <div className="dash-kpi-note">
          {criticalCount > 0 ? 'Require immediate review' : 'No urgent shortages'}
        </div>
      </div>

      {/* 3. Fulfilled This Month */}
      <div
        className="dash-kpi-card"
        onClick={() => onCardClick('requests', { status: 'FULFILLED' })}
        style={{ cursor: 'pointer' }}
      >
        <div className="dash-kpi-top">
          <div className="dash-kpi-icon green">
            <CheckCircle size={22} />
          </div>
          <span className="dash-kpi-label">Fulfilled this month</span>
        </div>
        <div className="dash-kpi-value" data-testid="kpi-fulfilled-month">
          {String(fulfilledCount).padStart(2, '0')}
        </div>
        <div className="dash-kpi-note">Requests completed</div>
      </div>
    </div>
  );
}
