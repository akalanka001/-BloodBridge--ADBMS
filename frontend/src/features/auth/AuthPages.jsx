import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/navigation.js';

export function RegisterPage({ districts, onDone }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    districtCode: '',
    bloodTypeCode: '',
    availableForContact: false,
    campNotificationsOptIn: false,
  });
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '', success: '' });
    try {
      await api('/auth/register-donor', {
        method: 'POST',
        body: JSON.stringify({ ...form, bloodTypeCode: form.bloodTypeCode || null }),
      });
      setState({
        loading: false,
        error: '',
        success: 'Account created. Sign in to manage your donor preferences.',
      });
      onDone();
    } catch (e) {
      setState({ loading: false, error: e.message, success: '' });
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card">
        <Badge>Donor registration</Badge>
        <h1>Join the BloodBridge community</h1>
        <p>Use only fictional data when evaluating the academic prototype.</p>
        <form onSubmit={submit} className="form-grid">
          <label>
            Full name
            <input
              required
              minLength={2}
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password (10+ characters)
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
            District
            <select
              required
              value={form.districtCode}
              onChange={(e) => set('districtCode', e.target.value)}
            >
              <option value="">Choose a district</option>
              {districts.map((d) => (
                <option value={d.code} key={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Blood group (optional, confirm medically)
            <select
              value={form.bloodTypeCode}
              onChange={(e) => set('bloodTypeCode', e.target.value)}
            >
              <option value="">Unknown / not confirmed</option>
              {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                <option value={t} key={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.availableForContact}
              onChange={(e) => set('availableForContact', e.target.checked)}
            />{' '}
            I agree to be contacted about donation opportunities
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.campNotificationsOptIn}
              onChange={(e) => set('campNotificationsOptIn', e.target.checked)}
            />{' '}
            Notify me about approved local donation camps
          </label>
          {state.error && <div className="notice error">{state.error}</div>}
          {state.success && <div className="notice success">{state.success}</div>}
          <button className="primary" disabled={state.loading}>
            {state.loading ? 'Creating account…' : 'Create donor account'} <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}

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
      const r = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card">
        <Badge>Secure login</Badge>
        <h1>Welcome back</h1>
        <p>
          Sign in to access the role-specific dashboard. Staff accounts must be created by authorized
          administrators.
        </p>
        <form onSubmit={submit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="notice error">{error}</div>}
          <button className="primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="form-foot">
          New donor?{' '}
          <button className="text-link" onClick={() => navigate('signup')}>
            Create an account
          </button>
        </p>
      </section>
    </div>
  );
}
