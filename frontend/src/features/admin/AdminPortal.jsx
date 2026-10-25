import React from 'react';
import { AnalyticsOverview } from '../analytics/pages/AnalyticsOverview.jsx';
import { DemandAnalysisPage } from '../analytics/pages/DemandAnalysisPage.jsx';
import { StockReportsPage } from '../analytics/pages/StockReportsPage.jsx';
import { CampAnalyticsPage } from '../analytics/pages/CampAnalyticsPage.jsx';
import { TransferReportsPage } from '../analytics/pages/TransferReportsPage.jsx';
import { ETLPipelinePage } from '../analytics/pages/ETLPipelinePage.jsx';
import { DatabasePerformancePage } from '../analytics/pages/DatabasePerformancePage.jsx';

export function AdminPortal({ token, activeTab = 'overview' }) {
  // Render dedicated analytical views when specific tabs are selected
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

  // Default to AnalyticsOverview (includes genuine PostgreSQL KPI cards, demand charts,
  // pipeline card, performance lab summary, and Member 1's pending claims approval section)
  return <AnalyticsOverview token={token} />;
}
