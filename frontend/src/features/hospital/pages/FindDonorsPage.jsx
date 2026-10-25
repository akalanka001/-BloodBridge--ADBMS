import React, { useEffect, useState } from 'react';
import { GeoSelector } from '../../../components/forms/GeoSelector.jsx';
import { hospitalApi } from '../api/hospitalApi.js';
import { useHospitalState } from '../useHospitalState.js';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export function FindDonorsPage({ token, hospital, selectedRequest = null, onInitiateAppeal = () => {} }) {
  const [filters, setFilters] = useHospitalState('candidates', null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const area = filters || {
    bloodTypeCode: selectedRequest?.items_json?.[0]?.bloodTypeCode || '',
    provinceCode: hospital?.provinceCode || '', districtCode: hospital?.districtCode || '',
    dsCode: hospital?.dsCode || '', gnCode: hospital?.gnCode || '', requestItemId: '',
  };
  const selectedItem = selectedRequest?.items_json?.find(item => item.itemId === area.requestItemId);
  const bloodTypeCode = selectedItem?.bloodTypeCode || area.bloodTypeCode;
  const update = changes => setFilters({ ...area, ...changes });

  useEffect(() => {
    if (!hospital?.hospitalId || !bloodTypeCode) { setResult(null); return; }
    let active = true;
    setLoading(true); setError(''); setResult(null);
    hospitalApi.getDonorCandidates({
      ...area, bloodTypeCode, hospitalId: hospital.hospitalId,
      requestId: selectedItem ? selectedRequest.id : '', requestItemId: selectedItem?.itemId || '',
    }, token).then(response => { if (active) setResult(response.data); })
      .catch(err => { if (active) setError(err.message || 'Candidate search unavailable'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, hospital?.hospitalId, bloodTypeCode, area.provinceCode, area.districtCode, area.dsCode, area.gnCode, selectedItem?.itemId, revision]);

  return (
    <section className="hospital-find-donors" aria-labelledby="candidate-heading">
      <h2 id="candidate-heading">Find potential donor candidates</h2>
      <p>Aggregated outreach counts only. Candidates require staff assessment; these counts do not indicate medical clearance or component compatibility.</p>
      <div className="dash-card" style={{ padding: 20 }}>
        {hospital && <p>Assigned institution: <strong>{hospital.hospitalName}</strong>. Initial area: {hospital.districtName || hospital.districtCode}{hospital.dsName ? ` · ${hospital.dsName}` : ''}. You can broaden the search.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 16 }}>
          <label>Blood group
            <select aria-label="Candidate blood group" value={bloodTypeCode || ''} disabled={Boolean(selectedItem)} onChange={event => update({ bloodTypeCode: event.target.value })}>
              <option value="">Choose a known blood group</option>
              {BLOOD_GROUPS.map(group => <option key={group}>{group}</option>)}
            </select>
          </label>
          {selectedRequest && <label>Request item
            <select aria-label="Candidate request item" value={area.requestItemId || ''} onChange={event => update({ requestItemId: event.target.value })}>
              <option value="">Independent blood group search</option>
              {(selectedRequest.items_json || []).map(item => <option key={item.itemId} value={item.itemId}>{item.bloodTypeCode} · {item.componentCode} · {item.unitsRequested} units</option>)}
            </select>
          </label>}
        </div>
        <div style={{ marginTop: 16 }}><GeoSelector value={area} onChange={geo => update(geo)} /></div>
        <button className="btn outline" type="button" onClick={() => setFilters({ bloodTypeCode: '', provinceCode: '', districtCode: '', dsCode: '', gnCode: '', requestItemId: '' })} style={{ marginTop: 16 }}>Clear filters</button>
      </div>
      <div style={{ marginTop: 20 }} aria-live="polite" aria-busy={loading}>
        {loading ? <p>Checking potential candidates…</p> : error ? <div role="alert" className="notice error">{error}<button type="button" onClick={() => setRevision(value => value + 1)}>Retry search</button></div> : !bloodTypeCode ? <p>Choose a blood group to search automatically.</p> : result ? <div className="dash-card" style={{ padding: 20 }}>
          <h3>Potential donor candidates</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)' }}>{result.candidateCount}</p>
          <p>Applied area: {[result.appliedFilters.provinceCode, result.appliedFilters.districtCode, result.appliedFilters.dsCode, result.appliedFilters.gnCode].filter(Boolean).join(' → ') || 'All seeded areas'} · Blood group {result.appliedFilters.bloodTypeCode}</p>
          {result.requestItem && <p>Selected item: {result.requestItem.componentCode} · {result.requestItem.unitsRequested} requested units.</p>}
          <p>{result.definition}</p>
          <p>Queried {new Date(result.queriedAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</p>
          {result.candidateCount === 0 && <p>Broaden the area or review the selected blood group. Outreach permissions remain required.</p>}
          <button type="button" className="btn primary" onClick={() => onInitiateAppeal(selectedRequest, selectedItem)}>Open request appeals</button>
          <p>No outreach is sent by this search. Appeal history shows persisted outcomes.</p>
        </div> : null}
      </div>
    </section>
  );
}
