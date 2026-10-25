import React, { useState } from 'react';
import { Siren, AlertTriangle, ShieldCheck } from 'lucide-react';

export function EmergencyAppealForm({
  requests = [],
  hospitalId,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  initialRequestId = '',
  initialItemId = '',
}) {
  const [selectedRequestId, setSelectedRequestId] = useState(initialRequestId || requests[0]?.id || '');
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);
  const items = selectedRequest?.items_json || [];

  const [selectedItemId, setSelectedItemId] = useState(initialItemId || items[0]?.itemId || '');
  const selectedItem = items.find((i) => i.itemId === selectedItemId) || items[0];

  const maxShortage = selectedItem
    ? Math.max(1, (selectedItem.unitsRequested || 1) - (selectedItem.fulfilledUnits || 0))
    : 1;

  const [shortageUnits, setShortageUnits] = useState(maxShortage);
  const [reason, setReason] = useState('');
  const [escalationLevel, setEscalationLevel] = useState('DISTRICT');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedRequestId || !selectedItemId) {
      setFormError('Please select a valid blood request and shortage item.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setFormError('Enter at least 5 characters explaining the coordination reason. Do not include patient details.');
      return;
    }

    onSubmit({
      requestId: selectedRequestId,
      requestItemId: selectedItemId,
      hospitalId: Number(hospitalId),
      shortageUnits: Number(shortageUnits),
      reason: reason.trim(),
      escalationLevel,
    });
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #FFE2E8',
        boxShadow: '0 8px 24px rgba(219, 54, 84, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#FFF0F2',
            color: '#DB3654',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Siren size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            Initiate Emergency Appeal
          </h3>
          <span style={{ fontSize: 12, color: '#7A8B9E' }}>
            Escalate acute component shortages for targeted donor mobilization
          </span>
        </div>
      </div>

      <div
        style={{
          background: '#FFF7ED',
          border: '1px solid #FFEDD5',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 18,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12, color: '#92400E' }}>
          Appeals record an outreach coordination request. Candidate counts require consent; a recorded appeal does not mean invitations were sent or donors medically cleared.
        </span>
      </div>

      {formError && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Parent Request Selector */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
            Target Blood Request
          </label>
          <select
            value={selectedRequestId}
            onChange={(e) => {
              setSelectedRequestId(e.target.value);
              const r = requests.find((req) => req.id === e.target.value);
              if (r && r.items_json && r.items_json.length > 0) {
                setSelectedItemId(r.items_json[0].itemId);
                const s = Math.max(1, (r.items_json[0].unitsRequested || 1) - (r.items_json[0].fulfilledUnits || 0));
                setShortageUnits(s);
              }
            }}
            className="dash-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
            required
          >
            {requests
              .filter((r) => r.status === 'OPEN' || r.status === 'PARTIALLY_FILLED')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id.slice(0, 8)} &mdash; {r.urgency} ({r.total_requested_units} units needed by {new Date(r.needed_by).toLocaleDateString()})
                </option>
              ))}
          </select>
        </div>

        {/* Item Selector if multi-item */}
        {items.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
              Select Component Item with Shortage
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const item = items.find((i) => i.itemId === e.target.value);
                if (item) {
                  const s = Math.max(1, (item.unitsRequested || 1) - (item.fulfilledUnits || 0));
                  setShortageUnits(s);
                }
              }}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
              required
            >
              {items.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.bloodTypeCode} &bull; {item.componentCode} &mdash; Requested: {item.unitsRequested}, Fulfilled: {item.fulfilledUnits || 0}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Remaining Shortage Units */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
              Acute Shortage (Units)
            </label>
            <input
              type="number"
              min="1"
              max={maxShortage * 2}
              value={shortageUnits}
              onChange={(e) => setShortageUnits(e.target.value)}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
              required
            />
          </div>

          {/* Area Escalation Scope */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
              Initial Escalation Scope
            </label>
            <select
              value={escalationLevel}
              onChange={(e) => setEscalationLevel(e.target.value)}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}
            >
              <option value="GN_DIVISION">GN Division (Immediate local cluster)</option>
              <option value="DS_DIVISION">DS Division (Surrounding division)</option>
              <option value="DISTRICT">District (Broad district mobilization)</option>
              <option value="PROVINCE">Province (Regional alert)</option>
            </select>
          </div>
        </div>

        {/* Clinical Necessity Reason */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
            Coordination reason (no patient details)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the component shortage and coordination need"
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
              background: '#DB3654',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <ShieldCheck size={16} />
            {loading ? 'Submitting...' : 'Submit Emergency Appeal'}
          </button>
        </div>
      </form>
    </div>
  );
}
