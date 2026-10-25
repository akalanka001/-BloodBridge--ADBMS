import React from 'react';
import { Bell, AlertTriangle, CalendarDays, Check, Info } from 'lucide-react';

export function NotificationCard({ notification, onMarkRead }) {
  const isUnread = notification.status === 'UNREAD';
  const isEmergency = notification.priority === 'EMERGENCY' || notification.category === 'EMERGENCY';

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: isUnread ? '#fff5f5' : '#ffffff',
        borderRadius: '10px',
        border: isEmergency ? '2px solid #ef4444' : isUnread ? '1px solid #fecaca' : '1px solid #e2e8f0',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'background-color 0.2s',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: isEmergency ? '#fee2e2' : isUnread ? '#ffe4e6' : '#f1f5f9',
          color: isEmergency ? '#dc2626' : isUnread ? '#e11d48' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isEmergency ? (
          <AlertTriangle size={20} />
        ) : notification.category === 'CAMP' ? (
          <CalendarDays size={20} />
        ) : (
          <Bell size={20} />
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: isUnread ? 700 : 600, color: '#0f172a', fontSize: '0.95rem' }}>
              {notification.title || 'BloodBridge Notification'}
            </span>
            {isEmergency && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                EMERGENCY
              </span>
            )}
            <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
              {notification.category || 'GENERAL'}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {new Date(notification.created_at).toLocaleString('en-LK', {
              dateStyle: 'short',
              timeStyle: 'short',
              timeZone: 'Asia/Colombo',
            })}
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.875rem', color: isUnread ? '#334155' : '#64748b', lineHeight: 1.45 }}>
          {notification.message}
        </p>

        {notification.camp_title && (
          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
            Associated Camp: {notification.camp_title}
          </span>
        )}
      </div>

      {isUnread && onMarkRead && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          title="Mark as read"
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}
