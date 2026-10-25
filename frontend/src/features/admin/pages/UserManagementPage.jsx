import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { getUsers, getStaffMemberships } from '../api/adminApi.js';
import { InviteStaffModal } from '../components/InviteStaffModal.jsx';
import { StaffMembershipModal } from '../components/StaffMembershipModal.jsx';
import { UserStatusModal } from '../components/UserStatusModal.jsx';
import { DonorClaimReview } from '../components/DonorClaimReview.jsx';

export function UserManagementPage({ token }) {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'memberships' | 'claims'

  // Users state
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  // Memberships state
  const [memberships, setMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);

  // Selected user for modals
  const [selectedUserForStatus, setSelectedUserForStatus] = useState(null);
  const [selectedUserForMembership, setSelectedUserForMembership] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const res = await getUsers(token, {
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter !== '' ? statusFilter : undefined,
        limit: 50,
      });
      setUsers(res.data?.users || []);
      setTotalUsers(res.data?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadMemberships = async () => {
    setLoadingMemberships(true);
    try {
      const res = await getStaffMemberships(token);
      setMemberships(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMemberships(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') {
      loadUsers();
    } else if (activeSubTab === 'memberships') {
      loadMemberships();
    }
  }, [token, activeSubTab, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
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
            Identity & Authorization
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            Users, Roles & Staff Memberships
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Manage system user accounts, institutional assignments, status activations, and staff onboarding invitations.
          </p>
        </div>

        <button
          id="btn-invite-staff-header"
          type="button"
          className="dash-btn-primary"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setInviteModalOpen(true)}
        >
          <UserPlus size={16} /> Invite Healthcare Staff
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

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E8ECF2', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'users' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeSubTab === 'users' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          User Accounts ({totalUsers || users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('memberships')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'memberships' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeSubTab === 'memberships' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          Staff Memberships
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('claims')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'claims' ? '3px solid #DB3654' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: activeSubTab === 'claims' ? '#DB3654' : '#7A8B9E',
            cursor: 'pointer',
          }}
        >
          Donor Link Claims
        </button>
      </div>

      {/* TAB 1: ALL USERS */}
      {activeSubTab === 'users' && (
        <div className="dash-card">
          {/* Filters Bar */}
          <form
            onSubmit={handleSearchSubmit}
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
                id="search-users-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by full name or email…"
                className="reg-input"
                style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13 }}
              />
            </div>

            <select
              id="filter-user-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="reg-input"
              style={{ width: 160, height: 38, fontSize: 13 }}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="BANK_STAFF">BANK_STAFF</option>
              <option value="HOSPITAL_STAFF">HOSPITAL_STAFF</option>
              <option value="DONOR">DONOR</option>
            </select>

            <select
              id="filter-user-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="reg-input"
              style={{ width: 140, height: 38, fontSize: 13 }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              id="btn-apply-user-filter"
              type="submit"
              className="dash-btn-primary"
              style={{ minHeight: 38, padding: '0 16px', fontSize: 13 }}
            >
              Search
            </button>
            <button
              type="button"
              className="reg-btn-outline"
              style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }}
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                loadUsers();
              }}
            >
              Reset
            </button>
          </form>

          {/* Users Table */}
          {loadingUsers ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading users…</p>
          ) : users.length === 0 ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No user records match current filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>User / Account</th>
                    <th style={{ padding: '10px 12px' }}>Role</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Memberships</th>
                    <th style={{ padding: '10px 12px' }}>Registered</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#1D3043', display: 'block' }}>{u.full_name}</strong>
                        <span style={{ fontSize: 12, color: '#7A8B9E' }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              u.role === 'ADMIN'
                                ? '#FFF5F6'
                                : u.role === 'BANK_STAFF'
                                ? '#E6F7F1'
                                : u.role === 'HOSPITAL_STAFF'
                                ? '#EFF6FF'
                                : '#F1F5F9',
                            color:
                              u.role === 'ADMIN'
                                ? '#DB3654'
                                : u.role === 'BANK_STAFF'
                                ? '#16A085'
                                : u.role === 'HOSPITAL_STAFF'
                                ? '#3B82F6'
                                : '#64748B',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: u.is_active ? '#E6F7F1' : '#FEE2E2',
                            color: u.is_active ? '#16A085' : '#EF4444',
                          }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#41566D', fontSize: 12 }}>
                        {u.memberships && u.memberships.length > 0 ? (
                          u.memberships.map((m, idx) => (
                            <div key={idx} style={{ lineHeight: 1.4 }}>
                              {m.hospital_name || m.blood_bank_name} ({m.is_active ? 'Active' : 'Revoked'})
                            </div>
                          ))
                        ) : (
                          <span style={{ color: '#A0AEC0' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#7A8B9E', fontSize: 12 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            id={`btn-assign-membership-${u.id}`}
                            type="button"
                            className="reg-btn-outline"
                            style={{ height: 32, padding: '0 10px', fontSize: 11 }}
                            onClick={() => setSelectedUserForMembership(u)}
                          >
                            Assign Staff
                          </button>
                          <button
                            id={`btn-toggle-status-${u.id}`}
                            type="button"
                            className="reg-btn-outline"
                            style={{
                              height: 32,
                              padding: '0 10px',
                              fontSize: 11,
                              color: u.is_active ? '#EF4444' : '#16A085',
                              borderColor: u.is_active ? '#FCA5A5' : '#6EE7B7',
                            }}
                            onClick={() => setSelectedUserForStatus(u)}
                          >
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF MEMBERSHIPS */}
      {activeSubTab === 'memberships' && (
        <div className="dash-card">
          <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="dash-card-title">Institutional Staff Affiliations</h2>
              <p className="dash-card-subtitle">Active and historical hospital and blood bank authorization bindings</p>
            </div>
            <button
              type="button"
              className="dash-btn-outline"
              style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
              onClick={loadMemberships}
            >
              <RefreshCw size={12} className={loadingMemberships ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {loadingMemberships ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading memberships…</p>
          ) : memberships.length === 0 ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No staff memberships registered.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Staff Name</th>
                    <th style={{ padding: '10px 12px' }}>Role</th>
                    <th style={{ padding: '10px 12px' }}>Institution Type</th>
                    <th style={{ padding: '10px 12px' }}>Institution Name</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#1D3043' }}>{m.user_name}</strong>
                        <div style={{ fontSize: 11, color: '#7A8B9E' }}>{m.user_email}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1D3043' }}>{m.user_role}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#41566D' }}>{m.institution_type}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#1D3043' }}>{m.institution_name}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: m.is_active ? '#E6F7F1' : '#FEE2E2',
                            color: m.is_active ? '#16A085' : '#EF4444',
                          }}
                        >
                          {m.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DONOR LINK CLAIMS */}
      {activeSubTab === 'claims' && <DonorClaimReview token={token} />}

      {/* Modals */}
      <InviteStaffModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        token={token}
        onSuccess={() => {
          loadUsers();
          loadMemberships();
        }}
      />

      <StaffMembershipModal
        isOpen={Boolean(selectedUserForMembership)}
        user={selectedUserForMembership}
        onClose={() => setSelectedUserForMembership(null)}
        token={token}
        onSuccess={() => {
          loadUsers();
          loadMemberships();
        }}
      />

      <UserStatusModal
        isOpen={Boolean(selectedUserForStatus)}
        user={selectedUserForStatus}
        onClose={() => setSelectedUserForStatus(null)}
        token={token}
        onSuccess={loadUsers}
      />
    </div>
  );
}
