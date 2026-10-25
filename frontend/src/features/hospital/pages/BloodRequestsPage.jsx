import React, { useState } from 'react';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { RequestUrgencyBadge, RequestStatusBadge } from '../components/RequestStatusBadge.jsx';

export const EMPTY_REQUEST_FILTERS = { search: '', status: '', urgency: '', bloodTypeCode: '', componentCode: '' };

export function BloodRequestsPage({
  requests = [], loading = false, error = '', filters = EMPTY_REQUEST_FILTERS, onFiltersChange = () => {},
  pagination = { total: 0, limit: 10, offset: 0 }, onPageChange = () => {}, onPageSizeChange = () => {},
  onRefresh = () => {}, onSelectRequest = () => {}, onCancelRequest = () => {}, onNewRequest = () => {},
}) {
  const [cancelId, setCancelId] = useState(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const update = (key, value) => onFiltersChange({ ...filters, [key]: value });
  const fields = [
    ['status', 'Status', [['OPEN', 'Open'], ['PARTIALLY_FILLED', 'Partially filled'], ['FULFILLED', 'Fulfilled'], ['CANCELLED', 'Cancelled']]],
    ['urgency', 'Urgency', [['CRITICAL', 'Critical'], ['URGENT', 'Urgent'], ['ROUTINE', 'Routine']]],
    ['bloodTypeCode', 'Blood group', ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(value => [value, value])],
    ['componentCode', 'Component', [['RBC', 'Red cells'], ['PLASMA', 'Plasma'], ['PLATELETS', 'Platelets']]],
  ];
  return <section aria-labelledby="requests-heading">
    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 20 }}>
      <div><h2 id="requests-heading">Blood requests</h2><p>Requests assigned to your institution, with component quantities and current progress.</p></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="btn outline" onClick={onRefresh}>Refresh</button><button type="button" className="btn primary" onClick={onNewRequest}>New request</button></div>
    </div>
    <div className="dash-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12 }}>
        <label>Search requests<input aria-label="Search requests" type="search" value={filters.search} onChange={event => update('search', event.target.value)} placeholder="Request ID or notes" /></label>
        {fields.map(([key, label, options]) => <label key={key}>{label}<select value={filters[key]} onChange={event => update(key, event.target.value)}><option value="">All {label.toLowerCase()}s</option>{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}
      </div>
      <button type="button" className="btn outline" onClick={() => onFiltersChange(EMPTY_REQUEST_FILTERS)} style={{ marginTop: 12 }}>Clear filters</button>
    </div>
    {error ? <div role="alert" className="notice error">{error}<button type="button" onClick={onRefresh}>Retry</button></div> : loading ? <p role="status">Loading requests…</p> : <div className="dash-card" style={{ padding: 16 }}>
      {requests.length === 0 ? <p>No requests match these filters.</p> : <div role="region" aria-label="Blood requests" tabIndex={0} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{['Request', 'Components / groups', 'Units', 'Urgency', 'Status', 'Needed by', 'Actions'].map(title => <th key={title} scope="col" style={{ padding: 12 }}>{title}</th>)}</tr></thead>
          <tbody>{requests.map(request => <tr key={request.id} style={{ borderTop: '1px solid var(--line)' }}>
            <td style={{ padding: 12 }}>#{String(request.id).slice(0, 8)}</td>
            <td style={{ padding: 12 }}>{(request.items_json || []).map(item => <div key={item.itemId || `${item.bloodTypeCode}-${item.componentCode}`}>{item.bloodTypeCode} · {item.componentCode} · {item.unitsRequested} units</div>)}</td>
            <td style={{ padding: 12 }}>{request.total_requested_units ?? 'Unavailable'}</td>
            <td style={{ padding: 12 }}><RequestUrgencyBadge urgency={request.urgency} /></td>
            <td style={{ padding: 12 }}><RequestStatusBadge status={request.status} /></td>
            <td style={{ padding: 12 }}>{request.needed_by ? new Date(request.needed_by).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'short', timeStyle: 'short' }) : 'Unavailable'}</td>
            <td style={{ padding: 12 }}><button type="button" className="btn outline small" onClick={() => onSelectRequest(request.id)}>Details</button>{['OPEN', 'PARTIALLY_FILLED'].includes(request.status) && <button type="button" className="btn outline small" onClick={() => { setCancelId(request.id); setReason(''); }}>Cancel</button>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <Pagination page={Math.floor(pagination.offset / pagination.limit) + 1} pageSize={pagination.limit} total={pagination.total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </div>}
    {cancelId && <div role="dialog" aria-modal="true" aria-labelledby="cancel-request-heading" className="modal-overlay" style={{ position: 'fixed', inset: 0, background: '#14243a88', zIndex: 1200, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="dash-card" style={{ padding: 24, width: 'min(480px, 100%)' }}><h3 id="cancel-request-heading">Cancel blood request</h3><p>Active reservations will be released. Enter a coordination reason without patient details.</p><label>Reason<textarea autoFocus value={reason} onChange={event => setReason(event.target.value)} maxLength={500} /></label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}><button type="button" className="btn outline" disabled={cancelling} onClick={() => setCancelId(null)}>Keep request</button><button type="button" className="btn primary" disabled={cancelling || !reason.trim()} onClick={async () => { setCancelling(true); try { if (await onCancelRequest(cancelId, reason)) setCancelId(null); } finally { setCancelling(false); } }}>Confirm cancellation</button></div></div>
    </div>}
  </section>;
}
