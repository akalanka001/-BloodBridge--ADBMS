import React from 'react';

export function DonationTrendsChart({ trends = [], loading = false }) {
  const months = trends.length > 0 ? trends : [
    { month_name: 'May', donations_count: 0 },
    { month_name: 'Jun', donations_count: 0 },
    { month_name: 'Jul', donations_count: 0 },
    { month_name: 'Aug', donations_count: 0 },
    { month_name: 'Sep', donations_count: 0 },
    { month_name: 'Oct', donations_count: 0 },
  ];

  const maxVal = Math.max(...months.map((m) => Number(m.donations_count) || 0), 10);
  const chartHeight = 150;
  const chartWidth = 520;
  const paddingLeft = 40;
  const paddingTop = 20;
  const barSlotWidth = (chartWidth - paddingLeft - 20) / Math.max(months.length, 1);
  const barWidth = Math.min(36, Math.max(20, barSlotWidth - 14));

  return (
    <div className="dash-card" id="card-donation-trends">
      <div className="dash-card-header">
        <div>
          <h2 className="dash-card-title">Donation collection trends</h2>
          <p className="dash-card-subtitle">Monthly completed collections & cumulative volume</p>
        </div>
        <span className="dash-pill-badge pink">Collection volume</span>
      </div>

      <div style={{ width: '100%', height: 200, position: 'relative', marginTop: 12 }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#7A8B9E', fontSize: 13 }}>
            Loading donation trends…
          </div>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} width="100%" height="100%">
            {[0, 0.5, 1].map((pct, i) => {
              const y = paddingTop + (chartHeight - paddingTop) * (1 - pct);
              return (
                <g key={i}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="#ECF0F4" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">
                    {Math.round(maxVal * pct)}
                  </text>
                </g>
              );
            })}

            {months.map((m, i) => {
              const val = Number(m.donations_count) || 0;
              const barHeight = Math.max(3, ((val / maxVal) * (chartHeight - paddingTop)));
              const x = paddingLeft + 15 + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
              const y = chartHeight - barHeight;

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill="#16A085"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize="11"
                    fontWeight="700"
                    fill="#1D3043"
                    textAnchor="middle"
                  >
                    {val}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 16}
                    fontSize="11"
                    fontWeight="500"
                    fill="#7A8B9E"
                    textAnchor="middle"
                  >
                    {m.month_name || m.month}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
