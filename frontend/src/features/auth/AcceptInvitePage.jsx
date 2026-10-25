import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Hospital, Building2 } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function AcceptInvitePage() {
  const [form, setForm] = useState({
    token: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ error: '', success: '' });

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setNotice({ error: 'Passwords do not match', success: '' });
      return;
    }
    setLoading(true);
    setNotice({ error: '', success: '' });
    try {
      const res = await authApi.acceptInvite(form);
      setNotice({
        error: '',
        success: res.message || 'Staff account activated successfully! You can now sign in.',
      });
    } catch (err) {
      setNotice({ error: err.message, success: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge>Staff Onboarding</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Administrator Invited</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Activate Staff Account</h1>
        <p style={{ color: '#647489' }}>
          Hospital and blood bank staff memberships are authorized exclusively by system administrators.
          Enter your invitation token below to complete registration.
        </p>

        <form onSubmit={submit} className="form-grid">
          <label>
            Invitation Token <span style={{ color: '#c9263e' }}>*</span>
            <input
              required
              value={form.token}
              onChange={(e) => set('token', e.target.value)}
              placeholder="Paste 64-character invitation token"
            />
          </label>

          <label>
            Full Name <span style={{ color: '#c9263e' }}>*</span>
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="e.g. Dr. Priyantha Silva"
            />
          </label>

          <label>
            Password (10+ characters) <span style={{ color: '#c9263e' }}>*</span>
            <input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </label>

          <label>
            Confirm Password <span style={{ color: '#c9263e' }}>*</span>
            <input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
            />
          </label>

          {notice.error && <div className="notice error">{notice.error}</div>}
          {notice.success && (
            <div className="notice success">
              <CheckCircle size={18} />
              <div>
                <strong>{notice.success}</strong>
                <div style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    className="primary small"
                    onClick={() => navigate('login')}
                  >
                    Sign In with Staff Account →
                  </button>
                </div>
              </div>
            </div>
          )}

          {!notice.success && (
            <button className="primary" disabled={loading} style={{ minHeight: 46 }}>
              {loading ? 'Activating account…' : 'Activate Staff Account'}
              <ArrowRight size={17} />
            </button>
          )}
        </form>

        <div style={{ borderTop: '1px solid #e8edf2', marginTop: 24, paddingTop: 16, textAlign: 'center' }}>
          <button type="button" className="text-link" onClick={() => navigate('login')}>
            ← Back to Sign In
          </button>
        </div>
      </section>
    </div>
  );
}
