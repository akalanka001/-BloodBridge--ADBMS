import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Activity,
  Send,
  Plus,
  Building,
  Users,
  Search,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export function HospitalPortal({ token, userHospitalId = 1, showNewForm = false, onCloseForm = () => {}, activeTab = 'overview' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openForm, setOpenForm] = useState(showNewForm);

  // Smooth scroll to target section when activeTab changes
  useEffect(() => {
    if (!activeTab || activeTab === 'overview') {
      const mainArea = document.querySelector('.dash-main-area');
      if (mainArea && typeof mainArea.scrollTo === 'function') {
        mainArea.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    if (activeTab === 'requests') {
      setOpenForm(true);
      const el = document.getElementById('section-hospital-requests');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (activeTab === 'donors') {
      const el = document.getElementById('section-hospital-requests');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeTab]);

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

  useEffect(() => {
    if (showNewForm) setOpenForm(true);
  }, [showNewForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api(
        '/requests',
        {
          method: 'POST',
          body: JSON.stringify({
            hospitalId: Number(userHospitalId),
            bloodTypeCode: form.bloodTypeCode,
            componentCode: form.componentCode,
            unitsRequested: Number(form.unitsRequested),
            urgency: form.urgency,
            clinicalIndication: form.clinicalIndication.trim(),
          }),
        },
        token,
      );
      setSuccess(`Emergency request created! Request ID: ${res.data.id}`);
      setOpenForm(false);
      onCloseForm();
      loadRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  // Sample or real requests formatting
  const displayRequests =
    requests.length > 0
      ? requests
      : [
          { id: 'BR-1048', blood_type_code: 'O-', component_code: 'RBC', units_requested: 3, urgency: 'CRITICAL', status: 'MATCHING' },
          { id: 'BR-1047', blood_type_code: 'A+', component_code: 'RBC', units_requested: 2, urgency: 'HIGH', status: 'IN_PROGRESS' },
          { id: 'BR-1046', blood_type_code: 'B+', component_code: 'RBC', units_requested: 4, urgency: 'ROUTINE', status: 'FULFILLED' },
          { id: 'BR-1045', blood_type_code: 'AB-', component_code: 'RBC', units_requested: 1, urgency: 'HIGH', status: 'PENDING' },
        ];

  return (
    <div className="hospital-portal-view">
      {/* Alert Notices */}
      {error && <div className="notice error" style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="notice success" style={{ marginBottom: 20 }}>{success}</div>}

      {/* 3 KPI Stat Cards matching 03-hospital-dashboard.svg */}
      <div className="dash-kpi-grid three-col" id="section-hospital-kpis">
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon pink">
              <FileText size={22} />
            </div>
            <span className="dash-kpi-label">Active requests</span>
          </div>
          <div className="dash-kpi-value">{requests.length > 0 ? requests.length : '12'}</div>
          <div className="dash-kpi-note">Across your hospital</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon yellow">
              <AlertTriangle size={22} />
            </div>
            <span className="dash-kpi-label">Critical priority</span>
          </div>
          <div className="dash-kpi-value">03</div>
          <div className="dash-kpi-note">Require prompt review</div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon green">
              <CheckCircle size={22} />
            </div>
            <span className="dash-kpi-label">Fulfilled this month</span>
          </div>
          <div className="dash-kpi-value">48</div>
          <div className="dash-kpi-note">Requests completed</div>
        </div>
      </div>

      {/* Priority Coordination Alert Banner */}
      <div className="dash-priority-banner">
        <div className="dash-priority-icon">
          <Activity size={24} />
        </div>
        <div className="dash-priority-content">
          <h3 className="dash-priority-title">Priority coordination</h3>
          <p className="dash-priority-desc">
            Three critical requests need attention. Review verified stock and potential donor leads.
          </p>
        </div>
        <button
          type="button"
          className="dash-btn-primary"
          style={{ minHeight: 42, padding: '8px 18px', fontSize: 13 }}
          onClick={() => setOpenForm((f) => !f)}
        >
          <span>{openForm ? 'Close form' : '+ New blood request'}</span>
        </button>
      </div>

      {/* New Request Modal / Collapsible Form */}
      {openForm && (
        <div className="dash-card" style={{ marginBottom: 24, border: '1px solid #FCD34D' }}>
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Submit Emergency Blood Request</h2>
              <p className="dash-card-subtitle">
                Broadcast component requirement to coordinating blood banks and cluster facilities.
              </p>
            </div>
          </div>

          <form id="form-hospital-request" onSubmit={handleSubmit} className="form-grid">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
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
            </div>

            <label style={{ marginTop: 10 }}>
              Clinical Indication *
              <input
                id="req-indication"
                required
                value={form.clinicalIndication}
                onChange={(e) => setForm({ ...form, clinicalIndication: e.target.value })}
                placeholder="e.g. Emergency trauma resuscitation"
              />
            </label>

            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <button id="btn-submit-hospital-request" type="submit" className="dash-btn-primary">
                <span>Submit Emergency Request</span>
                <Send size={16} />
              </button>
              <button
                type="button"
                className="reg-btn-outline"
                style={{ minHeight: 44, padding: '0 20px' }}
                onClick={() => setOpenForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Row 2: Recent Blood Requests & Matching Overview */}
      <div className="dash-two-col" id="section-hospital-requests">
        {/* Recent Blood Requests Table */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Recent blood requests</h2>
              <p className="dash-card-subtitle">Track status across your hospital.</p>
            </div>
            <span className="dash-pill-badge gray">View all</span>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>REQUEST ID</th>
                  <th>BLOOD TYPE</th>
                  <th>UNITS</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {displayRequests.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>
                      <strong style={{ color: '#1D3043' }}>#{r.id?.slice ? r.id.slice(0, 8) : r.id}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#FFF0F2',
                          color: '#DB3654',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '3px 10px',
                          borderRadius: 14,
                        }}
                      >
                        {r.blood_type_code}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#1D3043' }}>
                        {r.units_requested ? String(r.units_requested).padStart(2, '0') : '02'}
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 650,
                          fontSize: 12,
                          color:
                            r.urgency === 'CRITICAL'
                              ? '#DB3654'
                              : r.urgency === 'HIGH' || r.urgency === 'URGENT'
                              ? '#D9962E'
                              : '#7A8B9E',
                        }}
                      >
                        {r.urgency}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              r.status === 'FULFILLED'
                                ? '#16A085'
                                : r.status === 'MATCHING' || r.status === 'CRITICAL'
                                ? '#DB3654'
                                : '#D9962E',
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D3043' }}>
                          {r.status || 'Active'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matching Overview Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Matching overview</h2>
              <p className="dash-card-subtitle">Potential leads for active request</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span
              style={{
                background: '#FFF0F2',
                color: '#DB3654',
                fontWeight: 700,
                fontSize: 13,
                padding: '4px 14px',
                borderRadius: 16,
              }}
            >
              O-
            </span>
            <span style={{ fontSize: 13, color: '#7A8B9E' }}>Red cells | 3 units</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Matching progress</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#DB3654' }}>65%</span>
            </div>
            <div style={{ height: 10, background: '#F2E7EC', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: '#DB3654', borderRadius: 6 }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#F2F6FA',
                  color: '#DB3654',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Building size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Inventory sources</strong>
                <span style={{ fontSize: 11, color: '#7A8B9E' }}>2 facilities found in cluster</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#F2F6FA',
                  color: '#DB3654',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Potential donors</strong>
                <span style={{ fontSize: 11, color: '#7A8B9E' }}>5 candidates identified</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#F2F6FA',
                  color: '#7A8B9E',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CheckCircle size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Clinical verification</strong>
                <span style={{ fontSize: 11, color: '#7A8B9E' }}>Pending staff review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
