import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle, AlertCircle } from 'lucide-react';

export function VisitCheckInForm({
  userBankId = 1,
  initialDonorId = '',
  onCheckIn = () => {},
  loading = false,
}) {
  const [donorId, setDonorId] = useState(initialDonorId);
  const [purpose, setPurpose] = useState('DONATION');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!donorId.trim()) {
      setError('Donor ID is required for check-in');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await onCheckIn({
        donorId: donorId.trim(),
        bloodBankId: Number(userBankId),
        purpose,
        notes: notes.trim() || undefined,
      });
      setSuccess(`In-person visit checked in! Visit ID: ${res?.data?.id || 'recorded'}`);
    } catch (err) {
      setError(err.message || 'Failed to record check-in');
    }
  };

  return (
    <div className="visit-checkin-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardCheck size={20} color="#1D4ED8" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Donor Visit Check-in
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Record arrival of presenting donor at blood bank before clinical assessment
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="visit-donor-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Donor UUID *
            </label>
            <input
              id="visit-donor-id"
              type="text"
              required
              placeholder="e.g. 88888888-8888-8888-8888-888888888888"
              value={donorId}
              onChange={(e) => setDonorId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="visit-purpose" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Visit Purpose
            </label>
            <select
              id="visit-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="DONATION">Whole Blood / Component Donation</option>
              <option value="CONSULTATION">Medical Screening / Consultation</option>
              <option value="RETEST">Post-Deferral Clearance Retest</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="visit-notes" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
            Staff Observations / Intake Notes
          </label>
          <input
            id="visit-notes"
            type="text"
            placeholder="e.g. Presenting for scheduled regular donation"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
          />
        </div>

        <div>
          <button
            id="btn-checkin-visit"
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: '#1D4ED8',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ClipboardCheck size={16} />
            {loading ? 'Recording...' : 'Record Check-in'}
          </button>
        </div>
      </form>
    </div>
  );
}
