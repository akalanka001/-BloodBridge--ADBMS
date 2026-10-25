import React, { useState } from 'react';
import { ArrowLeft, Clock, AlertTriangle, Truck, Ban, Siren, CheckCircle2 } from 'lucide-react';
import { BloodTypeBadge, RequestUrgencyBadge, RequestStatusBadge } from '../components/RequestStatusBadge.jsx';
import { RequestProgressTracker } from '../components/RequestProgressTracker.jsx';
import { MatchingOverview } from '../components/MatchingOverview.jsx';
import { ReceiveBloodForm } from '../components/ReceiveBloodForm.jsx';

export function RequestDetailsPage({
  request = {},
  progressSummary = null,
  onBack = () => {},
  onCancelRequest = () => {},
  onReceiveFulfillment = () => {},
  onInitiateAppeal = () => {},
  onFindDonors = () => {},
  onMatchingItemChange = () => {},
}) {
  const [activeFulfillmentForReceipt, setActiveFulfillmentForReceipt] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const items = request.items_json || [];
  const history = request.history || [];
  const fulfillments = request.fulfillments || [];

  return (
    <div className="request-details-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="dash-card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
        <label>Matching summary for request item<select value={progressSummary?.requestItemId || ''} onChange={event => onMatchingItemChange(event.target.value)}><option value="" disabled>Choose an item</option>{items.map(item => <option key={item.itemId} value={item.itemId}>{item.bloodTypeCode} · {item.componentCode} · {item.unitsRequested} units</option>)}</select></label>
        <button type="button" className="btn outline" onClick={onFindDonors}>Find potential donor candidates</button>
      </div>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
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

        <div style={{ display: 'flex', gap: 10 }}>
          {request.status === 'OPEN' && (
            <>
              <button
                type="button"
                onClick={() => onInitiateAppeal(request)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1px solid #FFE2E8',
                  background: '#FFF0F2',
                  color: '#DB3654',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Siren size={15} /> Emergency Appeal
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: '1px solid #EF4444',
                  background: '#FFFFFF',
                  color: '#EF4444',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Ban size={15} /> Cancel Request
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Request Header Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: 0 }}>
                Request #{request.id}
              </h2>
              <RequestStatusBadge status={request.status} />
              <RequestUrgencyBadge urgency={request.urgency} />
            </div>
            <div style={{ fontSize: 13, color: '#7A8B9E' }}>
              Hospital: <strong>{request.hospital_name}</strong> &bull; District: {request.hospital_district || 'LK'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Needed By
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1D3043' }}>
              {new Date(request.needed_by).toLocaleString()}
            </div>
          </div>
        </div>

        {request.notes && (
          <div style={{ background: '#F7F9FC', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: '#4B5563', marginBottom: 16 }}>
            <strong>Coordination notes:</strong> {request.notes}
          </div>
        )}

        {/* Progress Tracker */}
        <RequestProgressTracker request={request} />
      </div>

      {/* Grid: Items & Matching Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 20 }}>
        {/* Left: Items & Fulfillments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Requested Items Table */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #E8ECF2' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1D3043', margin: '0 0 14px 0' }}>
              Requested Blood Components
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>BLOOD GROUP</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>COMPONENT</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>REQUESTED</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>RESERVED</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>FULFILLED</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '10px' }}>
                      <BloodTypeBadge bloodType={item.bloodTypeCode} />
                    </td>
                    <td style={{ padding: '10px', fontSize: 13, fontWeight: 600, color: '#1D3043' }}>
                      {item.componentCode}
                    </td>
                    <td style={{ padding: '10px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      {item.unitsRequested} units
                    </td>
                    <td style={{ padding: '10px', fontSize: 13, color: '#D97706', fontWeight: 600 }}>
                      {item.reservedUnits || 0}
                    </td>
                    <td style={{ padding: '10px', fontSize: 13, color: '#059669', fontWeight: 600 }}>
                      {item.fulfilledUnits || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fulfillments / Deliveries Section */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #E8ECF2' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1D3043', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={18} color="#DB3654" />
              Dispatched Fulfillments & Deliveries
            </h3>

            {fulfillments.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
                No dispatches assigned by blood banks yet. Supply coordination is active.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fulfillments.map((ful) => (
                  <div
                    key={ful.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: ful.status === 'RECEIVED' ? '#ECFDF5' : '#F7F9FC',
                      border: '1px solid #E8ECF2',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                          #{ful.id.slice(0, 8)} &mdash; {ful.blood_bank_name}
                        </span>
                        <RequestStatusBadge status={ful.status} />
                      </div>
                      <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
                        {ful.units_count ?? 'Unavailable'} units dispatched &bull; Created {new Date(ful.created_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                        {ful.received_at && ` &bull; Received by ${ful.receiver_name || 'Staff'} at ${new Date(ful.received_at).toLocaleTimeString()}`}
                      </div>
                      {ful.condition_notes && (
                        <div style={{ fontSize: 12, color: '#047857', marginTop: 4, fontStyle: 'italic' }}>
                          Notes: {ful.condition_notes}
                        </div>
                      )}
                    </div>

                    {ful.status === 'DISPATCHED' && (
                      <button
                        type="button"
                        onClick={() => setActiveFulfillmentForReceipt(ful)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: '#16A085',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={14} /> Confirm Receipt
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Matching Overview & Status History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MatchingOverview summary={progressSummary} fallbackRequest={request} />

          {/* Status History Timeline */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1px solid #E8ECF2' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1D3043', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#7A8B9E" /> Status Audit History
            </h3>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: '#7A8B9E', margin: 0 }}>Request created with initial OPEN status.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((h) => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DB3654', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#1D3043' }}>
                        Transitioned to {h.to_status}
                      </div>
                      <div style={{ color: '#7A8B9E' }}>
                        {new Date(h.changed_at).toLocaleString()} {h.changed_by_name && `by ${h.changed_by_name}`}
                      </div>
                      {h.reason && <div style={{ color: '#4B5563', marginTop: 2 }}>{h.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receive Blood Modal */}
      {activeFulfillmentForReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 500, width: '90%' }}>
            <ReceiveBloodForm
              fulfillment={activeFulfillmentForReceipt}
              onSubmit={(formData) => {
                onReceiveFulfillment(formData);
                setActiveFulfillmentForReceipt(null);
              }}
              onCancel={() => setActiveFulfillmentForReceipt(null)}
            />
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, maxWidth: 440, width: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 8px 0' }}>Cancel Request</h3>
            <p style={{ fontSize: 13, color: '#7A8B9E', margin: '0 0 16px 0' }}>
              Are you sure you want to cancel blood request #{request.id.slice(0, 8)}? Any reserved blood units will be released back to the bank.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="dash-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, resize: 'vertical', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#4B5563', fontSize: 13, cursor: 'pointer' }}
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancelRequest(request.id, cancelReason);
                  setCancelModalOpen(false);
                }}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
