import React from 'react';

export function DemandByGroupChart({ demand = [], loading = false }) {
  const groups = demand.length > 0 ? demand : [
    { blood_type: 'O+', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'A+', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'B+', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'AB+', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'O-', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'A-', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'B-', requested_units: 0, percentage_of_total: 0 },
    { blood_type: 'AB-', requested_units: 0, percentage_of_total: 0 },
  ];

  const maxUnits = Math.max(...groups.map((g) => Number(g.requested_units) || 0), 1);

  return (
    <div className="dash-card" id="card-demand-by-group">
      <div className="dash-card-header">
        <div>
          <h2 className="dash-card-title">Demand by blood group</h2>
          <p className="dash-card-subtitle">Actual request item volume across 8 blood groups</p>
        </div>
        <span className="dash-pill-badge gray">8 ABO/Rh groups</span>
      </div>

      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: '#7A8B9E', fontSize: 13 }}>
          Loading blood demand distribution…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            marginTop: 14,
          }}
        >
          {groups.map((item, idx) => {
            const units = Number(item.requested_units) || 0;
            const pct = Math.round((units / maxUnits) * 100);
            const isHighest = idx === 0 && units > 0;

            return (
              <div key={item.blood_type || idx} style={{ background: '#F8FAFC', padding: 10, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 750, color: '#1D3043' }}>
                    {item.blood_type}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    {units.toLocaleString()} units ({item.percentage_of_total || 0}%)
                  </span>
                </div>
                <div style={{ height: 10, background: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(pct, units > 0 ? 4 : 0)}%`,
                      height: '100%',
                      background: isHighest ? '#DB3654' : '#ECA7B5',
                      borderRadius: 5,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                {item.fulfilled_units !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
                    <span>Fulfilled: {item.fulfilled_units}</span>
                    <span>Fill rate: {item.fill_rate_pct || 0}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
