import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { Pagination } from '../../../components/ui/Pagination.jsx';

const ledgers = {
  donors: { title: 'All donor records', note: 'Includes online and staff-assisted walk-in records. Contact details and identity hashes are excluded.', fields: ['full_name', 'registration_origin', 'has_online_account', 'blood_type_code', 'district_name', 'donation_count'] },
  requests: { title: 'Blood requests', fields: ['hospital_name', 'urgency', 'status', 'needed_by', 'item_count', 'requested_units'] },
  inventory: { title: 'Component stock units', fields: ['blood_bank_name', 'blood_type_code', 'component_code', 'release_status', 'inventory_status', 'expires_at'] },
  reservations: { title: 'Stock reservations', fields: ['blood_bank_name', 'request_item_id', 'blood_unit_id', 'status', 'created_at'] },
  transfers: { title: 'Inter-bank transfers', fields: ['source_bank', 'destination_bank', 'status', 'unit_count', 'created_at'] },
  fulfillments: { title: 'Request fulfillments', fields: ['blood_bank_name', 'request_id', 'status', 'received_at', 'received_quantity'] },
  donations: { title: 'Collection history', fields: ['blood_bank_name', 'donor_id', 'collected_at', 'collected_volume_ml', 'process_status'] },
  visits: { title: 'Donor visits', fields: ['blood_bank_name', 'donor_id', 'camp_id', 'status', 'created_at'] },
  movements: { title: 'Inventory activity', fields: ['blood_bank_name', 'blood_unit_id', 'from_status', 'to_status', 'action', 'created_at'] },
  appeals: { title: 'Emergency appeals', fields: ['hospital_name', 'request_id', 'blood_type_code', 'component_code', 'status'] },
  'request-items': { title: 'Requested components', fields: ['hospital_name', 'request_id', 'blood_type_code', 'component_code', 'units_requested', 'status'] },
  matches: { title: 'Potential donor matches', fields: ['request_id', 'request_item_id', 'donor_id', 'status', 'created_at'] },
  registrations: { title: 'Camp participation', fields: ['camp_title', 'camp_id', 'donor_id', 'status', 'created_at'] },
  organizers: { title: 'Camp organizers', fields: ['name', 'is_verified'] },
  assessments: { title: 'Assessment status history', fields: ['donor_id', 'visit_id', 'status', 'assessed_at'] },
  invitations: { title: 'Staff invitation history', fields: ['role', 'institution_name', 'status', 'expires_at', 'accepted_at'] },
};
const related = { requests: ['requests', 'request-items', 'matches'], visits: ['visits', 'assessments'], registrations: ['registrations', 'organizers'] };
const label = (name) => name.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
const value = (name, val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (name.endsWith('_at') || name === 'needed_by') {
    const date = new Date(val);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });
  }
  return String(val);
};

export function AdministrativeLedger({ token, dataset }) {
  const [view, setView] = useState(dataset);
  const config = ledgers[view];
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const params = new URLSearchParams({ limit: pageSize, offset: (page - 1) * pageSize, search: query });
    api(`/admin/${view === 'donors' ? 'donors' : `operations/${view}`}?${params}`, {}, token)
      .then((res) => { if (active) { setRows(res.data || []); setTotal(res.pagination?.total || 0); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, view, query, page, pageSize, revision]);
  if (!config) return <p role="alert">Dataset unavailable.</p>;
  return <section className="dash-card" style={{ padding: 20, minWidth: 0 }}>
    <div className="page-header-row"><div><h2 className="page-heading">{config.title}</h2>
      <p className="page-subheading">{config.note || 'Administrative oversight of synthetic prototype records. Open a record to see linked references.'}</p></div>
      <button className="btn outline" type="button" onClick={() => setRevision((n) => n + 1)}>Refresh</button>
    </div>
    {related[dataset] && <label className="form-label">Related records <select className="form-control" value={view} onChange={(e) => { setView(e.target.value); setPage(1); setSearch(''); }}>
      {related[dataset].map((id) => <option key={id} value={id}>{ledgers[id].title}</option>)}
    </select></label>}
    <label className="form-label" htmlFor={`ledger-${dataset}`}>Search {config.title.toLowerCase()}</label>
    <input id={`ledger-${dataset}`} className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records, status or institution" />
    {error ? <p role="alert" className="notice error">{error}</p> : loading ? <p role="status">Loading records…</p> : <>
      {rows.length === 0 ? <p>No records match these filters.</p> : <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><caption className="sr-only">{config.title}</caption>
          <thead><tr>{config.fields.map((field) => <th key={field} style={{ padding: 10 }}>{label(field)}</th>)}<th style={{ padding: 10 }}>Record</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>{config.fields.map((field) => <td key={field} style={{ padding: 10, borderBottom: '1px solid #E8ECF2', overflowWrap: 'anywhere', maxWidth: 230 }}>{value(field, row[field])}</td>)}
            <td style={{ padding: 10 }}><details><summary>Details</summary><dl>{Object.entries(row).map(([field, val]) => <React.Fragment key={field}><dt style={{ fontWeight: 600 }}>{label(field)}</dt><dd style={{ margin: '0 0 8px', overflowWrap: 'anywhere' }}>{value(field, val)}</dd></React.Fragment>)}</dl></details></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </>}
  </section>;
}
