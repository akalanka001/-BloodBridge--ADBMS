import React, { useState, useEffect } from 'react';
import { X, Building2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { assignStaffMembership, getInstitutions } from '../api/adminApi.js';

export function StaffMembershipModal({ isOpen, onClose, token, user = null, onSuccess = () => {} }) {
  const [role, setRole] = useState('HOSPITAL_STAFF');
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingInst, setFetchingInst] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setRole('HOSPITAL_STAFF');
      setInstitutionId('');
      setIsActive(true);
      setReason('');
      setError('');
      setSuccess('');
      return;
    }

    if (user?.role === 'BANK_STAFF') {
      setRole('BANK_STAFF');
    } else {
      setRole('HOSPITAL_STAFF');
    }

    const loadInstitutions = async () => {
      setFetchingInst(true);
      try {
        const type = role === 'HOSPITAL_STAFF' ? 'HOSPITAL' : 'BLOOD_BANK';
        const res = await getInstitutions(token, { type });
        setInstitutions(res.data || []);
        if (res.data?.length > 0) {
          setInstitutionId(String(res.data[0].id));
        } else {
          setInstitutionId('');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setFetchingInst(false);
      }
    };

    loadInstitutions();
  }, [isOpen, role, token, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        userId: user.id,
        role,
        isActive,
        reason: reason.trim() || undefined,
      };

      if (role === 'HOSPITAL_STAFF') {
        payload.hospitalId = parseInt(institutionId, 10);
      } else {
        payload.bloodBankId = parseInt(institutionId, 10);
      }

      await assignStaffMembership(token, payload);
      setSuccess('Staff membership assigned and authorized');
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
          maxWidth: 520,
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          padding: 24,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043', margin: 0 }}>
              Assign Staff Membership
            </h2>
            <p className="dash-card-subtitle" style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
              Assign institutional affiliation for <strong>{user.full_name}</strong> ({user.email}).
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
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Role Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRole('HOSPITAL_STAFF')}
                style={{
                  height: 42,
                  borderRadius: 8,
                  border: role === 'HOSPITAL_STAFF' ? '2px solid #DB3654' : '1px solid #E8ECF2',
                  background: role === 'HOSPITAL_STAFF' ? '#FFF5F6' : '#FFFFFF',
                  color: role === 'HOSPITAL_STAFF' ? '#DB3654' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Building2 size={16} /> Hospital Staff
              </button>
              <button
                type="button"
                onClick={() => setRole('BANK_STAFF')}
                style={{
                  height: 42,
                  borderRadius: 8,
                  border: role === 'BANK_STAFF' ? '2px solid #DB3654' : '1px solid #E8ECF2',
                  background: role === 'BANK_STAFF' ? '#FFF5F6' : '#FFFFFF',
                  color: role === 'BANK_STAFF' ? '#DB3654' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Shield size={16} /> Blood Bank Staff
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Target Verified Institution *
            </label>
            <select
              id="membership-institution-select"
              required
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              className="reg-input"
              style={{ width: '100%', height: 42, fontSize: 13 }}
              disabled={fetchingInst || institutions.length === 0}
            >
              {fetchingInst ? (
                <option value="">Loading institutions…</option>
              ) : institutions.length === 0 ? (
                <option value="">No institutions registered</option>
              ) : (
                institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.district_name || inst.town})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Membership Status
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#41566D', cursor: 'pointer' }}>
              <input
                id="membership-active-toggle"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active Authorized Membership
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Administrative Reason / Department Notes
            </label>
            <input
              id="membership-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Assigned to emergency blood bank intake unit"
              className="reg-input"
              style={{ width: '100%', height: 42, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="reg-btn-outline"
              onClick={onClose}
              style={{ flex: 1, height: 42, fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              id="btn-save-membership"
              type="submit"
              className="dash-btn-primary"
              disabled={loading || fetchingInst || !institutionId}
              style={{ flex: 1, height: 42, fontSize: 13 }}
            >
              {loading ? 'Assigning…' : 'Save Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
