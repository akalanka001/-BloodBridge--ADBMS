import React, { useState } from 'react';
import { X, Calendar, MapPin, Users, Building2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { approveCamp, rejectCamp } from '../api/adminApi.js';

export function CampApprovalModal({ isOpen, onClose, token, camp = null, onSuccess = () => {} }) {
  const [decision, setDecision] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !camp) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (decision === 'APPROVE') {
        await approveCamp(token, camp.id);
        setSuccess('Donation camp approved successfully');
      } else {
        if (!rejectReason.trim()) {
          throw new Error('Rejection reason is required');
        }
        await rejectCamp(token, camp.id, rejectReason.trim());
        setSuccess('Donation camp rejected');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(29, 48, 67, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        className="dash-card"
        style={{
          width: '100%',
          maxWidth: 580,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          padding: 24,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043', margin: 0 }}>
              Camp Approval Review
            </h2>
            <p className="dash-card-subtitle" style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
              Verify regulatory compliance, location feasibility and coordinating blood bank resources.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#7A8B9E',
              padding: 4,
            }}
          >
            <X size={20} />
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

        {/* Camp Details Summary Card */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E8ECF2',
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <strong style={{ fontSize: 16, color: '#1D3043' }}>{camp.title}</strong>
              <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 2 }}>
                Camp ID: <code>{camp.id}</code>
              </div>
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 14,
                fontSize: 11,
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#D97706',
              }}
            >
              PENDING REVIEW
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, color: '#41566D' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={15} color="#7A8B9E" />
              <span><strong>Bank:</strong> {camp.blood_bank_name || 'Assigned Blood Bank'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} color="#7A8B9E" />
              <span><strong>Capacity:</strong> {camp.capacity || 'Unlimited'} donors</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#7A8B9E" />
              <span><strong>Starts:</strong> {new Date(camp.starts_at).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} color="#7A8B9E" />
              <span><strong>Venue:</strong> {camp.town || camp.district_name || 'Venued Location'}</span>
            </div>
          </div>

          {camp.description && (
            <p style={{ fontSize: 12, color: '#7A8B9E', marginTop: 10, marginBottom: 0, borderTop: '1px solid #E8ECF2', paddingTop: 8 }}>
              {camp.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Review Decision *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                style={{
                  height: 42,
                  borderRadius: 8,
                  border: decision === 'APPROVE' ? '2px solid #16A085' : '1px solid #E8ECF2',
                  background: decision === 'APPROVE' ? '#E6F7F1' : '#FFFFFF',
                  color: decision === 'APPROVE' ? '#16A085' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={16} /> Approve Camp
              </button>
              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                style={{
                  height: 42,
                  borderRadius: 8,
                  border: decision === 'REJECT' ? '2px solid #EF4444' : '1px solid #E8ECF2',
                  background: decision === 'REJECT' ? '#FEE2E2' : '#FFFFFF',
                  color: decision === 'REJECT' ? '#EF4444' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <XCircle size={16} /> Reject Camp
              </button>
            </div>
          </div>

          {decision === 'REJECT' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
                Reason for Rejection *
              </label>
              <textarea
                id="camp-reject-reason"
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State specific reason for audit log and organizer feedback…"
                className="reg-input"
                style={{ width: '100%', height: 'auto', padding: '10px 12px', fontSize: 13, resize: 'vertical' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="reg-btn-outline"
              onClick={onClose}
              style={{ flex: 1, height: 42, fontSize: 13 }}
            >
              Return to Queue
            </button>
            <button
              id="btn-submit-camp-approval"
              type="submit"
              disabled={loading || (decision === 'REJECT' && rejectReason.trim().length < 3)}
              style={{
                flex: 1,
                height: 42,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                cursor: loading || (decision === 'REJECT' && rejectReason.trim().length < 3) ? 'not-allowed' : 'pointer',
                background: decision === 'APPROVE' ? '#16A085' : '#EF4444',
                color: '#FFFFFF',
              }}
            >
              {loading ? 'Submitting…' : decision === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
