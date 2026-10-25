import React from 'react';
import { TrendingUp, BarChart3, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export function HospitalReportsPage({
  kpis = {},
  requests = [],
}) {
  const total = kpis.total_requests ?? 0;
  const fulfilled = kpis.fulfilled_requests ?? 0;
  const critical = kpis.critical_requests ?? 0;
  const urgent = kpis.urgent_requests ?? 0;
  const routine = kpis.routine_requests ?? 0;

  const fulfillmentRate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  return (
    <div className="hospital-reports-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={24} color="#DB3654" />
          Hospital request reports
        </h2>
        <span style={{ fontSize: 13, color: '#7A8B9E' }}>
          All-time request totals for this hospital, counted from the full dataset.
        </span>
      </div>

      {/* Metrics Row */}
      <div className="dash-kpi-grid three-col">
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <FileText size={20} />
            </div>
            <span className="dash-kpi-label">Total Requests</span>
          </div>
          <div className="dash-kpi-value">{total}</div>
          <div className="dash-kpi-note">Lifetime hospital requisitions</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle2 size={20} />
            </div>
            <span className="dash-kpi-label">Fulfillment Rate</span>
          </div>
          <div className="dash-kpi-value">{total > 0 ? `${fulfillmentRate}%` : 'No requests'}</div>
          <div className="dash-kpi-note">{fulfilled} requests completed</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <AlertTriangle size={20} />
            </div>
            <span className="dash-kpi-label">Critical Requests</span>
          </div>
          <div className="dash-kpi-value">{critical}</div>
          <div className="dash-kpi-note">High acuity emergency events</div>
        </div>
      </div>

      {/* Breakdown Breakdown */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 16px 0' }}>
          Urgency Distribution Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Critical */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              <span>Critical (Acute Trauma / Immediate)</span>
              <span style={{ color: '#DB3654' }}>{critical} requests ({total > 0 ? Math.round((critical / total) * 100) : 0}%)</span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ width: `${total > 0 ? (critical / total) * 100 : 0}%`, height: '100%', backgroundColor: '#DB3654' }} />
            </div>
          </div>

          {/* Urgent */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              <span>Urgent (Within 24 Hours)</span>
              <span style={{ color: '#D9962E' }}>{urgent} requests ({total > 0 ? Math.round((urgent / total) * 100) : 0}%)</span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ width: `${total > 0 ? (urgent / total) * 100 : 0}%`, height: '100%', backgroundColor: '#D9962E' }} />
            </div>
          </div>

          {/* Routine */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              <span>Routine (Elective / Scheduled)</span>
              <span style={{ color: '#7A8B9E' }}>{routine} requests ({total > 0 ? Math.round((routine / total) * 100) : 0}%)</span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ width: `${total > 0 ? (routine / total) * 100 : 0}%`, height: '100%', backgroundColor: '#7A8B9E' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
