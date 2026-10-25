import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi.js';
import {
  Database,
  Play,
  Zap,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileCode,
  BookOpen,
} from 'lucide-react';

export function DatabasePerformancePage({ token }) {
  const [templates, setTemplates] = useState([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState('EXP-01-COMPOSITE-GEO');
  const [repetitions, setRepetitions] = useState(3);
  const [activeResult, setActiveResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await analyticsApi.getBenchmarks(token);
      setTemplates(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load benchmark templates');
    }
  };

  useEffect(() => {
    if (token) loadTemplates();
  }, [token]);

  const handleRun = async (e) => {
    e?.preventDefault();
    setRunning(true);
    setError('');
    try {
      const res = await analyticsApi.runBenchmark(token, {
        experimentId: selectedExperimentId,
        repetitionCount: Number(repetitions),
      });
      setActiveResult(res.data);
    } catch (err) {
      setError(`Benchmark error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedExperimentId) || templates[0];

  const baselineMs = activeResult?.baseline?.executionTimeMs ?? null;
  const optimizedMs = activeResult?.optimized?.executionTimeMs ?? null;
  const improvement = activeResult?.improvementPercentage ?? null;

  const maxMs = Math.max(baselineMs || 1, optimizedMs || 1, 0.01);
  const baseWidth = baselineMs !== null ? Math.round((baselineMs / maxMs) * 100) : 0;
  const optWidth = optimizedMs !== null ? Math.max(Math.round((optimizedMs / maxMs) * 100), 5) : 0;

  return (
    <div className="database-performance-page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 750, color: '#1D3043', margin: '0 0 6px' }}>
          Database Performance Lab & SQL Optimization
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
          Controlled query-index experiments evaluating execution plans, shared buffer hits, and latency improvements with PostgreSQL EXPLAIN (ANALYZE, BUFFERS).
        </p>
      </div>

      {error && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Experiment Configuration Form */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Query Benchmark Form</h2>
            <p className="dash-card-subtitle">Select an approved ADBMS query experiment template and execute live on PostgreSQL</p>
          </div>
        </div>

        <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Experiment Template
              </label>
              <select
                value={selectedExperimentId}
                onChange={(e) => {
                  setSelectedExperimentId(e.target.value);
                  setActiveResult(null);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}: {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Repetition Count (Averaged)
              </label>
              <select
                value={repetitions}
                onChange={(e) => setRepetitions(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
              >
                <option value="1">1 run (instant)</option>
                <option value="3">3 runs (recommended average)</option>
                <option value="5">5 runs (rigorous)</option>
                <option value="10">10 runs (high statistical power)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                Index Strategy Under Evaluation
              </label>
              <input
                type="text"
                readOnly
                value={selectedTemplate?.indexStrategy || 'Composite Partial B-Tree'}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#F8FAFC', color: '#64748B' }}
              />
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, color: '#475569' }}>
            <strong>Experiment Objective:</strong> {selectedTemplate?.description}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="submit"
              className="dash-btn-primary"
              style={{ minHeight: 38, padding: '0 20px', fontSize: 13, gap: 6 }}
              disabled={running}
            >
              <Play size={14} /> {running ? 'Executing EXPLAIN (ANALYZE, BUFFERS)…' : 'Execute Benchmark'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Card */}
      {activeResult && (
        <div className="dash-card" style={{ marginBottom: 20 }}>
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Live Measured Comparative Results</h2>
              <p className="dash-card-subtitle">{activeResult.experimentName} · {activeResult.queryIdentifier}</p>
            </div>
            <div
              style={{
                background: activeResult.improvementPercentage >= 0 ? '#E8F7F1' : '#FEF3C7',
                color: activeResult.improvementPercentage >= 0 ? '#16A085' : '#D97706',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 750,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} /> {activeResult.summary}
            </div>
          </div>

          {/* Visual Latency Bars */}
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>
                  <strong>Baseline:</strong> {activeResult.baseline.planType} ({activeResult.baseline.sharedHitBlocks} buffer hits, {activeResult.baseline.sharedReadBlocks} reads)
                </span>
                <span style={{ fontSize: 14, fontWeight: 750, color: '#1D3043' }}>
                  {activeResult.baseline.executionTimeMs} ms
                </span>
              </div>
              <div style={{ height: 16, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${baseWidth}%`, height: '100%', background: '#E7A6B5', borderRadius: 8 }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>
                  <strong>Optimized:</strong> {activeResult.optimized.planType} ({activeResult.optimized.sharedHitBlocks} buffer hits, {activeResult.optimized.sharedReadBlocks} reads)
                </span>
                <span style={{ fontSize: 14, fontWeight: 750, color: '#16A085' }}>
                  {activeResult.optimized.executionTimeMs} ms
                </span>
              </div>
              <div style={{ height: 16, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${optWidth}%`, height: '100%', background: '#16A085', borderRadius: 8 }} />
              </div>
            </div>
          </div>

          {/* Query Plans Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 16 }}>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#64748B' }}>Baseline Execution Plan</h4>
              <pre style={{ background: '#0F172A', color: '#F43F5E', padding: 12, borderRadius: 8, fontSize: 11, maxHeight: 220, overflowY: 'auto' }}>
                {JSON.stringify(activeResult.baseline.queryPlan, null, 2)}
              </pre>
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 12, color: '#64748B' }}>Optimized Execution Plan</h4>
              <pre style={{ background: '#0F172A', color: '#38BDF8', padding: 12, borderRadius: 8, fontSize: 11, maxHeight: 220, overflowY: 'auto' }}>
                {JSON.stringify(activeResult.optimized.queryPlan, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Academic Lessons & ADBMS Concepts Reference */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h2 className="dash-card-title">Academic ADBMS Optimization Insights</h2>
            <p className="dash-card-subtitle">Theoretical foundations and empirical findings from BloodBridge database experiments</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 14 }}>
          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, borderLeft: '4px solid #DB3654' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#1D3043' }}>1. Partial Composite Indexing</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              `WHERE available_for_contact = TRUE` reduces index page count by filtering out inactive donors. The composite key `(blood_type_code, district_code, ds_code)` satisfies equality and range predicates without index re-checks.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, borderLeft: '4px solid #16A085' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#1D3043' }}>2. Expiry Ordering & Partial Predicates</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              Filtering `release_status = 'RELEASED' AND inventory_status = 'IN_STOCK'` indexes only live units. The B-Tree order on `expires_at ASC` delivers instant first-in-first-out allocation with zero sort overhead.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, borderLeft: '4px solid #3B82F6' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#1D3043' }}>3. Star Schema Dimensional Modeling</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              Denormalized facts with integer date surrogate keys eliminate deep relational joins with correlated subqueries, enabling PostgreSQL to execute vectorized HashAggregates for fast OLAP rendering.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, borderLeft: '4px solid #F59E0B' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#1D3043' }}>4. Physical Organization (CLUSTER)</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              Running `CLUSTER` orders heap tuples on disk matching index leaf order. Range scans fetch contiguous disk blocks, reducing shared buffer cache churn and eliminating random I/O thrashing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
