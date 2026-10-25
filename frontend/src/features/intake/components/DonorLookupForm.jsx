import React, { useState } from 'react';
import { Search, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export function DonorLookupForm({
  onLookup = () => {},
  onSelectDonor = () => {},
  loading = false,
}) {
  const [query, setQuery] = useState({ nationalId: '', phone: '', fullName: '' });
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.nationalId && !query.phone && !query.fullName) {
      setError('Please provide at least one search field (National ID, Phone, or Name)');
      return;
    }
    setError('');
    setHasSearched(true);
    try {
      const res = await onLookup(query);
      setResults(res?.data || []);
    } catch (err) {
      setError(err.message || 'Donor lookup failed');
    }
  };

  return (
    <div className="donor-lookup-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Search size={20} color="#1D4ED8" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Donor Identity Search & Verification
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Look up registered donors using Sri Lanka National Identity Card (NIC), phone, or legal full name
          </p>
        </div>
      </div>

      <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 10, padding: '10px 14px', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={16} color="#059669" />
        <span><strong>Privacy Assured:</strong> Donor identity matching is protected by cryptographic HMAC indexing. Search queries are verified against authorized institutional records.</span>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div>
          <label htmlFor="lookup-nic" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
            National Identity Card (NIC)
          </label>
          <input
            id="lookup-nic"
            type="text"
            placeholder="e.g. 199012345678 or 851234567V"
            value={query.nationalId}
            onChange={(e) => setQuery({ ...query, nationalId: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
          />
        </div>

        <div>
          <label htmlFor="lookup-phone" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
            Mobile Phone Number
          </label>
          <input
            id="lookup-phone"
            type="tel"
            placeholder="e.g. 0771234567"
            value={query.phone}
            onChange={(e) => setQuery({ ...query, phone: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
          />
        </div>

        <div>
          <label htmlFor="lookup-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
            Full Legal Name
          </label>
          <input
            id="lookup-name"
            type="text"
            placeholder="e.g. Sunimal Silva"
            value={query.fullName}
            onChange={(e) => setQuery({ ...query, fullName: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            id="btn-donor-search"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Search size={15} />
            {loading ? 'Searching...' : 'Search Donor'}
          </button>
        </div>
      </form>

      {/* Results */}
      {hasSearched && (
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1D3043', margin: '0 0 10px 0' }}>
            Search Results ({results.length})
          </h4>

          {results.length === 0 ? (
            <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
              No matching donor record found. You can enroll this visitor as a walk-in donor.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {results.map((donor) => (
                <div
                  key={donor.donor_id || donor.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1D3043' }}>
                        {donor.full_name}
                      </span>
                      {donor.blood_type_code && (
                        <span style={{ background: '#FFF0F2', color: '#DB3654', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
                          {donor.blood_type_code}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#64748B', background: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>
                        {donor.registration_origin || 'STAFF_WALKIN'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
                      Phone: {donor.phone || 'N/A'} &bull; Donor ID: #{donor.donor_id?.slice(0, 8)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectDonor(donor)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#16A085',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <UserCheck size={14} /> Check-in Visit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
