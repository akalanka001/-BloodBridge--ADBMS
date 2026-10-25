import React from 'react';
import { Activity, ArrowRight, Eye, Plus } from 'lucide-react';
import { RequestStatCards } from '../components/RequestStatCards.jsx';
import { MatchingOverview } from '../components/MatchingOverview.jsx';
import { BloodTypeBadge, RequestUrgencyBadge, RequestStatusBadge } from '../components/RequestStatusBadge.jsx';

export function HospitalOverview({
  dashboardData = {},
  loading = false,
  onNavigate = () => {},
  onSelectRequest = () => {},
}) {
  const { kpis = {}, recentRequests = [], urgentShortages = [], matchingOverview = null } = dashboardData;
  const criticalCount = kpis.critical_priority || 0;

  return (
    <div className="hospital-overview-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Accessible Title */}
      <h2 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        Hospital operations
      </h2>

      {/* 2. Three KPI Stat Cards (Real data from database) */}
      <RequestStatCards kpis={kpis} onCardClick={(tab, filters) => onNavigate(tab, filters)} />

      {/* 3. Priority Coordination Banner matching 03-hospital-dashboard.svg */}
      {criticalCount > 0 ? (
        <div
          className="dash-priority-banner"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderRadius: 18,
            backgroundColor: '#FFF0F2',
            border: '1px solid #FFE2E8',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#FBD6DF',
                color: '#DB3654',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1D3043' }}>
                Priority coordination
              </div>
              <div style={{ fontSize: 13, color: '#6D7183', marginTop: 2 }}>
                {criticalCount} critical {criticalCount === 1 ? 'request needs' : 'requests need'} attention. Review verified stock and potential donor leads.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('requests', { urgency: 'CRITICAL' })}
            style={{
              padding: '10px 20px',
              borderRadius: 11,
              border: 'none',
              backgroundColor: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Review requests
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 14,
            backgroundColor: '#F7F9FC',
            border: '1px solid #E8ECF2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            All priority requests are in steady state. Network supply monitors active shortages.
          </span>
          <button
            type="button"
            onClick={() => onNavigate('requests')}
            style={{ background: 'none', border: 'none', color: '#DB3654', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            View all requests &rarr;
          </button>
        </div>
      )}

      {/* 4. Split Grid: Recent Blood Requests & Matching Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, alignItems: 'start' }}>
        {/* Recent Blood Requests */}
        <div
          className="dash-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '24px 26px',
            border: '1px solid #E8ECF2',
            boxShadow: '0 9px 24px rgba(28, 57, 85, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: '#1D3043', margin: '0 0 2px 0' }}>
                Recent blood requests
              </h3>
              <span style={{ fontSize: 12, color: '#7A8B9E' }}>Track status across your hospital</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('requests')}
              style={{
                padding: '6px 14px',
                borderRadius: 15,
                background: '#F3F6F8',
                border: 'none',
                color: '#1D3043',
                fontSize: 12,
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              View all
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#7A8B9E' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14 }}>No blood requests submitted yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('new-request')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid #DB3654',
                  color: '#DB3654',
                  background: '#FFF0F2',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>REQUEST ID</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>BLOOD TYPE</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>UNITS</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>PRIORITY</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>STATUS</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => {
                    const firstItem = req.items_json && req.items_json[0];
                    const bloodType = firstItem?.bloodTypeCode || 'O+';
                    return (
                      <tr
                        key={req.id}
                        style={{ borderBottom: '1px solid #E8ECF2', transition: 'background-color 0.2s' }}
                      >
                        <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                          #{req.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <BloodTypeBadge bloodType={bloodType} />
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 700, color: '#1D3043' }}>
                          {req.total_requested_units == null ? 'Unavailable' : String(req.total_requested_units).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <RequestUrgencyBadge urgency={req.urgency} />
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <RequestStatusBadge status={req.status} />
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <button
                            type="button"
                            onClick={() => onSelectRequest(req.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#DB3654',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Eye size={14} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Matching Overview Card matching SVG */}
        <MatchingOverview
          summary={matchingOverview}
          fallbackRequest={recentRequests[0] || urgentShortages[0]}
        />
      </div>
    </div>
  );
}
