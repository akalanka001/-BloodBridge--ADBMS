import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Building2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Navigation,
  ArrowRight,
  Droplet,
  Loader2,
} from 'lucide-react';
import { campsApi } from './api/campsApi.js';
import { campDateParts, campArea } from './campDisplay.js';
import { navigate } from '../../lib/navigation.js';

/**
 * Branded fallback illustration for camps without a poster asset.
 * Features an SVG medical heartbeat wave, concentric rings, and BloodBridge crimson droplet.
 */
function CampBrandedIllustration() {
  return (
    <div className="bb-camp-illustration" aria-hidden="true">
      <svg
        viewBox="0 0 360 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="bb-camp-illustration-svg"
      >
        <defs>
          <linearGradient id="bbBgGrad" x1="0" y1="0" x2="360" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D3043" />
            <stop offset="60%" stopColor="#14243A" />
            <stop offset="100%" stopColor="#0F1B2A" />
          </linearGradient>
          <radialGradient id="bbGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DB3654" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#DB3654" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="360" height="200" fill="url(#bbBgGrad)" />
        <circle cx="180" cy="95" r="85" fill="url(#bbGlowGrad)" />
        <circle cx="180" cy="95" r="70" stroke="#DB3654" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="180" cy="95" r="48" stroke="#DB3654" strokeOpacity="0.25" strokeWidth="1.5" />

        {/* Electrocardiogram Heartbeat Path */}
        <path
          d="M0 100 H110 L125 78 L140 125 L155 85 L168 108 L180 100 H360"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Blood Donation Symbol */}
        <g transform="translate(162, 75)">
          <path
            d="M18 2C18 2 3 17 3 27C3 35.2843 9.71573 42 18 42C26.2843 42 33 35.2843 33 27C33 17 18 2 18 2Z"
            fill="#DB3654"
          />
          <path
            d="M18 16V28M12 22H24"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Modern, image-led BloodBridge donation camp discovery card.
 */
export function CampCard({
  camp,
  index = 0,
  token = null,
  savedArea = null,
  onViewDetails,
  onRegistrationChange,
  isRegistered = undefined,
  compact = false,
}) {
  const campId = camp.camp_id || camp.id;
  const serverRegistered = isRegistered ?? (camp.registration_status === 'REGISTERED');
  const [registered, setRegistered] = useState(serverRegistered);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setRegistered(serverRegistered);
    setConfirmCancel(false);
    setError('');
  }, [campId, serverRegistered]);

  // Date parsing with Asia/Colombo presentation
  const dateParts = campDateParts(camp.starts_at);
  const isFuture = Boolean(camp.starts_at) && new Date(camp.starts_at).getTime() > Date.now();
  const isApproved = camp.status === 'APPROVED' || !camp.status;
  const isClosed = !isFuture || !isApproved;
  const isAttended = ['ATTENDED', 'NO_SHOW'].includes(camp.registration_status);

  // Capacity calculations
  const capacity = camp.capacity != null ? Number(camp.capacity) : null;
  const registeredCount = camp.registered_count != null
    ? Number(camp.registered_count)
    : (camp.registered_donors != null ? Number(camp.registered_donors) : 0);
  const hasCapacity = capacity != null && capacity > 0;
  const remaining = hasCapacity ? Math.max(0, capacity - registeredCount) : null;
  const isFull = hasCapacity && registeredCount >= capacity;
  const capacityPercent = hasCapacity ? Math.min(100, Math.round((registeredCount / capacity) * 100)) : 0;

  // Proximity badge calculation
  const proximityLabel = campArea(camp.nearby_rank, savedArea, camp);

  // Venue location line
  const venueLocation = [camp.town || camp.venue_address, camp.district_name || 'Sri Lanka']
    .filter(Boolean)
    .join(', ');

  async function handleRegister() {
    if (!token) {
      navigate('login');
      return;
    }
    if (!campId || isClosed || isFull || isAttended || loading) return;

    setLoading(true);
    setError('');
    try {
      await campsApi.registerDonor(campId, token);
      setRegistered(true);
      await onRegistrationChange?.(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRegistration() {
    if (!campId || loading) return;

    setLoading(true);
    setError('');
    try {
      await campsApi.cancelRegistration(campId, token);
      setRegistered(false);
      setConfirmCancel(false);
      await onRegistrationChange?.(false);
    } catch (err) {
      setError(err.message || 'Cancellation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className="card camp-card bb-camp-card hoverable"
      data-camp-id={campId}
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      {/* 1. Header Media Section (16:9 Aspect Ratio) */}
      <div className="bb-camp-card-media">
        {camp.primary_poster_url && !imageFailed ? (
          <img
            src={camp.primary_poster_url}
            alt={camp.primary_poster_alt || `${camp.title} poster`}
            className="bb-camp-card-img"
            onError={() => setImageFailed(true)}
            loading="lazy"
          />
        ) : (
          <CampBrandedIllustration />
        )}

        {/* Overlay: Compact Date Badge (Top-Left) */}
        <div className="bb-camp-date-badge" aria-label={`Date: ${dateParts.full}`}>
          <span className="bb-camp-date-month">{dateParts.month}</span>
          <span className="bb-camp-date-day">{dateParts.day}</span>
        </div>

        {/* Overlay: Approval / Status Indicator (Top-Right) */}
        <div className="bb-camp-media-badges">
          {isApproved ? (
            <span className="bb-camp-status-pill approved" title="Official National Blood Bank approved drive">
              <CheckCircle size={12} aria-hidden="true" />
              <span>Approved</span>
            </span>
          ) : (
            <span className="bb-camp-status-pill pending">
              <span>{camp.status || 'Pending'}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Camp Information Section */}
      <div className="bb-camp-card-body">
        {/* Badges: Proximity & Registration State */}
        <div className="bb-camp-badges-row">
          {proximityLabel && (
            <span className="bb-badge bb-badge-nearby" title="Relative to your verified donor profile">
              <Navigation size={12} aria-hidden="true" />
              <span>{proximityLabel}</span>
            </span>
          )}
          {registered && (
            <span className="bb-badge bb-badge-registered">
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Registered</span>
            </span>
          )}
          {isFull && !registered && (
            <span className="bb-badge bb-badge-full">
              <AlertCircle size={12} aria-hidden="true" />
              <span>Camp Full</span>
            </span>
          )}
          {isClosed && (
            <span className="bb-badge bb-badge-closed">
              <span>Registration Closed</span>
            </span>
          )}
        </div>

        {/* Camp Title */}
        <h3 className="bb-camp-card-title" title={camp.title}>
          {camp.title || 'Donation Camp'}
        </h3>

        {/* Metadata Details */}
        <div className="bb-camp-meta-list">
          <div className="bb-camp-meta-item">
            <Calendar size={15} className="bb-meta-icon" aria-hidden="true" />
            <span className="bb-meta-text">{dateParts.full}</span>
          </div>

          <div className="bb-camp-meta-item">
            <MapPin size={15} className="bb-meta-icon pin" aria-hidden="true" />
            <span className="bb-meta-text">{venueLocation}</span>
          </div>

          <div className="bb-camp-meta-item">
            <Building2 size={15} className="bb-meta-icon" aria-hidden="true" />
            <span className="bb-meta-text">
              {camp.coordinating_blood_bank || 'National Blood Transfusion Service'}
            </span>
          </div>
        </div>

        {/* Registration count and capacity (Preserves .camp-capacity-stat class) */}
        <div className="bb-camp-capacity-box">
          <p className="camp-capacity-stat bb-capacity-line">
            <span>
              Registered: <strong>{registeredCount}</strong> / Capacity:{' '}
              <strong>{hasCapacity ? capacity : 'Open'}</strong>
            </span>
            {hasCapacity && (
              <span className={`bb-capacity-pill ${isFull ? 'full' : remaining <= 5 ? 'urgent' : 'available'}`}>
                {isFull ? '0 places left' : `${remaining} places left`}
              </span>
            )}
          </p>

          {hasCapacity && (
            <div
              className="bb-capacity-progress"
              role="progressbar"
              aria-label="Camp capacity registered"
              aria-valuenow={registeredCount}
              aria-valuemin={0}
              aria-valuemax={capacity}
            >
              <div
                className={`bb-capacity-bar-fill ${isFull ? 'full' : ''}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bb-camp-card-error" role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* 3. Actions Section: Two side-by-side buttons of equal width */}
        <div className="bb-camp-card-actions">
          {confirmCancel ? (
            <div className="bb-camp-cancel-confirm">
              <span className="bb-cancel-text">Cancel registration?</span>
              <div className="bb-cancel-buttons">
                <button
                  type="button"
                  className="btn-camp-outline small"
                  disabled={loading}
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep
                </button>
                <button
                  type="button"
                  className="btn-camp-danger small"
                  disabled={loading}
                  onClick={handleCancelRegistration}
                >
                  {loading ? 'Cancelling…' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Left Button: View Details (Outlined) */}
              <button
                type="button"
                className="btn-camp-outline"
                disabled={!campId}
                onClick={() => onViewDetails?.(campId)}
              >
                <span>View Details</span>
                <ArrowRight size={14} className="bb-arrow-icon" aria-hidden="true" />
              </button>

              {/* Right Button: Register for Camp / Cancel Registration */}
              {registered ? (
                <button
                  type="button"
                  className="btn-camp-cancel"
                  disabled={loading || isClosed || !campId}
                  onClick={() => setConfirmCancel(true)}
                >
                  <span>Cancel Registration</span>
                </button>
              ) : !token ? (
                <button
                  type="button"
                  className="btn-camp-primary"
                  onClick={() => navigate('login')}
                >
                  <span>Sign in to register</span>
                </button>
              ) : isClosed ? (
                <button type="button" className="btn-camp-disabled" disabled>
                  <span>Registration Closed</span>
                </button>
              ) : isFull ? (
                <button type="button" className="btn-camp-disabled" disabled>
                  <span>Camp Full</span>
                </button>
              ) : isAttended ? (
                <button type="button" className="btn-camp-disabled" disabled>
                  <span>Attended</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-camp-primary"
                  disabled={loading || !campId}
                  onClick={handleRegister}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="bb-spin-icon" aria-hidden="true" />
                      <span>Registering…</span>
                    </>
                  ) : (
                    <span>Register for Camp</span>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Skeleton card placeholder rendered during asynchronous camp searches.
 */
export function CampCardSkeleton() {
  return (
    <article className="card camp-card bb-camp-card bb-camp-skeleton" aria-hidden="true">
      <div className="bb-camp-card-media bb-skeleton-box bb-skeleton-img">
        <div className="bb-skeleton-badge" />
      </div>
      <div className="bb-camp-card-body">
        <div className="bb-skeleton-row short" />
        <div className="bb-skeleton-title" />
        <div className="bb-skeleton-row" />
        <div className="bb-skeleton-row" />
        <div className="bb-skeleton-row medium" />
        <div className="bb-skeleton-capacity" />
        <div className="bb-camp-card-actions">
          <div className="bb-skeleton-btn" />
          <div className="bb-skeleton-btn" />
        </div>
      </div>
    </article>
  );
}
