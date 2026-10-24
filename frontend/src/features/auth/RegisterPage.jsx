import React, { useState } from 'react';
import { ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Typography.jsx';
import { GeoSelector } from '../../components/forms/GeoSelector.jsx';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

export function RegisterPage({ districts = null, onDone = () => {} }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    weightKg: '',
    provinceCode: '',
    districtCode: '',
    dsCode: '',
    gnCode: '',
    town: '',
    bloodTypeCode: '',
    availableForContact: false,
    campNotificationsOptIn: false,
    smsConsent: false,
    emailConsent: false,
  });

  const [state, setState] = useState({ loading: false, error: '', success: '', devToken: '' });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = calculateAge(form.birthDate);

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '', success: '', devToken: '' });

    // Client-side validations
    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setState({ loading: false, error: 'Passwords do not match', success: '', devToken: '' });
      return;
    }

    if (currentAge !== null && currentAge < 18) {
      setState({
        loading: false,
        error: 'Donor must be at least 18 years old to register for donation.',
        success: '',
        devToken: '',
      });
      return;
    }

    if (form.weightKg && Number(form.weightKg) < 50.0) {
      setState({
        loading: false,
        error: 'Donor weight must be at least 50 kg to meet blood donation criteria.',
        success: '',
        devToken: '',
      });
      return;
    }

    if (!form.districtCode) {
      setState({
        loading: false,
        error: 'Please select a district.',
        success: '',
        devToken: '',
      });
      return;
    }

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword || form.password,
        phone: form.phone || null,
        birthDate: form.birthDate || null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        districtCode: form.districtCode,
        dsCode: form.dsCode || null,
        gnCode: form.gnCode || null,
        town: form.town || null,
        bloodTypeCode: form.bloodTypeCode || null,
        availableForContact: form.availableForContact,
        campNotificationsOptIn: form.campNotificationsOptIn,
        smsConsent: form.smsConsent,
        emailConsent: form.emailConsent,
      };

      const res = await authApi.registerDonor(payload);
      setState({
        loading: false,
        error: '',
        success: 'Donor account created successfully! Sign in to manage your donor preferences.',
        devToken: res.verificationToken || '',
      });
      onDone();
    } catch (err) {
      setState({ loading: false, error: err.message, success: '', devToken: '' });
    }
  };

  return (
    <div className="auth-layout">
      <section className="surface-card auth-card" style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge>Donor registration</Badge>
          <span style={{ fontSize: 11, color: '#718095' }}>· Academic Prototype</span>
        </div>

        <h1 style={{ marginTop: 12 }}>Join the BloodBridge community</h1>
        <p style={{ color: '#647489' }}>
          Connect with local blood donation drives and emergency appeals in Sri Lanka.
          Use fictional demonstration data during evaluation.
        </p>

        {/* Statutory Donor Eligibility Guidance */}
        <div
          className="notice"
          style={{
            backgroundColor: '#fff9fa',
            borderColor: '#f9d2d9',
            color: '#a82139',
            margin: '18px 0',
            alignItems: 'flex-start',
          }}
        >
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>National Donor Eligibility Criteria:</strong>
            <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              Donors must be <strong>at least 18 years of age</strong> (up to 65 years) and weigh{' '}
              <strong>at least 50 kg</strong>. Full medical screening occurs privately during
              collection by certified healthcare professionals.
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="form-grid">
          {/* Identity Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <label>
              Full name
              <input
                required
                minLength={2}
                maxLength={120}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
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
              Confirm secret
              <input
                minLength={10}
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="Repeat password"
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label>
              Contact phone (optional)
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="07X XXX XXXX"
              />
            </label>

            {/* Age & Weight Eligibility Inputs */}
            <label>
              Date of birth (Must be 18+)
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {currentAge !== null && (
                <span
                  style={{
                    fontSize: 11,
                    marginTop: 3,
                    color: currentAge >= 18 ? '#197b64' : '#a82139',
                    fontWeight: 700,
                  }}
                >
                  Calculated age: {currentAge} years {currentAge >= 18 ? '✓ Eligible' : '✗ Under 18'}
                </span>
              )}
            </label>

            <label>
              Weight in kg (Min 50 kg)
              <input
                type="number"
                step="0.5"
                min="50"
                max="250"
                value={form.weightKg}
                onChange={(e) => set('weightKg', e.target.value)}
                placeholder="e.g. 55.0"
              />
              <span style={{ fontSize: 11, color: '#718095', marginTop: 3 }}>
                Must be at least 50 kg for blood donation
              </span>
            </label>
          </div>

          {/* District selection: fallback to props.districts if provided, otherwise GeoSelector */}
          <div style={{ borderTop: '1px solid #e8edf2', paddingTop: 16, marginTop: 4 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>Location & Residential Area</h3>

            {districts && districts.length > 0 ? (
              <label>
                District
                <select
                  required
                  value={form.districtCode}
                  onChange={(e) => set('districtCode', e.target.value)}
                >
                  <option value="">Choose a district</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <GeoSelector
                value={{
                  provinceCode: form.provinceCode,
                  districtCode: form.districtCode,
                  dsCode: form.dsCode,
                  gnCode: form.gnCode,
                }}
                onChange={(geo) => {
                  setForm((prev) => ({
                    ...prev,
                    provinceCode: geo.provinceCode || '',
                    districtCode: geo.districtCode || '',
                    dsCode: geo.dsCode || '',
                    gnCode: geo.gnCode || '',
                  }));
                }}
                required={true}
                showGn={true}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
              <label>
                Town / Neighborhood
                <input
                  value={form.town}
                  onChange={(e) => set('town', e.target.value)}
                  placeholder="e.g. Maharagama"
                />
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
            </div>
          </div>

          {/* Privacy & Consent Options (Explicit Unchecked Toggles) */}
          <div style={{ borderTop: '1px solid #e8edf2', paddingTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>Privacy & Communication Preferences</h3>
            <p style={{ fontSize: 12, color: '#718095', margin: '0 0 12px 0' }}>
              Your location is never publicly exposed. Control your communication preferences below:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="checkbox-line" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.availableForContact}
                  onChange={(e) => set('availableForContact', e.target.checked)}
                />{' '}
                I agree to be contacted about donation opportunities
              </label>

              <label className="checkbox-line" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.campNotificationsOptIn}
                  onChange={(e) => set('campNotificationsOptIn', e.target.checked)}
                />{' '}
                Notify me about approved local donation camps
              </label>

              <label className="checkbox-line" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.smsConsent}
                  onChange={(e) => set('smsConsent', e.target.checked)}
                />{' '}
                Receive urgent SMS shortage alerts (requires phone number)
              </label>

              <label className="checkbox-line" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.emailConsent}
                  onChange={(e) => set('emailConsent', e.target.checked)}
                />{' '}
                Receive monthly community donor newsletter via email
              </label>
            </div>
          </div>

          {state.error && <div className="notice error">{state.error}</div>}
          {state.success && (
            <div className="notice success">
              <CheckCircle size={18} />
              <div>
                <strong>{state.success}</strong>
                {state.devToken && (
                  <div style={{ marginTop: 6, fontSize: 11 }}>
                    Demo Verification Token: <code>{state.devToken}</code>{' '}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => navigate('verify-email')}
                    >
                      Verify Now →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <button className="primary" disabled={state.loading} style={{ minHeight: 46 }}>
              {state.loading ? 'Creating account…' : 'Create donor account'} <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="outline"
              onClick={() => navigate('login')}
              style={{ minHeight: 46 }}
            >
              Sign in instead
            </button>
          </div>
        </form>

        <p className="form-foot" style={{ marginTop: 24, textAlign: 'center', color: '#718095' }}>
          Are you hospital or blood bank staff? Staff accounts are managed by authorized administrators via{' '}
          <button type="button" className="text-link" onClick={() => navigate('accept-invite')}>
            staff invitation
          </button>
          .
        </p>
      </section>
    </div>
  );
}
