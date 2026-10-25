import React, { useState } from 'react';
import { Bell, AlertTriangle, Truck, Siren, CheckCircle2, ShieldCheck, Inbox, Activity } from 'lucide-react';

export function HospitalNotificationsPage({
  requests = [],
  appeals = [],
  kpis = {},
  onNavigate = () => {},
  onSelectRequest = () => {},
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Build notifications from requests, deliveries, and appeals
  const notificationsList = [];

  // 1. Critical and urgent shortage alerts
  requests.forEach((req) => {
    if (['OPEN', 'PARTIALLY_FILLED'].includes(req.status)) {
      if (req.urgency === 'CRITICAL') {
        notificationsList.push({
          id: `crit-${req.id}`,
          type: 'CRITICAL',
          title: 'Critical Emergency Supply Shortage',
          message: `Request #${req.id.slice(0, 8)} requires immediate supply coordination for ${req.total_requested_units || 'outstanding'} component units.`,
          timestamp: req.created_at,
          actionLabel: 'Coordinate Supply',
          actionTab: 'emergency',
          requestId: req.id,
        });
      } else if (req.urgency === 'URGENT') {
        notificationsList.push({
          id: `urg-${req.id}`,
          type: 'URGENT',
          title: 'Urgent Priority Blood Request Pending',
          message: `Request #${req.id.slice(0, 8)} needed by ${new Date(req.needed_by).toLocaleString()} is awaiting bank reservation.`,
          timestamp: req.created_at,
          actionLabel: 'View Request',
          actionTab: 'requests',
          requestId: req.id,
        });
      }
    }

    // 2. Fulfillment alerts
    if (req.fulfillments && Array.isArray(req.fulfillments)) {
      req.fulfillments.forEach((ful) => {
        if (ful.status === 'DISPATCHED') {
          notificationsList.push({
            id: `ful-${ful.id}`,
            type: 'DISPATCH',
            title: 'Cold-Chain Delivery In Transit',
            message: `Dispatch #${ful.id.slice(0, 8)} from ${ful.blood_bank_name || 'Blood Bank'} is en route for Request #${req.id.slice(0, 8)}.`,
            timestamp: ful.created_at,
            actionLabel: 'Confirm Receipt',
            actionTab: 'tracking',
            requestId: req.id,
          });
        } else if (ful.status === 'RECEIVED') {
          notificationsList.push({
            id: `rec-${ful.id}`,
            type: 'RECEIVED',
            title: 'Delivery Confirmed & Released to Hospital',
            message: `Fulfillment #${ful.id.slice(0, 8)} verified and released by ${ful.receiver_name || 'Authorized Staff'}.`,
            timestamp: ful.received_at || ful.created_at,
            actionLabel: 'View Audit',
            actionTab: 'tracking',
            requestId: req.id,
          });
        }
      });
    }
  });

  // 3. Emergency Appeals alerts
  appeals.forEach((app) => {
    notificationsList.push({
      id: `app-${app.id}`,
      type: 'APPEAL',
      title: `Emergency Appeal Escalated: ${app.escalation_level || 'Recorded'}`,
      message: `Emergency appeal #${app.id.slice(0, 8)} is actively seeking ${app.shortage_units} units across ${app.escalation_level} area.`,
      timestamp: app.created_at,
      actionLabel: 'Manage Appeal',
      actionTab: 'emergency',
      requestId: app.request_id,
    });
  });

  // Filter
  const filtered = notificationsList.filter((item) => {
    if (activeFilter === 'URGENT') return ['CRITICAL', 'URGENT'].includes(item.type);
    if (activeFilter === 'DISPATCHES') return ['DISPATCH', 'RECEIVED'].includes(item.type);
    if (activeFilter === 'APPEALS') return item.type === 'APPEAL';
    return true;
  });

  const getAlertBadge = (type) => {
    switch (type) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', border: '#FCA5A5', color: '#B91C1C', icon: AlertTriangle };
      case 'URGENT':
        return { bg: '#FEF3C7', border: '#FCD34D', color: '#B45309', icon: Bell };
      case 'DISPATCH':
        return { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icon: Truck };
      case 'RECEIVED':
        return { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', icon: CheckCircle2 };
      case 'APPEAL':
        return { bg: '#FFF1F2', border: '#FECDD3', color: '#BE123C', icon: Siren };
      default:
        return { bg: '#F8FAFC', border: '#E2E8F0', color: '#475569', icon: Activity };
    }
  };

  return (
    <div className="hospital-notifications-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} color="#DB3654" />
            Hospital Notifications & Fulfillment Alerts
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Real-time alerts for urgent component shortages, dispatch arrivals, and emergency appeals
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Alerts (${notificationsList.length})` },
            { id: 'URGENT', label: 'Urgent & Critical' },
            { id: 'DISPATCHES', label: 'Dispatches' },
            { id: 'APPEALS', label: 'Emergency Appeals' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveFilter(pill.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: activeFilter === pill.id ? '1px solid #DB3654' : '1px solid #D1D5DB',
                backgroundColor: activeFilter === pill.id ? '#DB3654' : '#FFFFFF',
                color: activeFilter === pill.id ? '#FFFFFF' : '#4B5563',
                transition: 'all 0.15s ease',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          borderRadius: 12,
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          fontSize: 13,
        }}
      >
        <ShieldCheck size={20} style={{ flexShrink: 0, color: '#059669' }} />
        <div>
          <strong>Privacy Assured:</strong> BloodBridge hospital alerts transmit only verified institutional routing
          information and blood component types. Personal patient identifiers and sensitive medical history are never
          included in broadcast alerts.
        </div>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E8ECF2',
            padding: 48,
            textAlign: 'center',
          }}
        >
          <Inbox size={40} color="#9CA3AF" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1D3043', margin: '0 0 6px 0' }}>
            No notifications in this filter
          </h3>
          <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
            New alerts will appear automatically when reservations, dispatches, or emergency escalations occur.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item) => {
            const badge = getAlertBadge(item.type);
            const Icon = badge.icon;
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: `1px solid ${badge.border}`,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: '1 1 320px' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: badge.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={badge.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1D3043' }}>
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#4B5563', margin: '4px 0 0 0' }}>
                      {item.message}
                    </p>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: 'inline-block' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {item.actionLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.requestId && item.actionTab === 'requests') {
                        onSelectRequest(item.requestId);
                      } else if (item.actionTab) {
                        onNavigate(item.actionTab);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: badge.color,
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
