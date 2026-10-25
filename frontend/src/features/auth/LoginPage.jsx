import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Eye, EyeOff, Shield, Heart } from 'lucide-react';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cleanEmail = (email || '').trim();
      const cleanPassword = (password || '').replace(/[\r\n\t]+/g, '').trim();
      const res = await authApi.login(cleanEmail, cleanPassword);
      onLogin(res);
    } catch (err) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-zone view" style={{ paddingBottom: 40 }}>
      <div className="auth-frame">
        {/* Left Editorial Column */}
        <div className="auth-aside">
          <div className="auth-aside-content">
            <span className="brand" style={{ color: 'white' }}>
              <span className="mark">
                <Heart size={22} fill="white" strokeWidth={0} />
              </span>
              <span>
                Blood<span>Bridge</span>
                <small style={{ color: '#9ab0c3' }}>CONNECTING COMMUNITIES</small>
              </span>
            </span>
          </div>

          <div className="auth-aside-content" style={{ marginTop: 24 }}>
            <span
              className="tag"
              style={{
                background: '#ffffff22',
                color: '#ffe3e8',
                border: '1px solid #ffffff44',
                marginBottom: 20,
              }}
            >
              SECURE SHARED SIGN-IN
            </span>

            <h2>Welcome back to the bridge.</h2>

            <p>
              One sign-in. The right workspace for your role. Donor, hospital, bank, and administrator accounts share this secure entry point.
            </p>

            <div className="btnrow" style={{ marginTop: 20 }}>
              <Shield size={18} color="#d4e0eb" />
              <span style={{ fontSize: 12, color: '#d4e0eb' }}>
                Role access is determined by your authenticated account.
              </span>
            </div>
          </div>

          <div className="aside-quote">
            BloodBridge · Privacy-minded academic prototype
          </div>

          <div className="ghostshape" />
        </div>

        {/* Right Form Column */}
        <div className="auth-main">
          <div>
            <span className="tag">
              <Lock size={13} />
              <span>Secure access</span>
            </span>

            <h1>Sign in</h1>
            <p>Enter your account details to continue.</p>

            <form onSubmit={submit}>
              <div className="fgroup">
                <label htmlFor="login-email">
                  Email address <span className="required">*</span>
                </label>
                <div className="input-wrap">
                  <Mail className="input-icon" size={17} />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="fgroup">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label htmlFor="login-password">
                    Password <span className="required">*</span>
                  </label>
                  <button
                    type="button"
                    className="link"
                    onClick={() => navigate('forgot-password')}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="input-wrap">
                  <Lock className="input-icon" size={17} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 0,
                      background: 'transparent',
                      color: '#77889a',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="notice error" style={{ marginTop: 16 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn primary wide"
                disabled={loading}
                style={{ marginTop: 24 }}
              >
                <span>{loading ? 'Signing in…' : 'Sign in to Dashboard'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <p style={{ textAlign: 'center', margin: '24px 0 10px', fontSize: 13, color: 'var(--muted)' }}>
              New donor?{' '}
              <button
                type="button"
                className="link"
                onClick={() => navigate('signup')}
              >
                Create a donor account
              </button>
            </p>

            <p style={{ textAlign: 'center', margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              Received a staff invitation?{' '}
              <button
                type="button"
                className="link"
                onClick={() => navigate('accept-invite')}
              >
                Activate staff account
              </button>
            </p>

            <p
              className="micro"
              style={{
                textAlign: 'center',
                borderTop: '1px solid var(--line)',
                paddingTop: 18,
                marginTop: 22,
              }}
            >
              Design reference: role workspace is scoped upon authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
