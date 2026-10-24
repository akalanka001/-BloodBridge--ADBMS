import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CalendarDays,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Droplet,
  PackageCheck,
  Search,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { bankApi } from './api/bankApi.js';
import { BankOverview } from './BankOverview.jsx';
import { InventoryPage } from '../inventory/pages/InventoryPage.jsx';
import { ExpiryAlertsPage } from '../inventory/pages/ExpiryAlertsPage.jsx';
import { InventoryMovementsPage } from '../inventory/pages/InventoryMovementsPage.jsx';
import { ComponentProcessingPage } from '../inventory/pages/ComponentProcessingPage.jsx';
import { StockReservationForm } from '../inventory/components/StockReservationForm.jsx';
import { IntakePortal } from '../intake/IntakePortal.jsx';
import { TransfersPortal } from '../transfers/TransfersPortal.jsx';

export function BankPortal({
  token,
  session,
  activeTab = 'overview',
  onTabChange = () => {},
}) {
  const userBankId = session?.user?.bloodBankId || 1;

  // Data states
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      available_units: 0,
      expiring_soon: 0,
      incoming_requests: 0,
      today_collections: 0,
      in_transit_transfers: 0,
      upcoming_camps: 0,
    },
    bloodGroupAvailability: [],
    expiryWatch: [],
    recentActivity: [],
  });

  const [selectedComponent, setSelectedComponent] = useState('RBC');
  const [inventoryUnits, setInventoryUnits] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [donations, setDonations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [upcomingCamps, setUpcomingCamps] = useState([]);
  const [selectedRequestItem, setSelectedRequestItem] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Load Dashboard Data
  const loadDashboard = async (compCode = selectedComponent) => {
    if (!token) return;
    try {
      const res = await bankApi.getDashboard(userBankId, compCode, token);
      if (res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load bank overview');
    }
  };

  // 2. Load Inventory Units
  const loadUnits = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getInventoryUnits({ bankId: userBankId }, token);
      setInventoryUnits(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory units');
    } finally {
      setLoading(false);
    }
  };

  // 3. Load Expiry Alerts
  const loadExpiryAlerts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getExpiryAlerts(userBankId, token);
      setExpiryAlerts(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load expiry alerts');
    } finally {
      setLoading(false);
    }
  };

  // 4. Load Movements
  const loadMovements = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getMovements(userBankId, token);
      setMovements(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory movements');
    } finally {
      setLoading(false);
    }
  };

  // 5. Load Donations for Processing
  const loadDonations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getDonations(userBankId, token);
      setDonations(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  // 6. Load Incoming Requests
  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getBankRequests(userBankId, token);
      setIncomingRequests(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load incoming requests');
    } finally {
      setLoading(false);
    }
  };

  // 7. Load Upcoming Camps
  const loadCamps = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await bankApi.getUpcomingCamps(userBankId, token);
      setUpcomingCamps(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load camps');
    } finally {
      setLoading(false);
    }
  };

  // Effect to load data based on active tab
  useEffect(() => {
    if (!token) return;
    setError('');
    setSuccess('');

    if (activeTab === 'overview') {
      loadDashboard(selectedComponent);
    } else if (activeTab === 'inventory') {
      loadUnits();
    } else if (activeTab === 'expiry') {
      loadExpiryAlerts();
    } else if (activeTab === 'movements') {
      loadMovements();
    } else if (activeTab === 'processing') {
      loadDonations();
    } else if (activeTab === 'requests') {
      loadRequests();
      loadUnits();
    } else if (activeTab === 'reservations') {
      loadUnits();
      loadRequests();
    } else if (activeTab === 'camps') {
      loadCamps();
    }
  }, [activeTab, token, userBankId]);

  // Handle component selection change in stock grid
  const handleSelectComponent = (compCode) => {
    setSelectedComponent(compCode);
    loadDashboard(compCode);
  };

  // Handle Unit Release
  const handleReleaseUnit = async (unitId, { releaseStatus, notes }) => {
    setError('');
    setSuccess('');
    try {
      await bankApi.releaseUnit(unitId, { releaseStatus, notes }, token);
      setSuccess(`Blood unit #${unitId.slice(0, 8)} successfully updated to ${releaseStatus}!`);
      loadUnits();
      loadDashboard(selectedComponent);
    } catch (err) {
      setError(err.message || 'Failed to update blood unit release status');
      throw err;
    }
  };

  // Handle Component Processing (Fractionation)
  const handleProcessDonation = async ({ donationId, components }) => {
    setError('');
    setSuccess('');
    try {
      await bankApi.processDonation({ donationId, components }, token);
      setSuccess(`Donation successfully fractionated into ${components.length} component units!`);
      loadDonations();
      loadUnits();
    } catch (err) {
      setError(err.message || 'Failed to process donation components');
      throw err;
    }
  };

  // Handle Unit Reservation
  const handleReserveUnit = async ({ requestItemId, bloodUnitId, notes }) => {
    setError('');
    setSuccess('');
    try {
      await bankApi.reserveUnit({ requestItemId, bloodUnitId, notes }, token);
      setSuccess(`Unit #${bloodUnitId.slice(0, 8)} successfully allocated and locked for request!`);
      setSelectedRequestItem(null);
      loadRequests();
      loadUnits();
    } catch (err) {
      setError(err.message || 'Failed to allocate blood unit reservation');
      throw err;
    }
  };

  // Render view depending on activeTab
  return (
    <div className="bank-portal-root">
      {/* Notifications / Alerts */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* 1. Overview */}
      {activeTab === 'overview' && (
        <BankOverview
          dashboardData={dashboardData}
          selectedComponent={selectedComponent}
          onSelectComponent={handleSelectComponent}
          onNavigate={(target) => onTabChange(target)}
        />
      )}

      {/* 2. Blood Inventory */}
      {activeTab === 'inventory' && (
        <InventoryPage
          units={inventoryUnits}
          loading={loading}
          onRefresh={loadUnits}
          onReleaseUnit={handleReleaseUnit}
        />
      )}

      {/* 3. Donor Intake */}
      {activeTab === 'intake' && (
        <IntakePortal
          token={token}
          userBankId={userBankId}
          initialTab="lookup"
        />
      )}

      {/* 4. Donor Visits */}
      {activeTab === 'visits' && (
        <IntakePortal
          token={token}
          userBankId={userBankId}
          initialTab="visit"
        />
      )}

      {/* 5. Assessments */}
      {activeTab === 'assessments' && (
        <IntakePortal
          token={token}
          userBankId={userBankId}
          initialTab="assess"
        />
      )}

      {/* 6. Donations */}
      {activeTab === 'donations' && (
        <IntakePortal
          token={token}
          userBankId={userBankId}
          initialTab="collect"
        />
      )}

      {/* 7. Component Processing */}
      {activeTab === 'processing' && (
        <ComponentProcessingPage
          donations={donations}
          onProcessDonation={handleProcessDonation}
          loading={loading}
        />
      )}

      {/* 8. Hospital Requests */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={24} color="#DB3654" />
                Incoming Hospital Blood Requests
              </h2>
              <span style={{ fontSize: 13, color: '#7A8B9E' }}>
                Review active clinical demand from coordinating network hospitals and allocate inventory
              </span>
            </div>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                color: '#4B5563',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Requests
            </button>
          </div>

          <div className="dash-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8ECF2', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8ECF2' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1D3043', margin: 0 }}>
                Active Hospital Requests ({incomingRequests.length})
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>REQUEST ID</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>HOSPITAL</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>URGENCY</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>NEEDED BY</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>REQUESTED ITEMS</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {incomingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                        No pending hospital requests in the network.
                      </td>
                    </tr>
                  ) : (
                    incomingRequests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                          #{req.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1D3043' }}>
                          {req.hospital_name}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: req.urgency === 'CRITICAL' ? '#FEF2F2' : req.urgency === 'URGENT' ? '#FFFBEB' : '#EFF6FF',
                              color: req.urgency === 'CRITICAL' ? '#B91C1C' : req.urgency === 'URGENT' ? '#B45309' : '#1D4ED8',
                              border: `1px solid ${req.urgency === 'CRITICAL' ? '#FECACA' : req.urgency === 'URGENT' ? '#FDE68A' : '#BFDBFE'}`,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {req.urgency}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#4B5563' }}>
                          {new Date(req.needed_by).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {req.items?.map((item, idx) => (
                              <div key={idx} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: '#DB3654' }}>{item.blood_type_code}</span>
                                <span style={{ color: '#4B5563' }}>{item.component_code}</span>
                                <span style={{ color: '#7A8B9E' }}>
                                  ({item.units_fulfilled || 0}/{item.units_requested} units)
                                </span>
                                {(item.units_fulfilled || 0) < item.units_requested && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRequestItem(item);
                                      onTabChange('reservations');
                                    }}
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      border: '1px solid #D1D5DB',
                                      background: '#FFFFFF',
                                      color: '#1D4ED8',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Allocate Unit
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (req.items?.[0]) {
                                setSelectedRequestItem(req.items[0]);
                                onTabChange('reservations');
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#DB3654',
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <PackageCheck size={14} /> Allocate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. Reservations */}
      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StockReservationForm
            requestItem={selectedRequestItem}
            availableUnits={inventoryUnits}
            onSubmit={handleReserveUnit}
            onCancel={() => setSelectedRequestItem(null)}
            loading={loading}
          />
        </div>
      )}

      {/* 10. Inter-Bank Transfers */}
      {activeTab === 'transfers' && (
        <TransfersPortal
          token={token}
          userBankId={userBankId}
        />
      )}

      {/* 11. Expiry Alerts */}
      {activeTab === 'expiry' && (
        <ExpiryAlertsPage
          alerts={expiryAlerts}
          loading={loading}
          onRefresh={loadExpiryAlerts}
        />
      )}

      {/* 12. Donation Camps */}
      {activeTab === 'camps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarDays size={24} color="#DB3654" />
                Coordinating Donation Camps
              </h2>
              <span style={{ fontSize: 13, color: '#7A8B9E' }}>
                Approved upcoming mobile blood donation sessions coordinated with community organizers
              </span>
            </div>

            <button
              type="button"
              onClick={loadCamps}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                color: '#4B5563',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Camps
            </button>
          </div>

          <div className="dash-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8ECF2', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8ECF2' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1D3043', margin: 0 }}>
                Approved Camps ({upcomingCamps.length})
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>CAMP NAME</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>VENUE</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>START DATE & TIME</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>TARGET UNITS</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>COLLECTIONS</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCamps.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 14px', color: '#7A8B9E', fontSize: 13 }}>
                        No upcoming approved camps recorded for this blood bank.
                      </td>
                    </tr>
                  ) : (
                    upcomingCamps.map((camp) => (
                      <tr key={camp.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                          {camp.name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#4B5563' }}>
                          {camp.venue_name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#4B5563' }}>
                          {new Date(camp.starts_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                          {camp.target_units} units
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#047857' }}>
                          {camp.actual_collections || 0}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              background: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {camp.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 13. Inventory Activity */}
      {activeTab === 'movements' && (
        <InventoryMovementsPage
          movements={movements}
          loading={loading}
          onRefresh={loadMovements}
        />
      )}

      {/* 14. Notifications */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={24} color="#DB3654" />
                Operational Alerts & Notifications
              </h2>
              <span style={{ fontSize: 13, color: '#7A8B9E' }}>
                System and clinical alerts across inventory custody, cold-chain transfers, and emergencies
              </span>
            </div>
          </div>

          <div className="dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 12, borderBottom: '1px solid #E8ECF2' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF4E5', color: '#D49A36', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Daily Expiry Warning System</strong>
                  <span style={{ fontSize: 12, color: '#7A8B9E' }}>
                    {dashboardData.kpis.expiring_soon} unit(s) are approaching expiry threshold within 7 days. Inspect in Expiry Alerts.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 12, borderBottom: '1px solid #E8ECF2' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Network Clinical Demand</strong>
                  <span style={{ fontSize: 12, color: '#7A8B9E' }}>
                    {dashboardData.kpis.incoming_requests} pending hospital blood request(s) waiting in queue.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>Intake Progress Today</strong>
                  <span style={{ fontSize: 12, color: '#7A8B9E' }}>
                    {dashboardData.kpis.today_collections} blood collection(s) recorded at this center today.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
