import React, { useState } from 'react';
import { PackageCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export function StockReservationForm({
  requestItem = null,
  availableUnits = [],
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      setError('Please select an eligible released blood unit to allocate');
      return;
    }
    setError('');
    onSubmit({
      requestItemId: requestItem?.id,
      bloodUnitId: selectedUnitId,
      notes: notes.trim() || undefined,
    });
  };

  // Filter available units to match the request item's blood group and component
  const eligibleUnits = availableUnits.filter((u) => {
    if (!requestItem) return true;
    return (
      u.blood_type_code === requestItem.blood_type_code &&
      u.component_code === requestItem.component_code &&
      u.release_status === 'RELEASED' &&
      u.inventory_status === 'IN_STOCK'
    );
  });

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #E8ECF2',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#FFF0F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PackageCheck size={20} color="#DB3654" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Allocate Blood Unit for Hospital Request
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Atomic reservation locks the component unit and updates hospital fulfillment progress
          </p>
        </div>
      </div>

      {requestItem && (
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: '#1D3043',
          }}
        >
          <div>
            <strong>Hospital Request Target:</strong> {requestItem.hospital_name || 'Hospital'} &bull; Item #{requestItem.id?.slice(0, 8)}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 12, color: '#4B5563', fontSize: 12 }}>
            <span>Target Group: <strong style={{ color: '#DB3654' }}>{requestItem.blood_type_code}</strong></span>
            <span>Component: <strong>{requestItem.component_code}</strong></span>
            <span>Requested: <strong>{requestItem.units_requested} units</strong></span>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label
            htmlFor="reservation-unit-select"
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}
          >
            Select Eligible Unit ({eligibleUnits.length} available) *
          </label>
          <select
            id="reservation-unit-select"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              backgroundColor: '#FFFFFF',
              color: '#1D3043',
            }}
          >
            <option value="">-- Choose verified released unit --</option>
            {eligibleUnits.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id.slice(0, 8)} &bull; {u.blood_type_code} {u.component_code} ({u.volume_ml || 450}ml) &bull; Exp: {new Date(u.expires_at).toLocaleDateString()} ({u.days_left}d left)
              </option>
            ))}
          </select>
          {eligibleUnits.length === 0 && (
            <p style={{ fontSize: 12, color: '#DB3654', margin: '4px 0 0 0' }}>
              No released, in-stock units match this blood group and component.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reservation-notes"
            style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}
          >
            Staff Allocation Notes (Optional)
          </label>
          <textarea
            id="reservation-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Reserved for emergency surgical theater dispatch"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
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
            disabled={loading || eligibleUnits.length === 0}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading || eligibleUnits.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || eligibleUnits.length === 0 ? 0.6 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Lock size={15} />
            {loading ? 'Reserving...' : 'Confirm Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
