import React, { useState } from 'react';
import { UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';

export function WalkInRegistrationForm({
  userBankId,
  onRegister = () => {},
  loading = false,
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    bloodTypeCode: '',
    districtCode: 'CO',
    dsCode: 'COL',
    allowEmergencyContact: false,
    optInCampNotifications: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError('Full legal name is required');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await onRegister({
        ...formData,
        bloodBankId: Number(userBankId),
      });
      setSuccess(`Walk-in donor ${formData.fullName} enrolled successfully!`);
      setFormData({
        fullName: '',
        phone: '',
        nationalId: '',
        bloodTypeCode: '',
        districtCode: 'CO',
        dsCode: 'COL',
        allowEmergencyContact: false,
        optInCampNotifications: false,
      });
    } catch (err) {
      setError(err.message || 'Failed to enroll walk-in donor');
    }
  };

  return (
    <div className="walkin-registration-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserPlus size={20} color="#DB3654" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Walk-in Donor Registration
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            In-person intake does not require an online account or password
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
            <label htmlFor="walkin-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Full Legal Name *
            </label>
            <input
              id="walkin-name"
              type="text"
              required
              placeholder="e.g. Sunimal Silva"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="walkin-phone" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Phone Number
            </label>
            <input
              id="walkin-phone"
              type="tel"
              placeholder="e.g. 0771234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="walkin-nic" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              National Identity Card (NIC)
            </label>
            <input
              id="walkin-nic"
              type="text"
              placeholder="e.g. 199512345678"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="walkin-blood-type" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Self-Reported Blood Group
            </label>
            <select
              id="walkin-blood-type"
              value={formData.bloodTypeCode}
              onChange={(e) => setFormData({ ...formData, bloodTypeCode: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="">Unknown / To be tested</option>
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="walkin-district" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              District
            </label>
            <select
              id="walkin-district"
              value={formData.districtCode}
              onChange={(e) => setFormData({ ...formData, districtCode: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="CO">Colombo</option>
              <option value="GA">Gampaha</option>
              <option value="KA">Kalutara</option>
              <option value="KD">Kandy</option>
              <option value="GL">Galle</option>
            </select>
          </div>
        </div>

        {/* Consents (defaults to false) */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 8 }}>
            Explicit Donor Consents (Defaults to Unchecked)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                id="walkin-consent-emergency"
                type="checkbox"
                checked={formData.allowEmergencyContact}
                onChange={(e) => setFormData({ ...formData, allowEmergencyContact: e.target.checked })}
              />
              <span>I agree to be contacted for urgent emergency appeals matching my blood type</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                id="walkin-consent-camps"
                type="checkbox"
                checked={formData.optInCampNotifications}
                onChange={(e) => setFormData({ ...formData, optInCampNotifications: e.target.checked })}
              />
              <span>Notify me about approved community donation camps in my district</span>
            </label>
          </div>
        </div>

        <div>
          <button
            id="btn-enroll-walkin"
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
            <UserPlus size={16} />
            {loading ? 'Enrolling...' : 'Enroll Walk-in Donor'}
          </button>
        </div>
      </form>
    </div>
  );
}
