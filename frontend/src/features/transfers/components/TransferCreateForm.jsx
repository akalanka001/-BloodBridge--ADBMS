import React, { useState } from 'react';
import { Truck, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export function TransferCreateForm({
  userBankId,
  availableUnits = [],
  onSubmit = () => {},
  loading = false,
}) {
  const [targetBankId, setTargetBankId] = useState('2');
  const [transferCode, setTransferCode] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Eligible units for transfer: must be RELEASED and IN_STOCK
  const eligibleUnits = availableUnits.filter(
    (u) => u.release_status === 'RELEASED' && u.inventory_status === 'IN_STOCK'
  );

  const toggleUnit = (unitId) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUnitIds.length === 0) {
      setError('Please select at least one eligible blood unit for transfer');
      return;
    }
    if (Number(userBankId) === Number(targetBankId)) {
      setError('Target destination bank must be different from source bank');
      return;
    }
    setError('');
    onSubmit({
      transferCode: transferCode.trim(),
      sourceBankId: Number(userBankId),
      targetBankId: Number(targetBankId),
      unitIds: selectedUnitIds,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="transfer-create-card dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={20} color="#DB3654" />
        </div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Initiate Inter-Bank Transfer Request
          </h3>
          <p style={{ fontSize: 12, color: '#7A8B9E', margin: '2px 0 0 0' }}>
            Request transfer of released inventory units to another coordinating blood bank
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="create-transfer-code" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Transfer Code *
            </label>
            <input
              id="create-transfer-code"
              type="text"
              required
              value={transferCode}
              onChange={(e) => setTransferCode(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            />
          </div>

          <div>
            <label htmlFor="create-target-bank" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
              Destination Blood Bank *
            </label>
            <select
              id="create-target-bank"
              value={targetBankId}
              onChange={(e) => setTargetBankId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="1">National Blood Transfusion Center (Colombo)</option>
              <option value="2">Kandy General Hospital Blood Bank</option>
              <option value="3">Karapitiya Base Hospital Blood Bank (Galle)</option>
            </select>
          </div>
        </div>

        {/* Multi-unit Selection */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 6 }}>
            Select Blood Units to Transfer ({selectedUnitIds.length} selected of {eligibleUnits.length} eligible) *
          </label>

          {eligibleUnits.length === 0 ? (
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
              No released, in-stock units available to transfer. Please verify quarantined units first.
            </p>
          ) : (
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: '#F8FAFC',
              }}
            >
              {eligibleUnits.map((u) => {
                const checked = selectedUnitIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: checked ? '#EFF6FF' : '#FFFFFF',
                      border: checked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUnit(u.id)}
                    />
                    <strong style={{ color: '#1D3043' }}>#{u.id.slice(0, 8)}</strong>
                    <span style={{ color: '#DB3654', fontWeight: 800 }}>{u.blood_type_code}</span>
                    <span style={{ color: '#4B5563' }}>{u.component_code}</span>
                    <span style={{ color: '#7A8B9E' }}>Exp: {new Date(u.expires_at).toLocaleDateString()}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="create-transfer-notes" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
            Transfer Notes / Cold Chain Instructions
          </label>
          <input
            id="create-transfer-notes"
            type="text"
            placeholder="e.g. Temperature monitoring active, standard 2-6°C insulated carrier"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
          />
        </div>

        <div>
          <button
            id="btn-create-transfer"
            type="submit"
            disabled={loading || selectedUnitIds.length === 0}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading || selectedUnitIds.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Send size={15} />
            {loading ? 'Submitting...' : 'Submit Transfer Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
