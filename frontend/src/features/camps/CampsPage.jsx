import React from 'react';
import { Search } from 'lucide-react';
import { CampCard, CampCardSkeleton } from './CampCard.jsx';

export { CampCard, CampCardSkeleton };

export function CampsPage({ camps = [], district, setDistrict, districts = [], loading, error }) {
  return (
    <div className="container view" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <div className="section-heading" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Discover donation opportunities</div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '8px 0', color: '#1D3043', fontWeight: 800 }}>
            Donation camps
          </h1>
          <p style={{ maxWidth: 680, margin: 0, color: '#64748B', fontSize: '15px', lineHeight: 1.6 }}>
            Browse verified upcoming blood donation drives by Sri Lankan district. Your area selection filters real records in PostgreSQL.
          </p>
        </div>
      </div>

      <div className="card filter-card" style={{ marginBottom: 28, maxWidth: 640 }}>
        <label htmlFor="district" style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
          Filter by district
        </label>
        <div className="filter-row" style={{ marginTop: 8 }}>
          <Search size={18} color="#64748B" />
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
        <div className="bb-camp-grid">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <CampCardSkeleton key={idx} />
          ))}
        </div>
      ) : camps.length === 0 ? (
        <div className="empty-card" style={{ marginTop: 12 }}>
          <strong style={{ color: '#1D3043', fontSize: '17px' }}>No approved camps found</strong>
          <p style={{ color: '#64748B', marginTop: 6 }}>
            No scheduled blood donation drives currently match the selected district filter. Try selecting "All available districts".
          </p>
        </div>
      ) : (
        <div className="bb-camp-grid">
          {camps.map((camp, idx) => (
            <CampCard
              key={camp.camp_id || camp.id}
              camp={camp}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}
