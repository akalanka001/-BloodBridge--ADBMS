import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  User,
  Heart,
  MapPin,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Calendar,
  Scale,
  ShieldCheck,
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
    province: 'Western',
    districtCode: '',
    dsDivision: '',
    gnDivision: '',
    town: '',
    bloodTypeCode: '',
    availableForContact: false,
    campNotificationsOptIn: false,
    smsConsent: false,
    emailConsent: false,
    emergencyAppealOptIn: false,
  });

  const [state, setState] = useState({ loading: false, error: '', success: '', devToken: '' });

  useEffect(() => {
    if (propDistricts && propDistricts.length > 0) {
      setDistrictsList(propDistricts);
      return;
    }
    fetch('/api/v1/geography/districts')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setDistrictsList(data.data);
        }
      })
      .catch(() => {
        // Retain fallback districts
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

  const calculateStrength = (pwd) => {
    if (!pwd) return { percent: 0, color: 'var(--red)' };
    const score = Math.min(100, (pwd.length / 16) * 75 + (/[0-9]/.test(pwd) ? 12 : 0) + (/[!@#$%^&*]/.test(pwd) ? 13 : 0));
    const color = score > 85 ? '#16866c' : score > 55 ? '#d39936' : 'var(--red)';
    return { percent: score, color };
  };

  const strength = calculateStrength(form.password);

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
        emergencyAppealOptIn: form.emergencyAppealOptIn,
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
    <div className="container register-zone view" style={{ paddingBottom: 45 }}>
      <div className="register-card">
        {/* Header Tag and Title */}
        <div className="register-head">
          <div>
            <span className="tag">
              <Heart size={13} fill="currentColor" />
              <span>DONOR REGISTRATION</span>
            </span>
            <h1>Join the BloodBridge community</h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
              A few details help connect you with nearby opportunities. Clinical eligibility is assessed by authorized staff.
            </p>
          </div>
          <span className="icon-tile" style={{ flexShrink: 0 }}>
            <Heart size={26} />
          </span>
        </div>

        {/* Disclaimer Note */}
        <div className="note" style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={18} color="#16866c" />
          <span>Registration is not medical clearance. Optional notification consents remain off until you choose them.</span>
        </div>

        {/* National Eligibility Criteria Alert Box */}
        <div className="reg-alert-box" style={{ marginTop: 18 }}>
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
          {/* Section 1: Account Details */}
          <section className="form-section">
            <h3>
              <User size={18} />
              <span>01 · Account details</span>
            </h3>
            <p>Create a secure donor account using your own email address.</p>

            <div className="fieldrow">
              <div className="fgroup">
                <label htmlFor="reg-name">
                  Full name <span className="required">*</span>
                </label>
                <div className="input-wrap">
                  <User className="input-icon" size={17} />
                  <input
                    id="reg-name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                  />
                </div>
              </div>

              <div className="fgroup">
                <label htmlFor="reg-email">
                  Email address <span className="required">*</span>
                </label>
                <div className="input-wrap">
                  <Mail className="input-icon" size={17} />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="fieldrow" style={{ marginTop: 14 }}>
              <div className="fgroup">
                <label htmlFor="reg-password">
                  Password <span className="required">*</span>
                </label>
                <div className="input-wrap">
                  <Lock className="input-icon" size={17} />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    placeholder="At least 10 characters"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
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
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="fgroup">
                <label htmlFor="reg-confirm">Confirm password</label>
                <div className="input-wrap">
                  <Lock className="input-icon" size={17} />
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    minLength={10}
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 0,
                      background: 'transparent',
                      color: '#77889a',
                      cursor: 'pointer',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="password-strength" aria-hidden="true">
              <span style={{ width: `${strength.percent}%`, background: strength.color }} />
            </div>
            <p className="micro" style={{ margin: '7px 0 0' }}>
              Use at least 10 characters, ideally a unique passphrase.
            </p>
          </section>

          {/* Section 2: Personal & Contact Details */}
          <section className="form-section">
            <h3>
              <Heart size={18} />
              <span>02 · Personal &amp; contact details</span>
            </h3>
            <p>Medical measurements entered online are self-reported and do not certify eligibility.</p>

            <div className="fieldrow">
              <div className="fgroup">
                <label htmlFor="reg-phone">Phone number (optional)</label>
                <div className="input-wrap">
                  <Phone className="input-icon" size={17} />
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="07X XXX XXXX"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="fgroup">
                <label htmlFor="reg-dob">Date of birth (optional)</label>
                <div className="input-wrap">
                  <Calendar className="input-icon" size={17} />
                  <input
                    id="reg-dob"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set('birthDate', e.target.value)}
                  />
                </div>
                {currentAge !== null && (
                  <span className="micro" style={{ color: currentAge < 18 ? 'var(--red)' : '#16866c' }}>
                    Age: {currentAge} years old {currentAge < 18 ? '(Must be 18+ to donate)' : '✓ Eligible age'}
                  </span>
                )}
              </div>
            </div>

            <div className="fieldrow" style={{ marginTop: 14 }}>
              <div className="fgroup">
                <label htmlFor="reg-weight">Weight in kg (optional)</label>
                <div className="input-wrap">
                  <Scale className="input-icon" size={17} />
                  <input
                    id="reg-weight"
                    type="number"
                    step="0.5"
                    min="30"
                    max="250"
                    placeholder="e.g. 58"
                    value={form.weightKg}
                    onChange={(e) => set('weightKg', e.target.value)}
                  />
                </div>
                {form.weightKg && (
                  <span className="micro" style={{ color: Number(form.weightKg) < 50 ? 'var(--red)' : '#16866c' }}>
                    {Number(form.weightKg) < 50 ? 'Weight must be at least 50 kg' : '✓ Meets weight threshold'}
                  </span>
                )}
              </div>

              <div className="fgroup">
                <label htmlFor="reg-blood">Blood group (optional)</label>
                <select
                  id="reg-blood"
                  value={form.bloodTypeCode}
                  onChange={(e) => set('bloodTypeCode', e.target.value)}
                >
                  <option value="">Unknown / Not sure</option>
                  <option value="O-">O−</option>
                  <option value="O+">O+</option>
                  <option value="A-">A−</option>
                  <option value="A+">A+</option>
                  <option value="B-">B−</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB−</option>
                  <option value="AB+">AB+</option>
                </select>
                <span className="micro">Self-reported until verified by authorized staff.</span>
              </div>
            </div>
          </section>

          {/* Section 3: Your Location */}
          <section className="form-section">
            <h3>
              <MapPin size={18} />
              <span>03 · Your location</span>
            </h3>
            <p>Use the verified location hierarchy when available; fields load from the existing geography APIs.</p>

            <div className="fieldrow">
              <div className="fgroup">
                <label htmlFor="reg-province">Province (verified directory)</label>
                <select
                  id="reg-province"
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                >
                  <option value="Western">Western</option>
                  <option value="Central">Central</option>
                  <option value="Southern">Southern</option>
                  <option value="Northern">Northern</option>
                  <option value="North Western">North Western</option>
                  <option value="North Central">North Central</option>
                  <option value="Eastern">Eastern</option>
                  <option value="Uva">Uva</option>
                  <option value="Sabaragamuwa">Sabaragamuwa</option>
                </select>
              </div>

              <div className="fgroup">
                <label htmlFor="reg-district">
                  District <span className="required">*</span>
                </label>
                <select
                  id="reg-district"
                  required
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
              </div>
            </div>

            <div className="fieldrow" style={{ marginTop: 14 }}>
              <div className="fgroup">
                <label htmlFor="reg-ds">DS Division (when available)</label>
                <select
                  id="reg-ds"
                  value={form.dsDivision}
                  onChange={(e) => set('dsDivision', e.target.value)}
                >
                  <option value="">Select DS division</option>
                  <option value="COL">Colombo</option>
                  <option value="MAH">Maharagama</option>
                  <option value="THI">Thimbirigasyaya</option>
                </select>
              </div>

              <div className="fgroup">
                <label htmlFor="reg-gn">GN Division (when available)</label>
                <select
                  id="reg-gn"
                  value={form.gnDivision}
                  onChange={(e) => set('gnDivision', e.target.value)}
                >
                  <option value="">Select GN division</option>
                  <option value="sample">Sample subdivision</option>
                </select>
              </div>
            </div>

            <div className="fgroup" style={{ marginTop: 14 }}>
              <label htmlFor="reg-town">Town / locality (optional)</label>
              <input
                id="reg-town"
                placeholder="e.g. Maharagama"
                value={form.town}
                onChange={(e) => set('town', e.target.value)}
              />
            </div>
          </section>

          {/* Section 4: Communication Preferences */}
          <section className="form-section">
            <h3>
              <Mail size={18} />
              <span>04 · Communication preferences</span>
            </h3>
            <p>You can change your preferences later. All boxes are optional and unchecked by default.</p>

            <label className="check-item">
              <input
                type="checkbox"
                id="reg-contact"
                checked={form.availableForContact}
                onChange={(e) => set('availableForContact', e.target.checked)}
              />
              <span>I agree to be contacted about donation opportunities</span>
            </label>

            <label className="check-item">
              <input
                type="checkbox"
                id="reg-emergency"
                checked={form.emergencyAppealOptIn}
                onChange={(e) => set('emergencyAppealOptIn', e.target.checked)}
              />
              <span>I consent to emergency donation invitations.</span>
            </label>

            <label className="check-item">
              <input
                type="checkbox"
                id="reg-camps"
                checked={form.campNotificationsOptIn}
                onChange={(e) => set('campNotificationsOptIn', e.target.checked)}
              />
              <span>Notify me about approved local donation camps</span>
            </label>

            <label className="check-item">
              <input
                type="checkbox"
                id="reg-sms"
                checked={form.smsConsent}
                onChange={(e) => set('smsConsent', e.target.checked)}
              />
              <span>I agree to receive SMS messages.</span>
            </label>

            <label className="check-item">
              <input
                type="checkbox"
                id="reg-email-pref"
                checked={form.emailConsent}
                onChange={(e) => set('emailConsent', e.target.checked)}
              />
              <span>I agree to receive email messages.</span>
            </label>
          </section>

          {state.error && (
            <div className="notice error" style={{ marginTop: 18 }}>
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="notice success" style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
              <CheckCircle size={20} color="#16866c" />
              <div>
                <strong>{state.success}</strong>
                {state.devToken && (
                  <div style={{ marginTop: 6, fontSize: 11 }}>
                    Demo Verification Token: <code>{state.devToken}</code>{' '}
                    <button
                      type="button"
                      className="link"
                      onClick={() => navigate('verify-email')}
                    >
                      Verify Now →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Equal 50% columns in register-actions */}
          <div className="register-actions">
            <button
              type="submit"
              className="btn primary"
              disabled={state.loading}
            >
              <span>{state.loading ? 'Creating account…' : 'Create donor account'}</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={() => navigate('login')}
            >
              Sign in instead
            </button>
          </div>

          <p className="micro" style={{ margin: '15px 0 0', textAlign: 'center' }}>
            Are you hospital or blood bank staff? Staff accounts are managed by authorized administrators via{' '}
            <button
              type="button"
              className="link"
              onClick={() => navigate('accept-invite')}
            >
              staff invitation.
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
