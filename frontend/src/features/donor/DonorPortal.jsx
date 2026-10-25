import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { donorApi } from './api/donorApi.js';
import { DonorOverview } from './pages/DonorOverview.jsx';
import { DonationHistoryPage } from './pages/DonationHistoryPage.jsx';
import { DonorAppointmentsPage } from './pages/DonorAppointmentsPage.jsx';
import { FindBloodBanksPage } from './pages/FindBloodBanksPage.jsx';
import { FindCampsPage } from './pages/FindCampsPage.jsx';
import { DonorRegistrationsPage } from './pages/DonorRegistrationsPage.jsx';
import { DonorNotificationsPage } from './pages/DonorNotificationsPage.jsx';
import { DonorProfilePage } from './pages/DonorProfilePage.jsx';
import { PrivacyPreferencesPage } from './pages/PrivacyPreferencesPage.jsx';
import { AccountSettingsPage } from './pages/AccountSettingsPage.jsx';
import { DonorAccountPage } from './pages/DonorAccountPage.jsx';
import { ConsentPreferencesForm } from './components/ConsentPreferencesForm.jsx';
import { SectionTabs } from '../../components/ui/SectionTabs.jsx';

export function DonorPortal({
  profile,
  token,
  onProfileUpdate,
  activeTab = 'overview',
  onTabChange = () => {},
}) {
  const [dashboardData, setDashboardData] = useState(null);
  const [donations, setDonations] = useState([]);
  const [donationPage, setDonationPage] = useState(1);
  const [donationFilters, setDonationFilters] = useState({ search: '', year: '' });
  const [donationPagination, setDonationPagination] = useState({ pageSize: 10, total: 0 });
  const [donationLoading, setDonationLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(token && token !== 'mock-donor-token');
  const [error, setError] = useState('');
  const [savingPref, setSavingPref] = useState(false);

  // Claim form state
  const [claimDonorId, setClaimDonorId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  const fetchDonorData = async () => {
    if (!token || token === 'mock-donor-token') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError('');
      const [dashRes, invRes] = await Promise.all([
        donorApi.getDashboardSummary(token), donorApi.getInvitations(token),
      ]);

      if (dashRes?.data) setDashboardData(dashRes.data);
      if (invRes?.data) setInvitations(invRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && token !== 'mock-donor-token') {
      fetchDonorData();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || token === 'mock-donor-token' || activeTab !== 'donations') return undefined;
    const controller = new AbortController();
    setDonationLoading(true);
    donorApi.getDonations(token, { limit: 10, offset: (donationPage - 1) * 10, ...donationFilters }, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setDonations(result.data || []); setDonationPagination({ pageSize: result.pagination?.limit || 10, total: result.pagination?.total || 0 }); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setDonationLoading(false); });
    return () => controller.abort();
  }, [token, activeTab, donationPage, donationFilters]);

  const handleClaimSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!claimDonorId) return;
    setSubmittingClaim(true);
    setClaimMsg('');
    try {
      await donorApi.submitClaim(
        { donorId: claimDonorId.trim(), verificationNotes: claimNotes.trim() },
        token,
      );
      setClaimMsg('Claim submitted for administrative review.');
      setClaimDonorId('');
      setClaimNotes('');
    } catch (err) {
      alert(`Claim error: ${err.message}`);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleToggleAvailability = async (newVal) => {
    setSavingPref(true);
    try {
      const res = await donorApi.updatePreferences({ availableForContact: newVal }, token);
      setDashboardData((prev) =>
        prev ? { ...prev, available_for_contact: newVal } : prev,
      );
      if (onProfileUpdate) {
        onProfileUpdate({ ...profile, available_for_contact: newVal });
      }
    } catch (err) {
      alert(`Could not update availability: ${err.message}`);
    } finally {
      setSavingPref(false);
    }
  };

  const handleSavePreferences = async (formData) => {
    setSavingPref(true);
    try {
      await donorApi.updatePreferences(formData, token);
      const res = await donorApi.getProfile(token);
      setDashboardData((prev) => (prev ? { ...prev, ...res.data } : prev));
      if (onProfileUpdate) onProfileUpdate(res.data);
    } finally {
      setSavingPref(false);
    }
  };

  const handleRespondInvitation = async (id, response) => {
    try {
      await donorApi.respondInvitation(id, response, token);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: response } : inv)),
      );
      if (dashboardData?.latest_invitation?.id === id) {
        setDashboardData((prev) =>
          prev
            ? {
                ...prev,
                latest_invitation: { ...prev.latest_invitation, status: response },
                unread_invitations_count: Math.max(0, (prev.unread_invitations_count || 1) - 1),
              }
            : prev,
        );
      }
    } catch (err) {
      alert(`Failed to record response: ${err.message}`);
    }
  };

  const handleProfileUpdateSuccess = (updated) => {
    if (onProfileUpdate) onProfileUpdate(updated);
    fetchDonorData();
  };

  const handleDonationFilters = (filters) => {
    setDonationFilters(previous => previous.search === filters.search && previous.year === filters.year ? previous : filters);
    setDonationPage(1);
  };

  const effectiveDashboard =
    dashboardData || (profile ? { ...profile, total_donations: profile.donation_count || 0 } : null);

  return (
    <div className="donor-portal-container">
      {error && <p className="notice error" role="alert">{error} <button onClick={fetchDonorData}>Retry</button></p>}
      {loading && !effectiveDashboard ? (
        <div className="py-20 text-center">
          <Loader2 size={36} className="animate-spin text-rose-600 mx-auto" />
          <p className="text-slate-500 text-sm mt-3 font-medium">Loading your donor portal...</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <DonorOverview
              dashboardData={effectiveDashboard}
              profile={profile}
              onNavigateTab={onTabChange}
              onToggleAvailability={handleToggleAvailability}
              onRespondInvitation={handleRespondInvitation}
              loading={savingPref}
              claimDonorId={claimDonorId}
              setClaimDonorId={setClaimDonorId}
              claimNotes={claimNotes}
              setClaimNotes={setClaimNotes}
              onClaimSubmit={handleClaimSubmit}
              submittingClaim={submittingClaim}
              claimMsg={claimMsg}
            />
          )}

          {activeTab === 'donations' && (
            <DonationHistoryPage donations={donations} loading={donationLoading} pagination={donationPagination} page={donationPage} onPageChange={setDonationPage} onFiltersChange={handleDonationFilters} />
          )}

          {['appointments', 'banks'].includes(activeTab) && <SectionTabs label="Appointments and blood banks" tabs={[{id:'appointments',label:'My appointments'},{id:'banks',label:'Find a blood bank'}]} activeTab={activeTab} onChange={onTabChange} />}
          {activeTab === 'appointments' && (
            <DonorAppointmentsPage
              token={token}
              onBookSuccess={fetchDonorData}
            />
          )}

          {activeTab === 'banks' && (
            <FindBloodBanksPage
              token={token}
              onBookAppointment={() => onTabChange('appointments')}
            />
          )}

          {['camps', 'registrations'].includes(activeTab) && <FindCampsPage token={token} initialSection={activeTab === 'registrations' ? 'registered' : 'explore'} />}

          {activeTab === 'notifications' && (
            <DonorNotificationsPage
              invitations={invitations}
              onRespondInvitation={handleRespondInvitation}
              loading={loading}
            />
          )}

          {['account', 'profile', 'preferences', 'settings'].includes(activeTab) && (
            <DonorAccountPage
              profile={profile}
              token={token}
              onProfileUpdate={handleProfileUpdateSuccess}
            />
          )}

          {!['overview', 'donations', 'appointments', 'banks', 'camps', 'registrations', 'notifications', 'account', 'profile', 'preferences', 'settings'].includes(activeTab) && (
            <div className="py-16 text-center">
              <h3 className="text-lg font-bold text-navy">Section Not Found</h3>
              <p className="text-sm text-slate-500 mt-1">The requested donor section does not exist.</p>
              <button
                type="button"
                onClick={() => onTabChange('overview')}
                className="btn-primary mt-4 text-xs inline-flex items-center gap-1.5 px-3 py-1.5"
              >
                Return to Overview
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
