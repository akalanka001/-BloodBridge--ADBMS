import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';

/**
 * Cascading Sri Lankan Geography Selector
 * Emits standard hierarchical codes: provinceCode, districtCode, dsCode, gnCode
 * Automatically resets dependent selections and handles unseeded GN fallback.
 */
export function GeoSelector({
  value = {},
  onChange,
  required = false,
  showGn = true,
  disabled = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [dsDivisions, setDsDivisions] = useState([]);
  const [gnDivisions, setGnDivisions] = useState([]);

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingDs, setLoadingDs] = useState(false);
  const [loadingGn, setLoadingGn] = useState(false);

  // 1. Fetch Provinces on Mount
  useEffect(() => {
    let active = true;
    api('/locations/provinces')
      .then((res) => {
        if (active && res.data) {
          setProvinces(res.data);
        }
      })
      .catch((err) => console.error('Failed to load provinces:', err));
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch Districts when Province changes
  useEffect(() => {
    if (!value.provinceCode) {
      setDistricts([]);
      return;
    }
    let active = true;
    setLoadingDistricts(true);
    api(`/locations/districts?provinceCode=${encodeURIComponent(value.provinceCode)}`)
      .then((res) => {
        if (active && res.data) {
          setDistricts(res.data);
        }
      })
      .catch((err) => console.error('Failed to load districts:', err))
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });
    return () => {
      active = false;
    };
  }, [value.provinceCode]);

  // 3. Fetch DS Divisions when District changes
  useEffect(() => {
    if (!value.districtCode) {
      setDsDivisions([]);
      return;
    }
    let active = true;
    setLoadingDs(true);
    const provQuery = value.provinceCode ? `&provinceCode=${encodeURIComponent(value.provinceCode)}` : '';
    api(`/locations/ds-divisions?districtCode=${encodeURIComponent(value.districtCode)}${provQuery}`)
      .then((res) => {
        if (active && res.data) {
          setDsDivisions(res.data);
        }
      })
      .catch((err) => console.error('Failed to load DS divisions:', err))
      .finally(() => {
        if (active) setLoadingDs(false);
      });
    return () => {
      active = false;
    };
  }, [value.districtCode, value.provinceCode]);

  // 4. Fetch GN Divisions when DS Division changes
  useEffect(() => {
    if (!value.dsCode || !value.districtCode || !showGn) {
      setGnDivisions([]);
      return;
    }
    let active = true;
    setLoadingGn(true);
    api(
      `/locations/gn-divisions?districtCode=${encodeURIComponent(value.districtCode)}&dsCode=${encodeURIComponent(value.dsCode)}`,
    )
      .then((res) => {
        if (active && res.data) {
          setGnDivisions(res.data);
        }
      })
      .catch((err) => console.error('Failed to load GN divisions:', err))
      .finally(() => {
        if (active) setLoadingGn(false);
      });
    return () => {
      active = false;
    };
  }, [value.dsCode, value.districtCode, showGn]);

  const handleProvinceChange = (e) => {
    const provinceCode = e.target.value;
    onChange({
      ...value,
      provinceCode,
      districtCode: '',
      dsCode: '',
      gnCode: '',
    });
  };

  const handleDistrictChange = (e) => {
    const districtCode = e.target.value;
    // Auto-detect province if district chosen directly from full list
    const found = districts.find((d) => d.code === districtCode);
    const provinceCode = found?.province_code || value.provinceCode || '';
    onChange({
      ...value,
      provinceCode,
      districtCode,
      dsCode: '',
      gnCode: '',
    });
  };

  const handleDsChange = (e) => {
    const dsCode = e.target.value;
    onChange({
      ...value,
      dsCode,
      gnCode: '',
    });
  };

  const handleGnChange = (e) => {
    const gnCode = e.target.value;
    onChange({
      ...value,
      gnCode,
    });
  };

  return (
    <div className="geo-selector" style={{ display: 'grid', gap: '14px' }}>
      {/* Province */}
      <label>
        Province {required && <span style={{ color: '#c9263e' }}>*</span>}
        <select
          value={value.provinceCode || ''}
          onChange={handleProvinceChange}
          disabled={disabled || provinces.length === 0}
          required={required}
        >
          <option value="">Choose a province</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {/* District */}
      <label>
        District {required && <span style={{ color: '#c9263e' }}>*</span>}
        <select
          value={value.districtCode || ''}
          onChange={handleDistrictChange}
          disabled={disabled || (!value.provinceCode && districts.length === 0) || loadingDistricts}
          required={required}
        >
          <option value="">
            {loadingDistricts ? 'Loading districts…' : 'Choose a district'}
          </option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {/* DS Division */}
      <label>
        DS Division (Divisional Secretariat)
        <select
          value={value.dsCode || ''}
          onChange={handleDsChange}
          disabled={disabled || !value.districtCode || loadingDs}
        >
          <option value="">
            {!value.districtCode
              ? 'Select district first'
              : loadingDs
              ? 'Loading DS divisions…'
              : 'Choose a DS division (optional)'}
          </option>
          {dsDivisions.map((ds) => (
            <option key={ds.code} value={ds.code}>
              {ds.name}
            </option>
          ))}
        </select>
      </label>

      {/* GN Division (Optional, with unseeded fallback) */}
      {showGn && (
        <label>
          GN Division (Grama Niladhari)
          <select
            value={value.gnCode || ''}
            onChange={handleGnChange}
            disabled={disabled || !value.dsCode || loadingGn || gnDivisions.length === 0}
          >
            <option value="">
              {!value.dsCode
                ? 'Select DS division first'
                : loadingGn
                ? 'Loading GN divisions…'
                : gnDivisions.length === 0
                ? 'GN records unavailable for this division'
                : 'Choose a GN division (optional)'}
            </option>
            {gnDivisions.map((gn) => (
              <option key={gn.code} value={gn.code}>
                {gn.code} — {gn.name}
              </option>
            ))}
          </select>
          {value.dsCode && gnDivisions.length === 0 && !loadingGn && (
            <span style={{ fontSize: '11px', color: '#718095', marginTop: '4px', display: 'block' }}>
              Official GN dataset for this DS is not yet cataloged. You may proceed without it.
            </span>
          )}
        </label>
      )}
    </div>
  );
}
