import React from 'react';
import { Check, Clock, Truck, ShieldAlert } from 'lucide-react';

export function RequestProgressTracker({ request = {} }) {
  const requested = request.total_requested_units || 0;
  const reserved = request.total_reserved_units || 0;
  const fulfilled = request.total_fulfilled_units || 0;
  const status = request.status || 'OPEN';

  const steps = [
    { key: 'SUBMITTED', label: 'Request Placed', icon: Clock, done: true },
    { key: 'RESERVED', label: 'Inventory Reserved', icon: ShieldAlert, done: reserved > 0 || fulfilled > 0 || status === 'FULFILLED' },
    { key: 'DISPATCHED', label: 'In Transit', icon: Truck, done: fulfilled > 0 || status === 'FULFILLED' || (request.fulfillments && request.fulfillments.some(f => f.status === 'DISPATCHED')) },
    { key: 'FULFILLED', label: 'Received & Verified', icon: Check, done: status === 'FULFILLED' },
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E8ECF2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1D3043', margin: 0 }}>Fulfillment Journey</h4>
          <span style={{ fontSize: 12, color: '#7A8B9E' }}>
            {fulfilled} of {requested} units received ({requested > 0 ? Math.round((fulfilled / requested) * 100) : 0}%)
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, position: 'relative' }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: step.done ? '#16A085' : '#F3F4F6',
                  color: step.done ? '#FFFFFF' : '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  zIndex: 2,
                }}
              >
                <Icon size={18} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: step.done ? '#1D3043' : '#9CA3AF' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
