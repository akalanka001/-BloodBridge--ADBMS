import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar.jsx';
import { Package, Clock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export function StockReportsPage({ token }) {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getStockTrends(token, activeFilters);
      setStockData(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load stock reports');
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
      await analyticsApi.downloadCsv('/analytics/stock-trends', filters, token, 'component_stock_report.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  const totalAvailable = stockData.reduce((sum, s) => sum + (Number(s.available_units) || 0), 0);
  const totalQuarantined = stockData.reduce((sum, s) => sum + (Number(s.quarantined_units) || 0), 0);
  const totalReserved = stockData.reduce((sum, s) => sum + (Number(s.reserved_units) || 0), 0);
  const totalExpiring7d = stockData.reduce((sum, s) => sum + (Number(s.expiring_7d_units) || 0), 0);

  return (
    <div className="stock-reports-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Component Stock & Expiry Risk Reports
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Daily inventory snapshots across blood banks, tracking component availability, quarantine review, and 7-day expiration risks.
        </p>
      </div>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      <AnalyticsFilterBar
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={() => handleApplyFilters({})}
        onExport={handleExportCsv}
      />

      {/* Metric Cards */}
      <div className="dash-kpi-grid four-col" style={{ marginBottom: 20 }}>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle size={20} />
            </div>
            <span className="dash-kpi-label">Available Released Units</span>
          </div>
          <div className="dash-kpi-value">{totalAvailable.toLocaleString()}</div>
          <div className="dash-kpi-note">Ready for clinical dispatch</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <Clock size={20} />
            </div>
            <span className="dash-kpi-label">Expiring in ≤ 7 Days</span>
          </div>
          <div className="dash-kpi-value">{totalExpiring7d.toLocaleString()}</div>
          <div className="dash-kpi-note">Priority allocation needed</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon blue">
              <Package size={20} />
            </div>
            <span className="dash-kpi-label">Reserved Units</span>
          </div>
          <div className="dash-kpi-value">{totalReserved.toLocaleString()}</div>
          <div className="dash-kpi-note">Allocated to open requests</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <ShieldAlert size={20} />
            </div>
            <span className="dash-kpi-label">Quarantined Testing</span>
          </div>
          <div className="dash-kpi-value">{totalQuarantined.toLocaleString()}</div>
          <div className="dash-kpi-note">Under lab verification</div>
        </div>
      </div>

      {/* Detailed Stock Table */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Inventory Snapshot Records</h2>
            <p className="dash-card-subtitle">Granular component stocks logged by blood bank and blood group</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7A8B9E', fontSize: 13 }}>
            Querying inventory snapshots…
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>SNAPSHOT DATE</th>
                  <th style={{ padding: '10px 14px' }}>BLOOD BANK</th>
                  <th style={{ padding: '10px 14px' }}>GROUP</th>
                  <th style={{ padding: '10px 14px' }}>COMPONENT</th>
                  <th style={{ padding: '10px 14px' }}>AVAILABLE</th>
                  <th style={{ padding: '10px 14px' }}>EXPIRING ≤7D</th>
                  <th style={{ padding: '10px 14px' }}>QUARANTINED</th>
                  <th style={{ padding: '10px 14px' }}>RESERVED</th>
                  <th style={{ padding: '10px 14px' }}>TOTAL UNITS</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', color: '#1D3043', fontWeight: 600 }}>
                      {s.snapshot_date ? String(s.snapshot_date).slice(0, 10) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#1D3043', fontWeight: 600 }}>{s.blood_bank_name}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 750, color: '#DB3654' }}>{s.blood_type_code}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{s.component_code}</td>
                    <td style={{ padding: '12px 14px', color: '#16A085', fontWeight: 700 }}>{s.available_units}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.expiring_7d_units > 0 ? (
                        <span style={{ color: '#D97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={13} /> {s.expiring_7d_units}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{s.quarantined_units}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{s.reserved_units}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1D3043' }}>{s.total_units}</td>
                  </tr>
                ))}
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
                      No inventory snapshot records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
