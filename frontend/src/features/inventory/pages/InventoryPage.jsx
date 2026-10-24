import React, { useState } from 'react';
import { Droplet, Search, Filter, ShieldCheck, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export function InventoryPage({
  units = [],
  loading = false,
  onRefresh = () => {},
  onReleaseUnit = () => {},
}) {
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterRelease, setFilterRelease] = useState('ALL');
  const [filterInventory, setFilterInventory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected unit for release modal
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [releaseAction, setReleaseAction] = useState('RELEASED');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = units.filter((u) => {
    if (filterComponent !== 'ALL' && u.component_code !== filterComponent) return false;
    if (filterGroup !== 'ALL' && u.blood_type_code !== filterGroup) return false;
    if (filterRelease !== 'ALL' && u.release_status !== filterRelease) return false;
    if (filterInventory !== 'ALL' && u.inventory_status !== filterInventory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = u.id.toLowerCase().includes(q);
      const matchBank = u.blood_bank_name?.toLowerCase().includes(q);
      if (!matchId && !matchBank) return false;
    }
    return true;
  });

  const handleConfirmRelease = async (e) => {
    e.preventDefault();
    if (!selectedUnit) return;
    setActionLoading(true);
    try {
      await onReleaseUnit(selectedUnit.id, {
        releaseStatus: releaseAction,
        notes: releaseNotes.trim() || undefined,
      });
      setSelectedUnit(null);
      setReleaseNotes('');
    } finally {
      setActionLoading(false);
    }
  };

  const getReleaseBadge = (status) => {
    switch (status) {
      case 'RELEASED':
        return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      case 'QUARANTINED':
        return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
      case 'REJECTED':
        return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
    }
  };

  const getInventoryBadge = (status) => {
    switch (status) {
      case 'IN_STOCK':
        return { bg: '#F0FDF4', color: '#16A085', border: '#BBF7D0' };
      case 'RESERVED':
        return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
      case 'IN_TRANSIT':
        return { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' };
      case 'ISSUED':
        return { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
      case 'DISCARDED':
        return { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
    }
  };

  return (
    <div className="inventory-units-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Droplet size={24} color="#DB3654" />
            Blood Component Inventory
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Accountable stock custody, quarantine verification, and expiry tracking
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
          Refresh Stock
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #E8ECF2',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search unit UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
            }}
          />
        </div>

        {/* Component Filter */}
        <select
          value={filterComponent}
          onChange={(e) => setFilterComponent(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
        >
          <option value="ALL">All Components</option>
          <option value="RBC">Red Blood Cells (RBC)</option>
          <option value="PLASMA">Plasma</option>
          <option value="PLATELETS">Platelets</option>
        </select>

        {/* Blood Group Filter */}
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
        >
          <option value="ALL">All Groups</option>
          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {/* Release Status Filter */}
        <select
          value={filterRelease}
          onChange={(e) => setFilterRelease(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
        >
          <option value="ALL">All Release Status</option>
          <option value="RELEASED">RELEASED</option>
          <option value="QUARANTINED">QUARANTINED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        {/* Inventory Status Filter */}
        <select
          value={filterInventory}
          onChange={(e) => setFilterInventory(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
        >
          <option value="ALL">All Inventory Status</option>
          <option value="IN_STOCK">IN_STOCK</option>
          <option value="RESERVED">RESERVED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="ISSUED">ISSUED</option>
          <option value="DISCARDED">DISCARDED</option>
        </select>
      </div>

      {/* Table */}
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
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>UNIT ID</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>BLOOD GROUP</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>COMPONENT</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>RELEASE STATUS</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>STOCK STATUS</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>EXPIRY</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                    No blood units match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const relBadge = getReleaseBadge(u.release_status);
                  const invBadge = getInventoryBadge(u.inventory_status);
                  const isExpiringSoon = u.days_left <= 2 && u.inventory_status === 'IN_STOCK';
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                        #{u.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: '#FFF0F2',
                            color: '#DB3654',
                            fontWeight: 800,
                            fontSize: 12,
                            padding: '3px 9px',
                            borderRadius: 8,
                          }}
                        >
                          {u.blood_type_code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
                        {u.component_code} <span style={{ fontSize: 11, color: '#9CA3AF' }}>({u.volume_ml || 450}ml)</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            backgroundColor: relBadge.bg,
                            color: relBadge.color,
                            border: `1px solid ${relBadge.border}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {u.release_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            backgroundColor: invBadge.bg,
                            color: invBadge.color,
                            border: `1px solid ${invBadge.border}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {u.inventory_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12 }}>
                        <span style={{ color: isExpiringSoon ? '#DC2626' : '#4B5563', fontWeight: isExpiringSoon ? 700 : 500 }}>
                          {new Date(u.expires_at).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'block', fontSize: 10, color: isExpiringSoon ? '#DC2626' : '#9CA3AF' }}>
                          {u.days_left}d remaining
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {u.release_status === 'QUARANTINED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUnit(u);
                              setReleaseAction('RELEASED');
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#16A085',
                              color: '#FFFFFF',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Verify & Release
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Action Modal */}
      {selectedUnit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 440, width: '90%', background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="#16A085" />
              Staff Clinical Release Decision
            </h3>
            <p style={{ fontSize: 13, color: '#7A8B9E', margin: '0 0 16px 0' }}>
              Confirm screening test completion and release unit <strong>#{selectedUnit.id.slice(0, 8)}</strong> into active stock.
            </p>

            <form onSubmit={handleConfirmRelease} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>
                  Release Decision
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setReleaseAction('RELEASED')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 8,
                      border: releaseAction === 'RELEASED' ? '2px solid #16A085' : '1px solid #D1D5DB',
                      background: releaseAction === 'RELEASED' ? '#E8F7F1' : '#FFFFFF',
                      color: releaseAction === 'RELEASED' ? '#16A085' : '#4B5563',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    RELEASE (Verified)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseAction('REJECTED')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 8,
                      border: releaseAction === 'REJECTED' ? '2px solid #DB3654' : '1px solid #D1D5DB',
                      background: releaseAction === 'REJECTED' ? '#FFF0F2' : '#FFFFFF',
                      color: releaseAction === 'REJECTED' ? '#DB3654' : '#4B5563',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    REJECT (Discard)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>
                  Screening / Condition Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="e.g. Immunohematology and infectious disease markers non-reactive"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#4B5563', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: releaseAction === 'RELEASED' ? '#16A085' : '#DB3654',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
