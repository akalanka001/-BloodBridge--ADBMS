import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft, Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { campsApi } from '../api/campsApi.js';

export function CampRegistrationsPage({ campId, onBack }) {
  const [camp, setCamp] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let mounted = true;
    async function loadRegistrations() {
      setLoading(true);
      setError(null);
      try {
        const [campRes, regRes] = await Promise.all([
          campsApi.getCamp(campId),
          campsApi.listRegistrations(campId),
        ]);
        if (mounted) {
          setCamp(campRes.data);
          setRegistrations(regRes.data || []);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.error || err.message || 'Failed to load registrations');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (campId) loadRegistrations();
    return () => { mounted = false; };
  }, [campId]);

  const filtered = registrations.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.registration_status === statusFilter;
    const matchesSearch =
      !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) ||
      r.blood_type_code?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.875rem',
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={16} /> Back to Camps
      </button>

      <div>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={24} color="#dc2626" />
          Camp Donor Registrations
        </h2>
        {camp && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            {camp.title} · Capacity: {registrations.length} / {camp.capacity || '—'}
          </p>
        )}
      </div>

      {/* Filter and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'REGISTERED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: statusFilter === st ? '1px solid #dc2626' : '1px solid #e2e8f0',
                backgroundColor: statusFilter === st ? '#fee2e2' : '#ffffff',
                color: statusFilter === st ? '#991b1b' : '#475569',
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter by donor name, phone or blood group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '280px' }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 14px' }}>Donor Name</th>
              <th style={{ padding: '12px 14px' }}>Phone Contact</th>
              <th style={{ padding: '12px 14px' }}>Blood Group</th>
              <th style={{ padding: '12px 14px' }}>District</th>
              <th style={{ padding: '12px 14px' }}>Registered At</th>
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px' }}>Staff Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Loading registrations...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No donor registrations found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.registration_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                    {r.full_name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    {r.phone || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 600 }}>
                    {r.blood_type_code || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {r.district_code || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(r.registered_at).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: r.registration_status === 'ATTENDED' ? '#ecfdf5' : r.registration_status === 'NO_SHOW' ? '#fef2f2' : '#eff6ff',
                      color: r.registration_status === 'ATTENDED' ? '#065f46' : r.registration_status === 'NO_SHOW' ? '#991b1b' : '#1e40af',
                    }}>
                      {r.registration_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                    {r.attendance_notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
