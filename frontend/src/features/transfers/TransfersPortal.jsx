import React, { useState, useEffect } from 'react';
import { Truck, Send, CheckCircle2, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { TransferCreateForm } from './components/TransferCreateForm.jsx';
import { DispatchConfirmForm } from './components/DispatchConfirmForm.jsx';
import { ReceiveConfirmForm } from './components/ReceiveConfirmForm.jsx';

export function TransfersPortal({ token, userBankId, pageSize = 10 }) {
  const [transfers, setTransfers] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: pageSize });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trfRes, unitsRes] = await Promise.all([
        api(`/transfers?bankId=${userBankId}&limit=${pageSize}&offset=${(page - 1) * pageSize}`, {}, token),
        api(`/inventory/units?bankId=${userBankId}&inventoryStatus=IN_STOCK&releaseStatus=RELEASED&limit=100`, {}, token).catch(() => ({ data: [] })),
      ]);
      setTransfers(trfRes.data || []);
      setPagination(trfRes.pagination || { total: trfRes.count || 0, limit: pageSize });
      setAvailableUnits(unitsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && userBankId) loadData();
  }, [token, userBankId, page, pageSize]);

  if (!userBankId) return <div className="bb-empty" role="alert">Select an assigned blood bank before managing transfers.</div>;

  const handleCreateTransfer = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);
      setSuccess(`Transfer request ${res.data.transfer_code} initiated!`);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (transferId) => {
    setError('');
    setSuccess('');
    try {
      await api(`/transfers/${transferId}/dispatch`, {
        method: 'POST',
      }, token);
      setSuccess(`Transfer ${transferId} dispatched into transit! Units locked in IN_TRANSIT.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReceive = async (transferId, notes) => {
    setError('');
    setSuccess('');
    try {
      await api(`/transfers/${transferId}/receive`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }, token);
      setSuccess(`Transfer ${transferId} successfully received and custody updated to destination blood bank!`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
      case 'IN_TRANSIT':
        return { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' };
      case 'RECEIVED':
        return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      case 'CANCELLED':
        return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
    }
  };

  return (
    <div className="transfers-portal-feature" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={24} color="#DB3654" />
            Inter-Bank Component Transfers
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Coordinate supply rebalancing across Sri Lanka NBTS cluster blood banks
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              background: '#FFFFFF',
              color: '#4B5563',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={16} /> New Transfer Request
          </button>
        </div>
      </div>

      {/* Notices */}
      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Dispatch and Receive Operational Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <DispatchConfirmForm onDispatch={handleDispatch} loading={loading} />
        <ReceiveConfirmForm onReceive={handleReceive} loading={loading} />
      </div>

      {/* Transfers List Table */}
      <div className="dash-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8ECF2', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8ECF2' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Active & Recent Transfers ({transfers.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>TRANSFER CODE</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>SOURCE BANK</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>DESTINATION BANK</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>UNITS</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>STATUS</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>CREATED AT</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                    No inter-bank transfer requests recorded yet.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => {
                  const badge = getStatusBadge(trf.status);
                  return (
                    <tr key={trf.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                        {trf.transfer_code || `#${trf.id.slice(0, 8)}`}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1D3043' }}>
                        {trf.source_bank_name || 'Source Bank'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1D3043' }}>
                        {trf.target_bank_name || 'Destination Bank'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#4B5563' }}>
                        {trf.unit_count || 1} units
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {trf.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#7A8B9E' }}>
                        {new Date(trf.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={pagination.total} onPageChange={setPage} loading={loading} />
      </div>

      {/* New Transfer Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 520, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <TransferCreateForm
              userBankId={userBankId}
              availableUnits={availableUnits}
              onSubmit={handleCreateTransfer}
              loading={loading}
            />
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
