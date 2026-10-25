import React, { useState } from 'react';
import { Database, Activity, CheckCircle, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

export function WarehouseStatusCard({
  pipeline = {},
  onTriggerEtl = () => {},
  loading = false,
}) {
  const [triggering, setTriggering] = useState(false);
  const [mode, setMode] = useState('INCREMENTAL');

  const latest = pipeline.latestRun;
  const isHealthy = latest?.status === 'SUCCESS';
  const isRunning = latest?.status === 'RUNNING';

  const handleRun = async () => {
    setTriggering(true);
    try {
      await onTriggerEtl({ loadMode: mode });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="dash-card" id="card-warehouse-pipeline">
      <div className="dash-card-header">
        <div>
          <h2 className="dash-card-title">Warehouse pipeline</h2>
          <p className="dash-card-subtitle">OLTP-to-OLAP ETL status & data freshness</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid #CBD5E1' }}
          >
            <option value="INCREMENTAL">Incremental</option>
            <option value="FULL">Full Load</option>
          </select>
          <button
            type="button"
            className="dash-btn-primary"
            style={{ minHeight: 28, padding: '0 10px', fontSize: 11 }}
            onClick={handleRun}
            disabled={loading || triggering || isRunning}
          >
            <RefreshCw size={12} className={triggering || isRunning ? 'spin' : ''} />
            {triggering ? 'Running…' : 'Run ETL'}
          </button>
        </div>
      </div>

      {/* 3 Step Visual Flow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 10px 12px',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#E6F7F1',
              color: '#16A085',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 6px',
            }}
          >
            <Database size={20} />
          </div>
          <strong style={{ fontSize: 11, color: '#1D3043', display: 'block' }}>Extract</strong>
          <small style={{ fontSize: 10, color: '#7A8B9E' }}>OLTP logs</small>
        </div>

        <div style={{ flex: 1, height: 2, borderTop: '2px dashed #16A085', margin: '0 8px', marginBottom: 20 }} />

        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#E6F7F1',
              color: '#16A085',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 6px',
            }}
          >
            <Activity size={20} />
          </div>
          <strong style={{ fontSize: 11, color: '#1D3043', display: 'block' }}>Transform</strong>
          <small style={{ fontSize: 10, color: '#7A8B9E' }}>Surrogates & Dates</small>
        </div>

        <div style={{ flex: 1, height: 2, borderTop: '2px dashed #16A085', margin: '0 8px', marginBottom: 20 }} />

        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isHealthy ? '#E6F7F1' : '#FEF2F2',
              color: isHealthy ? '#16A085' : '#EF4444',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 6px',
            }}
          >
            {isHealthy ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <strong style={{ fontSize: 11, color: '#1D3043', display: 'block' }}>Load</strong>
          <small style={{ fontSize: 10, color: '#7A8B9E' }}>Star schema</small>
        </div>
      </div>

      {/* Metric details */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: 10,
          padding: 12,
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          fontSize: 11,
        }}
      >
        <div>
          <span style={{ color: '#64748B' }}>Latest Status:</span>{' '}
          <strong style={{ color: isHealthy ? '#16A085' : '#EF4444' }}>
            {latest?.status || 'IDLE'}
          </strong>
        </div>
        <div>
          <span style={{ color: '#64748B' }}>Records Loaded:</span>{' '}
          <strong style={{ color: '#1D3043' }}>
            {(latest?.rows_loaded ?? 0).toLocaleString()}
          </strong>
        </div>
        <div>
          <span style={{ color: '#64748B' }}>Errors:</span>{' '}
          <strong style={{ color: latest?.error_count > 0 ? '#EF4444' : '#16A085' }}>
            {latest?.error_count ?? 0}
          </strong>
        </div>
        <div>
          <span style={{ color: '#64748B' }}>Duration:</span>{' '}
          <strong style={{ color: '#1D3043' }}>
            {latest?.duration_seconds ? `${latest.duration_seconds}s` : '—'}
          </strong>
        </div>
      </div>

      <div
        style={{
          background: isHealthy ? '#E7F7F2' : '#FFF7ED',
          borderRadius: 8,
          padding: '6px 12px',
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: isHealthy ? '#16A085' : '#D97706',
          marginTop: 10,
        }}
      >
        DATA FRESHNESS: {pipeline.dataFreshness ? new Date(pipeline.dataFreshness).toLocaleString() : 'PENDING FIRST RUN'}
      </div>
    </div>
  );
}
