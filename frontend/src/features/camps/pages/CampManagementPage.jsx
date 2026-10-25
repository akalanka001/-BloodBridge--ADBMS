import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Send,
  XCircle,
  Users,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { campsApi } from '../api/campsApi.js';
import { CampStatusBadge } from '../components/CampStatusBadge.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { campCapacity, campDate } from '../campDisplay.js';

export function CampManagementPage({ onNavigate, user }) {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cancellingCampId, setCancellingCampId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);

  const fetchCamps = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: pageSize, offset: (page - 1) * pageSize };
      if (activeTab !== 'ALL') params.status = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await campsApi.listManagedCamps(params);
      setCamps(res.data || []);
      setTotal(res.pagination?.total || 0);
      if (page > Math.max(1, res.pagination?.totalPages || 1)) setPage(Math.max(1, res.pagination?.totalPages || 1));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load camps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCamps();
  }, [activeTab, debouncedSearch, page, pageSize]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCamps();
  };

  const handleSubmitForApproval = async (campId) => {
    setActionLoading(true);
    setError(null);
    try {
      await campsApi.submitCamp(campId);
      setSuccess('Camp submitted for administrative approval.');
      fetchCamps();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit camp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (campId) => {
    setActionLoading(true);
    setError(null);
    try {
      await campsApi.approveCamp(campId);
      setSuccess('Camp approved and published for donor discovery.');
      fetchCamps();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to approve camp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling this camp.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await campsApi.cancelCamp(cancellingCampId, cancelReason.trim());
      setSuccess('Camp has been cancelled.');
      setCancellingCampId(null);
      setCancelReason('');
      fetchCamps();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to cancel camp');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'All Camps' },
    { key: 'DRAFT', label: 'Draft' },
    { key: 'PENDING', label: 'Pending Approval' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={24} color="#dc2626" />
            Donation Camp Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Coordinate, schedule, approve, and track community and hospital blood donation drives.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('create-camp')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <PlusCircle size={18} />
          Create New Camp
        </button>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              aria-pressed={activeTab === tab.key}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: activeTab === tab.key ? '1px solid #dc2626' : '1px solid #e2e8f0',
                backgroundColor: activeTab === tab.key ? '#fee2e2' : '#ffffff',
                color: activeTab === tab.key ? '#991b1b' : '#475569',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search by title or town..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '12px 14px' }}>Camp Title</th>
              <th style={{ padding: '12px 14px' }}>Coordinating Bank</th>
              <th style={{ padding: '12px 14px' }}>Organizer</th>
              <th style={{ padding: '12px 14px' }}>Venue / Locality</th>
              <th style={{ padding: '12px 14px' }}>Schedule</th>
              <th style={{ padding: '12px 14px' }}>Capacity / Registered</th>
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  Loading donation camps...
                </td>
              </tr>
            ) : camps.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No donation camps found for the selected criteria.
                </td>
              </tr>
            ) : (
              camps.map((camp) => (
                <tr key={camp.camp_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                    {camp.title}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    {camp.blood_bank_name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    {camp.organizer_name}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {camp.town} ({camp.district_name || 'District'})
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8rem' }}>
                    {campDate(camp.starts_at)}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    {campCapacity(camp)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <CampStatusBadge status={camp.status} />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        title="View Details"
                        onClick={() => onNavigate && onNavigate('camp-details', { campId: camp.camp_id })}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                      >
                        <Eye size={14} color="#0f172a" />
                      </button>

                      {camp.status === 'DRAFT' && (
                        <>
                          <button
                            type="button"
                            title="Edit Draft"
                            onClick={() => onNavigate && onNavigate('edit-camp', { camp })}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                          >
                            <Edit size={14} color="#0284c7" />
                          </button>
                          <button
                            type="button"
                            title="Submit for Approval"
                            disabled={actionLoading}
                            onClick={() => handleSubmitForApproval(camp.camp_id)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', cursor: 'pointer' }}
                          >
                            <Send size={14} color="#059669" />
                          </button>
                        </>
                      )}

                      {camp.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'BANK_STAFF') && (
                        <button
                          type="button"
                          title="Approve Camp"
                          disabled={actionLoading}
                          onClick={() => handleApprove(camp.camp_id)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #86efac', backgroundColor: '#dcfce7', cursor: 'pointer', color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Approve
                        </button>
                      )}

                      {['APPROVED', 'PENDING'].includes(camp.status) && (
                        <button
                          type="button"
                          title="Cancel Camp"
                          onClick={() => setCancellingCampId(camp.camp_id)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', cursor: 'pointer' }}
                        >
                          <XCircle size={14} color="#dc2626" />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Registrations"
                        onClick={() => onNavigate && onNavigate('camp-registrations', { campId: camp.camp_id })}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                      >
                        <Users size={14} color="#475569" />
                      </button>

                      <button
                        type="button"
                        title="Attendance / Check-in"
                        onClick={() => onNavigate && onNavigate('camp-attendance', { campId: camp.camp_id })}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
                      >
                        <UserCheck size={14} color="#059669" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
      {/* Cancellation Modal */}
      {cancellingCampId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b' }}>Cancel Donation Camp</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
              Please provide an official justification for cancelling this camp. Registered donors and coordinating teams will be notified.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Inclement weather conditions / venue renovation / emergency rescheduling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCancellingCampId(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer' }}
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCancel}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
