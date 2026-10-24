import React, { useState } from 'react';
import { Clock, AlertTriangle, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

export function ExpiryAlertsPage({
  alerts = [],
  loading = false,
  onRefresh = () => {},
  onDiscardUnit = () => {},
}) {
  const [filter, setFilter] = useState('ALL');

  const filtered = alerts.filter((item) => {
    if (filter === 'CRITICAL') return item.alert_urgency === 'CRITICAL';
    if (filter === 'WARNING') return item.alert_urgency === 'WARNING';
    if (filter === 'EXPIRED') return item.alert_urgency === 'EXPIRED';
    return true;
  });

  const criticalCount = alerts.filter((a) => a.alert_urgency === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.alert_urgency === 'WARNING').length;
  const expiredCount = alerts.filter((a) => a.alert_urgency === 'EXPIRED').length;

  return (
    <div className="expiry-alerts-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={24} color="#D49A36" />
            Component Expiry Alerts & Watch
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            First-expiring inventory review to minimize wastage and guarantee clinical safety
          </span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Alerts (${alerts.length})` },
            { id: 'CRITICAL', label: `Critical <=48h (${criticalCount})` },
            { id: 'WARNING', label: `Warning <=7d (${warningCount})` },
            { id: 'EXPIRED', label: `Expired (${expiredCount})` },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: filter === pill.id ? '1px solid #D49A36' : '1px solid #D1D5DB',
                backgroundColor: filter === pill.id ? '#D49A36' : '#FFFFFF',
                color: filter === pill.id ? '#FFFFFF' : '#4B5563',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safety Notice */}
      <div
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: '#92400E',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
        }}
      >
        <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
        <div>
          <strong>Quality Protocol:</strong> In accordance with NBTS cold-chain regulations, component units within 48 hours
          of expiry are prioritized for routine compatibility cross-matches or inter-bank cluster transfers before expiration.
        </div>
      </div>

      {/* Alerts Table */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E8ECF2',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>UNIT ID</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>BLOOD GROUP</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>COMPONENT</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>EXPIRY DATE & TIME</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>TIME REMAINING</th>
                <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>SEVERITY</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                    No component units found under this expiry filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isCritical = item.alert_urgency === 'CRITICAL';
                  const isExpired = item.alert_urgency === 'EXPIRED';
                  const badgeColor = isExpired ? '#DC2626' : isCritical ? '#D97706' : '#2563EB';
                  const badgeBg = isExpired ? '#FEE2E2' : isCritical ? '#FEF3C7' : '#EFF6FF';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                        #{item.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: '#FFF0F2',
                            color: '#DB3654',
                            fontWeight: 800,
                            fontSize: 12,
                            padding: '3px 9px',
                            borderRadius: 8,
                          }}
                        >
                          {item.blood_type_code}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
                        {item.component_code} ({item.volume_ml || 450}ml)
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#4B5563' }}>
                        {new Date(item.expires_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: badgeColor }}>
                        {isExpired ? 'EXPIRED' : `${item.days_left} day${item.days_left === 1 ? '' : 's'} (${item.hours_left}h left)`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {item.alert_urgency}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
