import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { createInstitution, getInstitutions, getProvinces, getDistricts, getDsDivisions } from '../api/adminApi.js';

export function InstitutionModal({ isOpen, onClose, token, defaultType = 'HOSPITAL', onSuccess = () => {} }) {
  const [type, setType] = useState(defaultType);
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [hospitalId, setHospitalId] = useState('');
  const [hospitals, setHospitals] = useState([]);

  // Location fields
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [dsDivisions, setDsDivisions] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDs, setSelectedDs] = useState('');
  const [town, setTown] = useState('');
  const [addressLine, setAddressLine] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setContactPhone('');
      setIsVerified(true);
      setHospitalId('');
      setSelectedProvince('');
      setSelectedDistrict('');
      setSelectedDs('');
      setTown('');
      setAddressLine('');
      setError('');
      setSuccess('');
      return;
    }
    setType(defaultType);

    // Load initial reference data
    getProvinces()
      .then((res) => {
        const provs = res.data || [];
        setProvinces(provs);
        if (provs.length > 0) {
          setSelectedProvince(provs[0].code);
        }
      })
      .catch((err) => setError(err.message));

    getInstitutions(token, { type: 'HOSPITAL' })
      .then((res) => setHospitals(res.data || []))
      .catch(() => {});
  }, [isOpen, defaultType, token]);

  // Load districts when province changes
  useEffect(() => {
    if (!selectedProvince) return;
    getDistricts(selectedProvince)
      .then((res) => {
        const dists = res.data || [];
        setDistricts(dists);
        if (dists.length > 0) {
          setSelectedDistrict(dists[0].code);
        } else {
          setSelectedDistrict('');
        }
      })
      .catch(() => {});
  }, [selectedProvince]);

  // Load DS divisions when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setDsDivisions([]);
      setSelectedDs('');
      return;
    }
    getDsDivisions(selectedDistrict)
      .then((res) => {
        const dsList = res.data || [];
        setDsDivisions(dsList);
        if (dsList.length > 0) {
          setSelectedDs(dsList[0].code);
        } else {
          setSelectedDs('');
        }
      })
      .catch(() => {});
  }, [selectedDistrict]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        type,
        name: name.trim(),
        contactPhone: contactPhone.trim() || undefined,
        isVerified,
        hospitalId: type === 'BLOOD_BANK' && hospitalId ? parseInt(hospitalId, 10) : undefined,
        location: {
          districtCode: selectedDistrict,
          dsCode: selectedDs || undefined,
          town: town.trim(),
          addressLine: addressLine.trim() || undefined,
        },
      };

      await createInstitution(token, payload);
      setSuccess(`${type === 'HOSPITAL' ? 'Hospital' : 'Blood Bank'} created successfully`);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043', margin: 0 }}>
              Add Healthcare Institution
            </h2>
            <p className="dash-card-subtitle" style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
              Register verified hospital or coordinating blood bank with Sri Lankan geography coordinates.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Institution Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setType('HOSPITAL')}
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: type === 'HOSPITAL' ? '2px solid #DB3654' : '1px solid #E8ECF2',
                  background: type === 'HOSPITAL' ? '#FFF5F6' : '#FFFFFF',
                  color: type === 'HOSPITAL' ? '#DB3654' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Hospital
              </button>
              <button
                type="button"
                onClick={() => setType('BLOOD_BANK')}
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: type === 'BLOOD_BANK' ? '2px solid #DB3654' : '1px solid #E8ECF2',
                  background: type === 'BLOOD_BANK' ? '#FFF5F6' : '#FFFFFF',
                  color: type === 'BLOOD_BANK' ? '#DB3654' : '#41566D',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Blood Bank
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
              Official Name *
            </label>
            <input
              id="inst-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. National Hospital of Sri Lanka"
              className="reg-input"
              style={{ width: '100%', height: 40, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
                Contact Phone
              </label>
              <input
                id="inst-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+94112691111"
                className="reg-input"
                style={{ width: '100%', height: 40, fontSize: 13 }}
              />
            </div>
            {type === 'BLOOD_BANK' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1D3043', marginBottom: 6 }}>
                  Associated Hospital
                </label>
                <select
                  id="inst-assoc-hospital"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="reg-input"
                  style={{ width: '100%', height: 40, fontSize: 13 }}
                >
                  <option value="">Standalone / None</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #E8ECF2', paddingTop: 14, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <MapPin size={16} color="#DB3654" /> Geographical Hierarchy
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#41566D', marginBottom: 4 }}>
                  Province *
                </label>
                <select
                  id="inst-province-select"
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="reg-input"
                  style={{ width: '100%', height: 38, fontSize: 12 }}
                >
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#41566D', marginBottom: 4 }}>
                  District *
                </label>
                <select
                  id="inst-district-select"
                  required
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="reg-input"
                  style={{ width: '100%', height: 38, fontSize: 12 }}
                >
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#41566D', marginBottom: 4 }}>
                  DS Division
                </label>
                <select
                  id="inst-ds-select"
                  value={selectedDs}
                  onChange={(e) => setSelectedDs(e.target.value)}
                  className="reg-input"
                  style={{ width: '100%', height: 38, fontSize: 12 }}
                >
                  <option value="">Select DS Division</option>
                  {dsDivisions.map((ds) => (
                    <option key={ds.code} value={ds.code}>
                      {ds.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#41566D', marginBottom: 4 }}>
                  Town / Locality *
                </label>
                <input
                  id="inst-town"
                  type="text"
                  required
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="e.g. Colombo 07"
                  className="reg-input"
                  style={{ width: '100%', height: 38, fontSize: 12 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#41566D', marginBottom: 4 }}>
                Street Address
              </label>
              <input
                id="inst-address"
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="e.g. Regent Street, Colombo 08"
                className="reg-input"
                style={{ width: '100%', height: 38, fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              id="inst-verify-toggle"
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
            />
            <label htmlFor="inst-verify-toggle" style={{ fontSize: 13, color: '#41566D', cursor: 'pointer' }}>
              Mark as verified authorized healthcare facility
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              className="reg-btn-outline"
              onClick={onClose}
              style={{ flex: 1, height: 40, fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              id="btn-create-institution"
              type="submit"
              className="dash-btn-primary"
              disabled={loading || !name || !selectedDistrict || !town}
              style={{ flex: 1, height: 40, fontSize: 13 }}
            >
              {loading ? 'Creating…' : `Create ${type === 'HOSPITAL' ? 'Hospital' : 'Blood Bank'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
