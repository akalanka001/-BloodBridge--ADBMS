import React, { useEffect, useState } from 'react';
import { SectionTabs } from '../../components/ui/SectionTabs.jsx';
import { AdminOverview } from './pages/AdminOverview.jsx';
import { UserManagementPage } from './pages/UserManagementPage.jsx';
import { InstitutionManagementPage } from './pages/InstitutionManagementPage.jsx';
import { CampOversightPage } from './pages/CampOversightPage.jsx';
import { CampApprovalsPage } from './pages/CampApprovalsPage.jsx';
import { NotificationMonitoringPage } from './pages/NotificationMonitoringPage.jsx';
import { AuditActivityPage } from './pages/AuditActivityPage.jsx';
import { AdministrativeLedger } from './pages/AdministrativeLedger.jsx';
import { AnalyticsOverview } from '../analytics/pages/AnalyticsOverview.jsx';
import { DemandAnalysisPage } from '../analytics/pages/DemandAnalysisPage.jsx';
import { StockReportsPage } from '../analytics/pages/StockReportsPage.jsx';
import { CampAnalyticsPage } from '../analytics/pages/CampAnalyticsPage.jsx';
import { TransferReportsPage } from '../analytics/pages/TransferReportsPage.jsx';
import { ETLPipelinePage } from '../analytics/pages/ETLPipelinePage.jsx';
import { DatabasePerformancePage } from '../analytics/pages/DatabasePerformancePage.jsx';

const aliases = {
  users: ['people', 'accounts'], analytics: ['reports', 'summary'], demand: ['reports', 'demand'],
  stock: ['reports', 'stock'], camps: ['reports', 'camps'], transfers: ['reports', 'transfers'],
  benchmarks: ['system', 'performance'], etl: ['system', 'warehouse'], 'data-quality': ['system', 'warehouse'],
  'camp-oversight': ['operations', 'camps'], 'camp-approvals': ['operations', 'approvals'],
  'notification-monitoring': ['system', 'delivery'], 'audit-activity': ['system', 'audit'],
};
const groups = {
  people: [['accounts', 'Accounts & staff'], ['donors', 'All donor records'], ['invitations', 'Invitation history']],
  operations: [['camps', 'Camps'], ['approvals', 'Pending approvals'], ['requests', 'Requests'],
    ['inventory', 'Stock units'], ['reservations', 'Reservations'], ['transfers', 'Transfers'],
    ['fulfillments', 'Fulfillments'], ['donations', 'Collections'], ['visits', 'Visits'],
    ['movements', 'Stock activity'], ['appeals', 'Emergency appeals'], ['registrations', 'Camp participation']],
  reports: [['summary', 'Summary'], ['demand', 'Demand'], ['stock', 'Stock'], ['camps', 'Camps'], ['transfers', 'Transfers']],
  system: [['audit', 'Audit activity'], ['delivery', 'Notification delivery'], ['warehouse', 'Warehouse & quality'], ['performance', 'Performance lab']],
};
class AdminSectionBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="notice error" role="alert">
      This section could not be displayed. Other administrative sections remain available.
      <button type="button" className="btn outline" onClick={() => this.setState({ failed: false })}>Retry section</button>
    </div>;
    return this.props.children;
  }
}

export function AdminPortal({ token, activeTab = 'overview', onTabChange = () => {} }) {
  const group = aliases[activeTab]?.[0] || activeTab;
  const readSection = () => {
    const candidate = aliases[activeTab]?.[1] || new URLSearchParams(window.location.hash.split('?')[1] || '').get('section');
    return groups[group]?.some(([id]) => id === candidate) ? candidate : groups[group]?.[0]?.[0];
  };
  const [section, setSection] = useState(readSection);
  useEffect(() => {
    setSection(readSection());
    const sync = () => setSection(readSection());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, [activeTab]);
  const selectSection = (next) => {
    setSection(next);
    const [route, query] = window.location.hash.split('?');
    const params = new URLSearchParams(query || '');
    params.set('tab', group);
    params.set('section', next);
    window.location.hash = `${route || '#admin'}?${params}`;
  };
  const selected = groups[group]?.some(([id]) => id === section) ? section : groups[group]?.[0]?.[0];
  let content;
  if (group === 'overview') content = <AdminOverview token={token} onNavigateTab={onTabChange} />;
  else if (group === 'institutions') content = <InstitutionManagementPage token={token} />;
  else if (group === 'people') content = selected === 'accounts' ? <UserManagementPage token={token} />
    : <AdministrativeLedger key={selected} token={token} dataset={selected} />;
  else if (group === 'operations') content = selected === 'camps' ? <CampOversightPage token={token} />
    : selected === 'approvals' ? <CampApprovalsPage token={token} /> : <AdministrativeLedger key={selected} token={token} dataset={selected} />;
  else if (group === 'reports') {
    const Report = { summary: AnalyticsOverview, demand: DemandAnalysisPage, stock: StockReportsPage, camps: CampAnalyticsPage, transfers: TransferReportsPage }[selected];
    content = <Report token={token} />;
  } else if (group === 'system') {
    const System = { audit: AuditActivityPage, delivery: NotificationMonitoringPage, warehouse: ETLPipelinePage, performance: DatabasePerformancePage }[selected];
    content = <System token={token} />;
  } else content = <div className="notice error"><h2>Administrative Section Not Found</h2>
    <p>The selected administrative section ({activeTab}) is unavailable.</p>
    <button onClick={() => onTabChange('overview')}>Return to Overview Dashboard</button></div>;
  return <div className="admin-workspace">
    {groups[group] && <SectionTabs tabs={groups[group].map(([id, label]) => ({ id, label }))} activeTab={selected} onChange={selectSection} />}
    <AdminSectionBoundary key={`${group}:${selected || ''}`}>{content}</AdminSectionBoundary>
  </div>;
}
