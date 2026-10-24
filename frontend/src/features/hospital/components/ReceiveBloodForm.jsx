import React, { useState } from 'react';
import { Truck, CheckCircle, AlertCircle } from 'lucide-react';

export function ReceiveBloodForm({
  fulfillment = {},
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
}) {
  const unitsCount = fulfillment.units_count || 1;
  const [receivedQuantity, setReceivedQuantity] = useState(unitsCount);
  const [conditionNotes, setConditionNotes] = useState('All units received at 4°C with intact seals');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(receivedQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Received quantity must be a positive number');
      return;
    }

    if (qty !== unitsCount) {
      setError(`Received quantity must match dispatched count (${unitsCount} unit${unitsCount > 1 ? 's' : ''}). Report any damaged units in condition notes.`);
      return;
    }

    onSubmit({
      fulfillmentId: fulfillment.id,
      receivedQuantity: qty,
      conditionNotes: conditionNotes.trim(),
    });
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #E8ECF2',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#E8F8F2',
            color: '#16A085',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Truck size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Confirm Blood Delivery Receipt
          </h3>
          <span style={{ fontSize: 12, color: '#7A8B9E' }}>
            Dispatch from {fulfillment.blood_bank_name || 'Blood Bank'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 4 }}>
            Fulfillment Reference
          </label>
          <div style={{ fontSize: 13, color: '#4B5563', fontFamily: 'monospace', background: '#F3F4F6', padding: '8px 12px', borderRadius: 8 }}>
            #{fulfillment.id}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 4 }}>
            Verified Received Units Count
          </label>
          <input
            type="number"
            min="1"
            value={receivedQuantity}
            onChange={(e) => setReceivedQuantity(e.target.value)}
            className="dash-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
            required
          />
          <span style={{ fontSize: 11, color: '#7A8B9E', marginTop: 4, display: 'block' }}>
            Dispatched quantity: {unitsCount} unit{unitsCount > 1 ? 's' : ''}
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 4 }}>
            Condition / Cold Chain Discrepancy Notes
          </label>
          <textarea
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            rows={3}
            className="dash-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, resize: 'vertical' }}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid #D1D5DB',
              background: '#FFFFFF',
              color: '#4B5563',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#16A085',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <CheckCircle size={16} />
            {loading ? 'Confirming...' : 'Confirm Blood Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}
