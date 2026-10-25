import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getDonorClaims, approveDonorClaim, rejectDonorClaim } from '../api/adminApi.js';
import { Pagination } from '../../../components/ui/Pagination.jsx';

export function DonorClaimReview({ token }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadClaims = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDonorClaims(token, 'PENDING', { limit: pageSize, offset: (page - 1) * pageSize });
      setClaims(res.data || []);
      setTotal(res.pagination?.total ?? res.data?.length ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [token, page, pageSize]);

  const handleApprove = async (claimId) => {
    setActionLoading(claimId);
    setError('');
    setSuccess('');
    try {
      await approveDonorClaim(token, claimId);
      setSuccess('Donor account claim approved and linked successfully');
      loadClaims();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (claimId) => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for claim rejection');
      return;
    }
    setActionLoading(claimId);
    setError('');
    setSuccess('');
    try {
      await rejectDonorClaim(token, claimId, rejectReason.trim());
      setSuccess('Donor account claim rejected');
      setRejectingClaimId(null);
      setRejectReason('');
      loadClaims();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="dash-card-title">Pending Donor Account Link Claims</h2>
          <p className="dash-card-subtitle">
            Administrator review to link walk-in donor records to registered online accounts with full reconciliation.
          </p>
        </div>
        <button
          type="button"
          className="dash-btn-outline"
          style={{ minHeight: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={loadClaims}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Claims
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#E6F7F1',
            color: '#16A085',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#7A8B9E', fontSize: 13 }}>Loading claims…</p>
      ) : claims.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {claims.map((claim) => (
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

                {rejectingClaimId === claim.id && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Enter rejection reason…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="reg-input"
                      style={{ height: 34, fontSize: 12, width: 260 }}
                    />
                    <button
                      type="button"
                      className="dash-btn-primary"
                      style={{ height: 34, padding: '0 10px', fontSize: 12, background: '#EF4444' }}
                      onClick={() => handleReject(claim.id)}
                      disabled={actionLoading === claim.id}
                    >
                      Confirm Reject
                    </button>
                    <button
                      type="button"
                      className="reg-btn-outline"
                      style={{ height: 34, padding: '0 10px', fontSize: 12 }}
                      onClick={() => {
                        setRejectingClaimId(null);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {rejectingClaimId !== claim.id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    id={`btn-approve-claim-${claim.id}`}
                    type="button"
                    className="dash-btn-primary"
                    style={{ minHeight: 36, padding: '0 14px', fontSize: 12 }}
                    disabled={actionLoading === claim.id}
                    onClick={() => handleApprove(claim.id)}
                  >
                    <CheckCircle2 size={14} /> Approve Link
                  </button>
                  <button
                    id={`btn-reject-claim-${claim.id}`}
                    type="button"
                    className="reg-btn-outline"
                    style={{ minHeight: 36, padding: '0 14px', fontSize: 12 }}
                    disabled={actionLoading === claim.id}
                    onClick={() => setRejectingClaimId(claim.id)}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#7A8B9E', fontSize: 13, margin: 0 }}>
          No pending account claims on this page.
        </p>
      )}
      {!loading && !error && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </div>
  );
}
