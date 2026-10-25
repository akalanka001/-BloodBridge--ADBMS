import React, { useState } from 'react';
import { Search, UserPlus, ClipboardCheck, Stethoscope, HeartPulse } from 'lucide-react';
import { api } from '../../lib/api.js';
import { DonorLookupForm } from './components/DonorLookupForm.jsx';
import { WalkInRegistrationForm } from './components/WalkInRegistrationForm.jsx';
import { VisitCheckInForm } from './components/VisitCheckInForm.jsx';
import { AssessmentForm } from './components/AssessmentForm.jsx';
import { CollectionForm } from './components/CollectionForm.jsx';

export function IntakePortal({ token, userBankId, initialTab = 'lookup' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [activeVisitId, setActiveVisitId] = useState('');
  const [activeDonorId, setActiveDonorId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchronize initialTab if provided
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleLookup = async (query) => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/donor-intake/lookup', {
        method: 'POST',
        body: JSON.stringify(query),
      }, token);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleWalkinEnroll = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/donor-intake/walk-ins', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      setSelectedDonor(res.data);
      setActiveDonorId(res.data.id);
      setActiveTab('visit');
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (data) => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/donor-intake/visits', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      setActiveVisitId(res.data.id);
      setActiveDonorId(data.donorId);
      setActiveTab('assess');
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleAssess = async (visitId, data) => {
    setLoading(true);
    setError('');
    try {
      // Use standard plural /assessments endpoint
      const res = await api(`/donor-intake/visits/${visitId}/assessments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      if (res.data.status === 'PASSED') {
        setActiveTab('collect');
      }
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async (data) => {
    setLoading(true);
    setError('');
    try {
      // Use standard plural /donations endpoint
      const res = await api('/donor-intake/donations', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (!userBankId) return <div className="bb-empty" role="alert">Select an assigned blood bank before recording donor intake activity.</div>;

  return (
    <div className="intake-portal-feature" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Navigation Sub-Tabs */}
      <div
        className="sub-nav-tabs"
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          background: '#F1F5F9',
          padding: 6,
          borderRadius: 12,
        }}
      >
        <button
          id="tab-intake-lookup"
          type="button"
          onClick={() => setActiveTab('lookup')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'lookup' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'lookup' ? '#1D3043' : '#64748B',
            boxShadow: activeTab === 'lookup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Search size={15} /> Donor Search
        </button>

        <button
          id="tab-intake-enroll"
          type="button"
          onClick={() => setActiveTab('enroll')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'enroll' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'enroll' ? '#1D3043' : '#64748B',
            boxShadow: activeTab === 'enroll' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <UserPlus size={15} /> Walk-in Enrollment
        </button>

        <button
          id="tab-intake-visit"
          type="button"
          onClick={() => setActiveTab('visit')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'visit' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'visit' ? '#1D3043' : '#64748B',
            boxShadow: activeTab === 'visit' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ClipboardCheck size={15} /> Visit Check-in
        </button>

        <button
          id="tab-intake-assess"
          type="button"
          onClick={() => setActiveTab('assess')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'assess' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'assess' ? '#1D3043' : '#64748B',
            boxShadow: activeTab === 'assess' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Stethoscope size={15} /> Clinical Assessment
        </button>

        <button
          id="tab-intake-collect"
          type="button"
          onClick={() => setActiveTab('collect')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'collect' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'collect' ? '#1D3043' : '#64748B',
            boxShadow: activeTab === 'collect' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <HeartPulse size={15} /> Record Collection
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'lookup' && (
        <DonorLookupForm
          onLookup={handleLookup}
          onSelectDonor={(donor) => {
            setSelectedDonor(donor);
            setActiveDonorId(donor.donor_id || donor.id);
            setActiveTab('visit');
          }}
          loading={loading}
        />
      )}

      {activeTab === 'enroll' && (
        <WalkInRegistrationForm
          userBankId={userBankId}
          onRegister={handleWalkinEnroll}
          loading={loading}
        />
      )}

      {activeTab === 'visit' && (
        <VisitCheckInForm
          userBankId={userBankId}
          initialDonorId={activeDonorId}
          onCheckIn={handleCheckIn}
          loading={loading}
        />
      )}

      {activeTab === 'assess' && (
        <AssessmentForm
          initialVisitId={activeVisitId}
          onAssess={handleAssess}
          loading={loading}
        />
      )}

      {activeTab === 'collect' && (
        <CollectionForm
          userBankId={userBankId}
          initialVisitId={activeVisitId}
          initialDonorId={activeDonorId}
          onCollect={handleCollect}
          loading={loading}
        />
      )}
    </div>
  );
}
