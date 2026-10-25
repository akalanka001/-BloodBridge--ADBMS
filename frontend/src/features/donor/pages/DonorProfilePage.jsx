import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Weight,
  MapPin,
  Lock,
  ShieldCheck,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { GeoSelector } from '../../../components/forms/GeoSelector.jsx';
import { donorApi } from '../api/donorApi.js';

export function DonorProfilePage({ profile, token, onProfileUpdate }) {
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || profile?.full_name || '',
    phone: profile?.phone || '',
    birthDate: profile?.birth_date ? profile.birth_date.split('T')[0] : '',
    weightKg: profile?.weight_kg || '',
    town: profile?.town || '',
    bloodTypeCode: profile?.blood_type_code || '',
    provinceCode: profile?.province_code || '',
    districtCode: profile?.district_code || '',
    dsCode: profile?.ds_code || '',
    gnCode: profile?.gn_code || '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isMedicallyVerified = Boolean(profile?.is_medically_verified);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile.fullName || profile.full_name || prev.fullName,
        phone: profile.phone || prev.phone,
        birthDate: profile.birth_date ? profile.birth_date.split('T')[0] : prev.birthDate,
        weightKg: profile.weight_kg ?? prev.weightKg,
        town: profile.town || prev.town,
        bloodTypeCode: profile.blood_type_code || prev.bloodTypeCode,
        provinceCode: profile.province_code || '',
        districtCode: profile.district_code || prev.districtCode,
        dsCode: profile.ds_code || prev.dsCode,
        gnCode: profile.gn_code || prev.gnCode,
      }));
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGeoChange = (geo) => {
    setFormData((prev) => ({
      ...prev,
      provinceCode: geo.provinceCode ?? prev.provinceCode,
      districtCode: geo.districtCode ?? prev.districtCode,
      dsCode: geo.dsCode || null,
      gnCode: geo.gnCode || null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      fullName: formData.fullName.trim(),
      phone: formData.phone?.trim() || null,
      birthDate: formData.birthDate || null,
      weightKg: formData.weightKg ? Number(formData.weightKg) : null,
      town: formData.town?.trim() || null,
      districtCode: formData.districtCode,
      dsCode: formData.dsCode || null,
      gnCode: formData.gnCode || null,
    };

    // Only include self-reported blood group if not medically verified
    if (!isMedicallyVerified && formData.bloodTypeCode) {
      payload.bloodTypeCode = formData.bloodTypeCode;
    }

    try {
      const res = await donorApi.updateProfile(payload, token);
      setSuccess('Your profile has been successfully updated.');
      if (onProfileUpdate) onProfileUpdate(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="donor-profile-page max-w-4xl">
      <div className="profile-page-header mb-6">
        <h2 className="page-heading">My Profile</h2>
        <p className="page-subheading">
          Maintain your contact details, physical metrics, and Sri Lankan administrative location.
        </p>
      </div>

      {success && (
        <div className="alert-box alert-success mb-6 flex items-center gap-2">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-danger mb-6 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form-grid bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Personal Details */}
        <div className="form-section">
          <h3 className="section-title text-base font-bold text-navy mb-4 flex items-center gap-2">
            <User size={18} className="text-rose-600" />
            Personal & Identification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Account ID)</label>
              <div className="relative">
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="form-control bg-slate-100 text-slate-500 cursor-not-allowed pl-9"
                />
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Email is protected and tied to your authentication account.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX"
                  className="form-control pl-9"
                />
                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <div className="relative">
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="form-control pl-9"
                />
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                min="30"
                max="250"
                name="weightKg"
                value={formData.weightKg}
                onChange={handleChange}
                placeholder="e.g. 65.5"
                className="form-control"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Minimum safe weight for whole-blood donation is 50.0 kg.
              </span>
            </div>

            {/* Blood Type with Verified Protection */}
            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Blood Group</span>
                {isMedicallyVerified ? (
                  <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                    <ShieldCheck size={14} />
                    Medically Verified
                  </span>
                ) : (
                  <span className="text-xs text-amber-600">Self-Reported (Unverified)</span>
                )}
              </label>

              {isMedicallyVerified ? (
                <div className="relative">
                  <input
                    type="text"
                  value={formData.bloodTypeCode || 'Unknown'}
                    disabled
                    className="form-control bg-emerald-50 text-emerald-900 font-bold pl-9 cursor-not-allowed"
                  />
                  <Lock size={16} className="absolute left-3 top-3 text-emerald-600" />
                </div>
              ) : (
                <select
                  name="bloodTypeCode"
                  value={formData.bloodTypeCode}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="">-- Not known / Select --</option>
                  {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              )}
              {isMedicallyVerified && (
                <span className="text-xs text-slate-500 mt-1 block">
                  This blood group has been confirmed by clinical laboratory testing and cannot be altered via self-report.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Geographic Information */}
        <div className="form-section pt-4 border-t border-slate-100">
          <h3 className="section-title text-base font-bold text-navy mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-rose-600" />
            Administrative Location & Locality
          </h3>

          <div className="mb-4">
            <GeoSelector
              value={{
                provinceCode: formData.provinceCode,
                districtCode: formData.districtCode,
                dsCode: formData.dsCode,
                gnCode: formData.gnCode,
              }}
              onChange={handleGeoChange}
              required
            />
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Town / Locality Name</label>
            <input
              type="text"
              name="town"
              value={formData.town}
              onChange={handleChange}
              placeholder="e.g. Maharagama, Bambalapitiya"
              className="form-control"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
}
