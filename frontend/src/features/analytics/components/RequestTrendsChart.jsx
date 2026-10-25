import React, { useState } from 'react';
import { Filter, Download } from 'lucide-react';

export function RequestTrendsChart({
  trends = [],
  loading = false,
  onFilterChange = () => {},
  onExport = () => {},
  activeFilters = {},
}) {
  const [showFilters, setShowFilters] = useState(false);

  const months = trends.length > 0 ? trends : [
    { month_name: 'May', requested_units: 0 },
    { month_name: 'Jun', requested_units: 0 },
    { month_name: 'Jul', requested_units: 0 },
    { month_name: 'Aug', requested_units: 0 },
    { month_name: 'Sep', requested_units: 0 },
    { month_name: 'Oct', requested_units: 0 },
  ];

  const maxVal = Math.max(...months.map((m) => Number(m.requested_units) || 0), 10);
  const chartHeight = 160;
  const chartWidth = 540;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 20;
  const barSlotWidth = (chartWidth - paddingLeft - 20) / Math.max(months.length, 1);
  const barWidth = Math.min(38, Math.max(20, barSlotWidth - 16));

  return (
    <div className="dash-card" id="card-request-trends">
      <div className="dash-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 className="dash-card-title">Blood request trends</h2>
          <p className="dash-card-subtitle">Data warehouse analytics · monthly clinical demand</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="dash-btn-outline"
            style={{ minHeight: 32, padding: '0 10px', fontSize: 12, gap: 4 }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={13} /> Filters
          </button>
          <select
            aria-label="Reporting period"
            value={activeFilters.period || '6'}
            onChange={(e) => onFilterChange({ period: e.target.value })}
            style={{
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid #D1D9E2',
              fontSize: 12,
              fontWeight: 600,
              color: '#1D3043',
              background: '#FFFFFF',
            }}
          >
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
          <button
            type="button"
            className="dash-btn-outline"
            style={{ minHeight: 32, padding: '0 8px', fontSize: 12 }}
            onClick={onExport}
            title="Export CSV"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: 12,
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
          }}
        >
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
              Blood Group
            </label>
            <select
              value={activeFilters.bloodGroup || ''}
              onChange={(e) => onFilterChange({ bloodGroup: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #CBD5E1' }}
            >
              <option value="">All groups</option>
              {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
              Component
            </label>
            <select
              value={activeFilters.component || ''}
              onChange={(e) => onFilterChange({ component: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #CBD5E1' }}
            >
              <option value="">All components</option>
              <option value="RBC">Red Blood Cells (RBC)</option>
              <option value="PLASMA">Fresh Frozen Plasma</option>
              <option value="PLATELETS">Platelets</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
              Urgency
            </label>
            <select
              value={activeFilters.urgency || ''}
              onChange={(e) => onFilterChange({ urgency: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #CBD5E1' }}
            >
              <option value="">All urgencies</option>
              <option value="ROUTINE">Routine</option>
              <option value="URGENT">Urgent</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
              District
            </label>
            <select
              value={activeFilters.district || ''}
              onChange={(e) => onFilterChange({ district: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #CBD5E1' }}
            >
              <option value="">All districts</option>
              <option value="CO">Colombo</option>
              <option value="GQ">Gampaha</option>
              <option value="KT">Kalutara</option>
              <option value="KD">Kandy</option>
              <option value="GL">Galle</option>
            </select>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <div style={{ width: '100%', height: 210, position: 'relative', marginTop: 12 }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#7A8B9E', fontSize: 13 }}>
            Querying warehouse analytics…
          </div>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingTop + (chartHeight - paddingTop) * (1 - pct);
              const val = Math.round(maxVal * pct);
              return (
                <g key={i}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="#ECF0F4" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Monthly Bars */}
            {months.map((m, i) => {
              const val = Number(m.requested_units) || 0;
              const barHeight = Math.max(3, ((val / maxVal) * (chartHeight - paddingTop)));
              const x = paddingLeft + 15 + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
              const y = chartHeight - barHeight;
              const isCurrent = i === months.length - 1;

              return (
                <g key={i} className="chart-bar-group">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill={isCurrent ? '#DB3654' : '#ECA7B5'}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
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
