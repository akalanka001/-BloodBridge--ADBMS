import React, { useState } from 'react';
import { HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';

export function CollectionForm({
  userBankId,
  initialVisitId = '',
  initialDonorId = '',
  onCollect = () => {},
  loading = false,
}) {
  const [formData, setFormData] = useState({
    visitId: initialVisitId,
    donorId: initialDonorId,
    bloodBankId: userBankId,
    bloodTypeCode: 'O+',
    collectedVolumeMl: '450',
    bagSerial: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.visitId.trim() || !formData.donorId.trim()) {
      setError('Visit ID and Donor ID are required');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await onCollect({
        visitId: formData.visitId.trim(),
        donorId: formData.donorId.trim(),
        bloodBankId: Number(formData.bloodBankId),
        bloodTypeCode: formData.bloodTypeCode,
        collectedVolumeMl: Number(formData.collectedVolumeMl),
        bagSerial: formData.bagSerial.trim() || undefined,
      });
      setSuccess(`Donation collected successfully! Record ID: ${res?.data?.id || 'recorded'}`);
    } catch (err) {
      setError(err.message || 'Failed to record donation collection');
    }
  };

  return (
    <div className="donation-collection-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeartPulse size={20} color="#DB3654" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Donation Collection Event
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Record actual phlebotomy volume and blood bag barcode after passing clinical assessment
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
            <label htmlFor="collect-visit-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Visit UUID *
            </label>
            <input
              id="collect-visit-id"
              type="text"
              required
              placeholder="e.g. visit-uuid-555"
              value={formData.visitId}
              onChange={(e) => setFormData({ ...formData, visitId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="collect-donor-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Donor UUID *
            </label>
            <input
              id="collect-donor-id"
              type="text"
              required
              placeholder="e.g. donor-uuid-777"
              value={formData.donorId}
              onChange={(e) => setFormData({ ...formData, donorId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="collect-blood-type" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Verified Blood Group *
            </label>
            <select
              id="collect-blood-type"
              value={formData.bloodTypeCode}
              onChange={(e) => setFormData({ ...formData, bloodTypeCode: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 700 }}
            >
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="collect-volume" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Collected Volume (ml) *
            </label>
            <input
              id="collect-volume"
              type="number"
              required
              placeholder="e.g. 450"
              value={formData.collectedVolumeMl}
              onChange={(e) => setFormData({ ...formData, collectedVolumeMl: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="collect-bag-serial" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Blood Bag Barcode / Serial
            </label>
            <input
              id="collect-bag-serial"
              type="text"
              placeholder="e.g. BAG-2026-001"
              value={formData.bagSerial}
              onChange={(e) => setFormData({ ...formData, bagSerial: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>
        </div>

        <div>
          <button
            id="btn-save-collection"
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <HeartPulse size={16} />
            {loading ? 'Recording...' : 'Record Collection'}
          </button>
        </div>
      </form>
    </div>
  );
}
