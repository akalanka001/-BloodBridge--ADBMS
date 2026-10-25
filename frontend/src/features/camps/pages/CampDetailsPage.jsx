import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Building,
  Users,
  MapPin,
  Phone,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { campsApi } from '../api/campsApi.js';
import { CampStatusBadge } from '../components/CampStatusBadge.jsx';

export function CampDetailsPage({ campId, onBack, user }) {
  const [camp, setCamp] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [campRes, regRes, medRes] = await Promise.all([
          campsApi.getCamp(campId),
          campsApi.listRegistrations(campId).catch(() => ({ data: [] })),
          campsApi.listOrganizers().catch(() => ({ data: [] })), // placeholder
        ]);
        if (mounted) {
          setCamp(campRes.data);
          setRegistrations(regRes.data || []);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.error || err.message || 'Failed to load camp details');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [campId]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
        Loading donation camp details...
      </div>
    );
  }

  if (error || !camp) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px' }}>
        <p>{error || 'Camp not found'}</p>
        <button type="button" onClick={onBack} style={{ marginTop: '12px', padding: '6px 12px', cursor: 'pointer' }}>
          Back to Camps
        </button>
      </div>
    );
  }

  const capacity = camp.capacity || 100;
  const registeredCount = camp.registered_count || registrations.length || 0;
  const percentFilled = Math.min(100, Math.round((registeredCount / capacity) * 100));

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

      {/* Main Camp Header */}
      <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CampStatusBadge status={camp.status} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Coordinated by <strong>{camp.blood_bank_name}</strong>
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{camp.title}</h2>
          {camp.description && (
            <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '0.95rem', maxWidth: '700px' }}>
              {camp.description}
            </p>
          )}
        </div>

        {camp.primary_poster_url && (
          <div style={{ width: '160px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img
              src={camp.primary_poster_url}
              alt={camp.primary_poster_alt || camp.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>

      {/* Grid of Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Venue & Location */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#dc2626" />
            Venue & Geography
          </h4>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
            {camp.town} ({camp.district_name || 'District'})
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>
            {camp.venue_address || 'Address provided upon confirmation'}
          </p>
          {camp.province_name && (
            <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
              {camp.province_name} · DS: {camp.ds_name || camp.ds_code || 'General'}
            </span>
          )}
        </div>

        {/* Schedule */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={18} color="#dc2626" />
            Schedule (Asia/Colombo)
          </h4>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155' }}>
            <strong>Starts:</strong> {new Date(camp.starts_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
          </p>
          <p style={{ margin: '0 0 0 0', fontSize: '0.9rem', color: '#334155' }}>
            <strong>Ends:</strong> {new Date(camp.ends_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
          </p>
        </div>

        {/* Organizer & Contact */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="#dc2626" />
            Organizer & Contact
          </h4>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
            {camp.organizer_name}
          </p>
          {camp.public_contact && (
            <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} /> {camp.public_contact}
            </p>
          )}
        </div>
      </div>

      {/* Capacity & Registrations Section */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#dc2626" />
          Donor Capacity & Registration Progress
        </h4>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
            <span><strong>{registeredCount}</strong> donors registered</span>
            <span>Target Capacity: <strong>{capacity}</strong></span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${percentFilled}%`, height: '100%', backgroundColor: percentFilled >= 100 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Registrations Ledger Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 12px' }}>Donor Name</th>
                <th style={{ padding: '10px 12px' }}>Blood Group</th>
                <th style={{ padding: '10px 12px' }}>District</th>
                <th style={{ padding: '10px 12px' }}>Registration Date</th>
                <th style={{ padding: '10px 12px' }}>Attendance Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No donor registrations recorded yet for this camp.
                  </td>
                </tr>
              ) : (
                registrations.map((r) => (
                  <tr key={r.registration_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {r.full_name}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 600 }}>
                      {r.blood_type_code || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {r.district_code || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {new Date(r.registered_at).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Colombo' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
