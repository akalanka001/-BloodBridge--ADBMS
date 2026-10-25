import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import {
  Activity,
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export function ETLPipelinePage({ token }) {
  const [runs, setRuns] = useState([]);
  const [qualityAudit, setQualityAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [jobName, setJobName] = useState('DAILY_OLAP_ETL');
  const [loadMode, setLoadMode] = useState('INCREMENTAL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [runsRes, auditRes] = await Promise.all([
        analyticsApi.getEtlRuns(token),
        analyticsApi.getDataQuality(token),
      ]);
      setRuns(runsRes.data || []);
      setQualityAudit(auditRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load ETL pipeline monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleExecute = async (e) => {
    e?.preventDefault();
    setRunning(true);
    setError('');
    setSuccess('');
    try {
      const res = await analyticsApi.triggerEtlRun(token, {
        jobName,
        loadMode,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setSuccess(`ETL pipeline executed successfully! Loaded ${res.data?.rowsLoaded || 0} records.`);
      await loadData();
    } catch (err) {
      setError(`ETL execution error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const latestRun = runs[0] || null;

  return (
    <div className="etl-pipeline-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Data Warehouse ETL Pipeline & Data Quality Monitoring
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Extract, transform, and load operational records into the analytical star schema with automated reconciliation auditing.
        </p>
      </div>

      {error && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="notice success" style={{ marginBottom: 16 }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Top Cards */}
      <div className="dash-kpi-grid four-col" style={{ marginBottom: 20 }}>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle size={20} />
            </div>
            <span className="dash-kpi-label">Latest Run Status</span>
          </div>
          <div className="dash-kpi-value" style={{ color: latestRun?.status === 'SUCCESS' ? '#16A085' : '#EF4444' }}>
            {latestRun?.status || 'IDLE'}
          </div>
          <div className="dash-kpi-note">{latestRun?.load_mode || 'INCREMENTAL'} mode</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon blue">
              <Database size={20} />
            </div>
            <span className="dash-kpi-label">Latest Records Loaded</span>
          </div>
          <div className="dash-kpi-value">{(latestRun?.rows_loaded ?? 0).toLocaleString()}</div>
          <div className="dash-kpi-note">Facts & dimension rows</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <Clock size={20} />
            </div>
            <span className="dash-kpi-label">Data Freshness</span>
          </div>
          <div className="dash-kpi-value" style={{ fontSize: 16, marginTop: 4 }}>
            {latestRun?.finished_at ? new Date(latestRun.finished_at).toLocaleTimeString() : 'Pending'}
          </div>
          <div className="dash-kpi-note">
            {latestRun?.finished_at ? new Date(latestRun.finished_at).toLocaleDateString() : 'Never run'}
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <ShieldCheck size={20} />
            </div>
            <span className="dash-kpi-label">Reconciliation Health</span>
          </div>
          <div className="dash-kpi-value" style={{ color: qualityAudit?.health === 'HEALTHY' ? '#16A085' : '#D97706' }}>
            {qualityAudit?.health || 'UNKNOWN'}
          </div>
          <div className="dash-kpi-note">Source vs Warehouse count audit</div>
        </div>
      </div>

      {/* Row 2: ETL Execution Form + Live Reconciliation Table */}
      <div className="dash-two-col">
        {/* Execution Form */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Trigger Warehouse ETL Job</h2>
              <p className="dash-card-subtitle">Approved transactional load into bloodbridge_warehouse</p>
            </div>
          </div>

          <form onSubmit={handleExecute} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Approved Job
              </label>
              <select
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
              >
                <option value="DAILY_OLAP_ETL">DAILY_OLAP_ETL (Standard Star Schema Sync)</option>
                <option value="RECONCILIATION_SYNC">RECONCILIATION_SYNC (Full Inventory & Auditing)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Load Mode
              </label>
              <div style={{ display: 'flex', gap: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1D3043' }}>
                  <input
                    type="radio"
                    name="loadMode"
                    value="INCREMENTAL"
                    checked={loadMode === 'INCREMENTAL'}
                    onChange={() => setLoadMode('INCREMENTAL')}
                  />
                  Incremental (Watermark Sync)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1D3043' }}>
                  <input
                    type="radio"
                    name="loadMode"
                    value="FULL"
                    checked={loadMode === 'FULL'}
                    onChange={() => setLoadMode('FULL')}
                  />
                  Full Load (All Historical Data)
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  From Date (Optional)
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                  To Date (Optional)
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="dash-btn-primary"
              style={{ minHeight: 40, marginTop: 8 }}
              disabled={running}
            >
              <RefreshCw size={15} className={running ? 'spin' : ''} />
              {running ? 'Executing ETL Pipeline…' : 'Execute Warehouse Job'}
            </button>
          </form>
        </div>

        {/* Source-to-Warehouse Reconciliation Table */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Data Quality & Reconciliation</h2>
              <p className="dash-card-subtitle">Zero-discrepancy integrity audit between OLTP and Warehouse</p>
            </div>
            <button
              className="dash-btn-outline"
              style={{ minHeight: 30, padding: '0 8px', fontSize: 11 }}
              onClick={loadData}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Verify
            </button>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                  <th style={{ padding: '8px 10px' }}>ENTITY</th>
                  <th style={{ padding: '8px 10px' }}>OPERATIONAL</th>
                  <th style={{ padding: '8px 10px' }}>WAREHOUSE</th>
                  <th style={{ padding: '8px 10px' }}>DISCREPANCY</th>
                  <th style={{ padding: '8px 10px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {qualityAudit?.reconciliation?.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px', fontWeight: 650, color: '#1D3043' }}>{r.entity}</td>
                    <td style={{ padding: '10px', color: '#1D3043' }}>{r.operationalCount.toLocaleString()}</td>
                    <td style={{ padding: '10px', color: '#16A085', fontWeight: 600 }}>{r.warehouseCount.toLocaleString()}</td>
                    <td style={{ padding: '10px', color: r.discrepancy === 0 ? '#16A085' : '#EF4444', fontWeight: 700 }}>
                      {r.discrepancy}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          background: r.status === 'MATCHED' ? '#E8F7F1' : '#FEF3C7',
                          color: r.status === 'MATCHED' ? '#16A085' : '#D97706',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3: Run History Table */}
      <div className="dash-card" style={{ marginTop: 24 }}>
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">ETL Execution History</h2>
            <p className="dash-card-subtitle">Audited execution logs with duration, rows loaded, and step details</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                <th style={{ padding: '10px 12px' }}>RUN ID</th>
                <th style={{ padding: '10px 12px' }}>JOB NAME</th>
                <th style={{ padding: '10px 12px' }}>MODE</th>
                <th style={{ padding: '10px 12px' }}>STARTED AT</th>
                <th style={{ padding: '10px 12px' }}>DURATION</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
                <th style={{ padding: '10px 12px' }}>ROWS LOADED</th>
                <th style={{ padding: '10px 12px' }}>ERRORS</th>
                <th style={{ padding: '10px 12px' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1D3043' }}>#{r.id}</td>
                  <td style={{ padding: '10px 12px', color: '#1D3043' }}>{r.job_name}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{r.load_mode}</td>
                  <td style={{ padding: '10px 12px', color: '#64748B' }}>{new Date(r.started_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: '#1D3043' }}>{r.duration_seconds ? `${r.duration_seconds}s` : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        background: r.status === 'SUCCESS' ? '#E8F7F1' : '#FEF2F2',
                        color: r.status === 'SUCCESS' ? '#16A085' : '#EF4444',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#16A085', fontWeight: 650 }}>
                    {r.rows_loaded.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', color: r.error_count > 0 ? '#EF4444' : '#64748B' }}>
                    {r.error_count}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      type="button"
                      className="dash-btn-outline"
                      style={{ minHeight: 24, padding: '0 8px', fontSize: 10 }}
                      onClick={() => setSelectedRunDetails(selectedRunDetails?.id === r.id ? null : r)}
                    >
                      {selectedRunDetails?.id === r.id ? 'Hide' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Run Details Inspector */}
        {selectedRunDetails && (
          <div style={{ marginTop: 16, background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#1D3043' }}>
              Run #{selectedRunDetails.id} Breakdown & Auditing Details
            </h4>
            <pre style={{ background: '#0F172A', color: '#38BDF8', padding: 10, borderRadius: 6, fontSize: 11, overflowX: 'auto' }}>
              {JSON.stringify(selectedRunDetails.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
