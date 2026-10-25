import React, { useState } from 'react';
import { Truck, CheckCircle2, Clock, Check, AlertCircle } from 'lucide-react';
import { RequestStatusBadge } from '../components/RequestStatusBadge.jsx';
import { ReceiveBloodForm } from '../components/ReceiveBloodForm.jsx';

export function DeliveriesPage({
  requests = [],
  onReceiveFulfillment = () => {},
  onSelectRequest = () => {},
  loading = false,
}) {
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);

  // Collect all fulfillments from all requests
  const allDeliveries = [];
  requests.forEach((req) => {
    if (req.fulfillments && Array.isArray(req.fulfillments)) {
      req.fulfillments.forEach((f) => {
        allDeliveries.push({
          ...f,
          requestUrgency: req.urgency,
          requestHospitalName: req.hospital_name,
        });
      });
    }
  });

  const inTransitDeliveries = allDeliveries.filter((d) => d.status === 'DISPATCHED');
  const completedDeliveries = allDeliveries.filter((d) => d.status === 'RECEIVED');

  return (
    <div className="deliveries-tracking-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={24} color="#DB3654" />
          Request Tracking & Blood Bank Deliveries
        </h2>
        <span style={{ fontSize: 13, color: '#7A8B9E' }}>
          Monitor cold-chain dispatches, track in-transit blood components, and verify delivery receipt
        </span>
      </div>

      {/* In Transit Deliveries */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D97706' }} />
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: 0 }}>
            In-Transit Dispatches ({inTransitDeliveries.length})
          </h3>
        </div>

        {inTransitDeliveries.length === 0 ? (
          <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
            No dispatches currently in transit to your hospital.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inTransitDeliveries.map((del) => (
              <div
                key={del.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1D3043' }}>
                      Dispatch #{del.id.slice(0, 8)} &mdash; From {del.blood_bank_name || 'Central Bank'}
                    </span>
                    <RequestStatusBadge status={del.status} />
                  </div>
                  <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
                    Linked to Request #{del.request_id.slice(0, 8)} &bull; Dispatched units: {del.units_count || 1}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => onSelectRequest(del.request_id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      background: '#FFFFFF',
                      color: '#4B5563',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFulfillment(del)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#16A085',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={14} /> Confirm Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Receipts History */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: '0 0 16px 0' }}>
          Received Deliveries History ({completedDeliveries.length})
        </h3>

        {completedDeliveries.length === 0 ? (
          <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
            No completed delivery receipts recorded yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>DELIVERY ID</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>BLOOD BANK</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>RECEIVED UNITS</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>RECEIVER</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>RECEIVED AT</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>CONDITION NOTES</th>
                </tr>
              </thead>
              <tbody>
                {completedDeliveries.map((del) => (
                  <tr key={del.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      #{del.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 13, color: '#4B5563' }}>
                      {del.blood_bank_name || 'Blood Bank'}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 700, color: '#047857' }}>
                      {del.received_quantity || del.units_count || 1} units
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 13, color: '#4B5563' }}>
                      {del.receiver_name || 'Authorized Staff'}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 12, color: '#7A8B9E' }}>
                      {del.received_at ? new Date(del.received_at).toLocaleString() : 'Confirmed'}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 12, color: '#4B5563', fontStyle: 'italic' }}>
                      {del.condition_notes || 'Seals verified'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedFulfillment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 500, width: '90%' }}>
            <ReceiveBloodForm
              fulfillment={selectedFulfillment}
              onSubmit={(formData) => {
                onReceiveFulfillment(formData);
                setSelectedFulfillment(null);
              }}
              onCancel={() => setSelectedFulfillment(null)}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
