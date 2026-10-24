import React, { useState } from 'react';
import {
  Heart,
  Droplet,
  Calendar,
  Building2,
  ShieldCheck,
  Search,
  Filter,
  FileCheck,
  Award,
} from 'lucide-react';

export function DonationHistoryPage({ donations = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  const filteredDonations = donations.filter((dn) => {
    const matchesSearch =
      (dn.location_name || dn.blood_bank_name || dn.camp_title || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesYear =
      yearFilter === 'ALL' ||
      (dn.collected_at && new Date(dn.collected_at).getFullYear().toString() === yearFilter);
    return matchesSearch && matchesYear;
  });

  const totalVolume = donations.reduce(
    (acc, d) => acc + (Number(d.collected_volume_ml) || 450),
    0,
  );

  const years = Array.from(
    new Set(
      donations
        .map((d) => d.collected_at && new Date(d.collected_at).getFullYear())
        .filter(Boolean),
    ),
  );

  return (
    <div className="donation-history-page">
      <div className="history-page-header">
        <div>
          <h2 className="page-heading">Verified Donation History</h2>
          <p className="page-subheading">
            Official record of completed blood and component donations under the National Blood Bank network.
          </p>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="history-kpi-row">
        <div className="hist-kpi-card">
          <div className="hist-kpi-icon bg-rose-50 text-rose-600">
            <Heart size={20} />
          </div>
          <div>
            <span className="hist-kpi-label">Completed Collections</span>
            <strong className="hist-kpi-val">{donations.length}</strong>
          </div>
        </div>

        <div className="hist-kpi-card">
          <div className="hist-kpi-icon bg-blue-50 text-blue-600">
            <Droplet size={20} />
          </div>
          <div>
            <span className="hist-kpi-label">Total Volume</span>
            <strong className="hist-kpi-val">{(totalVolume / 1000).toFixed(2)} Liters</strong>
          </div>
        </div>

        <div className="hist-kpi-card">
          <div className="hist-kpi-icon bg-emerald-50 text-emerald-600">
            <Award size={20} />
          </div>
          <div>
            <span className="hist-kpi-label">Estimated Lives Supported</span>
            <strong className="hist-kpi-val text-emerald-700">{donations.length * 3}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="history-controls-row">
        <div className="search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by hospital, blood bank or camp venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="history-search-input"
          />
        </div>

        <div className="filter-select-wrap">
          <Filter size={16} className="text-slate-400" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="history-select"
          >
            <option value="ALL">All Years</option>
            {years.map((yr) => (
              <option key={yr} value={yr.toString()}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Donation Records */}
      {filteredDonations.length === 0 ? (
        <div className="history-empty-card">
          <div className="empty-icon-circle">
            <FileCheck size={32} className="text-slate-400" />
          </div>
          <h4 className="text-lg font-bold text-navy mt-3">No verified donations found</h4>
          <p className="text-slate-500 max-w-md mx-auto text-sm mt-1">
            {searchTerm || yearFilter !== 'ALL'
              ? 'No donation records matched your search filters.'
              : 'Donation records are verified and added to this ledger following in-person staff screening and collection.'}
          </p>
        </div>
      ) : (
        <div className="history-records-list">
          {filteredDonations.map((item, idx) => (
            <div key={item.id || item.donation_id || idx} className="donation-record-card">
              <div className="record-main-info">
                <div className="record-date-block">
                  <span className="rec-day">
                    {new Date(item.collected_at).toLocaleDateString('en-GB', { day: '2-digit' })}
                  </span>
                  <span className="rec-month">
                    {new Date(item.collected_at).toLocaleDateString('en-GB', { month: 'short' })}
                  </span>
                  <span className="rec-year">
                    {new Date(item.collected_at).getFullYear()}
                  </span>
                </div>

                <div className="record-details">
                  <h4 className="rec-facility-name">
                    {item.location_name || item.blood_bank_name || item.camp_title || 'National Blood Transfusion Service'}
                  </h4>
                  <div className="rec-meta-tags">
                    <span className="rec-meta-item">
                      <Calendar size={13} className="text-slate-400 inline mr-1" />
                      {item.formatted_date || new Date(item.collected_at).toLocaleDateString()}
                    </span>
                    <span className="rec-dot">•</span>
                    <span className="rec-meta-item">
                      <Droplet size={13} className="text-rose-500 inline mr-1" />
                      {item.collected_volume_ml || 450} mL Whole Blood
                    </span>
                  </div>
                </div>
              </div>

              <div className="record-status-col">
                <span className="rec-status-badge verified">
                  <ShieldCheck size={14} className="inline mr-1 text-emerald-600" />
                  Verified & Processed
                </span>
                <span className="rec-type-note">Clinical Batch Recorded</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinical Disclaimer */}
      <div className="history-disclaimer-note mt-6">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Notice:</strong> Incomplete, medically deferred, or rejected donations are excluded from this verified clinical history.
          Transfusion safety clearances and component separation are strictly governed by NBTS standard operating procedures.
        </p>
      </div>
    </div>
  );
}
