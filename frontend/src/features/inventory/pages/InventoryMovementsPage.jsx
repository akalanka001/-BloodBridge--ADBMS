import React, { useState } from 'react';
import { History, Search, RefreshCw, Activity, ArrowRight } from 'lucide-react';

export function InventoryMovementsPage({
  movements = [],
  loading = false,
  onRefresh = () => {},
}) {
  const [search, setSearch] = useState('');

  const filtered = movements.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.blood_unit_id?.toLowerCase().includes(q) ||
      m.action?.toLowerCase().includes(q) ||
      m.actor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="inventory-movements-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={24} color="#DB3654" />
            Inventory Activity & Audit Trail
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Accountable log of unit status changes, reservations, cold-chain dispatches, and releases
          </span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            borderRadius: 8,
            border: '1px solid #D1D5DB',
            background: '#FFFFFF',
            color: '#4B5563',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Activity
        </button>
      </div>

      {/* Search Input */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 20px',
          border: '1px solid #E8ECF2',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Unit UUID or actor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Movements Table */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E8ECF2',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>EVENT ID</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>BLOOD UNIT</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>TYPE & COMPONENT</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>STATUS TRANSITION</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>ACTOR</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>RECORDED TIMESTAMP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                    No inventory movement records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#7A8B9E' }}>
                      #{item.id}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      #{item.blood_unit_id?.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      <span style={{ fontWeight: 800, color: '#DB3654' }}>{item.blood_type_code}</span> &bull; {item.component_code}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', color: '#64748B', fontWeight: 600 }}>
                          {item.from_status || 'INITIAL'}
                        </span>
                        <ArrowRight size={12} color="#94A3B8" />
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
                          {item.to_status}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#4B5563' }}>
                      {item.actor_name || 'System Transaction'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#7A8B9E' }}>
                      {new Date(item.acted_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
