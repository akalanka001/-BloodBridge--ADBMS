import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      onLogin(res);
    } catch (err) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge>Secure Authentication</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Academic Prototype</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Welcome back</h1>
        <p style={{ color: '#647489' }}>
          Sign in to access your role-specific dashboard. Donor, blood bank, hospital, and admin accounts use this single entry point.
        </p>

        <form onSubmit={submit} className="form-grid">
          <label>
            Email Address
            <input
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="login-password" style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>
                Password
              </label>
              <button
                type="button"
                className="text-link"
                style={{ fontSize: 11 }}
                onClick={() => navigate('forgot-password')}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="notice error">{error}</div>}

          <button className="primary" disabled={loading} style={{ minHeight: 46, marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign in to Dashboard'}
            <ArrowRight size={17} />
          </button>
        </form>

        <div style={{ borderTop: '1px solid #e8edf2', marginTop: 24, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-foot" style={{ margin: 0, textAlign: 'center', color: '#718095' }}>
            New donor?{' '}
            <button type="button" className="text-link" onClick={() => navigate('signup')}>
              Register to donate blood
            </button>
          </p>

          <p className="form-foot" style={{ margin: 0, textAlign: 'center', fontSize: 12, color: '#718095' }}>
            Received a staff invitation?{' '}
            <button type="button" className="text-link" onClick={() => navigate('accept-invite')}>
              Activate staff account
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
