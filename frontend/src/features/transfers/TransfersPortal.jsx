import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';

export function TransfersPortal({ token, userBankId = 1 }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dispatch form state
  const [dispatchForm, setDispatchForm] = useState({
    transferId: '',
  });

  // Receive form state (with required notes field)
  const [receiveForm, setReceiveForm] = useState({
    transferId: '',
    notes: 'Received in good condition, cold chain verified',
  });

  const loadTransfers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/transfers', {}, token);
      setTransfers(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadTransfers();
  }, [token]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchForm.transferId) return;
    setError('');
    setSuccess('');
    try {
      await api(`/transfers/${dispatchForm.transferId.trim()}/dispatch`, {
        method: 'POST',
      }, token);
      setSuccess(`Transfer ${dispatchForm.transferId} dispatched into transit! Units locked in IN_TRANSIT.`);
      setDispatchForm({ transferId: '' });
      loadTransfers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    if (!receiveForm.transferId) return;
    setError('');
    setSuccess('');
    try {
      await api(`/transfers/${receiveForm.transferId.trim()}/receive`, {
        method: 'POST',
        body: JSON.stringify({ notes: receiveForm.notes.trim() }),
      }, token);
      setSuccess(`Transfer ${receiveForm.transferId} successfully received and custody updated to destination blood bank!`);
      setReceiveForm({ transferId: '', notes: 'Received in good condition, cold chain verified' });
      loadTransfers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="transfers-portal-feature">
      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      <div className="two-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Dispatch Card */}
        <div className="surface-card">
          <h3>Dispatch Transfer (Source Bank)</h3>
          <p>
            Verify all attached units atomically before dispatching. Requires active membership at source blood bank.
          </p>
          <form id="form-transfer-dispatch" onSubmit={handleDispatch} className="form-grid">
            <label>
              Transfer UUID *
              <input
                id="dispatch-transfer-id"
                required
                placeholder="UUID of requested transfer"
                value={dispatchForm.transferId}
                onChange={(e) => setDispatchForm({ transferId: e.target.value })}
              />
            </label>
            <button id="btn-dispatch-transfer" className="primary">
              Dispatch Transfer <Send size={16} />
            </button>
          </form>
        </div>

        {/* Receive Card */}
        <div className="surface-card">
          <h3>Receive Transfer (Destination Bank)</h3>
          <p>
            Accept incoming units and record cold chain verification notes. Procedure signature accepts 3 parameters: transferId, actorId, notes.
          </p>
          <form id="form-transfer-receive" onSubmit={handleReceive} className="form-grid">
            <label>
              Transfer UUID *
              <input
                id="receive-transfer-id"
                required
                placeholder="UUID of in-transit transfer"
                value={receiveForm.transferId}
                onChange={(e) => setReceiveForm({ ...receiveForm, transferId: e.target.value })}
              />
            </label>
            <label>
              Receipt & Condition Notes *
              <input
                id="receive-notes"
                required
                placeholder="Temperature check, packaging integrity, etc."
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
              />
            </label>
            <button id="btn-receive-transfer" className="primary">
              Acknowledge Receipt <CheckCircle2 size={16} />
            </button>
          </form>
        </div>
      </div>

      <div className="surface-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Inter-Bank Transfers Log</h3>
          <button className="outline small" onClick={loadTransfers} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p>Loading transfers…</p>
        ) : transfers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>Transfer Code</th>
                  <th style={{ padding: '8px' }}>Source Bank</th>
                  <th style={{ padding: '8px' }}>Target Bank</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{t.transfer_code || t.id.slice(0, 8)}</td>
                    <td style={{ padding: '8px' }}>{t.source_bank_name || t.source_bank_id}</td>
                    <td style={{ padding: '8px' }}>{t.target_bank_name || t.target_bank_id}</td>
                    <td style={{ padding: '8px' }}>
                      <Badge>{t.status}</Badge>
                    </td>
                    <td style={{ padding: '8px' }}>
                      {t.status === 'REQUESTED' && (
                        <button
                          className="outline small"
                          onClick={() => setDispatchForm({ transferId: t.id })}
                        >
                          Select for Dispatch
                        </button>
                      )}
                      {t.status === 'IN_TRANSIT' && (
                        <button
                          className="primary small"
                          onClick={() => setReceiveForm((prev) => ({ ...prev, transferId: t.id }))}
                        >
                          Select for Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No transfer requests found.</p>
        )}
      </div>
    </div>
  );
}
