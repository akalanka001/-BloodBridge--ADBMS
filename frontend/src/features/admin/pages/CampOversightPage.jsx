import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Search,
  Filter,
  Users,
  Building2,
  MapPin,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { getCamps, getCampDetails } from '../api/adminApi.js';

export function CampOversightPage({ token }) {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Details modal
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadCamps = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCamps(token, {
        status: statusFilter || undefined,
      });
      let list = res.data || [];
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (c) =>
            c.title?.toLowerCase().includes(q) ||
            c.blood_bank_name?.toLowerCase().includes(q) ||
            c.district_name?.toLowerCase().includes(q)
        );
      }
      setCamps(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamps();
  }, [token, statusFilter]);

  const handleOpenDetails = async (campId) => {
    setLoadingDetails(true);
    try {
      const res = await getCampDetails(token, campId);
      setSelectedCamp(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        className="dash-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: 24,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#DB3654',
            }}
          >
            Campaign Operations
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            Mobile Donation Camp Oversight
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Operational monitoring across all draft, pending, approved, completed, and cancelled blood donation campaigns.
          </p>
        </div>

        <button
          type="button"
          className="dash-btn-outline"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={loadCamps}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Camps
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table Card */}
      <div className="dash-card">
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
            background: '#F8FAFC',
            padding: 14,
            borderRadius: 10,
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A8B9E' }}
            />
            <input
              id="search-camps-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title, blood bank, or district…"
              className="reg-input"
              style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13 }}
            />
          </div>

          <select
            id="filter-camps-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="reg-input"
            style={{ width: 160, height: 38, fontSize: 13 }}
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <button
            id="btn-filter-camps"
            type="button"
            className="dash-btn-primary"
            style={{ minHeight: 38, padding: '0 16px', fontSize: 13 }}
            onClick={loadCamps}
          >
            Filter
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading camp records…</p>
        ) : camps.length === 0 ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No donation camps match current filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Campaign Title</th>
                  <th style={{ padding: '10px 12px' }}>Coordinating Bank</th>
                  <th style={{ padding: '10px 12px' }}>Location</th>
                  <th style={{ padding: '10px 12px' }}>Schedule</th>
                  <th style={{ padding: '10px 12px' }}>Capacity / Signups</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {camps.map((camp) => (
                  <tr key={camp.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#1D3043', display: 'block' }}>{camp.title}</strong>
                      <span style={{ fontSize: 11, color: '#7A8B9E' }}>
                        ID: <code>{camp.id.slice(0, 8)}…</code>
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#41566D' }}>
                      {camp.blood_bank_name || 'Regional Blood Bank'}
                    </td>
                    <td style={{ padding: '12px', color: '#41566D' }}>
                      <strong>{camp.district_name || 'District'}</strong>
                      {camp.town && <div style={{ fontSize: 11, color: '#7A8B9E' }}>{camp.town}</div>}
                    </td>
                    <td style={{ padding: '12px', color: '#7A8B9E', fontSize: 12 }}>
                      {new Date(camp.starts_at).toLocaleDateString()}
                      <div style={{ fontSize: 11 }}>
                        {new Date(camp.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#1D3043' }}>
                      <strong>{camp.registered_count ?? camp.registration_count ?? 0}</strong> / {camp.capacity || '∞'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            camp.status === 'APPROVED'
                              ? '#E6F7F1'
                              : camp.status === 'PENDING'
                              ? '#FEF3C7'
                              : camp.status === 'CANCELLED'
                              ? '#FEE2E2'
                              : '#F1F5F9',
                          color:
                            camp.status === 'APPROVED'
                              ? '#16A085'
                              : camp.status === 'PENDING'
                              ? '#D97706'
                              : camp.status === 'CANCELLED'
                              ? '#EF4444'
                              : '#64748B',
                        }}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="reg-btn-outline"
                        style={{ height: 32, padding: '0 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleOpenDetails(camp.id)}
                      >
                        <Eye size={12} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Camp Details Modal */}
      {selectedCamp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(29, 48, 67, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="dash-card"
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043', margin: 0 }}>
                  {selectedCamp.title}
                </h2>
                <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 2 }}>
                  Status: <strong>{selectedCamp.status}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCamp(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7A8B9E' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#41566D' }}>
              <div><strong>Coordinating Bank:</strong> {selectedCamp.blood_bank_name}</div>
              <div><strong>Organizer:</strong> {selectedCamp.organizer_name || 'Community Organization'}</div>
              <div><strong>Venue:</strong> {selectedCamp.town}, {selectedCamp.district_name}</div>
              <div><strong>Schedule:</strong> {new Date(selectedCamp.starts_at).toLocaleString()} – {new Date(selectedCamp.ends_at).toLocaleString()}</div>
              <div><strong>Capacity:</strong> {selectedCamp.capacity || 'Unlimited'} donors</div>
              <div><strong>Description:</strong> {selectedCamp.description || 'No description provided.'}</div>
              {selectedCamp.cancellation_reason && (
                <div style={{ color: '#EF4444' }}>
                  <strong>Cancellation Reason:</strong> {selectedCamp.cancellation_reason}
                </div>
              )}
            </div>

            <button
              type="button"
              className="dash-btn-primary"
              style={{ width: '100%', height: 40, marginTop: 20 }}
              onClick={() => setSelectedCamp(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
