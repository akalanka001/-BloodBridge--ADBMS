import React from 'react';
import { Droplet } from 'lucide-react';

export function BloodGroupStockGrid({
  stockData = [],
  selectedComponent = 'RBC',
  onSelectComponent = () => {},
  onTileClick = () => {},
}) {
  const components = [
    { code: 'RBC', label: 'Red cells' },
    { code: 'PLASMA', label: 'Plasma' },
    { code: 'PLATELETS', label: 'Platelets' },
  ];

  return (
    <div
      className="dash-card blood-group-stock-grid-card"
      style={{
        background: '#FFFFFF',
        borderRadius: 18,
        padding: 24,
        border: '1px solid #E8ECF2',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header & Component Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0' }}>
            Blood group availability
          </h2>
          <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
            Real-time released inventory by ABO/Rh group for selected component
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, background: '#F3F6F8', padding: 4, borderRadius: 12 }}>
          {components.map((comp) => (
            <button
              key={comp.code}
              type="button"
              onClick={() => onSelectComponent(comp.code)}
              style={{
                border: 'none',
                background: selectedComponent === comp.code ? '#FFFFFF' : 'transparent',
                color: selectedComponent === comp.code ? '#1D3043' : '#7A8B9E',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: selectedComponent === comp.code ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {comp.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8-Blood Group Grid (2 rows of 4) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {stockData.map((item) => (
          <div
            key={item.type}
            onClick={() => onTileClick(item.type)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTileClick(item.type)}
            style={{
              background: '#F8FAFC',
              borderRadius: 14,
              padding: '14px 16px',
              border: '1px solid #EAEFF5',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#FFF0F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Droplet size={16} color="#DB3654" fill="#DB3654" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#1D3043' }}>
                {item.type}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: item.color }}>
                {item.units} <span style={{ fontSize: 12, fontWeight: 600 }}>units</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7A8B9E' }}>
                {item.pct}%
              </span>
            </div>

            {/* Progress Track & Fill */}
            <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#E6EAF0', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, item.pct)}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: item.color,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
