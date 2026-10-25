import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Clock,
  AlertTriangle,
  CalendarCheck,
  MailCheck,
  TrendingUp,
  UserPlus,
  PlusCircle,
  FileCheck,
  Activity,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { getAdminDashboard } from '../api/adminApi.js';
import { DonorClaimReview } from '../components/DonorClaimReview.jsx';
import { InviteStaffModal } from '../components/InviteStaffModal.jsx';
import { InstitutionModal } from '../components/InstitutionModal.jsx';

export function AdminOverview({ token, onNavigateTab = () => {} }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminDashboard(token);
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const kpis = data?.kpis || {};
  const recentAudit = data?.recentAudit || [];
  const recentCamps = data?.recentCamps || [];
  const notificationWarnings = data?.notificationWarnings || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Welcome & Quick Actions Bar */}
      <div
        className="dash-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'linear-gradient(135deg, #1D3043 0%, #2A435D 100%)',
          color: '#FFFFFF',
          borderRadius: 16,
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
              background: 'rgba(219, 54, 84, 0.15)',
              padding: '4px 10px',
              borderRadius: 20,
              display: 'inline-block',
              marginBottom: 8,
            }}
          >
            System Administration & Governance
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            BloodBridge Executive Overview
          </h1>
          <p style={{ fontSize: 13, color: '#A0AEC0', marginTop: 4, marginBottom: 0 }}>
            Unified real-time monitoring of Sri Lanka donor networks, institutions, camp approvals and system operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            id="btn-quick-invite-staff"
            type="button"
            className="dash-btn-primary"
            style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setInviteModalOpen(true)}
          >
            <UserPlus size={16} /> Invite Staff
          </button>
          <button
            id="btn-quick-add-institution"
            type="button"
            className="reg-btn-outline"
            style={{
              minHeight: 40,
              padding: '0 16px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
            }}
            onClick={() => setInstitutionModalOpen(true)}
          >
            <PlusCircle size={16} /> Add Institution
          </button>
          <button
            type="button"
            className="reg-btn-outline"
            style={{
              minHeight: 40,
              padding: '0 14px',
              fontSize: 13,
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
            }}
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
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

      {/* 10 Genuine PostgreSQL KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {/* Card 1: Registered Donors */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onClick={() => onNavigateTab('users')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Registered Donors
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF5F6', color: '#DB3654', display: 'grid', placeItems: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.registered_donors ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#7A8B9E', marginTop: 4 }}>
            {kpis.online_donors ?? 0} online · {kpis.walkin_donors ?? 0} walk-in
          </div>
        </div>

        {/* Card 2: Verified Hospitals */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('institutions')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Verified Hospitals
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', color: '#3B82F6', display: 'grid', placeItems: 'center' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.verified_hospitals ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#16A085', marginTop: 4 }}>
            Regulatory authorized
          </div>
        </div>

        {/* Card 3: Active Blood Banks */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('institutions')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Active Blood Banks
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E6F7F1', color: '#16A085', display: 'grid', placeItems: 'center' }}>
              <Shield size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.active_blood_banks ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#7A8B9E', marginTop: 4 }}>
            National collection centres
          </div>
        </div>

        {/* Card 4: Pending Blood Requests */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('demand')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Pending Requests
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.pending_requests ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
            Awaiting bank fulfillment
          </div>
        </div>

        {/* Card 5: Stock Alerts (7d Expiry) */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('stock')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              7-Day Stock Alerts
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEE2E2', color: '#EF4444', display: 'grid', placeItems: 'center' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#EF4444' }}>
            {loading ? '…' : kpis.stock_alerts ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
            Units expiring ≤ 7 days
          </div>
        </div>

        {/* Card 6: Pending Donor Claims */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('users')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Donor Link Claims
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}>
              <FileCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.pending_claims ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
            Pending identity verification
          </div>
        </div>

        {/* Card 7: Pending Camp Approvals */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('camp-approvals')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Camp Approvals
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.pending_camps ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
            Awaiting administrator sign-off
          </div>
        </div>

        {/* Card 8: Notification Delivery Failures */}
        <div
          className="dash-card"
          style={{ padding: 18, cursor: 'pointer' }}
          onClick={() => onNavigateTab('notification-monitoring')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7A8B9E', textTransform: 'uppercase' }}>
              Delivery Failures
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF5F6', color: '#DB3654', display: 'grid', placeItems: 'center' }}>
              <MailCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3043' }}>
            {loading ? '…' : kpis.failed_notifications ?? 0}
          </div>
          <div style={{ fontSize: 11, color: '#7A8B9E', marginTop: 4 }}>
            Failed multi-channel dispatches
          </div>
        </div>
      </div>

      {/* Row 2: Recent Activity & Action Hub */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Recent Audit Events */}
        <div className="dash-card">
          <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="dash-card-title">Recent Administrative Audits</h2>
              <p className="dash-card-subtitle">Immutable log of authorized state mutations</p>
            </div>
            <button
              type="button"
              className="dash-btn-outline"
              style={{ minHeight: 32, padding: '0 10px', fontSize: 11 }}
              onClick={() => onNavigateTab('audit-activity')}
            >
              Full Log <ArrowRight size={12} />
            </button>
          </div>

          {recentAudit.length === 0 ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, margin: 0 }}>No audit records registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentAudit.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: '#1D3043' }}>{log.action}</strong>
                    <div style={{ color: '#7A8B9E', fontSize: 11 }}>
                      by {log.actor_name || 'System'} ({log.actor_role || 'ADMIN'}) · Entity: {log.entity_name} #{log.entity_id}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#A0AEC0' }}>
                    {new Date(log.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Submitted Camps & Approvals */}
        <div className="dash-card">
          <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="dash-card-title">Recent Camp Submissions</h2>
              <p className="dash-card-subtitle">Upcoming mobile blood donation campaigns</p>
            </div>
            <button
              type="button"
              className="dash-btn-outline"
              style={{ minHeight: 32, padding: '0 10px', fontSize: 11 }}
              onClick={() => onNavigateTab('camp-approvals')}
            >
              Approval Queue <ArrowRight size={12} />
            </button>
          </div>

          {recentCamps.length === 0 ? (
            <p style={{ color: '#7A8B9E', fontSize: 13, margin: 0 }}>No upcoming camps submitted.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentCamps.map((camp) => (
                <div
                  key={camp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: '#1D3043' }}>{camp.title}</strong>
                    <div style={{ color: '#7A8B9E', fontSize: 11 }}>
                      Bank: {camp.blood_bank_name} · Starts: {new Date(camp.starts_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      background: camp.status === 'APPROVED' ? '#E6F7F1' : camp.status === 'PENDING' ? '#FEF3C7' : '#F1F5F9',
                      color: camp.status === 'APPROVED' ? '#16A085' : camp.status === 'PENDING' ? '#D97706' : '#64748B',
                    }}
                  >
                    {camp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Pending Donor Account Link Claims (Required by DomainPortals.test.jsx) */}
      <DonorClaimReview token={token} />

      {/* Modals */}
      <InviteStaffModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        token={token}
        onSuccess={loadDashboard}
      />

      <InstitutionModal
        isOpen={institutionModalOpen}
        onClose={() => setInstitutionModalOpen(false)}
        token={token}
        onSuccess={loadDashboard}
      />
    </div>
  );
}
