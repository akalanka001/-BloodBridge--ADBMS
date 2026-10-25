import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { campsApi } from '../api/campsApi.js';

export function CampAttendancePage({ campId, onBack }) {
  const [camp, setCamp] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchCampData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [campRes, regRes] = await Promise.all([
        campsApi.getCamp(campId),
        campsApi.listRegistrations(campId),
      ]);
      setCamp(campRes.data);
      setRegistrations(regRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load attendance list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campId) fetchCampData();
  }, [campId]);

  const handleUpdateStatus = async (donorId, status) => {
    setActionLoadingId(donorId);
    setError(null);
    setSuccess(null);
    try {
      await campsApi.checkInDonor(campId, {
        donorId,
        status,
        notes: `Recorded at camp reception on ${new Date().toLocaleTimeString('en-LK')}`,
      });
      setSuccess(`Donor attendance status updated to ${status}. Note: Attendance check-in is not a completed donation.`);
      await fetchCampData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to record attendance');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = registrations.filter((r) =>
    !search ||
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    r.blood_type_code?.toLowerCase().includes(search.toLowerCase())
  );

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
          <UserCheck size={24} color="#059669" />
          Camp Attendance & Check-in
        </h2>
        {camp && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            {camp.title} · Venue: {camp.town} ({camp.venue_address || 'Venue'})
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search arriving donor by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Attended:{' '}
          <strong style={{ color: '#059669' }}>
            {registrations.filter((r) => r.registration_status === 'ATTENDED').length}
          </strong>{' '}
          / Total Registered: <strong>{registrations.length}</strong>
        </div>
      </div>

      {/* Attendance Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 14px' }}>Donor</th>
              <th style={{ padding: '12px 14px' }}>Phone</th>
              <th style={{ padding: '12px 14px' }}>Blood Group</th>
              <th style={{ padding: '12px 14px' }}>District</th>
              <th style={{ padding: '12px 14px' }}>Current Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Attendance Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Loading attendee records...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No registered donors match the search.
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
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: r.registration_status === 'ATTENDED' ? '#ecfdf5' : r.registration_status === 'NO_SHOW' ? '#fef2f2' : '#eff6ff',
                      color: r.registration_status === 'ATTENDED' ? '#065f46' : r.registration_status === 'NO_SHOW' ? '#991b1b' : '#1e40af',
                    }}>
                      {r.registration_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        disabled={actionLoadingId === r.donor_id || r.registration_status === 'ATTENDED'}
                        onClick={() => handleUpdateStatus(r.donor_id, 'ATTENDED')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: r.registration_status === 'ATTENDED' ? '#f1f5f9' : '#ecfdf5',
                          color: r.registration_status === 'ATTENDED' ? '#94a3b8' : '#059669',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: r.registration_status === 'ATTENDED' ? 'default' : 'pointer',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle size={14} /> Mark Attended
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === r.donor_id || r.registration_status === 'NO_SHOW'}
                        onClick={() => handleUpdateStatus(r.donor_id, 'NO_SHOW')}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: r.registration_status === 'NO_SHOW' ? '#f1f5f9' : '#fef2f2',
                          color: r.registration_status === 'NO_SHOW' ? '#94a3b8' : '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: r.registration_status === 'NO_SHOW' ? 'default' : 'pointer',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <XCircle size={14} /> No-Show
                      </button>
                    </div>
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
