import React from 'react';
import { Calendar, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export function NextReviewCard({ reviewInfo }) {
  if (!reviewInfo) return null;

  const isDeferred = Boolean(reviewInfo.is_deferred);
  const isPermanent = reviewInfo.deferral_status === 'PERMANENT_DEFERRAL';
  const days = reviewInfo.days_until_review;
  const isReadyNow = !isDeferred && (days === 0 || days === null);

  const formatDate = (dStr) => {
    if (!dStr) return 'Pending assessment';
    try {
      const dt = new Date(dStr);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className={`donor-review-card ${isDeferred ? 'review-deferred' : isReadyNow ? 'review-eligible' : 'review-cooling'}`}>
      <div className="review-card-top">
        <div className="review-icon-wrap">
          {isDeferred ? (
            <ShieldAlert className="text-amber-500" size={24} />
          ) : isReadyNow ? (
            <CheckCircle2 className="text-emerald-500" size={24} />
          ) : (
            <Clock className="text-blue-500" size={24} />
          )}
        </div>
        <div className="review-title-group">
          <span className="review-tag">Next Assessment Status</span>
          <h4 className="review-heading">
            {isPermanent
              ? 'Permanently Deferred'
              : isDeferred
              ? 'Temporary Deferral Active'
              : isReadyNow
              ? 'Eligible for Assessment'
              : `Earliest Review in ${days} days`}
          </h4>
        </div>
      </div>

      <div className="review-meta-grid">
        <div className="meta-col">
          <span className="meta-label">Earliest Review Date</span>
          <strong className="meta-value">
            {isPermanent ? 'None' : formatDate(reviewInfo.earliest_review_date)}
          </strong>
        </div>

        {reviewInfo.last_donation_date && (
          <div className="meta-col">
            <span className="meta-label">Previous Donation</span>
            <strong className="meta-value">{formatDate(reviewInfo.last_donation_date)}</strong>
          </div>
        )}
      </div>

      {isDeferred && reviewInfo.deferral_reason && (
        <div className="review-deferral-box">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <div className="deferral-text">
            <strong>Staff-recorded reason:</strong> {reviewInfo.deferral_reason}
            {reviewInfo.deferral_until && (
              <span> (Active through {formatDate(reviewInfo.deferral_until)})</span>
            )}
          </div>
        </div>
      )}

      <div className="review-disclaimer-box">
        <p className="disclaimer-copy">
          {reviewInfo.clearance_disclaimer ||
            'Calculated date represents earliest administrative assessment review and does not constitute medical transfusion clearance. Official screening occurs in-person with medical staff.'}
        </p>
      </div>
    </div>
  );
}
