import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar.jsx';
import { Truck, Clock, CheckCircle2, Navigation } from 'lucide-react';

export function TransferReportsPage({ token }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsApi.getTransfers(token, activeFilters);
      setTransfers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load transfer reports');
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
      await analyticsApi.downloadCsv('/analytics/transfers', filters, token, 'interbank_transfers_report.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  const totalTransfers = transfers.reduce((sum, t) => sum + (Number(t.transfer_count) || 0), 0);
  const totalUnits = transfers.reduce((sum, t) => sum + (Number(t.total_units) || 0), 0);
  const completedTransfers = transfers.filter((t) => t.status === 'RECEIVED');
  const inTransitTransfers = transfers.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED');

  return (
    <div className="transfer-reports-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Inter-Bank Blood Transfers & Movement Reports
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Tracking custody transitions, cold-chain transport duration, and inter-facility stock rebalancing across the blood network.
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
              <Truck size={20} />
            </div>
            <span className="dash-kpi-label">Total Custody Movements</span>
          </div>
          <div className="dash-kpi-value">{totalTransfers.toLocaleString()}</div>
          <div className="dash-kpi-note">Inter-bank transfer events</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <Navigation size={20} />
            </div>
            <span className="dash-kpi-label">Total Units Moved</span>
          </div>
          <div className="dash-kpi-value">{totalUnits.toLocaleString()}</div>
          <div className="dash-kpi-note">Blood component units</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <Clock size={20} />
            </div>
            <span className="dash-kpi-label">Active in Transit</span>
          </div>
          <div className="dash-kpi-value">
            {inTransitTransfers.reduce((sum, t) => sum + Number(t.transfer_count || 0), 0)}
          </div>
          <div className="dash-kpi-note">Dispatched & en route</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle2 size={20} />
            </div>
            <span className="dash-kpi-label">Successfully Received</span>
          </div>
          <div className="dash-kpi-value">
            {completedTransfers.reduce((sum, t) => sum + Number(t.transfer_count || 0), 0)}
          </div>
          <div className="dash-kpi-note">Completed & verified</div>
        </div>
      </div>

      {/* Transfers Data Table */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Transfer Movement Breakdown</h2>
            <p className="dash-card-subtitle">Source and receiving blood banks with verified custody status</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7A8B9E', fontSize: 13 }}>
            Querying inter-bank transfers…
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>SOURCE BLOOD BANK</th>
                  <th style={{ padding: '10px 14px' }}>RECEIVING BLOOD BANK</th>
                  <th style={{ padding: '10px 14px' }}>TRANSFERS</th>
                  <th style={{ padding: '10px 14px' }}>UNITS</th>
                  <th style={{ padding: '10px 14px' }}>STATUS</th>
                  <th style={{ padding: '10px 14px' }}>AVG DURATION</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 650, color: '#1D3043' }}>{t.source_bank_name}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 650, color: '#1D3043' }}>{t.target_bank_name}</td>
                    <td style={{ padding: '12px 14px', color: '#1D3043' }}>{t.transfer_count}</td>
                    <td style={{ padding: '12px 14px', color: '#16A085', fontWeight: 700 }}>{t.total_units}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: t.status === 'RECEIVED' ? '#E8F7F1' : t.status === 'IN_TRANSIT' ? '#FEF3C7' : '#F1F5F9',
                          color: t.status === 'RECEIVED' ? '#16A085' : t.status === 'IN_TRANSIT' ? '#D97706' : '#64748B',
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>
                      {t.avg_duration_minutes ? `${t.avg_duration_minutes} mins` : '—'}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
                      No inter-bank transfer records found for the selected criteria.
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
