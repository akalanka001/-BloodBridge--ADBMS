import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { donorApi } from '../api/donorApi.js';

export function FindBloodBanksPage({ token, onBookAppointment }) {
  const [bloodBanks, setBloodBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  useEffect(() => {
    donorApi
      .getBloodBanks(token)
      .then((res) => setBloodBanks(res.data || []))
      .catch(() => setBloodBanks([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredBanks = bloodBanks.filter((bb) => {
    const q = search.toLowerCase();
    const matchesQuery =
      bb.name.toLowerCase().includes(q) ||
      (bb.district_name || '').toLowerCase().includes(q) ||
      (bb.address || '').toLowerCase().includes(q);
    const matchesDistrict =
      districtFilter === 'ALL' || bb.district_code === districtFilter;
    return matchesQuery && matchesDistrict;
  });

  const districts = Array.from(
    new Set(bloodBanks.map((b) => b.district_name || b.district_code).filter(Boolean)),
  );

  return (
    <div className="find-blood-banks-page">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Verified Blood Banks</h2>
          <p className="page-subheading">
            Locate accredited hospital blood banks and regional transfusion centers across Sri Lanka.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar mb-6">
        <div className="search-box-input flex-1">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search blood banks by name, city or location..."
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
          <p className="text-sm text-slate-500 mt-2">Loading verified blood banks...</p>
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="empty-state-card text-center py-12 bg-white rounded-xl border border-slate-200">
          <Building2 size={36} className="text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-navy mt-3">No blood banks matched your search</h4>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search query or district filter.</p>
        </div>
      ) : (
        <div className="blood-banks-card-grid">
          {filteredBanks.map((bb) => (
            <div key={bb.id} className="blood-bank-card">
              <div className="bb-card-top">
                <div className="bb-icon-circle">
                  <Building2 size={20} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="bb-name">{bb.name}</h4>
                  <div className="bb-district-tag">
                    <MapPin size={13} className="text-slate-400 inline mr-1" />
                    <span>{bb.district_name || bb.district_code || 'Sri Lanka'}</span>
                  </div>
                </div>
              </div>

              <div className="bb-card-body">
                {bb.contact_phone && (
                  <div className="bb-info-line">
                    <Phone size={14} className="text-slate-400" />
                    <span>{bb.contact_phone}</span>
                  </div>
                )}
                <div className="bb-status-line">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800">
                    Accredited National Transfusion Center
                  </span>
                </div>
              </div>

              <div className="bb-card-footer">
                <button
                  type="button"
                  onClick={() => onBookAppointment && onBookAppointment(bb)}
                  className="btn-primary w-full text-xs py-2 inline-flex items-center justify-center gap-2"
                >
                  <Calendar size={14} />
                  Book Appointment Here
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
