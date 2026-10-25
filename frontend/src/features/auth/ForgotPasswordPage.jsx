import React, { useState } from 'react';
import { ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ error: '', success: '', resetToken: '' });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice({ error: '', success: '', resetToken: '' });
    try {
      const res = await authApi.forgotPassword(email);
      setNotice({
        error: '',
        success: res.message || 'Password reset instructions have been dispatched.',
        resetToken: res.resetToken || '',
      });
    } catch (err) {
      setNotice({ error: err.message, success: '', resetToken: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge>Password Recovery</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Academic Prototype</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Reset your password</h1>
        <p style={{ color: '#647489' }}>
          Enter the email address associated with your BloodBridge account to receive a secure password recovery token.
        </p>

        <form onSubmit={submit} className="form-grid">
          <label>
            Email Address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {notice.error && <div className="notice error">{notice.error}</div>}
          {notice.success && (
            <div className="notice success">
              <CheckCircle size={18} />
              <div>
                <strong>{notice.success}</strong>
                {notice.resetToken && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <div>Prototype Demo Token: <code>{notice.resetToken}</code></div>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => navigate('reset-password')}
                      style={{ marginTop: 4 }}
                    >
                      Proceed to Reset Password →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button className="primary" disabled={loading} style={{ minHeight: 46 }}>
            {loading ? 'Submitting request…' : 'Send Recovery Instructions'}
            <ArrowRight size={17} />
          </button>
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
