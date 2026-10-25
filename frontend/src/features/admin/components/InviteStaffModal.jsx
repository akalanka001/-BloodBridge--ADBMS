import React, { useState, useEffect } from 'react';
import { X, Mail, Building2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { inviteStaff, getInstitutions } from '../api/adminApi.js';

export function InviteStaffModal({ isOpen, onClose, token, onSuccess = () => {} }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('HOSPITAL_STAFF');
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingInst, setFetchingInst] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('HOSPITAL_STAFF');
      setInstitutionId('');
      setError('');
      setSuccess('');
      return;
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
  }, [isOpen, role, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        role,
      };
      if (role === 'HOSPITAL_STAFF') {
        payload.hospitalId = parseInt(institutionId, 10);
      } else {
        payload.bloodBankId = parseInt(institutionId, 10);
      }

      await inviteStaff(token, payload);
      setSuccess(`Invitation successfully dispatched to ${payload.email}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
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
              Invite Healthcare Staff
            </h2>
            <p className="dash-card-subtitle" style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
              Dispatch a single-use onboarding invitation with authorized institutional scope.
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
              Staff Work Email *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8B9E' }}
              />
              <input
                id="invite-staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff.member@hospital.lk"
                className="reg-input"
                style={{ width: '100%', paddingLeft: 38, height: 42, fontSize: 13 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Designated Staff Role *
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
              Assigned Institution *
            </label>
            <select
              id="invite-staff-institution"
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
                <option value="">No institutions registered yet</option>
              ) : (
                institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.district_name || inst.town})
                  </option>
                ))
              )}
            </select>
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
              id="btn-submit-invite-staff"
              type="submit"
              className="dash-btn-primary"
              disabled={loading || fetchingInst || !institutionId}
              style={{ flex: 1, height: 42, fontSize: 13 }}
            >
              {loading ? 'Dispatching…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
