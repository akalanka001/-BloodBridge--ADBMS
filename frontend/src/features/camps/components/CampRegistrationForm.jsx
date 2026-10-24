import React, { useState } from 'react';
import { CalendarDays, MapPin, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { campsApi } from '../api/campsApi.js';

export function CampRegistrationForm({ camp, isRegistered = false, onRegistrationChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const capacity = camp.capacity || 100;
  const registeredCount = camp.registered_count || 0;
  const isFull = registeredCount >= capacity;

  const handleRegister = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await campsApi.registerDonor(camp.camp_id || camp.id);
      setSuccess('You are successfully registered for this blood donation camp!');
      if (onRegistrationChange) onRegistrationChange(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to register for camp');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await campsApi.cancelRegistration(camp.camp_id || camp.id);
      setSuccess('Your camp registration has been cancelled.');
      if (onRegistrationChange) onRegistrationChange(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to cancel registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', color: '#0f172a' }}>
        {camp.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.9rem', color: '#475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} color="#ef4444" />
          <span>
            {new Date(camp.starts_at).toLocaleString('en-LK', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Colombo',
            })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} color="#ef4444" />
          <span>{camp.town || camp.venue_address || 'Community Venue'} · {camp.district_name || 'District'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="#ef4444" />
          <span>
            Capacity: <strong>{registeredCount}</strong> / {capacity} donors registered
            {isFull && <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: 600 }}>(Full)</span>}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '10px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {isRegistered ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={16} /> Registered
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={handleCancel}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cancel Registration'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={loading || isFull}
          onClick={handleRegister}
          style={{
            padding: '10px 18px',
            backgroundColor: isFull ? '#94a3b8' : '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: isFull ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : (isFull ? 'Camp Full' : 'Register for Camp')}
        </button>
      )}
    </div>
  );
}
