import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ error: '', success: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setNotice({ error: 'Passwords do not match', success: '' });
      return;
    }
    setLoading(true);
    setNotice({ error: '', success: '' });
    try {
      const res = await authApi.resetPassword(token, password, confirmPassword);
      setNotice({
        error: '',
        success: res.message || 'Password has been reset successfully. You can now sign in.',
      });
    } catch (err) {
      setNotice({ error: err.message, success: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge>Set New Password</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Academic Prototype</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Enter new password</h1>
        <p style={{ color: '#647489' }}>
          Provide the one-time recovery token you received and select a secure new password (10+ characters).
        </p>

        <form onSubmit={submit} className="form-grid">
          <label>
            Recovery Token
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste recovery token"
            />
          </label>

          <label>
            New Password (10+ characters)
            <input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label>
            Confirm New Password
            <input
              required
              minLength={10}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Sign In Now →
                  </button>
                </div>
              </div>
            </div>
          )}

          {!notice.success && (
            <button className="primary" disabled={loading} style={{ minHeight: 46 }}>
              {loading ? 'Updating password…' : 'Update Password'}
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
