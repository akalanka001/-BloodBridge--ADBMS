import React, { useState, useEffect, useCallback } from 'react';
import { hospitalApi } from './api/hospitalApi.js';
import { HospitalOverview } from './pages/HospitalOverview.jsx';
import { BloodRequestsPage, EMPTY_REQUEST_FILTERS } from './pages/BloodRequestsPage.jsx';
import { CreateRequestPage } from './pages/CreateRequestPage.jsx';
import { RequestDetailsPage } from './pages/RequestDetailsPage.jsx';
import { EmergencyAppealsPage } from './pages/EmergencyAppealsPage.jsx';
import { DeliveriesPage } from './pages/DeliveriesPage.jsx';
import { FindDonorsPage } from './pages/FindDonorsPage.jsx';
import { BloodBanksPage } from './pages/BloodBanksPage.jsx';
import { HospitalReportsPage } from './pages/HospitalReportsPage.jsx';
import { HospitalNotificationsPage } from './pages/HospitalNotificationsPage.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SectionTabs } from '../../components/ui/SectionTabs.jsx';
import { useHospitalState } from './useHospitalState.js';
import { updatePortalQuery } from '../../lib/portalNavigation.js';

const REQUEST_VIEWS = ['requests', 'new-request', 'details', 'appeals', 'tracking'];
const VIEWS = [...REQUEST_VIEWS, 'overview', 'donors', 'banks', 'reports', 'notifications'];
const alias = page => page === 'emergency' ? 'appeals' : page;
const primary = page => REQUEST_VIEWS.includes(alias(page)) ? 'requests' : page;

export function HospitalPortal({ token, userHospitalId = null, activeTab = 'overview', showNewForm = false, onCloseForm = () => {}, onTabChange = () => {} }) {
  const [storedPage, setStoredPage] = useHospitalState('view', 'overview');
  const [selectedId, setSelectedId] = useHospitalState('request', null);
  const [list, setList] = useHospitalState('list', { filters: EMPTY_REQUEST_FILTERS, page: 1, pageSize: 10 });
  const [appealPage, setAppealPage] = useHospitalState('appealPage', { page: 1, pageSize: 10 });
  const [deliveryPage, setDeliveryPage] = useHospitalState('deliveryPage', { page: 1, pageSize: 10 });
  const [hospital, setHospital] = useState(null);
  const [contextError, setContextError] = useState('');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({ dashboard: null, stock: [], reports: null, appeals: [], requests: [], deliveries: [] });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState({});
  const [pagination, setPagination] = useState({});
  const [details, setDetails] = useState(null);
  const [progress, setProgress] = useState(null);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [working, setWorking] = useState(false);
  const [appealContext, setAppealContext] = useState(null);
  const currentPage = showNewForm ? 'new-request' : primary(storedPage) === primary(alias(activeTab)) ? storedPage : alias(activeTab);
  const refresh = () => setRevision(value => value + 1);

  const go = useCallback((page, filters) => {
    const next = alias(page);
    if (filters) setList(previous => ({ ...previous, filters: { ...EMPTY_REQUEST_FILTERS, ...filters }, page: 1 }));
    updatePortalQuery({ tab: primary(next), h_view: JSON.stringify(next) });
    setStoredPage(next);
    onTabChange(primary(next));
  }, [onTabChange, setStoredPage, setList]);

  useEffect(() => {
    if (['new-request', 'tracking', 'appeals', 'emergency'].includes(activeTab)) setStoredPage(alias(activeTab));
  }, [activeTab]);

  useEffect(() => {
    let active = true;
    setContextError('');
    hospitalApi.getContext(userHospitalId, token).then(response => { if (active) setHospital(response.data); })
      .catch(error => { if (active) { setHospital(null); setContextError(error.message || 'Institution assignment unavailable'); } });
    return () => { active = false; };
  }, [token, userHospitalId, revision]);

  // Each section reports its own failure. A rejected request never looks like a successful empty list.
  useEffect(() => {
    if (!hospital?.hospitalId) return;
    let active = true;
    const load = (key, promise) => {
      setBusy(previous => ({ ...previous, [key]: true }));
      setErrors(previous => ({ ...previous, [key]: '' }));
      promise.then(response => {
        if (!active) return;
        setData(previous => ({ ...previous, [key]: response.data }));
        if (response.pagination) setPagination(previous => ({ ...previous, [key]: response.pagination }));
      }).catch(error => { if (active) setErrors(previous => ({ ...previous, [key]: error.message || 'Section unavailable' })); })
        .finally(() => { if (active) setBusy(previous => ({ ...previous, [key]: false })); });
    };
    load('dashboard', hospitalApi.getDashboard(hospital.hospitalId, token));
    load('stock', hospitalApi.getAvailableStock(hospital.hospitalId, token));
    load('reports', hospitalApi.getReports(hospital.hospitalId, token));
    return () => { active = false; };
  }, [hospital?.hospitalId, token, revision]);

  const [debouncedSearch, setDebouncedSearch] = useState(list.filters.search);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(list.filters.search), 300); return () => clearTimeout(timer); }, [list.filters.search]);
  useEffect(() => {
    if (!hospital?.hospitalId) return;
    let active = true;
    setBusy(previous => ({ ...previous, requests: true })); setErrors(previous => ({ ...previous, requests: '' }));
    hospitalApi.getRequests({ ...list.filters, search: debouncedSearch, hospitalId: hospital.hospitalId, limit: list.pageSize, offset: (list.page - 1) * list.pageSize }, token)
      .then(response => { if (active) { setData(previous => ({ ...previous, requests: response.data })); setPagination(previous => ({ ...previous, requests: response.pagination || { total: response.data.length, limit: list.pageSize, offset: 0 } })); } })
      .catch(error => { if (active) setErrors(previous => ({ ...previous, requests: error.message })); })
      .finally(() => { if (active) setBusy(previous => ({ ...previous, requests: false })); });
    return () => { active = false; };
  }, [hospital?.hospitalId, token, revision, debouncedSearch, list.filters.status, list.filters.urgency, list.filters.bloodTypeCode, list.filters.componentCode, list.page, list.pageSize]);

  useEffect(() => {
    if (!hospital?.hospitalId) return;
    let active = true;
    const isAppeals = currentPage === 'appeals';
    if (!isAppeals && currentPage !== 'tracking') return;
    const key = isAppeals ? 'appeals' : 'deliveries';
    const state = isAppeals ? appealPage : deliveryPage;
    const filters = { limit: state.pageSize, offset: (state.page - 1) * state.pageSize };
    setBusy(previous => ({ ...previous, [key]: true })); setErrors(previous => ({ ...previous, [key]: '' }));
    const request = isAppeals ? hospitalApi.getEmergencyAppeals(hospital.hospitalId, token, filters) : hospitalApi.getDeliveries(hospital.hospitalId, filters, token);
    request.then(response => { if (active) { setData(previous => ({ ...previous, [key]: response.data })); setPagination(previous => ({ ...previous, [key]: response.pagination })); } })
      .catch(error => { if (active) setErrors(previous => ({ ...previous, [key]: error.message })); })
      .finally(() => { if (active) setBusy(previous => ({ ...previous, [key]: false })); });
    return () => { active = false; };
  }, [hospital?.hospitalId, token, revision, currentPage, appealPage.page, appealPage.pageSize, deliveryPage.page, deliveryPage.pageSize]);

  useEffect(() => {
    if (!selectedId || !['details', 'donors'].includes(currentPage)) return;
    let active = true;
    setDetails(null); setProgress(null); setErrors(previous => ({ ...previous, details: '' })); setBusy(previous => ({ ...previous, details: true }));
    Promise.allSettled([hospitalApi.getRequestById(selectedId, token), hospitalApi.getMatchingSummary(selectedId, null, token)])
      .then(([detail, summary]) => {
        if (!active) return;
        if (detail.status === 'rejected') throw detail.reason;
        setDetails(detail.value.data);
        if (summary.status === 'fulfilled') setProgress(summary.value.data);
        else setActionError(`Matching summary unavailable: ${summary.reason.message}`);
      })
      .catch(error => { if (active) setErrors(previous => ({ ...previous, details: error.message })); })
      .finally(() => { if (active) setBusy(previous => ({ ...previous, details: false })); });
    return () => { active = false; };
  }, [currentPage, selectedId, token, revision]);

  const selectRequest = id => { setSelectedId(id); go('details'); };
  const run = async (work, message) => {
    setWorking(true); setActionError(''); setSuccess('');
    try { const result = await work(); setSuccess(message); refresh(); return result || true; }
    catch (error) { setActionError(error.message || 'Action failed. Please retry.'); return false; }
    finally { setWorking(false); }
  };
  const create = async payload => {
    const response = await run(() => hospitalApi.createRequest(payload, token), 'Blood request created.');
    if (response?.data?.id) { onCloseForm(); selectRequest(response.data.id); }
  };
  const cancel = (id, reason) => run(() => hospitalApi.cancelRequest(id, reason, token), 'Request cancelled; active reservations released.');
  const receive = form => run(() => hospitalApi.receiveFulfillment(form.fulfillmentId, form, token), 'Delivery receipt recorded.');
  const startAppeal = (request = details, item = null) => { if (request) setAppealContext({ request, item }); go('appeals'); };
  const sectionError = key => errors[key] ? <div role="alert" className="notice error">{errors[key]}<button type="button" onClick={refresh}>Retry</button></div> : null;

  if (contextError) return <div role="alert" className="notice error">{contextError}<button type="button" onClick={refresh}>Retry institution lookup</button></div>;
  if (!hospital) return <p role="status">Loading your assigned institution…</p>;
  const requestTabs = [{ id: 'requests', label: 'Requests' }, { id: 'tracking', label: 'Deliveries & tracking' }, { id: 'appeals', label: 'Emergency appeals' }];
  return <div className="hospital-portal-container">
    {actionError && <div role="alert" className="notice error">{actionError}</div>}{success && <div role="status" className="notice success">{success}</div>}
    {REQUEST_VIEWS.includes(currentPage) && <SectionTabs tabs={requestTabs} activeTab={['new-request', 'details'].includes(currentPage) ? 'requests' : currentPage} onChange={go} />}
    {currentPage === 'overview' && (sectionError('dashboard') || (data.dashboard ? <HospitalOverview dashboardData={data.dashboard} loading={busy.dashboard} onNavigate={go} onSelectRequest={selectRequest} /> : <p>Loading hospital overview…</p>))}
    {currentPage === 'requests' && <BloodRequestsPage requests={data.requests} loading={busy.requests} error={errors.requests} filters={list.filters} onFiltersChange={filters => setList({ ...list, filters, page: 1 })} pagination={pagination.requests} onPageChange={page => setList({ ...list, page })} onPageSizeChange={pageSize => setList({ ...list, page: 1, pageSize })} onRefresh={refresh} onSelectRequest={selectRequest} onCancelRequest={cancel} onNewRequest={() => go('new-request')} />}
    {currentPage === 'new-request' && <CreateRequestPage hospitalId={hospital.hospitalId} onSubmit={create} onCancel={() => { onCloseForm(); go('requests'); }} loading={working} />}
    {currentPage === 'details' && (busy.details ? <p>Loading request details…</p> : sectionError('details') || (details ? <RequestDetailsPage request={details} progressSummary={progress} onBack={() => go('requests')} onCancelRequest={cancel} onReceiveFulfillment={receive} onInitiateAppeal={startAppeal} onFindDonors={() => go('donors')} onMatchingItemChange={async itemId => { try { const result = await hospitalApi.getMatchingSummary(selectedId, itemId, token); setProgress(result.data); } catch (error) { setActionError(error.message); } }} /> : <p>Choose a request from the list.</p>))}
    {currentPage === 'donors' && <FindDonorsPage token={token} hospital={hospital} selectedRequest={details} onInitiateAppeal={startAppeal} />}
    {currentPage === 'banks' && (sectionError('stock') || <BloodBanksPage availableStock={data.stock} loading={busy.stock} onRefresh={refresh} onRequestStock={() => go('new-request')} />)}
    {currentPage === 'reports' && (sectionError('reports') || (data.reports ? <HospitalReportsPage kpis={data.reports} /> : <p>Loading report totals…</p>))}
    {currentPage === 'appeals' && (sectionError('appeals') || <><EmergencyAppealsPage appeals={data.appeals} requests={appealContext ? [appealContext.request] : data.requests} hospitalId={hospital.hospitalId} initialRequestId={appealContext?.request?.id} initialItemId={appealContext?.item?.itemId} loading={working || busy.appeals} onCreateAppeal={payload => run(() => hospitalApi.createEmergencyAppeal(payload, token), 'Emergency appeal recorded. No invitation delivery is implied.')} onEscalateAppeal={(id, stage) => run(() => hospitalApi.escalateEmergencyAppeal(id, stage, token), 'Appeal escalation recorded.')} onRefresh={refresh} /><Pagination page={appealPage.page} pageSize={appealPage.pageSize} total={pagination.appeals?.total ?? 0} onPageChange={page => setAppealPage({ ...appealPage, page })} onPageSizeChange={pageSize => setAppealPage({ page: 1, pageSize })} /></>)}
    {currentPage === 'tracking' && (sectionError('deliveries') || <><DeliveriesPage deliveries={data.deliveries} onReceiveFulfillment={receive} onSelectRequest={selectRequest} loading={working || busy.deliveries} /><Pagination page={deliveryPage.page} pageSize={deliveryPage.pageSize} total={pagination.deliveries?.total ?? 0} onPageChange={page => setDeliveryPage({ ...deliveryPage, page })} onPageSizeChange={pageSize => setDeliveryPage({ page: 1, pageSize })} /></>)}
    {currentPage === 'notifications' && <HospitalNotificationsPage requests={data.dashboard?.recentRequests || []} appeals={data.appeals} onNavigate={go} onSelectRequest={selectRequest} />}
    {!VIEWS.includes(currentPage) && <div className="dash-card"><h2>Section not found</h2><button type="button" onClick={() => go('overview')}>Return to overview</button></div>}
  </div>;
}
