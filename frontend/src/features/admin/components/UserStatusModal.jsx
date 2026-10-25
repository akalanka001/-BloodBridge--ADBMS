import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { updateUserStatus } from '../api/adminApi.js';

export function UserStatusModal({ isOpen, onClose, token, user = null, onSuccess = () => {} }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !user) return null;

  const targetActive = !user.is_active;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUserStatus(token, user.id, {
        isActive: targetActive,
        reason: reason.trim() || undefined,
      });

      setSuccess(`User successfully ${targetActive ? 'reactivated' : 'deactivated'}`);
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
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          padding: 24,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: targetActive ? '#E6F7F1' : '#FEE2E2',
                color: targetActive ? '#16A085' : '#EF4444',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="dash-card-title" style={{ fontSize: 16, color: '#1D3043', margin: 0 }}>
                {targetActive ? 'Reactivate Account' : 'Deactivate Account'}
              </h2>
            </div>
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

        <p style={{ fontSize: 13, color: '#41566D', lineHeight: 1.5, marginBottom: 16 }}>
          Are you sure you want to {targetActive ? 'reactivate' : 'deactivate'} account for{' '}
          <strong>{user.full_name}</strong> ({user.email})?
          {!targetActive && (
            <span style={{ display: 'block', color: '#EF4444', marginTop: 6, fontSize: 12 }}>
              Warning: All active sessions will be terminated immediately. The user will be unable to access protected portal features.
            </span>
          )}
        </p>

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
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Audit Reason *
            </label>
            <textarea
              id="user-status-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification for security and regulatory compliance audit log…"
              className="reg-input"
              style={{ width: '100%', height: 'auto', padding: '10px 12px', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="reg-btn-outline"
              onClick={onClose}
              style={{ flex: 1, height: 40, fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-user-status"
              type="submit"
              disabled={loading || reason.trim().length < 3}
              style={{
                flex: 1,
                height: 40,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                cursor: loading || reason.trim().length < 3 ? 'not-allowed' : 'pointer',
                background: targetActive ? '#16A085' : '#EF4444',
                color: '#FFFFFF',
              }}
            >
              {loading ? 'Processing…' : targetActive ? 'Confirm Reactivation' : 'Confirm Deactivation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
