import React, { useState, useEffect } from 'react';
import { MapPin, Building, Navigation } from 'lucide-react';
import { apiClient } from '../../../lib/api.js';

export function CampLocationSelector({
  venueType,
  setVenueType,
  locationId,
  setLocationId,
  customLocation,
  setCustomLocation,
  disabled = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [dsDivisions, setDsDivisions] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Fetch provinces & institutions
  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      try {
        setLoadingGeo(true);
        const [provRes, bankRes] = await Promise.all([
          apiClient.get('/locations/provinces').catch(() => ({ data: [] })),
          apiClient.get('/locations/blood-banks').catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setProvinces(provRes.data || []);
          setInstitutions(bankRes.data || []);
        }
      } catch {
        // Fallback demo provinces if API is offline
        if (mounted) {
          setProvinces([
            { code: 'WP', name: 'Western Province' },
            { code: 'CP', name: 'Central Province' },
            { code: 'SP', name: 'Southern Province' },
            { code: 'NP', name: 'Northern Province' },
          ]);
        }
      } finally {
        if (mounted) setLoadingGeo(false);
      }
    }
    loadInitial();
    return () => { mounted = false; };
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    let mounted = true;
    async function loadDistricts() {
      if (!customLocation.provinceCode) {
        setDistricts([]);
        return;
      }
      try {
        const res = await apiClient.get(`/locations/districts?provinceCode=${customLocation.provinceCode}`);
        if (mounted) setDistricts(res.data || []);
      } catch {
        if (mounted) {
          setDistricts([
            { code: 'CO', name: 'Colombo' },
            { code: 'GQ', name: 'Gampaha' },
            { code: 'KT', name: 'Kalutara' },
          ]);
        }
      }
    }
    loadDistricts();
    return () => { mounted = false; };
  }, [customLocation.provinceCode]);

  // Fetch DS divisions when district changes
  useEffect(() => {
    let mounted = true;
    async function loadDs() {
      if (!customLocation.districtCode) {
        setDsDivisions([]);
        return;
      }
      try {
        const res = await apiClient.get(`/locations/ds-divisions?districtCode=${customLocation.districtCode}`);
        if (mounted) setDsDivisions(res.data || []);
      } catch {
        if (mounted) {
          setDsDivisions([
            { code: 'MAH', name: 'Maharagama' },
            { code: 'COL', name: 'Colombo Central' },
            { code: 'HOM', name: 'Homagama' },
          ]);
        }
      }
    }
    loadDs();
    return () => { mounted = false; };
  }, [customLocation.districtCode]);

  return (
    <div className="location-selector-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Venue Type Selection */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setVenueType('COMMUNITY');
            setLocationId(null);
          }}
          style={{
            flex: '1 1 200px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: venueType === 'COMMUNITY' ? '2px solid #ef4444' : '1px solid #cbd5e1',
            backgroundColor: venueType === 'COMMUNITY' ? '#fef2f2' : '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            color: venueType === 'COMMUNITY' ? '#991b1b' : '#334155',
          }}
        >
          <MapPin size={20} color={venueType === 'COMMUNITY' ? '#ef4444' : '#64748b'} />
          Mobile / Community Venue
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setVenueType('INSTITUTION');
          }}
          style={{
            flex: '1 1 200px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: venueType === 'INSTITUTION' ? '2px solid #ef4444' : '1px solid #cbd5e1',
            backgroundColor: venueType === 'INSTITUTION' ? '#fef2f2' : '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            color: venueType === 'INSTITUTION' ? '#991b1b' : '#334155',
          }}
        >
          <Building size={20} color={venueType === 'INSTITUTION' ? '#ef4444' : '#64748b'} />
          Verified Institution Premise
        </button>
      </div>

      {venueType === 'INSTITUTION' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="institution-location" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
            Select Blood Bank / Hospital Location <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="institution-location"
            value={locationId || ''}
            disabled={disabled}
            onChange={(e) => setLocationId(Number(e.target.value) || null)}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: disabled ? '#f8fafc' : '#ffffff',
              fontSize: '0.9rem',
            }}
          >
            <option value="">-- Select Institution Location --</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.location_id || inst.id}>
                {inst.name} ({inst.town || 'Verified Centre'})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Province */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="geo-province" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Province
            </label>
            <select
              id="geo-province"
              value={customLocation.provinceCode || ''}
              disabled={disabled}
              onChange={(e) =>
                setCustomLocation({
                  ...customLocation,
                  provinceCode: e.target.value,
                  districtCode: '',
                  dsCode: '',
                })
              }
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Select Province --</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="geo-district" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              District <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="geo-district"
              value={customLocation.districtCode || ''}
              disabled={disabled}
              onChange={(e) =>
                setCustomLocation({
                  ...customLocation,
                  districtCode: e.target.value,
                  dsCode: '',
                })
              }
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Select District --</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* DS Division */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="geo-ds" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              DS Division
            </label>
            <select
              id="geo-ds"
              value={customLocation.dsCode || ''}
              disabled={disabled}
              onChange={(e) => setCustomLocation({ ...customLocation, dsCode: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">-- Select DS Division --</option>
              {dsDivisions.map((ds) => (
                <option key={ds.code} value={ds.code}>
                  {ds.name}
                </option>
              ))}
            </select>
          </div>

          {/* Town / Locality */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="geo-town" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Town / Locality <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="geo-town"
              type="text"
              placeholder="e.g. Maharagama"
              value={customLocation.town || ''}
              disabled={disabled}
              onChange={(e) => setCustomLocation({ ...customLocation, town: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Address Line */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
            <label htmlFor="geo-address" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Venue Address Line
            </label>
            <input
              id="geo-address"
              type="text"
              placeholder="e.g. Community Center Hall, High Level Road"
              value={customLocation.addressLine || ''}
              disabled={disabled}
              onChange={(e) => setCustomLocation({ ...customLocation, addressLine: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
