import React, { useState, useEffect } from 'react';
import {
  Tent,
  MapPin,
  Calendar,
  Clock,
  Users,
  Search,
  CheckCircle,
  Loader2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { donorApi } from '../api/donorApi.js';

export function FindCampsPage({ token }) {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [registeringId, setRegisteringId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadCamps = async () => {
    setLoading(true);
    try {
      const res = await donorApi.getCamps('', token);
      setCamps(res.data || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamps();
  }, [token]);

  const handleRegister = async (campId) => {
    setRegisteringId(campId);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await donorApi.registerCamp(campId, token);
      setSuccessMsg('You are registered for this blood donation camp! Details sent to your notifications.');
      loadCamps();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRegisteringId(null);
    }
  };

  const filteredCamps = camps.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (c.title || '').toLowerCase().includes(q) ||
      (c.venue_name || '').toLowerCase().includes(q) ||
      (c.district_name || '').toLowerCase().includes(q);
    const matchesDistrict =
      districtFilter === 'ALL' || c.district_code === districtFilter;
    return matchesSearch && matchesDistrict;
  });

  const districts = Array.from(
    new Set(camps.map((c) => c.district_name || c.district_code).filter(Boolean)),
  );

  return (
    <div className="find-camps-page">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Approved Donation Camps</h2>
          <p className="page-subheading">
            Browse and register for community mobile donation drives authorized by the NBTS.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert-box alert-success mb-4 flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-danger mb-4 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls */}
      <div className="search-filter-bar mb-6">
        <div className="search-box-input flex-1">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search donation drives by venue, town or organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-sm focus:outline-none"
          />
        </div>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="district-filter-select"
        >
          <option value="ALL">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state-box">
          <Loader2 size={28} className="animate-spin text-rose-600 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Discovering nearby donation camps...</p>
        </div>
      ) : filteredCamps.length === 0 ? (
        <div className="empty-state-card text-center py-12 bg-white rounded-xl border border-slate-200">
          <Tent size={36} className="text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-navy mt-3">No active donation camps found</h4>
          <p className="text-slate-500 text-sm mt-1">
            New community camps are scheduled regularly. Check back soon or visit a permanent blood bank.
          </p>
        </div>
      ) : (
        <div className="camps-grid">
          {filteredCamps.map((camp) => (
            <div key={camp.id} className="camp-card">
              <div className="camp-card-header">
                <span className="camp-badge-approved">APPROVED DRIVE</span>
                <span className="camp-date-pill">
                  <Calendar size={12} className="inline mr-1" />
                  {new Date(camp.camp_date || camp.start_time).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              <h3 className="camp-title">{camp.title}</h3>

              <div className="camp-venue-block">
                <MapPin size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="venue-name">{camp.venue_name || camp.location_name}</strong>
                  <p className="venue-address text-xs text-slate-500">
                    {camp.town || camp.district_name || 'Sri Lanka'}
                  </p>
                </div>
              </div>

              <div className="camp-meta-grid">
                <div className="camp-meta-item">
                  <Clock size={13} className="text-slate-400" />
                  <span>
                    {camp.start_time ? new Date(camp.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00'} -{' '}
                    {camp.end_time ? new Date(camp.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '15:00'}
                  </span>
                </div>
                <div className="camp-meta-item">
                  <Users size={13} className="text-slate-400" />
                  <span>Target: {camp.target_units || 50} units</span>
                </div>
              </div>

              <div className="camp-footer-action">
                <button
                  type="button"
                  disabled={registeringId === camp.id}
                  onClick={() => handleRegister(camp.id)}
                  className="btn-primary w-full text-xs py-2.5 inline-flex items-center justify-center gap-2"
                >
                  {registeringId === camp.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Register to Donate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
