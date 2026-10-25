import React, { useState, useEffect } from 'react';
import { TicketCheck, CalendarDays, MapPin, Building, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { campsApi } from '../../camps/api/campsApi.js';

export function DonorRegistrationsPage({ token }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionId, setActionId] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await campsApi.getMyRegistrations();
      setRegistrations(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load your camp registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [token]);

  const handleCancelRegistration = async (campId) => {
    setActionId(campId);
    setError(null);
    setSuccess(null);
    try {
      await campsApi.cancelRegistration(campId);
      setSuccess('Your registration has been cancelled.');
      await fetchRegistrations();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to cancel registration');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TicketCheck size={24} color="#dc2626" />
          My Camp Registrations
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
          View, confirm, and manage your booked slots at upcoming verified community blood donation drives.
        </p>
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

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
          Loading your registrations...
        </div>
      ) : registrations.length === 0 ? (
        <div style={{ padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
          <TicketCheck size={36} style={{ margin: '0 auto 8px auto', display: 'block' }} />
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#334155' }}>No camp registrations yet</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Browse upcoming camps in your area to reserve a donation seat.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {registrations.map((r) => (
            <div
              key={r.registration_id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>{r.camp_title}</h4>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: r.registration_status === 'ATTENDED' ? '#ecfdf5' : r.registration_status === 'CANCELLED' ? '#fef2f2' : '#eff6ff',
                  color: r.registration_status === 'ATTENDED' ? '#065f46' : r.registration_status === 'CANCELLED' ? '#991b1b' : '#1e40af',
                }}>
                  {r.registration_status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={15} color="#dc2626" />
                  <span>
                    {new Date(r.starts_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="#dc2626" />
                  <span>{r.town} · {r.venue_address || 'Venue'} ({r.district_name || 'District'})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={15} color="#dc2626" />
                  <span>Coordinated by: {r.coordinating_blood_bank}</span>
                </div>
              </div>

              {r.registration_status === 'REGISTERED' && (
                <button
                  type="button"
                  disabled={actionId === r.camp_id}
                  onClick={() => handleCancelRegistration(r.camp_id)}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  <XCircle size={14} /> Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
