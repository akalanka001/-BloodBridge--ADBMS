import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { getAuditLogs } from '../api/adminApi.js';

export function AuditActivityPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs(token, {
        action: actionFilter.trim() || undefined,
        entityName: entityFilter.trim() || undefined,
        limit: 50,
      });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [token, entityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAuditLogs();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        className="dash-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: 24,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#DB3654',
            }}
          >
            Governance & Compliance
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            System Audit & Mutation Activity
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Immutable chronological record of administrative actions, status updates, institutional approvals and security events.
          </p>
        </div>

        <button
          type="button"
          className="dash-btn-outline"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={loadAuditLogs}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Log
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table Card */}
      <div className="dash-card">
        {/* Filters */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
            background: '#F8FAFC',
            padding: 14,
            borderRadius: 10,
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8B9E' }}
            />
            <input
              id="search-audit-action"
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action keyword (e.g. USER, VERIFY, CAMP)…"
              className="reg-input"
              style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13 }}
            />
          </div>

          <select
            id="filter-audit-entity"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="reg-input"
            style={{ width: 180, height: 38, fontSize: 13 }}
          >
            <option value="">All Entities</option>
            <option value="users">users</option>
            <option value="staff_memberships">staff_memberships</option>
            <option value="hospitals">hospitals</option>
            <option value="blood_banks">blood_banks</option>
            <option value="donation_camps">donation_camps</option>
            <option value="donor_account_claims">donor_account_claims</option>
          </select>

          <button
            id="btn-apply-audit-filter"
            type="submit"
            className="dash-btn-primary"
            style={{ minHeight: 38, padding: '0 16px', fontSize: 13 }}
          >
            Search
          </button>
          <button
            type="button"
            className="reg-btn-outline"
            style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }}
            onClick={() => {
              setActionFilter('');
              setEntityFilter('');
              loadAuditLogs();
            }}
          >
            Reset
          </button>
        </form>

        {loading ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading audit trail…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No audit activity logs recorded for this criteria.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px' }}>Actor</th>
                  <th style={{ padding: '10px 12px' }}>Entity</th>
                  <th style={{ padding: '10px 12px' }}>Entity Ref</th>
                  <th style={{ padding: '10px 12px' }}>Action & Mutation Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px', color: '#7A8B9E', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.occurred_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#1D3043', display: 'block' }}>{log.actor_name || 'System / Auto'}</strong>
                      <span style={{ fontSize: 11, color: '#7A8B9E' }}>
                        {log.actor_role || 'ADMIN'} {log.actor_email ? `(${log.actor_email})` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        {log.entity_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <code>{String(log.entity_id).slice(0, 12)}</code>
                    </td>
                    <td style={{ padding: '12px', color: '#1D3043', fontWeight: 600 }}>
                      {log.action}
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
