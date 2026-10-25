import React, { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';

export function DispatchConfirmForm({
  initialTransferId = '',
  onDispatch = () => {},
  loading = false,
}) {
  const [transferId, setTransferId] = useState(initialTransferId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transferId.trim()) return;
    onDispatch(transferId.trim());
  };

  return (
    <div className="surface-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 22, border: '1px solid #E8ECF2' }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1D3043', margin: '0 0 6px 0' }}>
        Dispatch Transfer (Source Bank)
      </h3>
      <p style={{ fontSize: 12, color: '#7A8B9E', margin: '0 0 14px 0' }}>
        Verify all attached units atomically before dispatching. Requires active membership at source blood bank.
      </p>

      <form id="form-transfer-dispatch" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="dispatch-transfer-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563' }}>
          Transfer UUID *
          <input
            id="dispatch-transfer-id"
            required
            placeholder="UUID of requested transfer"
            value={transferId}
            onChange={(e) => setTransferId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, marginTop: 4 }}
          />
        </label>

        <button
          id="btn-dispatch-transfer"
          type="submit"
          disabled={loading || !transferId.trim()}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#1D4ED8',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          Dispatch Transfer <Send size={15} />
        </button>
      </form>
    </div>
  );
}
