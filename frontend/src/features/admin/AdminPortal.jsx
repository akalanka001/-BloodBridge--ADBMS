import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, BarChart3, Database } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';

export function AdminPortal({ token }) {
  const [pendingClaims, setPendingClaims] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const claimsRes = await api('/admin/donor-link-claims', {}, token);
      setPendingClaims(claimsRes.data || []);
      const analyticsRes = await api('/analytics/summary', {}, token);
      setAnalyticsData(analyticsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleClaimDecision = async (claimId, approve) => {
    setError('');
    setSuccess('');
    try {
      if (approve) {
        await api(`/admin/donor-link-claims/${claimId}/approve`, { method: 'POST' }, token);
        setSuccess('Donor identity claim successfully approved! Walk-in donation history reconciled.');
      } else {
        await api(`/admin/donor-link-claims/${claimId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Verification documentation did not match identity records' }),
        }, token);
        setSuccess('Donor identity claim rejected.');
      }
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-portal-feature">
      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Pending Donor Account Link Claims</h3>
          <button className="outline small" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
        <p>
          Administrator review to link walk-in donor records to registered online accounts with full reconciliation.
        </p>
        {loading ? (
          <p>Loading claims…</p>
        ) : pendingClaims.length > 0 ? (
          <div>
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="surface-card claim-item"
                style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444', padding: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem' }}>Online User:</strong> {claim.claimant_name} ({claim.claimant_email})<br />
                    <strong>Target Walk-in Record:</strong> {claim.donor_name} ({claim.donor_phone || 'No phone'}) · Blood: {claim.blood_type_code || 'Unspecified'}<br />
                    <small style={{ color: '#64748b' }}>Claim ID: {claim.id} | Verification Notes: {claim.verification_notes || 'None provided'}</small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id={`btn-approve-claim-${claim.id}`}
                      className="primary small"
                      onClick={() => handleClaimDecision(claim.id, true)}
                    >
                      <CheckCircle2 size={15} style={{ marginRight: '4px' }} /> Approve Link
                    </button>
                    <button
                      id={`btn-reject-claim-${claim.id}`}
                      className="outline small"
                      onClick={() => handleClaimDecision(claim.id, false)}
                    >
                      <XCircle size={15} style={{ marginRight: '4px' }} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>No pending account claims requiring review.</p>
        )}
      </div>

      {analyticsData?.metrics && (
        <div className="surface-card">
          <h3>Operational Warehouse Metrics</h3>
          <div className="three-grid">
            <div className="surface-card stat-card">
              <span className="small-label">Total Donors</span>
              <h3>{analyticsData.metrics.total_donors}</h3>
              <p>Registered in system</p>
            </div>
            <div className="surface-card stat-card">
              <span className="small-label">Total Donations</span>
              <h3>{analyticsData.metrics.total_donations}</h3>
              <p>Completed collections</p>
            </div>
            <div className="surface-card stat-card">
              <span className="small-label">Available Units</span>
              <h3>{analyticsData.metrics.available_units}</h3>
              <p>Released in stock</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
