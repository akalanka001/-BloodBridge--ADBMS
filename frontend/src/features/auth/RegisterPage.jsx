import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Calendar,
  Scale,
  MapPin,
  Map,
  Home,
  Droplet,
  ChevronDown,
} from 'lucide-react';
import { authApi } from '../../lib/authApi.js';
import { navigate } from '../../lib/navigation.js';

const FALLBACK_DISTRICTS = [
  { code: 'CO', name: 'Colombo' },
  { code: 'GA', name: 'Gampaha' },
  { code: 'KA', name: 'Kalutara' },
  { code: 'KD', name: 'Kandy' },
  { code: 'MT', name: 'Matale' },
  { code: 'NE', name: 'Nuwara Eliya' },
  { code: 'GL', name: 'Galle' },
  { code: 'MR', name: 'Matara' },
  { code: 'HB', name: 'Hambantota' },
  { code: 'JA', name: 'Jaffna' },
  { code: 'KU', name: 'Kurunegala' },
  { code: 'AN', name: 'Anuradhapura' },
  { code: 'BD', name: 'Badulla' },
  { code: 'RN', name: 'Ratnapura' },
];

export function RegisterPage({ districts: propDistricts = null, onDone = () => {} }) {
  const [districtsList, setDistrictsList] = useState(propDistricts || FALLBACK_DISTRICTS);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    weightKg: '',
    districtCode: '',
    town: '',
    bloodTypeCode: '',
    availableForContact: false,
    campNotificationsOptIn: false,
    smsConsent: false,
    emailConsent: false,
  });

  const [state, setState] = useState({ loading: false, error: '', success: '', devToken: '' });

  useEffect(() => {
    if (propDistricts && propDistricts.length > 0) {
      setDistrictsList(propDistricts);
      return;
    }
    // Fetch districts from backend
    fetch('/api/v1/geography/districts')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setDistrictsList(data.data);
        }
      })
      .catch(() => {
        // Keep fallback districts
      });
  }, [propDistricts]);

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
    <div className="auth-layout" style={{ padding: '32px 16px' }}>
      <section className="reg-card">
        {/* Header Tag */}
        <div className="reg-badge-row">
          <span className="reg-badge-pill">Donor registration</span>
          <span className="reg-badge-sub">· Academic Prototype</span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="reg-title">Join the BloodBridge community</h1>
        <p className="reg-subtitle">
          Connect with local blood donation drives and emergency appeals in Sri Lanka. Use fictional
          demonstration data during evaluation.
        </p>

        {/* National Donor Eligibility Criteria Banner */}
        <div className="reg-alert-box">
          <ShieldAlert className="reg-alert-icon" size={22} />
          <div>
            <div className="reg-alert-title">National Donor Eligibility Criteria</div>
            <div className="reg-alert-desc">
              Donors must be at least 18 years of age (up to 65 years) and weigh at least 50 kg.
              <br />
              Full medical screening occurs privately during collection by certified healthcare professionals.
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          {/* Section 1: Personal Information */}
          <div className="reg-section" style={{ marginTop: 0 }}>
            <div className="reg-section-header">
              <User className="reg-section-icon" size={20} />
              <div>
                <h2 className="reg-section-title">Personal Information</h2>
                <p className="reg-section-desc">Provide your basic details to create your donor account.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Full name <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <User className="reg-leading-icon" size={18} />
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    className="reg-input"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Email <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Mail className="reg-leading-icon" size={18} />
                  <input
                    required
                    type="email"
                    className="reg-input"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Password <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Lock className="reg-leading-icon" size={18} />
                  <input
                    required
                    minLength={10}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="reg-input reg-input-with-trailing"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="At least 10 characters"
                  />
                  <button
                    type="button"
                    className="reg-trailing-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Confirm password <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Lock className="reg-leading-icon" size={18} />
                  <input
                    minLength={10}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="reg-input reg-input-with-trailing"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    className="reg-trailing-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Contact & Basic Details */}
          <div className="reg-section">
            <div className="reg-section-header">
              <Phone className="reg-section-icon" size={20} />
              <div>
                <h2 className="reg-section-title">Contact & Basic Details</h2>
                <p className="reg-section-desc">Help us reach you and ensure you meet basic eligibility criteria.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>Contact phone (optional)</span>
                <div className="reg-input-wrap">
                  <Phone className="reg-leading-icon" size={18} />
                  <input
                    type="tel"
                    className="reg-input"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="07X XXX XXXX"
                  />
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Date of birth <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Calendar className="reg-leading-icon" size={18} />
                  <input
                    type="date"
                    className="reg-input"
                    value={form.birthDate}
                    onChange={(e) => set('birthDate', e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  />
                </div>
                {currentAge !== null && (
                  <span
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      color: currentAge >= 18 ? '#16a34a' : '#dc2626',
                      fontWeight: 600,
                    }}
                  >
                    Calculated age: {currentAge} years {currentAge >= 18 ? '✓ Eligible' : '✗ Under 18'}
                  </span>
                )}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  Weight in kg <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Scale className="reg-leading-icon" size={18} />
                  <input
                    type="number"
                    step="0.5"
                    min="50"
                    max="250"
                    className="reg-input"
                    value={form.weightKg}
                    onChange={(e) => set('weightKg', e.target.value)}
                    placeholder="e.g. 55.0"
                  />
                </div>
                <span className="reg-hint">Must be at least 50 kg for blood donation.</span>
              </label>
            </div>
          </div>

          {/* Section 3: Location & Residential Area */}
          <div className="reg-section">
            <div className="reg-section-header">
              <MapPin className="reg-section-icon" size={20} />
              <div>
                <h2 className="reg-section-title">Location & Residential Area</h2>
                <p className="reg-section-desc">Select your area to help us find nearby donation opportunities.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>
                  District <span className="reg-req">*</span>
                </span>
                <div className="reg-input-wrap">
                  <Map className="reg-leading-icon" size={18} />
                  <select
                    required
                    aria-label="District"
                    className="reg-select"
                    value={form.districtCode}
                    onChange={(e) => set('districtCode', e.target.value)}
                  >
                    <option value="">Select district</option>
                    {districtsList.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="reg-select-chevron" size={18} />
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>Town / Neighborhood</span>
                <div className="reg-input-wrap">
                  <Home className="reg-leading-icon" size={18} />
                  <input
                    className="reg-input"
                    value={form.town}
                    onChange={(e) => set('town', e.target.value)}
                    placeholder="e.g. Maharagama"
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                <span>Blood group (optional, confirm medically)</span>
                <div className="reg-input-wrap">
                  <Droplet className="reg-leading-icon" size={18} />
                  <select
                    className="reg-select"
                    value={form.bloodTypeCode}
                    onChange={(e) => set('bloodTypeCode', e.target.value)}
                  >
                    <option value="">Select blood group</option>
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => (
                      <option value={t} key={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="reg-select-chevron" size={18} />
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Communication Preferences */}
          <div className="reg-section">
            <div className="reg-section-header">
              <Mail className="reg-section-icon" size={20} />
              <div>
                <h2 className="reg-section-title">Communication Preferences</h2>
                <p className="reg-section-desc">
                  Your location is never publicly exposed. Control your communication preferences below.
                </p>
              </div>
            </div>

            <div className="reg-pref-box">
              <label className="reg-pref-item">
                <input
                  type="checkbox"
                  checked={form.availableForContact}
                  onChange={(e) => set('availableForContact', e.target.checked)}
                />
                <span>I agree to be contacted about donation opportunities</span>
              </label>

              <label className="reg-pref-item">
                <input
                  type="checkbox"
                  checked={form.campNotificationsOptIn}
                  onChange={(e) => set('campNotificationsOptIn', e.target.checked)}
                />
                <span>Notify me about approved local donation camps</span>
              </label>

              <label className="reg-pref-item">
                <input
                  type="checkbox"
                  checked={form.smsConsent}
                  onChange={(e) => set('smsConsent', e.target.checked)}
                />
                <span>Receive urgent SMS shortage alerts (requires phone number)</span>
              </label>

              <label className="reg-pref-item">
                <input
                  type="checkbox"
                  checked={form.emailConsent}
                  onChange={(e) => set('emailConsent', e.target.checked)}
                />
                <span>Receive monthly community donor newsletter via email</span>
              </label>
            </div>
          </div>

          {/* Notification Feedback Messages */}
          {state.error && (
            <div className="notice error" style={{ marginTop: 18 }}>
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="notice success" style={{ marginTop: 18 }}>
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

          {/* Side-by-side action buttons */}
          <div className="reg-actions">
            <button type="submit" className="reg-btn-primary" disabled={state.loading}>
              <span>{state.loading ? 'Creating account…' : 'Create donor account'}</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="reg-btn-outline"
              onClick={() => navigate('login')}
            >
              Sign in instead
            </button>
          </div>
        </form>

        {/* Staff invitation note */}
        <p className="reg-foot">
          Are you hospital or blood bank staff? Staff accounts are managed by authorized administrators via{' '}
          <button type="button" className="reg-staff-link" onClick={() => navigate('accept-invite')}>
            staff invitation.
          </button>
        </p>
      </section>
    </div>
  );
}
