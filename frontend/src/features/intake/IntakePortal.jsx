import React, { useState } from 'react';
import { Search, PlusCircle, CheckCircle, FileText, Droplet } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';

export function IntakePortal({ token, userBankId = 1 }) {
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' | 'enroll' | 'visit' | 'assess' | 'collect'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState({ nationalId: '', phone: '', fullName: '' });
  const [lookupResults, setLookupResults] = useState([]);

  // Walkin enroll form state (explicit opt-in defaults to false as required)
  const [walkinForm, setWalkinForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    bloodTypeCode: '',
    districtCode: 'CO',
    allowEmergencyContact: false,
    optInCampNotifications: false,
  });

  // Visit check-in state
  const [visitForm, setVisitForm] = useState({
    donorId: '',
    bloodBankId: userBankId,
    purpose: 'DONATION',
    notes: '',
  });
  const [createdVisit, setCreatedVisit] = useState(null);

  // Clinical assessment state
  const [assessForm, setAssessForm] = useState({
    visitId: '',
    status: 'PASSED',
    hemoglobin: '14.0',
    weight: '65.0',
    systolicBp: '120',
    diastolicBp: '80',
    pulseBpm: '72',
    notes: '',
  });

  // Collection recording state
  const [collectForm, setCollectForm] = useState({
    visitId: '',
    donorId: '',
    bloodBankId: userBankId,
    bloodTypeCode: 'O+',
    collectedVolumeMl: '450',
    bagSerial: '',
  });

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setLookupResults([]);
    try {
      const res = await api('/donor-intake/lookup', {
        method: 'POST',
        body: JSON.stringify(lookupQuery),
      }, token);
      setLookupResults(res.data);
      if (res.data.length === 0) {
        setSuccess('No matching donor record found. You can proceed to enroll this visitor as a walk-in donor.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWalkinEnroll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/donor-intake/walk-ins', {
        method: 'POST',
        body: JSON.stringify({
          ...walkinForm,
          bloodBankId: Number(userBankId),
        }),
      }, token);
      setSuccess(`Walk-in donor ${res.data.full_name} enrolled successfully! Donor ID: ${res.data.id}`);
      setVisitForm((prev) => ({ ...prev, donorId: res.data.id }));
      setCollectForm((prev) => ({ ...prev, donorId: res.data.id }));
      setWalkinForm({
        fullName: '',
        phone: '',
        nationalId: '',
        bloodTypeCode: '',
        districtCode: 'CO',
        allowEmergencyContact: false,
        optInCampNotifications: false,
      });
      setActiveTab('visit');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckInVisit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/donor-intake/visits', {
        method: 'POST',
        body: JSON.stringify({
          donorId: visitForm.donorId.trim(),
          bloodBankId: Number(visitForm.bloodBankId),
          purpose: visitForm.purpose,
          notes: visitForm.notes.trim() || undefined,
        }),
      }, token);
      setCreatedVisit(res.data);
      setAssessForm((prev) => ({ ...prev, visitId: res.data.id }));
      setCollectForm((prev) => ({ ...prev, visitId: res.data.id, donorId: visitForm.donorId.trim() }));
      setSuccess(`In-person visit checked in! Visit ID: ${res.data.id}. Please proceed to clinical assessment.`);
      setActiveTab('assess');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordAssessment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api(`/donor-intake/visits/${assessForm.visitId}/assessment`, {
        method: 'POST',
        body: JSON.stringify({
          status: assessForm.status,
          hemoglobin_g_dl: assessForm.hemoglobin ? Number(assessForm.hemoglobin) : undefined,
          weight_kg: assessForm.weight ? Number(assessForm.weight) : undefined,
          systolic_bp: assessForm.systolicBp ? Number(assessForm.systolicBp) : undefined,
          diastolic_bp: assessForm.diastolicBp ? Number(assessForm.diastolicBp) : undefined,
          pulse_bpm: assessForm.pulseBpm ? Number(assessForm.pulseBpm) : undefined,
          notes: assessForm.notes.trim() || undefined,
        }),
      }, token);
      setSuccess(`Clinical assessment recorded with status: ${res.data.status}!`);
      if (res.data.status === 'PASSED') {
        setActiveTab('collect');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api('/donor-intake/collections', {
        method: 'POST',
        body: JSON.stringify({
          visitId: collectForm.visitId.trim(),
          donorId: collectForm.donorId.trim(),
          bloodBankId: Number(collectForm.bloodBankId),
          bloodTypeCode: collectForm.bloodTypeCode,
          collectedVolumeMl: Number(collectForm.collectedVolumeMl),
          bagSerial: collectForm.bagSerial.trim() || undefined,
        }),
      }, token);
      setSuccess(`Blood collection completed! Donation record ID: ${res.data.id}. Visit marked COLLECTION_COMPLETED.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="intake-portal-feature">
      <div className="sub-nav-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          id="tab-intake-lookup"
          className={activeTab === 'lookup' ? 'primary small' : 'outline small'}
          onClick={() => setActiveTab('lookup')}
        >
          Donor Search
        </button>
        <button
          id="tab-intake-enroll"
          className={activeTab === 'enroll' ? 'primary small' : 'outline small'}
          onClick={() => setActiveTab('enroll')}
        >
          Walk-in Enrollment
        </button>
        <button
          id="tab-intake-visit"
          className={activeTab === 'visit' ? 'primary small' : 'outline small'}
          onClick={() => setActiveTab('visit')}
        >
          Visit Check-in
        </button>
        <button
          id="tab-intake-assess"
          className={activeTab === 'assess' ? 'primary small' : 'outline small'}
          onClick={() => setActiveTab('assess')}
        >
          Clinical Assessment
        </button>
        <button
          id="tab-intake-collect"
          className={activeTab === 'collect' ? 'primary small' : 'outline small'}
          onClick={() => setActiveTab('collect')}
        >
          Record Collection
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      {/* 1. LOOKUP */}
      {activeTab === 'lookup' && (
        <div className="surface-card">
          <h3>Donor Lookup & Registry Search</h3>
          <p>
            Search existing records using privacy-preserving keyed HMAC before enrolling to prevent duplicate profiles.
          </p>
          <form id="form-donor-lookup" onSubmit={handleLookup} className="form-grid">
            <label>
              National ID / NIC
              <input
                id="lookup-nic"
                placeholder="NIC number (e.g. 200012345678)"
                value={lookupQuery.nationalId}
                onChange={(e) => setLookupQuery({ ...lookupQuery, nationalId: e.target.value })}
              />
            </label>
            <label>
              Phone Number
              <input
                id="lookup-phone"
                placeholder="Phone number"
                value={lookupQuery.phone}
                onChange={(e) => setLookupQuery({ ...lookupQuery, phone: e.target.value })}
              />
            </label>
            <label>
              Full Name
              <input
                id="lookup-name"
                placeholder="Name prefix or exact name"
                value={lookupQuery.fullName}
                onChange={(e) => setLookupQuery({ ...lookupQuery, fullName: e.target.value })}
              />
            </label>
            <button id="btn-donor-search" className="primary">Search Registry <Search size={16} /></button>
          </form>

          {lookupResults.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h4>Matching Donors ({lookupResults.length})</h4>
              <div className="three-grid">
                {lookupResults.map((d) => (
                  <div key={d.donor_id} className="surface-card" style={{ padding: '1rem' }}>
                    <strong>{d.full_name}</strong>
                    <p style={{ margin: '4px 0' }}>Blood: {d.blood_type_code || 'Unconfirmed'}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>Phone: {d.phone || 'None'}</p>
                    <Badge>{d.registration_origin}</Badge>
                    <button
                      className="text-link"
                      style={{ marginTop: '8px', display: 'block' }}
                      onClick={() => {
                        setVisitForm((prev) => ({ ...prev, donorId: d.donor_id }));
                        setCollectForm((prev) => ({ ...prev, donorId: d.donor_id }));
                        setActiveTab('visit');
                      }}
                    >
                      Check-in for visit →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. WALK-IN ENROLLMENT */}
      {activeTab === 'enroll' && (
        <div className="surface-card">
          <h3>Staff-Assisted Walk-in Registration</h3>
          <p>
            Enroll in-person donors without forcing account passwords. Explicit consent required for contact.
          </p>
          <form id="form-walkin-enroll" onSubmit={handleWalkinEnroll} className="form-grid">
            <label>
              Full Name *
              <input
                id="walkin-name"
                required
                value={walkinForm.fullName}
                onChange={(e) => setWalkinForm({ ...walkinForm, fullName: e.target.value })}
              />
            </label>
            <label>
              Phone Number *
              <input
                id="walkin-phone"
                required
                value={walkinForm.phone}
                onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
              />
            </label>
            <label>
              National ID / NIC
              <input
                id="walkin-nic"
                value={walkinForm.nationalId}
                onChange={(e) => setWalkinForm({ ...walkinForm, nationalId: e.target.value })}
              />
            </label>
            <label>
              Blood Group
              <select
                id="walkin-blood-type"
                value={walkinForm.bloodTypeCode}
                onChange={(e) => setWalkinForm({ ...walkinForm, bloodTypeCode: e.target.value })}
              >
                <option value="">Unknown / Lab pending</option>
                {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            {/* Explicit consent checkboxes defaulting to false */}
            <div style={{ gridColumn: '1 / -1', margin: '0.5rem 0' }}>
              <label className="toggle-row" style={{ marginBottom: '8px' }}>
                <input
                  id="walkin-consent-emergency"
                  type="checkbox"
                  checked={walkinForm.allowEmergencyContact}
                  onChange={(e) => setWalkinForm({ ...walkinForm, allowEmergencyContact: e.target.checked })}
                />
                <span>Donor explicitly consented to emergency contact outreach</span>
              </label>
              <label className="toggle-row">
                <input
                  id="walkin-consent-camps"
                  type="checkbox"
                  checked={walkinForm.optInCampNotifications}
                  onChange={(e) => setWalkinForm({ ...walkinForm, optInCampNotifications: e.target.checked })}
                />
                <span>Donor explicitly consented to nearby camp notifications</span>
              </label>
            </div>

            <button id="btn-enroll-walkin" className="primary" disabled={saving}>
              Enroll Walk-in Donor <PlusCircle size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 3. VISIT CHECK-IN */}
      {activeTab === 'visit' && (
        <div className="surface-card">
          <h3>In-Person Donor Visit Check-in</h3>
          <p>
            Log a donor visit at the blood bank. A visit is tracked separately from clinical assessment and donation collection.
          </p>
          <form id="form-visit-checkin" onSubmit={handleCheckInVisit} className="form-grid">
            <label>
              Donor UUID *
              <input
                id="visit-donor-id"
                required
                placeholder="UUID of registered donor"
                value={visitForm.donorId}
                onChange={(e) => setVisitForm({ ...visitForm, donorId: e.target.value })}
              />
            </label>
            <label>
              Visit Purpose
              <select
                id="visit-purpose"
                value={visitForm.purpose}
                onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
              >
                <option value="DONATION">Whole Blood / Component Donation</option>
                <option value="CONSULTATION">Pre-screening Consultation</option>
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Intake Notes
              <input
                id="visit-notes"
                placeholder="Optional check-in notes"
                value={visitForm.notes}
                onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              />
            </label>
            <button id="btn-checkin-visit" className="primary" disabled={saving}>
              Check-in Visit <FileText size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 4. CLINICAL ASSESSMENT */}
      {activeTab === 'assess' && (
        <div className="surface-card">
          <h3>Record Clinical Assessment</h3>
          <p>
            Assess donor fitness (hemoglobin, weight, BP). Only visits with a PASSED assessment can proceed to collection.
          </p>
          <form id="form-record-assessment" onSubmit={handleRecordAssessment} className="form-grid">
            <label>
              Visit UUID *
              <input
                id="assess-visit-id"
                required
                value={assessForm.visitId}
                onChange={(e) => setAssessForm({ ...assessForm, visitId: e.target.value })}
              />
            </label>
            <label>
              Assessment Decision *
              <select
                id="assess-status"
                value={assessForm.status}
                onChange={(e) => setAssessForm({ ...assessForm, status: e.target.value })}
              >
                <option value="PASSED">PASSED (Eligible for collection)</option>
                <option value="DEFERRED_TEMPORARY">DEFERRED_TEMPORARY</option>
                <option value="DEFERRED_PERMANENT">DEFERRED_PERMANENT</option>
                <option value="FAILED_HEALTH">FAILED_HEALTH</option>
              </select>
            </label>
            <label>
              Hemoglobin (g/dL)
              <input
                id="assess-hemoglobin"
                type="number"
                step="0.1"
                value={assessForm.hemoglobin}
                onChange={(e) => setAssessForm({ ...assessForm, hemoglobin: e.target.value })}
              />
            </label>
            <label>
              Weight (kg)
              <input
                id="assess-weight"
                type="number"
                step="0.1"
                value={assessForm.weight}
                onChange={(e) => setAssessForm({ ...assessForm, weight: e.target.value })}
              />
            </label>
            <label>
              Blood Pressure (Sys / Dia)
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  id="assess-systolic"
                  placeholder="Sys"
                  value={assessForm.systolicBp}
                  onChange={(e) => setAssessForm({ ...assessForm, systolicBp: e.target.value })}
                />
                <input
                  id="assess-diastolic"
                  placeholder="Dia"
                  value={assessForm.diastolicBp}
                  onChange={(e) => setAssessForm({ ...assessForm, diastolicBp: e.target.value })}
                />
              </div>
            </label>
            <label>
              Pulse (BPM)
              <input
                id="assess-pulse"
                type="number"
                value={assessForm.pulseBpm}
                onChange={(e) => setAssessForm({ ...assessForm, pulseBpm: e.target.value })}
              />
            </label>
            <button id="btn-save-assessment" className="primary" disabled={saving}>
              Save Assessment <CheckCircle size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 5. COLLECTION RECORDING */}
      {activeTab === 'collect' && (
        <div className="surface-card">
          <h3>Record Blood Donation Collection</h3>
          <p>
            Collect donation and advance visit status to COLLECTION_COMPLETED. Protected by DB-level unique constraint on visit_id.
          </p>
          <form id="form-record-collection" onSubmit={handleRecordCollection} className="form-grid">
            <label>
              Visit UUID *
              <input
                id="collect-visit-id"
                required
                value={collectForm.visitId}
                onChange={(e) => setCollectForm({ ...collectForm, visitId: e.target.value })}
              />
            </label>
            <label>
              Donor UUID *
              <input
                id="collect-donor-id"
                required
                value={collectForm.donorId}
                onChange={(e) => setCollectForm({ ...collectForm, donorId: e.target.value })}
              />
            </label>
            <label>
              Confirmed Blood Group *
              <select
                id="collect-blood-type"
                value={collectForm.bloodTypeCode}
                onChange={(e) => setCollectForm({ ...collectForm, bloodTypeCode: e.target.value })}
              >
                {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Volume Collected (mL) *
              <input
                id="collect-volume"
                type="number"
                value={collectForm.collectedVolumeMl}
                onChange={(e) => setCollectForm({ ...collectForm, collectedVolumeMl: e.target.value })}
              />
            </label>
            <label>
              Blood Bag Serial Number
              <input
                id="collect-bag-serial"
                placeholder="e.g. BAG-2026-9901"
                value={collectForm.bagSerial}
                onChange={(e) => setCollectForm({ ...collectForm, bagSerial: e.target.value })}
              />
            </label>
            <button id="btn-save-collection" className="primary" disabled={saving}>
              Record Collection Event <Droplet size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
