import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar.jsx';
import { CalendarDays, Users, UserCheck, TrendingUp } from 'lucide-react';

export function CampAnalyticsPage({ token }) {
  const [campData, setCampData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getCampPerformance(token, activeFilters);
      setCampData(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load camp analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  const handleExportCsv = async () => {
    try {
      await analyticsApi.downloadCsv('/analytics/camp-performance', filters, token, 'camp_performance_report.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  const totalRegistered = campData.reduce((sum, c) => sum + (Number(c.registered_count) || 0), 0);
  const totalAttended = campData.reduce((sum, c) => sum + (Number(c.attended_count) || 0), 0);
  const overallTurnout = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  return (
    <div className="camp-analytics-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Donation Camp Registration & Attendance Performance
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Evaluates community outreach turnout, pre-registration conversions, and actual donor attendance by district.
        </p>
      </div>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      <AnalyticsFilterBar
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={() => handleApplyFilters({})}
        onExport={handleExportCsv}
      />

      <div className="dash-kpi-grid four-col" style={{ marginBottom: 20 }}>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon blue">
              <Users size={20} />
            </div>
            <span className="dash-kpi-label">Total Pre-Registrations</span>
          </div>
          <div className="dash-kpi-value">{totalRegistered.toLocaleString()}</div>
          <div className="dash-kpi-note">Community donor signups</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <UserCheck size={20} />
            </div>
            <span className="dash-kpi-label">Actual Attended</span>
          </div>
          <div className="dash-kpi-value">{totalAttended.toLocaleString()}</div>
          <div className="dash-kpi-note">Verified check-in attendance</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <TrendingUp size={20} />
            </div>
            <span className="dash-kpi-label">Average Turnout Rate</span>
          </div>
          <div className="dash-kpi-value">{overallTurnout}%</div>
          <div className="dash-kpi-note">Registration conversion ratio</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <CalendarDays size={20} />
            </div>
            <span className="dash-kpi-label">Active Outreach Districts</span>
          </div>
          <div className="dash-kpi-value">{campData.filter((c) => Number(c.registered_count) > 0).length}</div>
          <div className="dash-kpi-note">Districts with scheduled camps</div>
        </div>
      </div>

      {/* District Attendance Performance Table */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">District Turnout Performance</h2>
            <p className="dash-card-subtitle">Dimensional analysis of pre-registered donors versus verified camp attendance</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7A8B9E', fontSize: 13 }}>
            Querying camp performance metrics…
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>DISTRICT</th>
                  <th style={{ padding: '10px 14px' }}>CODE</th>
                  <th style={{ padding: '10px 14px' }}>PRE-REGISTERED</th>
                  <th style={{ padding: '10px 14px' }}>ATTENDED</th>
                  <th style={{ padding: '10px 14px' }}>TURNOUT RATIO</th>
                  <th style={{ padding: '10px 14px' }}>PERFORMANCE</th>
                </tr>
              </thead>
              <tbody>
                {campData.map((c, idx) => (
                  <tr key={c.district_code || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1D3043' }}>{c.district_name}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{c.district_code}</td>
                    <td style={{ padding: '12px 14px', color: '#1D3043', fontWeight: 600 }}>{Number(c.registered_count).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', color: '#16A085', fontWeight: 600 }}>{Number(c.attended_count).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 80, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${c.attendance_turnout_pct || 0}%`, height: '100%', background: '#16A085', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1D3043' }}>{c.attendance_turnout_pct || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: (c.attendance_turnout_pct || 0) >= 70 ? '#E8F7F1' : (c.attendance_turnout_pct || 0) >= 40 ? '#FEF3C7' : '#F1F5F9',
                          color: (c.attendance_turnout_pct || 0) >= 70 ? '#16A085' : (c.attendance_turnout_pct || 0) >= 40 ? '#D97706' : '#64748B',
                        }}
                      >
                        {(c.attendance_turnout_pct || 0) >= 70 ? 'High Turnout' : (c.attendance_turnout_pct || 0) >= 40 ? 'Moderate' : 'Low / Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
