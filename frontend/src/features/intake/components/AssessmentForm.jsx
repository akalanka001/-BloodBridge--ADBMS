import React, { useState } from 'react';
import { Stethoscope, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export function AssessmentForm({
  initialVisitId = '',
  onAssess = () => {},
  loading = false,
}) {
  const [formData, setFormData] = useState({
    visitId: initialVisitId,
    status: 'PASSED',
    hemoglobin: '14.0',
    weight: '65.0',
    deferralReason: '',
    deferralUntil: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.visitId.trim()) {
      setError('Visit ID is required for clinical assessment');
      return;
    }
    if (['TEMPORARY_DEFERRAL', 'PERMANENT_DEFERRAL'].includes(formData.status) && !formData.deferralReason.trim()) {
      setError('A deferral reason is mandatory when deferring a donor');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await onAssess(formData.visitId.trim(), {
        status: formData.status,
        hemoglobin_g_dl: formData.hemoglobin ? Number(formData.hemoglobin) : undefined,
        weight_kg: formData.weight ? Number(formData.weight) : undefined,
        deferralReason: formData.deferralReason.trim() || undefined,
        deferralUntil: formData.deferralUntil || undefined,
        notes: formData.notes.trim() || undefined,
      });
      setSuccess(`Clinical assessment recorded with status: ${formData.status}!`);
    } catch (err) {
      setError(err.message || 'Failed to record assessment');
    }
  };

  return (
    <div className="clinical-assessment-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF4E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stethoscope size={20} color="#D49A36" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Authorized Clinical Donor Assessment
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Medical pre-donation screening to verify donor eligibility and clinical safety
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="assess-visit-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Visit UUID *
            </label>
            <input
              id="assess-visit-id"
              type="text"
              required
              placeholder="e.g. visit-uuid-555"
              value={formData.visitId}
              onChange={(e) => setFormData({ ...formData, visitId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="assess-decision" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Eligibility Decision *
            </label>
            <select
              id="assess-decision"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 700 }}
            >
              <option value="PASSED">PASSED (Cleared for Collection)</option>
              <option value="TEMPORARY_DEFERRAL">TEMPORARY DEFERRAL</option>
              <option value="PERMANENT_DEFERRAL">PERMANENT DEFERRAL</option>
            </select>
          </div>

          <div>
            <label htmlFor="assess-hemoglobin" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Hemoglobin (g/dL) *
            </label>
            <input
              id="assess-hemoglobin"
              type="number"
              step="0.1"
              required
              placeholder="e.g. 14.0"
              value={formData.hemoglobin}
              onChange={(e) => setFormData({ ...formData, hemoglobin: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="assess-weight" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Weight (kg) *
            </label>
            <input
              id="assess-weight"
              type="number"
              step="0.5"
              required
              placeholder="e.g. 65.0"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>
        </div>

        {formData.status !== 'PASSED' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#FFFBEB', padding: 14, borderRadius: 10, border: '1px solid #FDE68A' }}>
            <div>
              <label htmlFor="assess-deferral-reason" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                Clinical Deferral Reason *
              </label>
              <input
                id="assess-deferral-reason"
                type="text"
                required
                placeholder="e.g. Low hemoglobin level < 12.5 g/dL"
                value={formData.deferralReason}
                onChange={(e) => setFormData({ ...formData, deferralReason: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
              />
            </div>

            {formData.status === 'TEMPORARY_DEFERRAL' && (
              <div>
                <label htmlFor="assess-deferral-until" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                  Deferred Until Date
                </label>
                <input
                  id="assess-deferral-until"
                  type="date"
                  value={formData.deferralUntil}
                  onChange={(e) => setFormData({ ...formData, deferralUntil: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <button
            id="btn-save-assessment"
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: '#D49A36',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Stethoscope size={16} />
            {loading ? 'Recording...' : 'Record Clinical Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
