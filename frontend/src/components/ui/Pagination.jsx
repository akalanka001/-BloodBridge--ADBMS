import React from 'react';

export function Pagination({ page = 1, pageSize = 10, total = 0, onPageChange, onPageSizeChange, loading = false }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(1, Math.min(page, pages));
  return <nav className="bb-pagination" aria-label="Pagination">
    <span aria-live="polite">{total ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} of ${total.toLocaleString()}` : '0 results'}</span>
    <div className="bb-pagination-controls">
      {onPageSizeChange && <label>Per page <select aria-label="Results per page" value={pageSize} disabled={loading} onChange={e => onPageSizeChange(Number(e.target.value))}>
        {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>}
      <button type="button" className="btn outline small" aria-label="Previous page" disabled={current <= 1 || loading} onClick={() => onPageChange(current - 1)}>Previous</button>
      <span>Page {current} of {pages}</span>
      <button type="button" className="btn outline small" aria-label="Next page" disabled={current >= pages || loading} onClick={() => onPageChange(current + 1)}>Next</button>
    </div>
  </nav>;
}
