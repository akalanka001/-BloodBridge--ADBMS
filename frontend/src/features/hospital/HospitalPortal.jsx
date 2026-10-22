import React, { useState, useEffect } from 'react';
import { Hospital, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';

export function HospitalPortal({ token, userHospitalId = 1 }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    bloodTypeCode: 'O+',
    componentCode: 'RBC',
    unitsRequested: '2',
    urgency: 'CRITICAL',
    clinicalIndication: 'Emergency trauma resuscitation',
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api('/requests', {}, token);
      setRequests(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRequests();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api('/requests', {
        method: 'POST',
        body: JSON.stringify({
          hospitalId: Number(userHospitalId),
          bloodTypeCode: form.bloodTypeCode,
          componentCode: form.componentCode,
          unitsRequested: Number(form.unitsRequested),
          urgency: form.urgency,
          clinicalIndication: form.clinicalIndication.trim(),
        }),
      }, token);
      setSuccess(`Emergency request created! Request ID: ${res.data.id}`);
      loadRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="hospital-portal-feature">
      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      <div className="surface-card" style={{ marginBottom: '1.5rem' }}>
        <h3>Submit Emergency Blood Request</h3>
        <p>
          Broadcast urgent component requirement to coordinating blood banks and cluster facilities.
        </p>
        <form id="form-hospital-request" onSubmit={handleSubmit} className="form-grid">
          <label>
            Blood Type *
            <select
              id="req-blood-type"
              value={form.bloodTypeCode}
              onChange={(e) => setForm({ ...form, bloodTypeCode: e.target.value })}
            >
              {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Component Code *
            <select
              id="req-component"
              value={form.componentCode}
              onChange={(e) => setForm({ ...form, componentCode: e.target.value })}
            >
              <option value="RBC">Red Blood Cells (RBC)</option>
              <option value="WB">Whole Blood (WB)</option>
              <option value="PLT">Platelets (PLT)</option>
              <option value="FFP">Fresh Frozen Plasma (FFP)</option>
              <option value="CRYO">Cryoprecipitate (CRYO)</option>
            </select>
          </label>
          <label>
            Units Requested *
            <input
              id="req-units"
              type="number"
              min="1"
              max="20"
              value={form.unitsRequested}
              onChange={(e) => setForm({ ...form, unitsRequested: e.target.value })}
            />
          </label>
          <label>
            Urgency Level *
            <select
              id="req-urgency"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            >
              <option value="CRITICAL">CRITICAL (Immediate transfusion)</option>
              <option value="URGENT">URGENT (Within 4 hours)</option>
              <option value="ROUTINE">ROUTINE (Elective / Scheduled)</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Clinical Indication *
            <input
              id="req-indication"
              required
              value={form.clinicalIndication}
              onChange={(e) => setForm({ ...form, clinicalIndication: e.target.value })}
            />
          </label>
          <button id="btn-submit-hospital-request" className="primary">
            Submit Request <Send size={16} />
          </button>
        </form>
      </div>

      <div className="surface-card">
        <h3>Hospital Blood Requests Status</h3>
        {loading ? (
          <p>Loading requests…</p>
        ) : requests.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>Component</th>
                  <th style={{ padding: '8px' }}>Units</th>
                  <th style={{ padding: '8px' }}>Urgency</th>
                  <th style={{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{r.blood_type_code} {r.component_code}</td>
                    <td style={{ padding: '8px' }}>{r.units_requested}</td>
                    <td style={{ padding: '8px' }}>
                      <Badge>{r.urgency}</Badge>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <Badge>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No active hospital blood requests.</p>
        )}
      </div>
    </div>
  );
}
