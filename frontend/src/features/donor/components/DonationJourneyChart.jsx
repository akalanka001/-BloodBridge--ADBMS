import React from 'react';
import { TrendingUp, Award, Droplet } from 'lucide-react';

export function DonationJourneyChart({ journey = [], totalDonations = 0, onDiscoverCamps }) {
  const hasHistory = Array.isArray(journey) && journey.length > 0;

  // SVG dimensions
  const width = 640;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  // Compute points if we have journey items
  let points = [];
  let areaPath = '';
  let linePath = '';

  if (hasHistory) {
    const maxVal = Math.max(...journey.map((d) => Number(d.count) || 1), 2);
    const stepX = (width - paddingX * 2) / Math.max(journey.length - 1, 1);

    points = journey.map((item, index) => {
      const val = Number(item.count) || 0;
      const x = paddingX + index * stepX;
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return { x, y, label: item.month, count: val, volume: item.total_volume_ml };
    });

    if (points.length === 1) {
      // Single point, draw horizontal curve
      linePath = `M ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${points[0].y}`;
      areaPath = `M ${points[0].x - 30} ${height - paddingY} L ${points[0].x - 30} ${points[0].y} L ${points[0].x + 30} ${points[0].y} L ${points[0].x + 30} ${height - paddingY} Z`;
    } else {
      linePath = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
    }
  }

  return (
    <div className="donor-journey-card">
      <div className="journey-header">
        <div>
          <h3 className="journey-title">Your donation journey</h3>
          <p className="journey-subtitle">A timeline of your recorded contributions.</p>
        </div>
        <div className="journey-badge-pill">
          <span>This year</span>
        </div>
      </div>

      {!hasHistory ? (
        <div className="journey-empty-state">
          <div className="empty-icon-wrap">
            <Droplet className="text-rose-500" size={32} />
          </div>
          <h4 className="empty-heading">No verified donations recorded yet</h4>
          <p className="empty-copy">
            Every life-saving journey begins with a single step. Once your first donation is verified
            by clinical staff, your donation milestones will appear here.
          </p>
          {onDiscoverCamps && (
            <button
              type="button"
              onClick={onDiscoverCamps}
              className="btn-primary mt-3 inline-flex items-center gap-2"
            >
              <Award size={16} />
              Find a blood drive near you
            </button>
          )}
        </div>
      ) : (
        <div className="journey-chart-wrapper">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="journey-svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="journeyChartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#DA3755" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#DA3755" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#F1F5F9" strokeWidth="1" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#F1F5F9" strokeWidth="1" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#E2E8F0" strokeWidth="1" />

            {/* Area fill */}
            <path d={areaPath} fill="url(#journeyChartGradient)" />

            {/* Main curved line */}
            <path
              d={linePath}
              fill="none"
              stroke="#DB3654"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((pt, i) => (
              <g key={i} className="chart-node-group">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  fill="#FFFFFF"
                  stroke="#DB3654"
                  strokeWidth="3"
                />
                <text
                  x={pt.x}
                  y={height - 10}
                  fontSize="11"
                  fontWeight="600"
                  fill="#7A8B9E"
                  textAnchor="middle"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>

          <div className="journey-stats-footer">
            <div className="stat-item">
              <span className="stat-label">Total Completed</span>
              <strong className="stat-val text-navy">{totalDonations}</strong>
            </div>
            <div className="stat-item">
              <span className="stat-label">Estimated Lives Touched</span>
              <strong className="stat-val text-rose-600">{totalDonations * 3}</strong>
            </div>
            <div className="stat-item">
              <span className="stat-label">Estimated Volume</span>
              <strong className="stat-val text-navy">{(totalDonations * 0.45).toFixed(1)} L</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
