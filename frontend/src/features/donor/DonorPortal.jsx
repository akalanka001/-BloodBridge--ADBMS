import React, { useState } from 'react';
import { HeartHandshake, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api.js';

export function DonorPortal({ profile, token, onProfileUpdate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [claimDonorId, setClaimDonorId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  const savePreference = async (key, val) => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const updated = { ...profile, [key]: val };
    try {
      const result = await api(
        '/donors/me/preferences',
        {
          method: 'PATCH',
          body: JSON.stringify({
            availableForContact: updated.available_for_contact,
            campNotificationsOptIn: updated.camp_notifications_opt_in,
          }),
        },
        token,
      );
      if (onProfileUpdate) onProfileUpdate({ ...updated, ...result.data });
      setSuccess('Preferences updated and logged in PostgreSQL audit trail.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimDonorId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api(
        '/donors/me/link-claims',
        {
          method: 'POST',
          body: JSON.stringify({ donorId: claimDonorId.trim(), verificationNotes: claimNotes.trim() }),
        },
        token,
      );
      setSuccess('Identity claim submitted! An administrator will review your past donation records.');
      setClaimDonorId('');
      setClaimNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="donor-portal-feature">
      {error && <div className="notice error">{error}</div>}
      {success && <div className="notice success">{success}</div>}

      <div className="surface-card settings-card">
        <h3>Donor preferences & Explicit Consent</h3>
        <p>
          These preferences are saved directly to PostgreSQL. Availability and contact consent
          do not constitute medical fitness for donation. Explicit opt-in required.
        </p>
        <label className="toggle-row">
          <input
            id="donor-consent-contact"
            type="checkbox"
            disabled={saving}
            checked={Boolean(profile?.available_for_contact)}
            onChange={(e) => savePreference('available_for_contact', e.target.checked)}
          />
          <span>Explicit consent to be contacted for emergency blood outreach</span>
        </label>
        <label className="toggle-row">
          <input
            id="donor-consent-camps"
            type="checkbox"
            disabled={saving}
            checked={Boolean(profile?.camp_notifications_opt_in)}
            onChange={(e) => savePreference('camp_notifications_opt_in', e.target.checked)}
          />
          <span>Explicit consent to receive notification of nearby donation camps</span>
        </label>
      </div>

      <div className="surface-card" style={{ marginTop: '1.5rem' }}>
        <h3>Claim Existing Walk-in Donor Record</h3>
        <p>
          Did you donate at a blood bank or mobile camp prior to creating this online account?
          Submit your Donor ID to link your historical donations to your verified user account.
        </p>
        <form onSubmit={handleClaimSubmit} className="form-grid">
          <label>
            Offline Donor UUID
            <input
              id="claim-donor-id"
              required
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={claimDonorId}
              onChange={(e) => setClaimDonorId(e.target.value)}
            />
          </label>
          <label>
            Verification Notes (NIC or past donation venue)
            <input
              id="claim-notes"
              placeholder="Notes for administrator review"
              value={claimNotes}
              onChange={(e) => setClaimNotes(e.target.value)}
            />
          </label>
          <button id="btn-submit-claim" className="primary" disabled={saving}>
            Submit Account Claim <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
