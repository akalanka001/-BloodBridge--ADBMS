import React, { useState } from 'react';
import { Search, RotateCcw, Plus, Eye, Ban, Calendar, Filter } from 'lucide-react';
import { BloodTypeBadge, RequestUrgencyBadge, RequestStatusBadge } from '../components/RequestStatusBadge.jsx';

export function BloodRequestsPage({
  requests = [],
  loading = false,
  onRefresh = () => {},
  onSelectRequest = () => {},
  onCancelRequest = () => {},
  onNewRequest = () => {},
}) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    urgency: '',
    bloodTypeCode: '',
    componentCode: '',
  });

  const [cancelModalId, setCancelModalId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by authorized hospital staff');

  const filteredRequests = requests.filter((r) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchNotes = (r.notes || '').toLowerCase().includes(q);
      if (!matchId && !matchNotes) return false;
    }
    if (filters.status && r.status !== filters.status) return false;
    if (filters.urgency && r.urgency !== filters.urgency) return false;
    if (filters.bloodTypeCode) {
      const hasType = r.items_json?.some((i) => i.bloodTypeCode === filters.bloodTypeCode);
      if (!hasType) return false;
    }
    if (filters.componentCode) {
      const hasComp = r.items_json?.some((i) => i.componentCode === filters.componentCode);
      if (!hasComp) return false;
    }
    return true;
  });

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      urgency: '',
      bloodTypeCode: '',
      componentCode: '',
    });
  };

  const handleConfirmCancel = () => {
    if (cancelModalId) {
      onCancelRequest(cancelModalId, cancelReason);
      setCancelModalId(null);
    }
  };

  return (
    <div className="blood-requests-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0' }}>
            Blood Requests Directory
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Track and coordinate component requests across verified national blood banks
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #D1D5DB',
              background: '#FFFFFF',
              color: '#4B5563',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={onNewRequest}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Create Request
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: 16,
          border: '1px solid #E8ECF2',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search request ID or clinical notes..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="dash-input"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 8, fontSize: 13 }}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="dash-input"
          style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="PARTIALLY_FILLED">Partially Filled</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={filters.urgency}
          onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
          className="dash-input"
          style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">All Urgencies</option>
          <option value="CRITICAL">Critical</option>
          <option value="URGENT">Urgent</option>
          <option value="ROUTINE">Routine</option>
        </select>

        <select
          value={filters.componentCode}
          onChange={(e) => setFilters({ ...filters, componentCode: e.target.value })}
          className="dash-input"
          style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
        >
          <option value="">All Components</option>
          <option value="RBC">Red Blood Cells (RBC)</option>
          <option value="PLASMA">Plasma</option>
          <option value="PLATELETS">Platelets</option>
        </select>

        <button
          type="button"
          onClick={handleClearFilters}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #E8ECF2',
            background: '#F7F9FC',
            color: '#7A8B9E',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Requests Table */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        {filteredRequests.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7A8B9E' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: 14 }}>No requests match the selected criteria.</p>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#DB3654',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>REQUEST ID</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>COMPONENTS / GROUPS</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>TOTAL UNITS</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>PRIORITY</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>NEEDED BY</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 750, color: '#7A8B9E' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      #{req.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {req.items_json && req.items_json.length > 0 ? (
                          req.items_json.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: '#FFF0F2',
                                color: '#DB3654',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {item.bloodTypeCode} &bull; {item.componentCode} ({item.unitsRequested})
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 12, color: '#7A8B9E' }}>Standard request</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 700, color: '#1D3043' }}>
                      {req.total_requested_units || 1} units
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <RequestUrgencyBadge urgency={req.urgency} />
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#4B5563' }}>
                      {new Date(req.needed_by).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSelectRequest(req.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1D3043',
                            fontSize: 12,
                            fontWeight: 650,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Eye size={14} color="#DB3654" /> Details
                        </button>
                        {req.status === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => setCancelModalId(req.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Ban size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModalId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 10px 0' }}>
              Cancel Blood Request
            </h3>
            <p style={{ fontSize: 13, color: '#7A8B9E', margin: '0 0 16px 0' }}>
              Cancelling will release any active inventory reservations back to the blood bank. This action cannot be reversed.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
              Cancellation Reason
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, resize: 'vertical', marginBottom: 18 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelModalId(null)}
                style={{
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
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
