import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar.jsx';
import { DemandByGroupChart } from '../components/DemandByGroupChart.jsx';
import { Droplets, CheckCircle, AlertTriangle } from 'lucide-react';

export function DemandAnalysisPage({ token }) {
  const [demandData, setDemandData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getDemandByGroup(token, activeFilters);
      setDemandData(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load blood demand analytics');
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
      await analyticsApi.downloadCsv('/analytics/demand-by-group', filters, token, 'blood_demand_analysis.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  const totalRequested = demandData.reduce((sum, d) => sum + (Number(d.requested_units) || 0), 0);
  const totalFulfilled = demandData.reduce((sum, d) => sum + (Number(d.fulfilled_units) || 0), 0);
  const overallFillRate = totalRequested > 0 ? Math.round((totalFulfilled / totalRequested) * 100) : 0;

  return (
    <div className="demand-analysis-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Blood Demand & Allocation Analytics
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Star schema analytics tracking clinical demand, inventory allocations, and fulfillment rates across 8 ABO/Rh blood groups.
        </p>
      </div>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      <AnalyticsFilterBar
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={() => handleApplyFilters({})}
        onExport={handleExportCsv}
      />

      {/* Aggregate summary cards */}
      <div className="dash-kpi-grid four-col" style={{ marginBottom: 20 }}>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <Droplets size={20} />
            </div>
            <span className="dash-kpi-label">Total Requested Units</span>
          </div>
          <div className="dash-kpi-value">{totalRequested.toLocaleString()}</div>
          <div className="dash-kpi-note">Across selected filters</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle size={20} />
            </div>
            <span className="dash-kpi-label">Fulfilled Units</span>
          </div>
          <div className="dash-kpi-value">{totalFulfilled.toLocaleString()}</div>
          <div className="dash-kpi-note">Completed allocations</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon blue">
              <Droplets size={20} />
            </div>
            <span className="dash-kpi-label">Overall Fill Rate</span>
          </div>
          <div className="dash-kpi-value">{overallFillRate}%</div>
          <div className="dash-kpi-note">National demand coverage</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <AlertTriangle size={20} />
            </div>
            <span className="dash-kpi-label">Unfulfilled Deficit</span>
          </div>
          <div className="dash-kpi-value">{(totalRequested - totalFulfilled).toLocaleString()}</div>
          <div className="dash-kpi-note">Pending clinical allocations</div>
        </div>
      </div>

      <DemandByGroupChart demand={demandData} loading={loading} />

      {/* Breakdown table */}
      <div className="dash-card" style={{ marginTop: 24 }}>
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">ABO/Rh Demand Breakdown</h2>
            <p className="dash-card-subtitle">Granular fact data aggregated from warehouse dimensional models</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>BLOOD GROUP</th>
                <th style={{ padding: '10px 14px' }}>REQUESTED UNITS</th>
                <th style={{ padding: '10px 14px' }}>FULFILLED UNITS</th>
                <th style={{ padding: '10px 14px' }}>FILL RATE (%)</th>
                <th style={{ padding: '10px 14px' }}>SHARE OF TOTAL</th>
                <th style={{ padding: '10px 14px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {demandData.map((d, i) => (
                <tr key={d.blood_type || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 750, color: '#1D3043' }}>{d.blood_type}</td>
                  <td style={{ padding: '12px 14px', color: '#1D3043', fontWeight: 600 }}>{Number(d.requested_units || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', color: '#16A085', fontWeight: 600 }}>{Number(d.fulfilled_units || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 80, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${d.fill_rate_pct || 0}%`, height: '100%', background: '#16A085', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1D3043' }}>{d.fill_rate_pct || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748B' }}>{d.percentage_of_total || 0}%</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background: (d.fill_rate_pct || 0) >= 80 ? '#E8F7F1' : (d.fill_rate_pct || 0) >= 50 ? '#FEF3C7' : '#FEE2E2',
                        color: (d.fill_rate_pct || 0) >= 80 ? '#16A085' : (d.fill_rate_pct || 0) >= 50 ? '#D97706' : '#DC2626',
                      }}
                    >
                      {(d.fill_rate_pct || 0) >= 80 ? 'Well Supplied' : (d.fill_rate_pct || 0) >= 50 ? 'Moderate' : 'Critical Deficit'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
