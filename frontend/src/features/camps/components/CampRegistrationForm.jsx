import React, { useEffect, useState } from 'react';
import { campsApi } from '../api/campsApi.js';
import { campCapacity } from '../campDisplay.js';

export function CampRegistrationForm({ camp, isRegistered, token, onRegistrationChange, compact = false }) {
  const serverRegistered = isRegistered ?? camp.registration_status === 'REGISTERED';
  const [registered, setRegistered] = useState(serverRegistered);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const campId = camp.camp_id || camp.id;
  useEffect(() => { setRegistered(serverRegistered); setConfirmCancel(false); setMessage(''); }, [campId, serverRegistered]);
  const future = Boolean(camp.starts_at) && new Date(camp.starts_at).getTime() > Date.now();
  const closed = !future || (camp.status && camp.status !== 'APPROVED');
  const full = camp.capacity != null && camp.registered_count != null && camp.registered_count >= camp.capacity;
  const attended = ['ATTENDED', 'NO_SHOW'].includes(camp.registration_status);

  async function submit(cancel = false) {
    setLoading(true); setError(''); setMessage('');
    try {
      if (cancel) await campsApi.cancelRegistration(campId, token);
      else await campsApi.registerDonor(campId, token);
      setRegistered(!cancel); setConfirmCancel(false);
      setMessage(cancel ? 'Registration cancelled.' : 'Registration confirmed.');
      await onRegistrationChange?.(!cancel);
    } catch (err) { setError(err.message || 'Unable to update this registration. Please try again.'); }
    finally { setLoading(false); }
  }

  return <div>
    {!compact && <p>{campCapacity(camp)}. Registration records your interest; staff assessment is still required.</p>}
    {error && <p className="camp-status error" role="alert">{error}</p>}
    {message && <p className="camp-status success" role="status">{message}</p>}
    {confirmCancel ? <div className="camp-status">
      <p>Cancel your registration for {camp.title}?</p>
      <div className="camp-actions">
        <button type="button" className="btn outline small" disabled={loading} onClick={() => setConfirmCancel(false)}>Keep registration</button>
        <button type="button" className="btn outline small" disabled={loading} onClick={() => submit(true)}>{loading ? 'Cancelling…' : 'Confirm cancellation'}</button>
      </div>
    </div> : <div className="camp-actions">
      {registered && <span className="camp-label registered">Registered</span>}
      {registered ? <button type="button" className="btn outline small" disabled={loading || !future || !campId} onClick={() => setConfirmCancel(true)}>Cancel registration</button>
        : <button type="button" className="btn small" disabled={loading || closed || full || attended || !campId} onClick={() => submit()}>
          {loading ? 'Registering…' : !campId ? 'Camp unavailable' : attended ? 'Attendance recorded' : closed ? 'Registration closed' : full ? 'Camp full' : 'Register for camp'}
        </button>}
    </div>}
  </div>;
}
