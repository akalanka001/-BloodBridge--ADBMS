import React, { useState } from 'react';
import { ArrowRight, CheckCircle, MailCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function VerifyEmailPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ error: '', success: '' });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice({ error: '', success: '' });
    try {
      const res = await authApi.verifyEmail(token);
      setNotice({
        error: '',
        success: res.message || 'Email verified successfully!',
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
          <Badge>Email Verification</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Academic Prototype</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Verify your account</h1>
        <p style={{ color: '#647489' }}>
          Enter the one-time verification token provided upon donor registration.
        </p>

        <form onSubmit={submit} className="form-grid">
          <label>
            Verification Token
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token"
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
                    Proceed to Sign In →
                  </button>
                </div>
              </div>
            </div>
          )}

          {!notice.success && (
            <button className="primary" disabled={loading} style={{ minHeight: 46 }}>
              {loading ? 'Verifying…' : 'Verify Email'}
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
