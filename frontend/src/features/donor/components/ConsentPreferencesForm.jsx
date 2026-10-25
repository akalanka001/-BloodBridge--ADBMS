import React, { useState } from 'react';
import { Shield, Bell, Smartphone, Mail, AlertTriangle, Check, Loader2 } from 'lucide-react';

export function ConsentPreferencesForm({
  preferences,
  onSave,
  saving = false,
}) {
  const [formData, setFormData] = useState({
    availableForContact: Boolean(preferences?.available_for_contact ?? preferences?.availableForContact),
    emergencyAppealOptIn: Boolean(preferences?.emergency_appeal_opt_in ?? preferences?.emergencyAppealOptIn),
    campNotificationsOptIn: Boolean(preferences?.camp_notifications_opt_in ?? preferences?.campNotificationsOptIn),
    inAppAlerts: Boolean(preferences?.in_app_alerts ?? preferences?.inAppAlerts ?? true),
    smsAlerts: Boolean(preferences?.sms_alerts ?? preferences?.smsAlerts),
    emailAlerts: Boolean(preferences?.email_alerts ?? preferences?.emailAlerts),
    newsletterOptIn: Boolean(preferences?.newsletter_opt_in ?? preferences?.newsletterOptIn),
  });

  const [message, setMessage] = useState('');

  const handleChange = (field) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await onSave(formData);
      setMessage('Preferences successfully saved and recorded in audit log.');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="consent-preferences-form">
      <div className="pref-section-group">
        <div className="pref-section-header">
          <Shield className="text-navy" size={20} />
          <div>
            <h4 className="pref-group-title">Participation & Emergency Consents</h4>
            <p className="pref-group-desc">
              Control your visibility to blood centers. You may withdraw consent at any time.
            </p>
          </div>
        </div>

        <div className="pref-items-list">
          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">Available for Routine Invitations</span>
              <span className="pref-detail">
                Allows verified blood banks in your district to send targeted appointment requests.
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.availableForContact}
              onChange={() => handleChange('availableForContact')}
            />
          </label>

          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label font-semibold text-rose-700">
                Emergency Appeal Permission
              </span>
              <span className="pref-detail">
                Consents to urgent outreach when critical blood shortages or major trauma incidents occur.
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.emergencyAppealOptIn}
              onChange={() => handleChange('emergencyAppealOptIn')}
            />
          </label>

          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">Donation Camp Announcements</span>
              <span className="pref-detail">
                Receive notifications when community donation drives are organized near your district.
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.campNotificationsOptIn}
              onChange={() => handleChange('campNotificationsOptIn')}
            />
          </label>
        </div>
      </div>

      <div className="pref-section-group mt-6">
        <div className="pref-section-header">
          <Bell className="text-navy" size={20} />
          <div>
            <h4 className="pref-group-title">Communication Channels</h4>
            <p className="pref-group-desc">Choose how you wish to receive alerts and updates.</p>
          </div>
        </div>

        <div className="pref-items-list">
          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">In-App Notifications</span>
              <span className="pref-detail">Shows alerts in your donor portal topbar and notifications tab.</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.inAppAlerts}
              onChange={() => handleChange('inAppAlerts')}
            />
          </label>

          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">SMS Direct Alerts</span>
              <span className="pref-detail">Send urgent dispatch notices directly to your verified phone.</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.smsAlerts}
              onChange={() => handleChange('smsAlerts')}
            />
          </label>

          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">Email Notifications</span>
              <span className="pref-detail">Appointment confirmations and monthly donor impact summaries.</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.emailAlerts}
              onChange={() => handleChange('emailAlerts')}
            />
          </label>

          <label className="pref-row-item">
            <div className="pref-info">
              <span className="pref-label">BloodBridge Newsletter & Health Tips</span>
              <span className="pref-detail">Quarterly educational insights on nutrition, iron recovery and health.</span>
            </div>
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={formData.newsletterOptIn}
              onChange={() => handleChange('newsletterOptIn')}
            />
          </label>
        </div>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      )}

      <div className="form-submit-row mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Privacy Preferences
        </button>
      </div>
    </form>
  );
}
