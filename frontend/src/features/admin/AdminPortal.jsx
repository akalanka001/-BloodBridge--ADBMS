import React from 'react';
import { AdminOverview } from './pages/AdminOverview.jsx';
import { UserManagementPage } from './pages/UserManagementPage.jsx';
import { InstitutionManagementPage } from './pages/InstitutionManagementPage.jsx';
import { CampOversightPage } from './pages/CampOversightPage.jsx';
import { CampApprovalsPage } from './pages/CampApprovalsPage.jsx';
import { NotificationMonitoringPage } from './pages/NotificationMonitoringPage.jsx';
import { AuditActivityPage } from './pages/AuditActivityPage.jsx';

// Member 6 Analytical and Performance Pages
import { AnalyticsOverview } from '../analytics/pages/AnalyticsOverview.jsx';
import { DemandAnalysisPage } from '../analytics/pages/DemandAnalysisPage.jsx';
import { StockReportsPage } from '../analytics/pages/StockReportsPage.jsx';
import { CampAnalyticsPage } from '../analytics/pages/CampAnalyticsPage.jsx';
import { TransferReportsPage } from '../analytics/pages/TransferReportsPage.jsx';
import { ETLPipelinePage } from '../analytics/pages/ETLPipelinePage.jsx';
import { DatabasePerformancePage } from '../analytics/pages/DatabasePerformancePage.jsx';

export function AdminPortal({ token, activeTab = 'overview', onTabChange = () => {} }) {
  // 1. Overview Dashboard (Real KPIs, alerts, approvals and recent activity)
  if (activeTab === 'overview') {
    return <AdminOverview token={token} onNavigateTab={onTabChange} />;
  }

  // 2. Member 6 Analytics & Reporting Modules
  if (activeTab === 'analytics') {
    return <AnalyticsOverview token={token} />;
  }

  if (activeTab === 'demand') {
    return <DemandAnalysisPage token={token} />;
  }

  if (activeTab === 'stock') {
    return <StockReportsPage token={token} />;
  }

  if (activeTab === 'camps') {
    return <CampAnalyticsPage token={token} />;
  }

  if (activeTab === 'transfers') {
    return <TransferReportsPage token={token} />;
  }

  if (activeTab === 'benchmarks') {
    return <DatabasePerformancePage token={token} />;
  }

  if (activeTab === 'etl' || activeTab === 'data-quality') {
    return <ETLPipelinePage token={token} />;
  }

  // 3. Member 1 User, Role, Staff & Claims Management
  if (activeTab === 'users') {
    return <UserManagementPage token={token} />;
  }

  // 4. Member 1 Hospital, Blood Bank & Geography Infrastructure
  if (activeTab === 'institutions') {
    return <InstitutionManagementPage token={token} />;
  }

  // 5. Member 1 + Member 5 Camp Oversight (All camp records & status monitoring)
  if (activeTab === 'camp-oversight') {
    return <CampOversightPage token={token} />;
  }

  // 6. Member 1 + Member 5 Camp Approvals (Dedicated PENDING camps queue & review decisions)
  if (activeTab === 'camp-approvals') {
    return <CampApprovalsPage token={token} />;
  }

  // 7. Member 1 + Member 5 Multi-Channel Notification Telemetry & Outbox Monitoring
  if (activeTab === 'notification-monitoring') {
    return <NotificationMonitoringPage token={token} />;
  }

  // 8. Audit Activity Log
  if (activeTab === 'audit-activity') {
    return <AuditActivityPage token={token} />;
  }

  // Fallback for unknown menu IDs (helpful not-found state, never silent redirect)
  return (
    <div className="dash-card" style={{ padding: 40, textAlign: 'center' }}>
      <h2 className="dash-card-title" style={{ fontSize: 18, color: '#1D3043' }}>
        Administrative Section Not Found
      </h2>
      <p className="dash-card-subtitle" style={{ fontSize: 13, color: '#7A8B9E', marginTop: 6 }}>
        The selected administrator dashboard view (<code>{activeTab}</code>) is not recognized or has been moved.
      </p>
      <button
        type="button"
        className="dash-btn-primary"
        style={{ minHeight: 40, padding: '0 20px', marginTop: 18, fontSize: 13 }}
        onClick={() => onTabChange('overview')}
      >
        Return to Overview Dashboard
      </button>
    </div>
  );
}
