import React from 'react';
import { CalendarDays, MapPin, Hospital, Search, ArrowRight } from 'lucide-react';
import { Badge, Heading } from '../../components/ui/Typography.jsx';
import { navigate } from '../../lib/navigation.js';

export function CampCard({ camp }) {
  const date = new Date(camp.starts_at);
  return (
    <article className="surface-card camp-card">
      <div className="camp-art">
        <CalendarDays size={43} />
      </div>
      <Badge className="success">Verified blood-bank event</Badge>
      <h3>{camp.title}</h3>
      <p>
        <MapPin size={15} />
        {camp.town} · {camp.district_name}
      </p>
      <p>
        <CalendarDays size={15} />
        {date.toLocaleString('en-LK', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Colombo',
        })}
      </p>
      <p>
        <Hospital size={15} />
        {camp.coordinating_blood_bank}
      </p>
      {(camp.target_donors || camp.capacity) ? (
        <p className="camp-capacity-stat" style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0' }}>
          Registered: <strong>{camp.registered_donors ?? camp.registered_count ?? 0}</strong> / Capacity: <strong>{camp.target_donors || camp.capacity}</strong>
        </p>
      ) : null}
      <button className="text-link" onClick={() => navigate('login')}>
        Sign in to register <ArrowRight size={16} />
      </button>
    </article>
  );
}

export function CampsPage({ camps, district, setDistrict, districts, loading, error }) {
  return (
    <div className="view-section">
      <Heading
        tag="Find a blood donation opportunity"
        title="Donation camps"
        description="Browse verified upcoming camps by Sri Lankan district. Your area selection filters real records in PostgreSQL."
      />
      <div className="surface-card filter-card">
        <label htmlFor="district">Filter by district</label>
        <div className="filter-row">
          <Search size={20} />
          <select id="district" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All available districts</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}
      {loading ? (
        <p className="loading">Loading approved camps…</p>
      ) : camps.length ? (
        <div className="three-grid">
          {camps.map((c) => (
            <CampCard key={c.camp_id} camp={c} />
          ))}
        </div>
      ) : (
        <div className="empty-card">
          <CalendarDays size={32} />
          <h3>No upcoming camps found</h3>
          <p>Try another district, or check back once a blood bank approves a camp.</p>
        </div>
      )}
    </div>
  );
}
