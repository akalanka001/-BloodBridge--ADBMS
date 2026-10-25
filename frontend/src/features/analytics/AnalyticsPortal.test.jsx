import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsOverview } from './pages/AnalyticsOverview.jsx';
import { DemandAnalysisPage } from './pages/DemandAnalysisPage.jsx';
import { StockReportsPage } from './pages/StockReportsPage.jsx';
import { CampAnalyticsPage } from './pages/CampAnalyticsPage.jsx';
import { TransferReportsPage } from './pages/TransferReportsPage.jsx';
import { ETLPipelinePage } from './pages/ETLPipelinePage.jsx';
import { DatabasePerformancePage } from './pages/DatabasePerformancePage.jsx';
import { AdminPortal } from '../admin/AdminPortal.jsx';

describe('Member 6 — Warehouse, Analytics & ADBMS Optimization (Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('M6-UI-01: AnalyticsOverview renders all 6 genuine PostgreSQL KPI cards with non-placeholder values', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/admin/donor-link-claims')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      }
      if (url.includes('/analytics/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                metrics: {
                  total_donors: 148,
                  online_donors: 92,
                  walkin_donors: 56,
                  active_hospitals: 14,
                  requests_this_month: 23,
                  stock_alerts: 4,
                  available_units: 82,
                  collections_this_month: 19,
                },
                demandByGroup: [
                  { blood_type: 'O+', requested_units: 35, percentage_of_total: 40, fill_rate_pct: 85 },
                  { blood_type: 'A+', requested_units: 25, percentage_of_total: 30, fill_rate_pct: 80 },
                ],
                requestTrends: [
                  { month_name: 'Sep', requested_units: 45 },
                  { month_name: 'Oct', requested_units: 60 },
                ],
                etlPipeline: {
                  latestRun: { status: 'SUCCESS', rows_loaded: 450, error_count: 0 },
                  dataFreshness: '2026-10-25T05:00:00Z',
                },
                benchmarks: {
                  templates: [{ id: 'EXP-01-COMPOSITE-GEO', name: 'Donor Matching' }],
                },
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });

    render(<AnalyticsOverview token="test-token" />);

    expect(await screen.findByText('Registered donors')).toBeDefined();
    expect(await screen.findByText('148')).toBeDefined();
    expect(await screen.findByText('Active hospitals')).toBeDefined();
    expect(await screen.findByText('14')).toBeDefined();
    expect(await screen.findByText('Requests this month')).toBeDefined();
    expect(await screen.findByText('23')).toBeDefined();
    expect(await screen.findByText('Stock alerts')).toBeDefined();
    expect(await screen.findByText('4')).toBeDefined();
    expect(await screen.findByText('Available component units')).toBeDefined();
    expect(await screen.findByText('82')).toBeDefined();
    expect(await screen.findByText('Collections this month')).toBeDefined();
    expect(await screen.findByText('19')).toBeDefined();
  });

  it('M6-UI-02: DemandAnalysisPage renders blood groups, filter bar, and calculates total metrics', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { blood_type: 'O+', requested_units: 50, fulfilled_units: 40, fill_rate_pct: 80, percentage_of_total: 50 },
              { blood_type: 'A+', requested_units: 30, fulfilled_units: 24, fill_rate_pct: 80, percentage_of_total: 30 },
              { blood_type: 'B+', requested_units: 20, fulfilled_units: 16, fill_rate_pct: 80, percentage_of_total: 20 },
            ],
          }),
      })
    );

    render(<DemandAnalysisPage token="test-token" />);

    expect(await screen.findByText('Blood Demand & Allocation Analytics')).toBeDefined();
    expect(await screen.findByText('Total Requested Units')).toBeDefined();
    expect((await screen.findAllByText('100')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('80%')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Apply Filters')).toBeDefined();
  });

  it('M6-UI-03: StockReportsPage renders component inventory snapshots with 7-day expiry warnings', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                snapshot_date: '2026-10-25',
                blood_bank_name: 'National Blood Centre Colombo',
                blood_type_code: 'O+',
                component_code: 'RBC',
                available_units: 32,
                expiring_7d_units: 5,
                quarantined_units: 3,
                reserved_units: 8,
                total_units: 43,
              },
            ],
          }),
      })
    );

    render(<StockReportsPage token="test-token" />);

    expect(await screen.findByText('Component Stock & Expiry Risk Reports')).toBeDefined();
    expect(await screen.findByText('National Blood Centre Colombo')).toBeDefined();
    expect(await screen.findByText('Available Released Units')).toBeDefined();
    expect((await screen.findAllByText('32')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('5')).length).toBeGreaterThan(0);
  });

  it('M6-UI-04: CampAnalyticsPage displays registration vs verified attendance turnout', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                district_code: 'CO',
                district_name: 'Colombo',
                registered_count: 50,
                attended_count: 42,
                attendance_turnout_pct: 84,
              },
            ],
          }),
      })
    );

    render(<CampAnalyticsPage token="test-token" />);

    expect(await screen.findByText('Donation Camp Registration & Attendance Performance')).toBeDefined();
    expect((await screen.findAllByText('Colombo')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('84%')).length).toBeGreaterThan(0);
    expect(await screen.findByText('High Turnout')).toBeDefined();
  });

  it('M6-UI-05: TransferReportsPage tracks custody movements and in-transit durations', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                source_bank_name: 'Colombo Central Bank',
                target_bank_name: 'Kandy General Bank',
                transfer_count: 4,
                total_units: 12,
                status: 'RECEIVED',
                avg_duration_minutes: 75,
              },
            ],
          }),
      })
    );

    render(<TransferReportsPage token="test-token" />);

    expect(await screen.findByText('Inter-Bank Blood Transfers & Movement Reports')).toBeDefined();
    expect(await screen.findByText('Colombo Central Bank')).toBeDefined();
    expect(await screen.findByText('Kandy General Bank')).toBeDefined();
    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0);
  });

  it('M6-UI-06: ETLPipelinePage renders execution form, run history, and reconciliation audit table', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/analytics/etl-runs')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 1,
                  job_name: 'DAILY_OLAP_ETL',
                  load_mode: 'INCREMENTAL',
                  started_at: '2026-10-25T05:00:00Z',
                  finished_at: '2026-10-25T05:00:02Z',
                  duration_seconds: 2.1,
                  status: 'SUCCESS',
                  rows_loaded: 450,
                  error_count: 0,
                  details: { donations: 120 },
                },
              ],
            }),
        });
      }
      if (url.includes('/analytics/data-quality')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                health: 'HEALTHY',
                reconciliation: [
                  {
                    entity: 'Donations',
                    operationalCount: 139,
                    warehouseCount: 139,
                    discrepancy: 0,
                    status: 'MATCHED',
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });

    render(<ETLPipelinePage token="test-token" />);

    expect(await screen.findByText('Data Warehouse ETL Pipeline & Data Quality Monitoring')).toBeDefined();
    expect(await screen.findByText('Execute Warehouse Job')).toBeDefined();
    expect(await screen.findByText('HEALTHY')).toBeDefined();
    expect(await screen.findByText('Donations')).toBeDefined();
    expect(await screen.findByText('MATCHED')).toBeDefined();
  });

  it('M6-UI-07: DatabasePerformancePage executes query benchmark and inspects query plan', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url, opts) => {
      if (url.includes('/analytics/benchmarks') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                experimentId: 'EXP-01-COMPOSITE-GEO',
                experimentName: 'Donor Matching & Geographical Filtering',
                queryIdentifier: 'Q_DONOR_MATCH_GEO',
                baseline: { executionTimeMs: 0.85, planType: 'Seq Scan', queryPlan: { Plan: { 'Node Type': 'Seq Scan' } } },
                optimized: { executionTimeMs: 0.12, planType: 'Index Scan', queryPlan: { Plan: { 'Node Type': 'Index Scan' } } },
                improvementPercentage: 85.9,
                summary: '85.9% FASTER (0.85ms vs 0.12ms)',
              },
            }),
        });
      }
      if (url.includes('/analytics/benchmarks')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'EXP-01-COMPOSITE-GEO',
                  name: 'Donor Matching & Geographical Filtering',
                  description: 'Compares sequential scan against composite partial B-tree index.',
                  indexStrategy: 'Composite B-Tree',
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });

    render(<DatabasePerformancePage token="test-token" />);

    expect(await screen.findByText('Database Performance Lab & SQL Optimization')).toBeDefined();
    const runBtn = screen.getByText('Execute Benchmark');
    fireEvent.click(runBtn);

    expect(await screen.findByText(/85.9% FASTER/i)).toBeDefined();
    expect((await screen.findAllByText(/0\.85/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/0\.12/)).length).toBeGreaterThan(0);
  });

  it('M6-UI-08: AdminPortal delegates correctly based on activeTab', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
    );

    const { rerender } = render(<AdminPortal token="test-token" activeTab="demand" />);
    expect(await screen.findByText('Blood Demand & Allocation Analytics')).toBeDefined();

    rerender(<AdminPortal token="test-token" activeTab="stock" />);
    expect(await screen.findByText('Component Stock & Expiry Risk Reports')).toBeDefined();

    rerender(<AdminPortal token="test-token" activeTab="camps" />);
    expect(await screen.findByText('Donation Camp Registration & Attendance Performance')).toBeDefined();

    rerender(<AdminPortal token="test-token" activeTab="transfers" />);
    expect(await screen.findByText('Inter-Bank Blood Transfers & Movement Reports')).toBeDefined();

    rerender(<AdminPortal token="test-token" activeTab="benchmarks" />);
    expect(await screen.findByText('Database Performance Lab & SQL Optimization')).toBeDefined();

    rerender(<AdminPortal token="test-token" activeTab="etl" />);
    expect(await screen.findByText('Data Warehouse ETL Pipeline & Data Quality Monitoring')).toBeDefined();
  });
});
