import React from 'react';

export function CampStatusBadge({ status }) {
  const normalized = (status || 'DRAFT').toUpperCase();

  const styles = {
    APPROVED: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'Approved' },
    PENDING: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'Pending Approval' },
    DRAFT: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Draft' },
    REJECTED: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'Rejected' },
    CANCELLED: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'Cancelled' },
    COMPLETED: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', label: 'Completed' },
  };

  const current = styles[normalized] || styles.DRAFT;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
      }}
    >
      {current.label}
    </span>
  );
}
