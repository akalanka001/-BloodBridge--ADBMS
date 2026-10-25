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
import { CampManagementPage } from '../camps/pages/CampManagementPage.jsx';
import { CreateCampPage } from '../camps/pages/CreateCampPage.jsx';
import { CampDetailsPage } from '../camps/pages/CampDetailsPage.jsx';
import { CampRegistrationsPage } from '../camps/pages/CampRegistrationsPage.jsx';
import { CampAttendancePage } from '../camps/pages/CampAttendancePage.jsx';
import { NotificationInbox } from '../notifications/pages/NotificationInbox.jsx';
import { SectionTabs } from '../../components/ui/SectionTabs.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { authApi } from '../../lib/authApi.js';

export function BankPortal({
  token,
  session,
  activeTab = 'overview',
  onTabChange = () => {},
}) {
  const sessionBankId = session?.user?.bloodBankId || null;
  const [memberships, setMemberships] = useState([]);
  const [membershipError, setMembershipError] = useState('');
  const [membershipLoading, setMembershipLoading] = useState(Boolean(token));
  const [userBankId, setUserBankId] = useState(sessionBankId);
  const [campSubView, setCampSubView] = useState({ page: 'list', data: null });

  useEffect(() => {
    let cancelled = false;
    if (!token) { setMembershipLoading(false); return undefined; }
    setMembershipLoading(true);
    authApi.getMemberships(token).then(result => {
      if (cancelled) return;
      const membershipList = result.memberships || result.data?.memberships;
      if (!Array.isArray(membershipList)) {
        if (!sessionBankId) setUserBankId('');
        setMemberships([]);
        return;
      }
      const activeMemberships = membershipList.filter(m => m.is_active !== false && m.blood_bank_id);
      setMemberships(activeMemberships);
      const sessionMembership = activeMemberships.find(m => String(m.blood_bank_id) === String(sessionBankId));
      if (sessionMembership) setUserBankId(sessionMembership.blood_bank_id);
      else if (activeMemberships.length === 1) setUserBankId(activeMemberships[0].blood_bank_id);
      else setUserBankId('');
      setMembershipError('');
    }).catch(err => {
      if (!cancelled) setMembershipError(err.message || 'Could not load bank assignments');
    }).finally(() => { if (!cancelled) setMembershipLoading(false); });
    return () => { cancelled = true; };
  }, [token, sessionBankId]);

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
  const [inventoryFilters, setInventoryFilters] = useState({ componentCode: '', bloodTypeCode: '', releaseStatus: '', inventoryStatus: '', search: '' });
  const [expiryUrgency, setExpiryUrgency] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [donations, setDonations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [upcomingCamps, setUpcomingCamps] = useState([]);
  const [selectedRequestItem, setSelectedRequestItem] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listPages, setListPages] = useState({
    inventory: { page: 1, pageSize: 10, total: 0 },
    expiry: { page: 1, pageSize: 10, total: 0 },
    movements: { page: 1, pageSize: 10, total: 0 },
    requests: { page: 1, pageSize: 10, total: 0 },
  });
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
  const loadUnits = async (page = listPages.inventory.page, filters = inventoryFilters, allocationItem = null) => {
    if (!token || !userBankId) return;
    setLoading(true);
    try {
      const allocationFilters = allocationItem ? { bloodTypeCode: allocationItem.blood_type_code, componentCode: allocationItem.component_code, releaseStatus: 'RELEASED', inventoryStatus: 'IN_STOCK', limit: 100, offset: 0 } : {};
      const pageSize = allocationItem ? 100 : 10;
      const res = await bankApi.getInventoryUnits({ bankId: userBankId, limit: pageSize, offset: (page - 1) * pageSize, ...filters, ...allocationFilters }, token);
      setInventoryUnits(res.data || []);
      setListPages(prev => ({ ...prev, inventory: { page, pageSize, total: res.pagination?.total ?? res.count ?? (res.data || []).length } }));
    } catch (err) {
      setError(err.message || 'Failed to load inventory units');
    } finally {
      setLoading(false);
    }
  };

  // 3. Load Expiry Alerts
  const loadExpiryAlerts = async (page = listPages.expiry.page, urgency = expiryUrgency) => {
    if (!token || !userBankId) return;
    setLoading(true);
    try {
      const res = await bankApi.getExpiryAlerts(userBankId, token, { limit: 10, offset: (page - 1) * 10, urgency });
      setExpiryAlerts(res.data || []);
      setListPages(prev => ({ ...prev, expiry: { page, pageSize: 10, total: res.pagination?.total ?? res.count ?? (res.data || []).length } }));
    } catch (err) {
      setError(err.message || 'Failed to load expiry alerts');
    } finally {
      setLoading(false);
    }
  };

  // 4. Load Movements
  const loadMovements = async (page = listPages.movements.page, search = movementSearch) => {
    if (!token || !userBankId) return;
    setLoading(true);
    try {
      const res = await bankApi.getMovements(userBankId, token, { limit: 10, offset: (page - 1) * 10, search });
      setMovements(res.data || []);
      setListPages(prev => ({ ...prev, movements: { page, pageSize: 10, total: res.pagination?.total ?? res.count ?? (res.data || []).length } }));
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
  const loadRequests = async (page = listPages.requests.page) => {
    if (!token || !userBankId) return;
    setLoading(true);
    try {
      const res = await bankApi.getBankRequests(userBankId, token, { limit: 10, offset: (page - 1) * 10 });
      setIncomingRequests(res.data || []);
      setListPages(prev => ({ ...prev, requests: { page, pageSize: 10, total: res.pagination?.total ?? res.count ?? (res.data || []).length } }));
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
    if (!token || !userBankId || membershipLoading) return;
    setError('');
    setSuccess('');

    if (activeTab === 'overview') {
      loadDashboard(selectedComponent);
    } else if (['inventory', 'stock'].includes(activeTab)) {
      loadUnits();
    } else if (activeTab === 'expiry') {
      loadExpiryAlerts();
    } else if (activeTab === 'movements') {
      loadMovements();
    } else if (activeTab === 'processing') {
      loadDonations();
    } else if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'reservations') {
      loadUnits(1, {}, selectedRequestItem);
    } else if (activeTab === 'camps') {
      loadCamps();
    }
  }, [activeTab, token, userBankId, membershipLoading, selectedRequestItem]);

  const handleInventoryFilters = (filters) => {
    setInventoryFilters(filters);
    setListPages(prev => ({ ...prev, inventory: { ...prev.inventory, page: 1 } }));
    loadUnits(1, filters);
  };
  const handleExpiryFilter = (urgency) => {
    setExpiryUrgency(urgency);
    setListPages(prev => ({ ...prev, expiry: { ...prev.expiry, page: 1 } }));
    loadExpiryAlerts(1, urgency);
  };
  const handleMovementSearch = (search) => {
    setMovementSearch(search);
    setListPages(prev => ({ ...prev, movements: { ...prev.movements, page: 1 } }));
    loadMovements(1, search);
  };

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
      {memberships.length > 1 && <label className="bb-bank-scope">Working at <select aria-label="Active blood bank" value={userBankId || ''} onChange={event => setUserBankId(event.target.value)}>{!userBankId && <option value="">Choose an assigned blood bank</option>}{memberships.map(m => <option key={m.id} value={m.blood_bank_id}>{m.blood_bank_name}</option>)}</select></label>}
      {!membershipLoading && !userBankId && <div className="notice error" role="alert">{membershipError || 'Choose an active blood bank assignment to continue.'}</div>}
      {membershipError && userBankId && <p className="notice error" role="alert">Assignment details could not be refreshed: {membershipError}</p>}
      {['inventory', 'stock', 'processing', 'expiry', 'movements'].includes(activeTab) && <SectionTabs label="Inventory sections" tabs={[{id:'inventory',label:'Blood units'},{id:'processing',label:'Component processing'},{id:'expiry',label:'Expiry watch'},{id:'movements',label:'Activity'}]} activeTab={activeTab === 'stock' ? 'inventory' : activeTab} onChange={onTabChange} />}
      {['requests', 'transfers', 'reservations'].includes(activeTab) && <SectionTabs label="Requests and transfers" tabs={[{id:'requests',label:'Hospital requests'},{id:'transfers',label:'Transfers'}]} activeTab={activeTab === 'reservations' ? 'requests' : activeTab} onChange={onTabChange} />}
      {membershipLoading && <p role="status">Loading assigned blood banks…</p>}
      {!membershipLoading && !userBankId ? null : <>
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
          onRefresh={() => loadUnits()}
          onReleaseUnit={handleReleaseUnit}
          pagination={listPages.inventory}
          onPageChange={page => loadUnits(page)}
          onFiltersChange={handleInventoryFilters}
          filters={inventoryFilters}
        />
      )}
      {activeTab === 'stock' && (
        <InventoryPage units={inventoryUnits} loading={loading} onRefresh={() => loadUnits()} onReleaseUnit={handleReleaseUnit} pagination={listPages.inventory} onPageChange={page => loadUnits(page)} onFiltersChange={handleInventoryFilters} filters={inventoryFilters} />
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
              onClick={() => loadRequests()}
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
                Active Hospital Requests ({listPages.requests.total})
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
          <Pagination page={listPages.requests.page} pageSize={listPages.requests.pageSize} total={listPages.requests.total} onPageChange={loadRequests} loading={loading} />
        </div>
      )}

      {/* 9. Reservations */}
      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedRequestItem ? <StockReservationForm
            requestItem={selectedRequestItem}
            availableUnits={inventoryUnits}
            onSubmit={handleReserveUnit}
            onCancel={() => setSelectedRequestItem(null)}
            loading={loading}
          /> : <div className="bb-empty">Choose an open request and its component line to allocate stock. <button type="button" className="btn outline" onClick={() => onTabChange('requests')}>View hospital requests</button></div>}
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
          onRefresh={() => loadExpiryAlerts()}
          pagination={listPages.expiry}
          onPageChange={page => loadExpiryAlerts(page)}
          onFilterChange={handleExpiryFilter}
          selectedFilter={expiryUrgency || 'ALL'}
        />
      )}

      {/* 12. Donation Camps */}
      {activeTab === 'camps' && (
        <>
          {campSubView.page === 'list' && (
            <CampManagementPage
              user={session?.user}
              onNavigate={(action, payload) => setCampSubView({ page: action, data: payload })}
            />
          )}
          {campSubView.page === 'create-camp' && (
            <CreateCampPage
              onBack={() => setCampSubView({ page: 'list', data: null })}
              onSuccess={() => {
                setCampSubView({ page: 'list', data: null });
                loadDashboard();
              }}
            />
          )}
          {campSubView.page === 'edit-camp' && (
            <CreateCampPage
              initialCamp={campSubView.data?.camp}
              onBack={() => setCampSubView({ page: 'list', data: null })}
              onSuccess={() => setCampSubView({ page: 'list', data: null })}
            />
          )}
          {campSubView.page === 'camp-details' && (
            <CampDetailsPage
              campId={campSubView.data?.campId}
              onBack={() => setCampSubView({ page: 'list', data: null })}
              user={session?.user}
            />
          )}
          {campSubView.page === 'camp-registrations' && (
            <CampRegistrationsPage
              campId={campSubView.data?.campId}
              onBack={() => setCampSubView({ page: 'list', data: null })}
            />
          )}
          {campSubView.page === 'camp-attendance' && (
            <CampAttendancePage
              campId={campSubView.data?.campId}
              onBack={() => setCampSubView({ page: 'list', data: null })}
            />
          )}
        </>
      )}

      {/* 13. Inventory Activity */}
      {activeTab === 'movements' && (
        <InventoryMovementsPage
          movements={movements}
          loading={loading}
          onRefresh={() => loadMovements()}
          pagination={listPages.movements}
          onPageChange={(page, search) => loadMovements(page, search)}
          onSearchChange={handleMovementSearch}
        />
      )}

      {/* 14. Notifications */}
      {activeTab === 'notifications' && (
        <NotificationInbox user={session?.user} />
      )}

      {!['overview', 'intake', 'visits', 'assessments', 'donations', 'inventory', 'stock', 'processing', 'expiry', 'requests', 'reservations', 'transfers', 'camps', 'movements', 'notifications', 'account'].includes(activeTab) && (
        <div className="dash-card" style={{ padding: 40, textAlign: 'center' }}>
          <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043' }}>Section Not Found</h2>
          <p className="dash-card-subtitle" style={{ fontSize: 13, color: '#7A8B9E', marginTop: 6 }}>
            The requested blood bank section (<code>{activeTab}</code>) is not recognized.
          </p>
          <button type="button" className="dash-btn-primary" style={{ marginTop: 18, padding: '0 20px', minHeight: 40 }} onClick={() => onTabChange('overview')}>
            Return to Overview
          </button>
        </div>
      )}
      </>}
    </div>
  );
}
