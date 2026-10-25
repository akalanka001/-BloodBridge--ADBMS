import React, { useState, useEffect } from 'react';
import {
  BadgeCheck,
  Calendar,
  Building2,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getCamps } from '../api/adminApi.js';
import { CampApprovalModal } from '../components/CampApprovalModal.jsx';

export function CampApprovalsPage({ token }) {
  const [pendingCamps, setPendingCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCampForReview, setSelectedCampForReview] = useState(null);

  const loadPendingCamps = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCamps(token, { status: 'PENDING' });
      setPendingCamps(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingCamps();
  }, [token]);

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
            Review & Authorization Queue
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            Pending Donation Camp Approvals
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Inspect proposed mobile blood donation camps, verify safety clearances and authorize public publishing.
          </p>
        </div>

        <button
          type="button"
          className="dash-btn-outline"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={loadPendingCamps}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Queue
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

      {/* Queue */}
      <div className="dash-card">
        {loading ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading pending approval queue…</p>
        ) : pendingCamps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#E6F7F1',
                color: '#16A085',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
              }}
            >
              <BadgeCheck size={28} />
            </div>
            <strong style={{ fontSize: 16, color: '#1D3043', display: 'block' }}>All Camps Reviewed</strong>
            <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, margin: '4px 0 0' }}>
              No pending donation camps currently require administrative review.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingCamps.map((camp) => (
              <div
                key={camp.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8ECF2',
                  borderLeft: '4px solid #F59E0B',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 16, color: '#1D3043' }}>{camp.title}</strong>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#FEF3C7',
                        color: '#D97706',
                      }}
                    >
                      AWAITING REVIEW
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 8,
                      fontSize: 13,
                      color: '#41566D',
                      marginTop: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color="#7A8B9E" />
                      <span>{camp.blood_bank_name || 'Assigned Blood Bank'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} color="#7A8B9E" />
                      <span>{new Date(camp.starts_at).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} color="#7A8B9E" />
                      <span>{camp.town || camp.district_name || 'Sri Lanka Venue'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#7A8B9E" />
                      <span>Target Capacity: <strong>{camp.capacity || 'Unlimited'}</strong></span>
                    </div>
                  </div>

                  {camp.description && (
                    <p style={{ fontSize: 12, color: '#7A8B9E', marginTop: 10, marginBottom: 0 }}>
                      {camp.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    id={`btn-review-camp-${camp.id}`}
                    type="button"
                    className="dash-btn-primary"
                    style={{ minHeight: 38, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setSelectedCampForReview(camp)}
                  >
                    <BadgeCheck size={16} /> Review Decision
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <CampApprovalModal
        isOpen={Boolean(selectedCampForReview)}
        camp={selectedCampForReview}
        onClose={() => setSelectedCampForReview(null)}
        token={token}
        onSuccess={loadPendingCamps}
      />
    </div>
  );
}
