import React, { useEffect, useState } from 'react';
import { campsApi } from '../api/campsApi.js';
import { CampStatusBadge } from '../components/CampStatusBadge.jsx';
import { campCapacity, campDate } from '../campDisplay.js';
import '../camp-portal.css';

export function CampDetailsPage({ campId, onBack }) {
  const [camp, setCamp] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    campsApi.getCamp(campId).then(res => { if (active) setCamp(res.data); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campId]);
  return <div className="camp-workspace">
    <div><button type="button" className="btn outline small" onClick={onBack}>Back to camps</button></div>
    {loading ? <p role="status">Loading camp details…</p> : error || !camp ? <div className="camp-status error" role="alert">{error || 'Camp unavailable'}</div> : <article className="bb-camp-detail">
      <div><h2>{camp.title}</h2><CampStatusBadge status={camp.status} /></div>
      {camp.primary_poster_url && <img className="camp-poster" src={camp.primary_poster_url} alt={camp.primary_poster_alt || `${camp.title} poster`} />}
      {camp.description && <p>{camp.description}</p>}
      <dl>
        <div><dt>Coordinating blood bank</dt><dd>{camp.coordinating_blood_bank || 'Unavailable'}</dd></div>
        <div><dt>Organizer</dt><dd>{camp.organizer_name || 'Unavailable'}</dd></div>
        <div><dt>Starts · Sri Lanka time</dt><dd>{campDate(camp.starts_at)}</dd></div>
        <div><dt>Ends · Sri Lanka time</dt><dd>{campDate(camp.ends_at)}</dd></div>
        <div><dt>Venue</dt><dd>{[camp.venue_address, camp.town, camp.ds_name, camp.district_name, camp.province_name].filter(Boolean).join(', ') || 'Unavailable'}</dd></div>
        <div><dt>Registration places</dt><dd>{campCapacity(camp)}</dd></div>
        <div><dt>Attendance recorded</dt><dd>{camp.attended_count ?? 'Unavailable'}</dd></div>
        <div><dt>No shows recorded</dt><dd>{camp.no_show_count ?? 'Unavailable'}</dd></div>
        {camp.public_contact && <div><dt>Public contact</dt><dd>{camp.public_contact}</dd></div>}
        {camp.cancellation_reason && <div><dt>Cancellation reason</dt><dd>{camp.cancellation_reason}</dd></div>}
      </dl>
      <p>Registrations and attendance are separate from completed donation collections.</p>
    </article>}
  </div>;
}
