import React from 'react';

export function RequestStatusBadge({ status }) {
  const styles = {
    OPEN: { bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB', label: 'Open' },
    PARTIALLY_FILLED: { bg: '#FFFBEB', color: '#B45309', dot: '#D97706', label: 'Partially Filled' },
    FULFILLED: { bg: '#ECFDF5', color: '#047857', dot: '#059669', label: 'Fulfilled' },
    CANCELLED: { bg: '#F3F4F6', color: '#4B5563', dot: '#9CA3AF', label: 'Cancelled' },
    DISPATCHED: { bg: '#F5F3FF', color: '#6D28D9', dot: '#7C3AED', label: 'Dispatched' },
    RECEIVED: { bg: '#ECFDF5', color: '#047857', dot: '#059669', label: 'Received' },
  };

  const current = styles[status] || {
    bg: '#F3F4F6',
    color: '#4B5563',
    dot: '#9CA3AF',
    label: status || 'Unknown',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: current.dot,
        }}
      />
      {current.label}
    </span>
  );
}

export function RequestUrgencyBadge({ urgency }) {
  const styles = {
    CRITICAL: { bg: '#FFF0F2', color: '#DB3654', label: 'Critical' },
    URGENT: { bg: '#FFF4E3', color: '#D9962E', label: 'Urgent' },
    ROUTINE: { bg: '#F3F6F8', color: '#7A8B9E', label: 'Routine' },
  };

  const current = styles[urgency] || {
    bg: '#F3F6F8',
    color: '#7A8B9E',
    label: urgency || 'Normal',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: current.bg,
        color: current.color,
      }}
    >
      {current.label}
    </span>
  );
}

export function BloodTypeBadge({ bloodType }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: '#FFF0F2',
        color: '#DB3654',
        border: '1px solid #FFE2E8',
      }}
    >
      {bloodType}
    </span>
  );
}
