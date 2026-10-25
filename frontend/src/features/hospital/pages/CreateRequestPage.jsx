import React, { useState } from 'react';
import { PlusCircle, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { RequestItemRepeater } from '../components/RequestItemRepeater.jsx';

export function CreateRequestPage({
  hospitalId,
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
}) {
  // Default needed-by to tomorrow at 10:00 AM
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultNeededBy = `${tomorrow.toISOString().slice(0, 10)}T10:00`;

  const [urgency, setUrgency] = useState('URGENT');
  const [neededBy, setNeededBy] = useState(defaultNeededBy);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { bloodTypeCode: 'O+', componentCode: 'RBC', unitsRequested: 2 },
  ]);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!neededBy) {
      setError('Please select a needed-by date and time.');
      return;
    }

    const neededByDate = new Date(neededBy);
    if (isNaN(neededByDate.getTime()) || neededByDate <= new Date()) {
      setError('Needed-by date and time must be in the future.');
      return;
    }

    if (!items || items.length === 0) {
      setError('Please add at least one blood component item.');
      return;
    }

    for (const item of items) {
      if (!item.unitsRequested || item.unitsRequested < 1) {
        setError('Requested units must be at least 1.');
        return;
      }
    }

    const payload = {
      hospitalId: Number(hospitalId),
      urgency,
      neededBy: neededByDate.toISOString(),
      notes: notes.trim() || undefined,
      items: items.map((i) => ({
        bloodTypeCode: i.bloodTypeCode,
        componentCode: i.componentCode,
        unitsRequested: Number(i.unitsRequested),
      })),
    };

    onSubmit(payload);
  };

  return (
    <div className="create-request-page" style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#7A8B9E',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Back to blood requests
        </button>
      </div>

      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          padding: '28px 32px',
          border: '1px solid #E8ECF2',
          boxShadow: '0 8px 24px rgba(28, 57, 85, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E8ECF2' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#FFF0F2',
              color: '#DB3654',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusCircle size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: 0 }}>
              New Blood Component Request
            </h2>
            <span style={{ fontSize: 13, color: '#7A8B9E' }}>
              Submit a verified multi-item component requisition to the blood bank cluster
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Urgency & Needed-by */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label htmlFor="request-urgency" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
                Urgency Level
              </label>
              <select
                id="request-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="dash-input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14 }}
              >
                <option value="ROUTINE">Routine (Scheduled surgery / elective)</option>
                <option value="URGENT">Urgent (Within 24 hours)</option>
                <option value="CRITICAL">Critical (Immediate acute trauma / ICU)</option>
              </select>
            </div>

            <div>
              <label htmlFor="request-needed-by" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
                Needed By (Future Date & Time)
              </label>
              <input
                id="request-needed-by"
                type="datetime-local"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="dash-input"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14 }}
                required
              />
            </div>
          </div>

          {/* Repeatable Request Items */}
          <RequestItemRepeater items={items} onChange={(newItems) => setItems(newItems)} />

          {/* Clinical Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1D3043', marginBottom: 6 }}>
              Coordination notes (optional, no patient details)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Component shortage and delivery coordination instructions"
              rows={3}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '11px 20px',
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: 14,
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
                padding: '11px 24px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#DB3654',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(219, 54, 84, 0.25)',
              }}
            >
              <Send size={16} />
              {loading ? 'Submitting...' : 'Submit Blood Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
