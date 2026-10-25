import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  MapPin,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { getInstitutions, getProvinces, getDistricts } from '../api/adminApi.js';
import { InstitutionModal } from '../components/InstitutionModal.jsx';
import { InstitutionVerifyModal } from '../components/InstitutionVerifyModal.jsx';

export function InstitutionManagementPage({ token }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'HOSPITAL' | 'BLOOD_BANK' | 'GEO'
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedInstForVerify, setSelectedInstForVerify] = useState(null);

  // Geography reference
  const [provinces, setProvinces] = useState([]);
  const [selectedGeoProv, setSelectedGeoProv] = useState('');
  const [geoDistricts, setGeoDistricts] = useState([]);

  const loadInstitutions = async () => {
    setLoading(true);
    setError('');
    try {
      const type = activeTab === 'HOSPITAL' || activeTab === 'BLOOD_BANK' ? activeTab : undefined;
      const res = await getInstitutions(token, {
        type,
        search: search.trim() || undefined,
        isVerified: verifiedFilter !== '' ? verifiedFilter : undefined,
      });
      setInstitutions(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'GEO') {
      loadInstitutions();
    }
  }, [token, activeTab, verifiedFilter]);

  // Load geography when GEO tab is opened
  useEffect(() => {
    if (activeTab === 'GEO') {
      getProvinces()
        .then((res) => {
          const provs = res.data || [];
          setProvinces(provs);
          if (provs.length > 0) {
            setSelectedGeoProv(provs[0].code);
          }
        })
        .catch((err) => setError(err.message));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'GEO' && selectedGeoProv) {
      getDistricts(selectedGeoProv)
        .then((res) => setGeoDistricts(res.data || []))
        .catch(() => {});
    }
  }, [activeTab, selectedGeoProv]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInstitutions();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        className="dash-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: 24,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#DB3654',
            }}
          >
            Institutional Infrastructure
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            Hospitals, Blood Banks & Geographical Hierarchy
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Authorize and manage verified healthcare facilities, blood centers and Sri Lankan geographic cluster reference codes.
          </p>
        </div>

        <button
          id="btn-add-institution-header"
          type="button"
          className="dash-btn-primary"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setAddModalOpen(true)}
        >
          <PlusCircle size={16} /> Add Healthcare Facility
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E8ECF2', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ALL' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'ALL' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          All Facilities ({institutions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HOSPITAL')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'HOSPITAL' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'HOSPITAL' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          Hospitals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BLOOD_BANK')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'BLOOD_BANK' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'BLOOD_BANK' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          Blood Banks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('GEO')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'GEO' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeTab === 'GEO' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          Geographical Hierarchy
        </button>
      </div>

      {/* INSTITUTIONS LIST TAB */}
      {activeTab !== 'GEO' && (
        <div className="dash-card">
          {/* Filters Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 16,
              background: '#F8FAFC',
              padding: 14,
              borderRadius: 10,
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8B9E' }}
              />
              <input
                id="search-institutions-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search facility name, district, town…"
                className="reg-input"
                style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13 }}
              />
            </div>

            <select
              id="filter-inst-verified"
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              className="reg-input"
              style={{ width: 160, height: 38, fontSize: 13 }}
            >
              <option value="">All Statuses</option>
              <option value="true">Verified Only</option>
              <option value="false">Unverified Only</option>
            </select>

            <button
              id="btn-apply-inst-filter"
              type="submit"
              className="dash-btn-primary"
              style={{ minHeight: 38, padding: '0 16px', fontSize: 13 }}
            >
              Search
            </button>
            <button
              type="button"
              className="reg-btn-outline"
              style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }}
              onClick={() => {
                setSearch('');
                setVerifiedFilter('');
                loadInstitutions();
              }}
            >
              Reset
            </button>
          </form>

          {/* Table */}
          {loading ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading institutions…</p>
          ) : institutions.length === 0 ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No healthcare institutions found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Facility / Institution</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>District & Province</th>
                    <th style={{ padding: '10px 12px' }}>Location</th>
                    <th style={{ padding: '10px 12px' }}>Active Staff</th>
                    <th style={{ padding: '10px 12px' }}>Verification</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={`${inst.type}-${inst.id}`} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#1D3043', display: 'block' }}>{inst.name}</strong>
                        {inst.contact_phone && (
                          <span style={{ fontSize: 11, color: '#7A8B9E', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} /> {inst.contact_phone}
                          </span>
                        )}
                        {inst.associated_hospital_name && (
                          <span style={{ fontSize: 11, color: '#3B82F6' }}>
                            Associated: {inst.associated_hospital_name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: inst.type === 'HOSPITAL' ? '#EFF6FF' : '#E6F7F1',
                            color: inst.type === 'HOSPITAL' ? '#3B82F6' : '#16A085',
                          }}
                        >
                          {inst.type === 'HOSPITAL' ? 'Hospital' : 'Blood Bank'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#41566D' }}>
                        <strong>{inst.district_name}</strong>
                        <div style={{ fontSize: 11, color: '#7A8B9E' }}>{inst.province_name}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#7A8B9E', fontSize: 12 }}>
                        {inst.town}
                        {inst.address_line && <div style={{ fontSize: 11 }}>{inst.address_line}</div>}
                      </td>
                      <td style={{ padding: '12px', color: '#1D3043', fontWeight: 600 }}>
                        {inst.active_staff_count} staff
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: inst.is_verified ? '#E6F7F1' : '#FEF3C7',
                            color: inst.is_verified ? '#16A085' : '#D97706',
                          }}
                        >
                          {inst.is_verified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          id={`btn-verify-inst-${inst.id}`}
                          type="button"
                          className="reg-btn-outline"
                          style={{
                            height: 32,
                            padding: '0 10px',
                            fontSize: 11,
                            color: inst.is_verified ? '#EF4444' : '#16A085',
                            borderColor: inst.is_verified ? '#FCA5A5' : '#6EE7B7',
                          }}
                          onClick={() => setSelectedInstForVerify(inst)}
                        >
                          {inst.is_verified ? 'Revoke' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GEOGRAPHY REFERENCE TAB */}
      {activeTab === 'GEO' && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Sri Lanka Geographical Reference Hierarchy</h2>
              <p className="dash-card-subtitle">
                Hierarchical parent-child references: <strong>Province → District → DS Division</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
            {/* Province selection */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1D3043', marginBottom: 10 }}>
                Provinces ({provinces.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {provinces.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedGeoProv(p.code)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: selectedGeoProv === p.code ? '2px solid #DB3654' : '1px solid #E8ECF2',
                      background: selectedGeoProv === p.code ? '#FFF5F6' : '#FFFFFF',
                      color: selectedGeoProv === p.code ? '#DB3654' : '#1D3043',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ fontSize: 11, color: '#7A8B9E' }}><code>{p.code}</code></span>
                  </button>
                ))}
              </div>
            </div>

            {/* Districts in selected province */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1D3043', marginBottom: 10 }}>
                Districts ({geoDistricts.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {geoDistricts.map((d) => (
                  <div
                    key={d.code}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E8ECF2',
                      borderRadius: 8,
                      padding: '12px 14px',
                    }}
                  >
                    <strong style={{ fontSize: 14, color: '#1D3043' }}>{d.name}</strong>
                    <div style={{ fontSize: 11, color: '#7A8B9E', marginTop: 4 }}>
                      District Code: <code>{d.code}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InstitutionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        token={token}
        onSuccess={loadInstitutions}
      />

      <InstitutionVerifyModal
        isOpen={Boolean(selectedInstForVerify)}
        institution={selectedInstForVerify}
        onClose={() => setSelectedInstForVerify(null)}
        token={token}
        onSuccess={loadInstitutions}
      />
    </div>
  );
}
