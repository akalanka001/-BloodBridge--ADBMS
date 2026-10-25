import React, { useEffect, useRef, useState } from 'react';
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
import { Pagination } from '../../../components/ui/Pagination.jsx';

export function DonationHistoryPage({ donations = [], loading = false, pagination, page = 1, onPageChange, onFiltersChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const onFiltersChangeRef = useRef(onFiltersChange);
  useEffect(() => { onFiltersChangeRef.current = onFiltersChange; }, [onFiltersChange]);
  useEffect(() => {
    if (!onFiltersChangeRef.current) return undefined;
    if (yearFilter && !/^\d{4}$/.test(yearFilter)) return undefined;
    const timer = setTimeout(() => onFiltersChangeRef.current?.({ search: searchTerm.trim(), year: yearFilter }), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, yearFilter]);

  const filteredDonations = onFiltersChange ? donations : donations.filter((dn) => {
    const matchesSearch =
      (dn.location_name || dn.blood_bank_name || dn.camp_title || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesYear =
      !yearFilter ||
      (dn.collected_at && new Date(dn.collected_at).getFullYear().toString() === yearFilter);
    return matchesSearch && matchesYear;
  });

  const totalVolume = donations.reduce(
    (acc, d) => acc + (Number(d.collected_volume_ml) || 450),
    0,
  );

  return (
    <div className="donation-history-page">
      <div className="history-page-header">
        <div>
          <h2 className="page-heading">Verified Donation History</h2>
          <p className="page-subheading">
            Donation records verified through the prototype’s registered blood bank and camp workflows.
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
            <span className="hist-kpi-label">Verified collections</span>
            <strong className="hist-kpi-val">{pagination?.total ?? donations.length}</strong>
          </div>
        </div>

        <div className="hist-kpi-card">
          <div className="hist-kpi-icon bg-blue-50 text-blue-600">
            <Droplet size={20} />
          </div>
          <div>
            <span className="hist-kpi-label">Volume on this page</span>
            <strong className="hist-kpi-val">{(totalVolume / 1000).toFixed(2)} Liters</strong>
          </div>
        </div>

        <div className="hist-kpi-card">
          <div className="hist-kpi-icon bg-emerald-50 text-emerald-600">
            <Award size={20} />
          </div>
          <div>
            <span className="hist-kpi-label">Current page</span>
            <strong className="hist-kpi-val text-emerald-700">{page}</strong>
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
          <input
            type="number"
            min="1990"
            max={new Date().getFullYear()}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="history-select"
            aria-label="Filter by year"
            placeholder="Year"
          />
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
            {searchTerm || yearFilter
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
                    {item.location_name || item.blood_bank_name || item.camp_title || 'Verified donor history'}
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
      {pagination && <Pagination page={page} pageSize={pagination.pageSize || 10} total={pagination.total || 0} onPageChange={onPageChange} loading={loading} />}

      {/* Clinical Disclaimer */}
      <div className="history-disclaimer-note mt-6">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Notice:</strong> This prototype displays records created by authorized staff. It does not provide donor eligibility or transfusion clearance; screening, component handling, and release decisions remain with authorized healthcare staff under applicable procedures.
        </p>
      </div>
    </div>
  );
}
