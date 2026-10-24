import React, { useState, useEffect, useCallback } from 'react';
import { hospitalApi } from './api/hospitalApi.js';
import { HospitalOverview } from './pages/HospitalOverview.jsx';
import { BloodRequestsPage } from './pages/BloodRequestsPage.jsx';
import { CreateRequestPage } from './pages/CreateRequestPage.jsx';
import { RequestDetailsPage } from './pages/RequestDetailsPage.jsx';
import { EmergencyAppealsPage } from './pages/EmergencyAppealsPage.jsx';
import { DeliveriesPage } from './pages/DeliveriesPage.jsx';
import { FindDonorsPage } from './pages/FindDonorsPage.jsx';
import { BloodBanksPage } from './pages/BloodBanksPage.jsx';
import { HospitalReportsPage } from './pages/HospitalReportsPage.jsx';
import { AlertTriangle, CheckCircle, Bell, Clock } from 'lucide-react';

export function HospitalPortal({
  token,
  userHospitalId = 1,
  activeTab = 'overview',
  showNewForm = false,
  onCloseForm = () => {},
}) {
  const [currentPage, setCurrentPage] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Domain data
  const [dashboardData, setDashboardData] = useState({
    kpis: { active_requests: 0, critical_priority: 0, fulfilled_this_month: 0, total_requests: 0 },
    recentRequests: [],
    urgentShortages: [],
    matchingOverview: null,
  });
  const [requests, setRequests] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  const [appeals, setAppeals] = useState([]);

  // Selected request for details
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [selectedRequestProgress, setSelectedRequestProgress] = useState(null);

  // Synchronize activeTab from DashboardLayout
  useEffect(() => {
    if (showNewForm) {
      setCurrentPage('new-request');
      return;
    }
    if (!activeTab || activeTab === 'overview') {
      setCurrentPage('overview');
    } else if (activeTab === 'requests') {
      setCurrentPage('requests');
    } else if (activeTab === 'new-request') {
      setCurrentPage('new-request');
    } else if (activeTab === 'donors') {
      setCurrentPage('donors');
    } else if (activeTab === 'banks') {
      setCurrentPage('banks');
    } else if (activeTab === 'emergency' || activeTab === 'appeals') {
      setCurrentPage('appeals');
    } else if (activeTab === 'tracking') {
      setCurrentPage('tracking');
    } else if (activeTab === 'notifications') {
      setCurrentPage('notifications');
    } else if (activeTab === 'reports') {
      setCurrentPage('reports');
    }
  }, [activeTab, showNewForm]);

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [dashRes, reqsRes, stockRes, appealsRes] = await Promise.allSettled([
        hospitalApi.getDashboard(userHospitalId, token),
        hospitalApi.getRequests({}, token),
        hospitalApi.getAvailableStock(userHospitalId, token),
        hospitalApi.getEmergencyAppeals(userHospitalId, token),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data || {});
      }
      if (reqsRes.status === 'fulfilled') {
        setRequests(reqsRes.value.data || []);
      }
      if (stockRes.status === 'fulfilled') {
        setAvailableStock(stockRes.value.data || []);
      }
      if (appealsRes.status === 'fulfilled') {
        setAppeals(appealsRes.value.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load hospital operations data');
    } finally {
      setLoading(false);
    }
  }, [token, userHospitalId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch details when selecting a request
  const handleSelectRequest = async (id) => {
    setSelectedRequestId(id);
    setLoading(true);
    try {
      const [detailRes, progRes] = await Promise.all([
        hospitalApi.getRequestById(id, token),
        hospitalApi.getRequestProgress(id, token).catch(() => ({ data: null })),
      ]);
      setSelectedRequestDetails(detailRes.data);
      setSelectedRequestProgress(progRes.data);
      setCurrentPage('details');
    } catch (err) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  // Create request handler
  const handleCreateRequest = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await hospitalApi.createRequest(payload, token);
      setSuccess(`Blood request #${res.data.id.slice(0, 8)} successfully submitted to network!`);
      onCloseForm();
      await loadData();
      setCurrentPage('requests');
    } catch (err) {
      setError(err.message || 'Failed to submit blood request');
    } finally {
      setLoading(false);
    }
  };

  // Cancel request handler
  const handleCancelRequest = async (id, reason) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await hospitalApi.cancelRequest(id, reason, token);
      setSuccess('Blood request cancelled and reserved units returned to stock.');
      await loadData();
      if (currentPage === 'details') {
        handleSelectRequest(id);
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel blood request');
    } finally {
      setLoading(false);
    }
  };

  // Emergency appeal handlers
  const handleCreateAppeal = async (payload) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await hospitalApi.createEmergencyAppeal(payload, token);
      setSuccess(`Emergency appeal #${res.data.id.slice(0, 8)} initiated for shortage.`);
      await loadData();
      setCurrentPage('appeals');
    } catch (err) {
      setError(err.message || 'Failed to create emergency appeal');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateAppeal = async (id, targetStage) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await hospitalApi.escalateEmergencyAppeal(id, targetStage, token);
      setSuccess(`Emergency appeal escalated to ${targetStage}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to escalate emergency appeal');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Fulfillment Receipt
  const handleReceiveFulfillment = async (formData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await hospitalApi.receiveFulfillment(formData.fulfillmentId, formData, token);
      setSuccess('Blood delivery receipt confirmed successfully! Units issued for hospital care.');
      await loadData();
      if (selectedRequestId) {
        handleSelectRequest(selectedRequestId);
      }
    } catch (err) {
      setError(err.message || 'Failed to confirm fulfillment receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hospital-portal-container" style={{ minHeight: '80vh', padding: '16px 0 32px 0' }}>
      {/* Alert Notices */}
      {error && (
        <div
          className="notice error"
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '12px 18px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          className="notice success"
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* View Router */}
      {currentPage === 'overview' && (
        <HospitalOverview
          dashboardData={dashboardData}
          loading={loading}
          onNavigate={(page, filters) => setCurrentPage(page)}
          onSelectRequest={handleSelectRequest}
        />
      )}

      {currentPage === 'requests' && (
        <BloodRequestsPage
          requests={requests}
          loading={loading}
          onRefresh={loadData}
          onSelectRequest={handleSelectRequest}
          onCancelRequest={handleCancelRequest}
          onNewRequest={() => setCurrentPage('new-request')}
        />
      )}

      {currentPage === 'new-request' && (
        <CreateRequestPage
          hospitalId={userHospitalId}
          onSubmit={handleCreateRequest}
          onCancel={() => {
            onCloseForm();
            setCurrentPage('overview');
          }}
          loading={loading}
        />
      )}

      {currentPage === 'details' && selectedRequestDetails && (
        <RequestDetailsPage
          request={selectedRequestDetails}
          progressSummary={selectedRequestProgress}
          onBack={() => setCurrentPage('requests')}
          onCancelRequest={handleCancelRequest}
          onReceiveFulfillment={handleReceiveFulfillment}
          onInitiateAppeal={(req) => setCurrentPage('appeals')}
        />
      )}

      {currentPage === 'appeals' && (
        <EmergencyAppealsPage
          appeals={appeals}
          requests={requests}
          hospitalId={userHospitalId}
          loading={loading}
          onCreateAppeal={handleCreateAppeal}
          onEscalateAppeal={handleEscalateAppeal}
          onRefresh={loadData}
        />
      )}

      {currentPage === 'tracking' && (
        <DeliveriesPage
          requests={requests}
          onReceiveFulfillment={handleReceiveFulfillment}
          onSelectRequest={handleSelectRequest}
          loading={loading}
        />
      )}

      {currentPage === 'donors' && (
        <FindDonorsPage
          hospitalDistrict={dashboardData.recentRequests[0]?.hospital_district || 'CO'}
          onInitiateAppeal={() => setCurrentPage('appeals')}
        />
      )}

      {currentPage === 'banks' && (
        <BloodBanksPage
          availableStock={availableStock}
          loading={loading}
          onRefresh={loadData}
          onRequestStock={() => setCurrentPage('new-request')}
        />
      )}

      {currentPage === 'reports' && (
        <HospitalReportsPage
          kpis={dashboardData.kpis}
          requests={requests}
        />
      )}

      {currentPage === 'notifications' && (
        <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E8ECF2' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1D3043', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color="#DB3654" />
            Hospital Notifications & Stock Alerts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 10, background: '#F7F9FC', border: '1px solid #E8ECF2' }}>
              <div style={{ fontWeight: 700, color: '#1D3043', fontSize: 13 }}>
                Automated Network Synchronization Active
              </div>
              <div style={{ color: '#7A8B9E', fontSize: 12, marginTop: 2 }}>
                Real-time WebSocket alerts notify your dashboard when blood banks reserve, dispatch, or deliver requested component units.
              </div>
            </div>
            {dashboardData.kpis.critical_priority > 0 && (
              <div style={{ padding: 14, borderRadius: 10, background: '#FFF0F2', border: '1px solid #FFE2E8' }}>
                <div style={{ fontWeight: 700, color: '#DB3654', fontSize: 13 }}>
                  Critical Priority Alert
                </div>
                <div style={{ color: '#881337', fontSize: 12, marginTop: 2 }}>
                  {dashboardData.kpis.critical_priority} critical requests require immediate clinical supply coordination.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
