import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi.js';
import { api } from '../../../lib/api.js';
import { AnalyticsKpiCards } from '../components/AnalyticsKpiCards.jsx';
import { RequestTrendsChart } from '../components/RequestTrendsChart.jsx';
import { DemandByGroupChart } from '../components/DemandByGroupChart.jsx';
import { WarehouseStatusCard } from '../components/WarehouseStatusCard.jsx';
import { BenchmarkComparison } from '../components/BenchmarkComparison.jsx';

export function AnalyticsOverview({ token }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Benchmark state
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  // Chart filters
  const [requestFilters, setRequestFilters] = useState({ period: '6' });

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Load pending claims (Member 1 integration)
      try {
        const claimsRes = await api('/admin/donor-link-claims', {}, token);
        setPendingClaims(claimsRes.data || []);
      } catch (err) {
        // Continue if claims endpoint is not applicable
      }

      // 2. Load dashboard analytics (or fallback to summary)
      try {
        const dashRes = await analyticsApi.getDashboard(token, requestFilters);
        setDashboardData(dashRes.data);
      } catch (dashErr) {
        const sumRes = await analyticsApi.getSummary(token);
        setDashboardData({
          metrics: sumRes.data?.metrics || {},
          demandByGroup: [],
          requestTrends: [],
          etlPipeline: { dataFreshness: 'Operational', status: 'IDLE' },
          benchmarks: { templates: [] },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  const handleRequestFilterChange = async (newFilters) => {
    const updated = { ...requestFilters, ...newFilters };
    setRequestFilters(updated);
    try {
      const res = await analyticsApi.getRequestTrends(token, updated);
      setDashboardData((prev) => ({
        ...prev,
        requestTrends: res.data || [],
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportRequestTrends = async () => {
    try {
      await analyticsApi.downloadCsv('/analytics/request-trends', requestFilters, token, 'request_trends.csv');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTriggerEtl = async (options) => {
    try {
      setSuccess('Triggering warehouse ETL pipeline…');
      const res = await analyticsApi.triggerEtlRun(token, options);
      setSuccess(`ETL pipeline finished successfully: ${res.data?.rowsLoaded || 0} rows loaded.`);
      loadAll();
    } catch (err) {
      setError(`ETL execution failed: ${err.message}`);
    }
  };

  const handleRunBenchmark = async (options) => {
    setRunningBenchmark(true);
    setError('');
    try {
      const res = await analyticsApi.runBenchmark(token, options);
      setBenchmarkResult(res.data);
      setSuccess(`Benchmark ${options.experimentId} executed with real query plan capture.`);
    } catch (err) {
      setError(`Benchmark failed: ${err.message}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleClaimDecision = async (claimId, approve) => {
    setError('');
    setSuccess('');
    try {
      if (approve) {
        await api(`/admin/donor-link-claims/${claimId}/approve`, { method: 'POST' }, token);
        setSuccess('Donor identity claim successfully approved! Walk-in donation history reconciled.');
      } else {
        await api(
          `/admin/donor-link-claims/${claimId}/reject`,
          {
            method: 'POST',
            body: JSON.stringify({ reason: 'Verification documentation did not match identity records' }),
          },
          token,
        );
        setSuccess('Donor identity claim rejected.');
      }
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="analytics-overview-page">
      {/* Notices */}
      {error && (
        <div className="notice error" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="notice success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Row 1: 6 Genuine PostgreSQL KPI Cards */}
      <AnalyticsKpiCards metrics={dashboardData?.metrics || {}} loading={loading} />

      {/* Row 2: Blood Request Trends & Demand by Blood Group */}
      <div className="dash-two-col" style={{ marginTop: 24 }}>
        <RequestTrendsChart
          trends={dashboardData?.requestTrends || []}
          loading={loading}
          activeFilters={requestFilters}
          onFilterChange={handleRequestFilterChange}
          onExport={handleExportRequestTrends}
        />

        <DemandByGroupChart
          demand={dashboardData?.demandByGroup || []}
          loading={loading}
        />
      </div>

      {/* Row 3: Database Performance Lab & Warehouse ETL Pipeline */}
      <div className="dash-two-col" style={{ marginTop: 24 }}>
        <BenchmarkComparison
          templates={dashboardData?.benchmarks?.templates || []}
          activeExperiment={benchmarkResult}
          onRunExperiment={handleRunBenchmark}
          running={runningBenchmark}
        />

        <WarehouseStatusCard
          pipeline={dashboardData?.etlPipeline || {}}
          onTriggerEtl={handleTriggerEtl}
          loading={loading}
        />
      </div>

      {/* Row 4: Pending Donor Link Claims Approval (Member 1 integration) */}
      <div className="dash-card" id="section-admin-users" style={{ marginTop: 24 }}>
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Pending Donor Account Link Claims</h2>
            <p className="dash-card-subtitle">
              Administrator review to link walk-in donor records to registered online accounts with full reconciliation.
            </p>
          </div>
          <button
            className="dash-btn-outline"
            style={{ minHeight: 36, padding: '0 14px' }}
            onClick={loadAll}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Claims
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#7A8B9E', fontSize: 13 }}>Loading claims…</p>
        ) : pendingClaims.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8ECF2',
                  borderLeft: '4px solid #DB3654',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, color: '#1D3043' }}>Online User:</strong>{' '}
                  <span style={{ fontSize: 14, color: '#1D3043', fontWeight: 600 }}>{claim.claimant_name}</span>{' '}
                  ({claim.claimant_email})<br />
                  <span style={{ fontSize: 13, color: '#41566D' }}>
                    <strong>Target Walk-in:</strong> {claim.donor_name} ({claim.donor_phone || 'No phone'}) · Blood:{' '}
                    {claim.blood_type_code || 'Unspecified'}
                  </span>
                  <br />
                  <small style={{ color: '#7A8B9E', fontSize: 11 }}>
                    Claim ID: {claim.id} | Verification Notes: {claim.verification_notes || 'None provided'}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    id={`btn-approve-claim-${claim.id}`}
                    type="button"
                    className="dash-btn-primary"
                    style={{ minHeight: 36, padding: '0 14px', fontSize: 12 }}
                    onClick={() => handleClaimDecision(claim.id, true)}
                  >
                    <CheckCircle2 size={14} /> Approve Link
                  </button>
                  <button
                    id={`btn-reject-claim-${claim.id}`}
                    type="button"
                    className="reg-btn-outline"
                    style={{ minHeight: 36, padding: '0 14px', fontSize: 12 }}
                    onClick={() => handleClaimDecision(claim.id, false)}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7A8B9E', fontSize: 13, margin: 0 }}>
            No pending account claims requiring review. All donor records are reconciled.
          </p>
        )}
      </div>
    </div>
  );
}
