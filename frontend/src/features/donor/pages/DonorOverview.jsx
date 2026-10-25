import React from 'react';
import {
  Heart,
  CheckCircle,
  Bell,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AvailabilityToggle } from '../components/AvailabilityToggle.jsx';
import { DonationJourneyChart } from '../components/DonationJourneyChart.jsx';
import { InvitationCard } from '../components/InvitationCard.jsx';
import { NextReviewCard } from '../components/NextReviewCard.jsx';

export function DonorOverview({
  dashboardData,
  profile,
  onNavigateTab,
  onToggleAvailability,
  onRespondInvitation,
  loading = false,
  claimDonorId,
  setClaimDonorId,
  claimNotes,
  setClaimNotes,
  onClaimSubmit,
  submittingClaim = false,
  claimMsg = '',
}) {
  const donorName = dashboardData?.full_name || profile?.fullName || profile?.full_name || 'Donor';
  const firstName = donorName.trim().split(' ')[0] || donorName;
  const totalDonations = Number(dashboardData?.total_donations) || 0;
  const isAvailable = Boolean(dashboardData?.available_for_contact ?? profile?.available_for_contact);
  const invitationsCount = Number(dashboardData?.unread_invitations_count) || 0;
  const bloodType = dashboardData?.blood_type_code || profile?.blood_type_code || 'Unknown / Not verified';
  const isMedicallyVerified = Boolean(dashboardData?.is_medically_verified ?? profile?.is_medically_verified);
  const districtName = dashboardData?.district_name || profile?.district_name || 'Sri Lanka';
  const reviewInfo = dashboardData?.next_review_info;
  const journey = dashboardData?.donation_journey || [];
  const latestInvitation = dashboardData?.latest_invitation;

  // Time-of-day greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = (name) => {
    if (!name || name === 'Donor') return 'DN';
    const p = name.trim().split(/\s+/);
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="donor-overview-page">
      {/* Overview Top Header Banner */}
      <div className="donor-hero-row">
        <div>
          <h1 className="donor-hero-title">
            {getGreeting()}, {firstName}
          </h1>
          <p className="donor-hero-subtitle">
            Every donation starts with someone willing to help.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('banks')}
          className="btn-primary hero-cta-btn inline-flex items-center gap-2"
        >
          <span>Find a blood bank</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="donor-kpi-grid">
        {/* Card 1: Your Donations */}
        <div
          className="donor-kpi-card cursor-pointer"
          onClick={() => onNavigateTab('donations')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('donations')}
        >
          <div className="kpi-icon-wrap bg-rose-50">
            <Heart className="text-rose-600" size={22} />
          </div>
          <span className="kpi-label">Your donations</span>
          <div className="kpi-metric-row">
            <span className="kpi-metric-val">
              {totalDonations < 10 ? `0${totalDonations}` : totalDonations}
            </span>
          </div>
          <span className="kpi-subtext">
            {totalDonations > 0 ? 'A meaningful contribution' : 'Start your journey'}
          </span>
        </div>

        {/* Card 2: Donation Status */}
        <div
          className="donor-kpi-card cursor-pointer"
          onClick={() => onNavigateTab('preferences')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('preferences')}
        >
          <div className={`kpi-icon-wrap ${isAvailable ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <CheckCircle className={isAvailable ? 'text-emerald-600' : 'text-slate-500'} size={22} />
          </div>
          <span className="kpi-label">Donation status</span>
          <div className="kpi-metric-row">
            <span className={`kpi-metric-val ${isAvailable ? 'text-emerald-700' : 'text-slate-600'}`}>
              {isAvailable ? 'Available' : 'Paused'}
            </span>
          </div>
          <span className="kpi-subtext">You control your availability</span>
        </div>

        {/* Card 3: Donation Invitations */}
        <div
          className="donor-kpi-card cursor-pointer"
          onClick={() => onNavigateTab('notifications')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('notifications')}
        >
          <div className="kpi-icon-wrap bg-rose-50">
            <Bell className="text-rose-600" size={22} />
          </div>
          <span className="kpi-label">Donation invitations</span>
          <div className="kpi-metric-row">
            <span className="kpi-metric-val">
              {invitationsCount < 10 ? `0${invitationsCount}` : invitationsCount}
            </span>
          </div>
          <span className="kpi-subtext">
            {invitationsCount > 0 ? 'New invitations to review' : 'No active appeals'}
          </span>
        </div>
      </div>

      {/* Middle Row: Availability (2/3) + Latest Invitation Card (1/3) */}
      <div className="donor-mid-grid">
        <div className="mid-left-col">
          <AvailabilityToggle
            isAvailable={isAvailable}
            onToggle={onToggleAvailability}
            loading={loading}
          />
        </div>

        <div className="mid-right-col">
          <div className="donor-invitation-spotlight-card">
            <div className="spotlight-header">
              <h3 className="spotlight-title">New donation invitation</h3>
              <span className="spotlight-badge">NEW</span>
            </div>

            {latestInvitation ? (
              <div className="spotlight-content">
                <div className="spotlight-facility">
                  <div className="spotlight-icon">
                    <Building2 size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <h4 className="spotlight-facility-name">
                      {latestInvitation.blood_bank_name || 'Regional Blood Center'}
                    </h4>
                    <span className="spotlight-location">
                      {latestInvitation.area_description || districtName}
                    </span>
                  </div>
                </div>

                <div className="spotlight-type-row">
                  <span className="spotlight-blood-pill">
                    {latestInvitation.blood_type_code || bloodType}
                  </span>
                  <span className="spotlight-appeal-type">
                    {latestInvitation.title || 'Donation appeal'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab('notifications')}
                  className="btn-primary w-full spotlight-action-btn"
                >
                  View invitation
                </button>
              </div>
            ) : (
              <div className="spotlight-empty">
                <p className="text-slate-500 text-sm">
                  No pending invitations right now. Thank you for staying ready!
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('camps')}
                  className="btn-secondary w-full mt-3 text-sm"
                >
                  Explore community camps
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Review Status Banner */}
      {reviewInfo && (
        <div className="mt-6">
          <NextReviewCard reviewInfo={reviewInfo} />
        </div>
      )}

      {/* Bottom Row: Donation Journey Chart (2/3) + Profile Card (1/3) */}
      <div className="donor-bottom-grid">
        <div className="bottom-left-col">
          <DonationJourneyChart
            journey={journey}
            totalDonations={totalDonations}
            onDiscoverCamps={() => onNavigateTab('camps')}
          />
        </div>

        <div className="bottom-right-col">
          <div className="donor-profile-summary-card">
            <h3 className="profile-card-title">Your donor profile</h3>

            <div className="profile-avatar-circle">
              <span>{getInitials(donorName)}</span>
            </div>

            <h4 className="profile-donor-name">{donorName}</h4>

            <div className="profile-blood-badge-wrap">
              <span className="profile-blood-pill">{bloodType}</span>
              {isMedicallyVerified && (
                <span className="medically-verified-badge" title="Medically verified by laboratory testing">
                  <ShieldCheck size={14} className="text-emerald-600 inline mr-1" />
                  Verified
                </span>
              )}
            </div>

            <p className="profile-location-text">
              <MapPin size={14} className="inline mr-1 text-slate-400" />
              {districtName} District
            </p>

            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="btn-edit-profile-link"
            >
              Edit profile
            </button>

            {/* Offline Walk-in Claim Box */}
            <div className="claim-box mt-4 pt-4 border-t border-slate-100 w-full text-left">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-1">
                Claim Offline Record
              </h4>
              <p className="text-xs text-slate-400 mb-2">
                Link historical donations with your previous donor UUID.
              </p>
              <form onSubmit={onClaimSubmit} className="space-y-2">
                <input
                  id="claim-donor-id"
                  type="text"
                  placeholder="Offline Donor UUID"
                  value={claimDonorId || ''}
                  onChange={(e) => setClaimDonorId && setClaimDonorId(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                />
                <input
                  id="claim-notes"
                  type="text"
                  placeholder="Verification notes or NIC"
                  value={claimNotes || ''}
                  onChange={(e) => setClaimNotes && setClaimNotes(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                />
                <button
                  id="btn-submit-claim"
                  type="submit"
                  disabled={submittingClaim}
                  className="btn-primary w-full text-xs py-1.5 font-bold"
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </form>
              {claimMsg && <p className="text-xs text-emerald-600 mt-2">{claimMsg}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
