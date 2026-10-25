import React, { useState } from 'react';
import { Filter, RotateCcw, Download } from 'lucide-react';

export function AnalyticsFilterBar({
  onApply = () => {},
  onReset = () => {},
  onExport = null,
  initialFilters = {},
}) {
  const [filters, setFilters] = useState(initialFilters);

  const handleChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const handleApply = (e) => {
    e?.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
  };

  return (
    <div
      className="dash-card"
      style={{
        marginBottom: 20,
        padding: '14px 18px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
      }}
    >
      <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          {/* Date From */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Date From
            </label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => handleChange('fromDate', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
              }}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Date To
            </label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => handleChange('toDate', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
              }}
            />
          </div>

          {/* District */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              District
            </label>
            <select
              value={filters.district || ''}
              onChange={(e) => handleChange('district', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
                background: '#FFFFFF',
              }}
            >
              <option value="">All districts</option>
              <option value="CO">Colombo</option>
              <option value="GQ">Gampaha</option>
              <option value="KT">Kalutara</option>
              <option value="KD">Kandy</option>
              <option value="GL">Galle</option>
              <option value="MR">Matara</option>
              <option value="KU">Kurunegala</option>
              <option value="AN">Anuradhapura</option>
              <option value="JA">Jaffna</option>
              <option value="BD">Badulla</option>
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Blood Group
            </label>
            <select
              value={filters.bloodGroup || ''}
              onChange={(e) => handleChange('bloodGroup', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
                background: '#FFFFFF',
              }}
            >
              <option value="">All groups</option>
              {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Component */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Component
            </label>
            <select
              value={filters.component || ''}
              onChange={(e) => handleChange('component', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
                background: '#FFFFFF',
              }}
            >
              <option value="">All components</option>
              <option value="RBC">Red Blood Cells</option>
              <option value="PLASMA">Fresh Frozen Plasma</option>
              <option value="PLATELETS">Platelets</option>
            </select>
          </div>

          {/* Aggregation Interval */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
              Interval
            </label>
            <select
              value={filters.interval || 'month'}
              onChange={(e) => handleChange('interval', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                color: '#1D3043',
                background: '#FFFFFF',
              }}
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="dash-btn-outline"
            style={{ minHeight: 32, padding: '0 12px', fontSize: 12, gap: 4 }}
            onClick={handleReset}
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            type="submit"
            className="dash-btn-primary"
            style={{ minHeight: 32, padding: '0 16px', fontSize: 12, gap: 4 }}
          >
            <Filter size={13} /> Apply Filters
          </button>
          {onExport && (
            <button
              type="button"
              className="dash-btn-outline"
              style={{ minHeight: 32, padding: '0 12px', fontSize: 12, gap: 4 }}
              onClick={onExport}
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
