import React, { useState } from 'react';
import { Mail, MessageSquare, Bell, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/api.js';

export function NotificationPreferences({ initialConsents, onSave }) {
  const [consents, setConsents] = useState({
    contactAllowed: initialConsents?.contact_allowed ?? true,
    smsAlerts: initialConsents?.sms_alerts ?? true,
    emailAlerts: initialConsents?.email_alerts ?? true,
    inAppAlerts: initialConsents?.in_app_alerts ?? true,
    campNotificationOptIn: initialConsents?.camp_notification_opt_in ?? true,
    emergencyAppealOptIn: initialConsents?.emergency_appeal_opt_in ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const handleToggle = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await apiClient.patch('/donors/me/availability', {
        contactAllowed: consents.contactAllowed,
        smsAlerts: consents.smsAlerts,
        emailAlerts: consents.emailAlerts,
        inAppAlerts: consents.inAppAlerts,
        campNotificationOptIn: consents.campNotificationOptIn,
        emergencyAppealOptIn: consents.emergencyAppealOptIn,
      });
      setSuccess('Your notification and channel preferences have been updated.');
      if (onSave) onSave(consents);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* SMS Alerts */}
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={18} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>SMS Text Messages</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Receive urgent shortage alerts directly to your mobile phone</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={consents.smsAlerts}
            onChange={() => handleToggle('smsAlerts')}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </label>

        {/* Email Alerts */}
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={18} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>Email Notifications</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Camp reminders and verified blood bank updates</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={consents.emailAlerts}
            onChange={() => handleToggle('emailAlerts')}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </label>

        {/* Camp Announcements */}
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>Local Camp Announcements</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Notify when approved donation camps are scheduled in your district</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={consents.campNotificationOptIn}
            onChange={() => handleToggle('campNotificationOptIn')}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 18px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start',
          fontSize: '0.875rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Notification Preferences'}
      </button>
    </form>
  );
}
