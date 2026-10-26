import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function ReceiveConfirmForm({
  initialTransferId = '',
  onReceive = () => {},
  loading = false,
}) {
  const [transferId, setTransferId] = useState(initialTransferId);
  const [notes, setNotes] = useState('Received in good condition, cold chain verified');

  React.useEffect(() => {
    if (initialTransferId) setTransferId(initialTransferId);
  }, [initialTransferId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transferId.trim()) return;
    onReceive(transferId.trim(), notes.trim());
  };

  return (
    <div className="surface-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 22, border: '1px solid #E8ECF2' }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1D3043', margin: '0 0 6px 0' }}>
        Receive Transfer (Destination Bank)
      </h3>
      <p style={{ fontSize: 12, color: '#7A8B9E', margin: '0 0 14px 0' }}>
        Reassigns custody of verified units to destination bank. Requires condition and temperature verification notes.
      </p>

      <form id="form-transfer-receive" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="receive-transfer-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563' }}>
          Transfer Code or UUID *
          <input
            id="receive-transfer-id"
            required
            placeholder="e.g. TRF-987381 or UUID"
            value={transferId}
            onChange={(e) => setTransferId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, marginTop: 4 }}
          />
        </label>

        <label htmlFor="receive-notes" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563' }}>
          Condition Notes *
          <input
            id="receive-notes"
            required
            placeholder="Cold chain condition, seals intact, temperature"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, marginTop: 4 }}
          />
        </label>

        <button
          id="btn-receive-transfer"
          type="submit"
          disabled={loading || !transferId.trim()}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#16A085',
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
          Confirm Receipt <CheckCircle2 size={15} />
        </button>
      </form>
    </div>
  );
}
