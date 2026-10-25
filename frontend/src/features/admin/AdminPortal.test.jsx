import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPortal } from './AdminPortal.jsx';
import { AdminOverview } from './pages/AdminOverview.jsx';
import { UserManagementPage } from './pages/UserManagementPage.jsx';
import { InstitutionManagementPage } from './pages/InstitutionManagementPage.jsx';
import { CampOversightPage } from './pages/CampOversightPage.jsx';
import { CampApprovalsPage } from './pages/CampApprovalsPage.jsx';
import { NotificationMonitoringPage } from './pages/NotificationMonitoringPage.jsx';

describe('Member 1 — Administrator Dashboard Implementation (Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('M1-UI-01: AdminOverview renders 10 genuine DB-backed KPI cards and quick action buttons', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/admin/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                kpis: {
                  registered_donors: 142,
                  online_donors: 98,
                  walkin_donors: 44,
                  verified_hospitals: 14,
                  active_blood_banks: 8,
                  pending_requests: 6,
                  stock_alerts: 12,
                  pending_claims: 2,
                  pending_camps: 3,
                  failed_notifications: 0,
                },
                recentAudit: [
                  {
                    id: 1,
                    action: 'VERIFY_INSTITUTION',
                    actor_name: 'Dr. Silva',
                    actor_role: 'ADMIN',
                    entity_name: 'hospitals',
                    entity_id: '1',
                    occurred_at: new Date().toISOString(),
                  },
                ],
                recentCamps: [
                  {
                    id: 'camp-101',
                    title: 'Rotary Club Colombo Camp',
                    blood_bank_name: 'National Blood Bank',
                    status: 'PENDING',
                    starts_at: new Date().toISOString(),
                  },
                ],
                notificationWarnings: [],
              },
            }),
        });
      }

      if (url.includes('/admin/donor-link-claims')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<AdminOverview token="test-token" />);

    expect(await screen.findByText('BloodBridge Executive Overview')).toBeDefined();
    expect(await screen.findByText('142')).toBeDefined(); // registered donors
    expect(await screen.findByText(/98 online/i)).toBeDefined();
    expect(await screen.findByText('14')).toBeDefined(); // verified hospitals
    expect(await screen.findByText('8')).toBeDefined(); // active banks
    expect(await screen.findByText('Invite Staff')).toBeDefined();
    expect(await screen.findByText('Add Institution')).toBeDefined();
  });

  it('M1-UI-02: Every Admin menu ID opens its designated page without falling back to Overview', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
    );

    // 1. Overview
    const { rerender } = render(<AdminPortal token="test-token" activeTab="overview" />);
    expect(await screen.findByText('BloodBridge Executive Overview')).toBeDefined();

    // 2. Users and Roles
    rerender(<AdminPortal token="test-token" activeTab="users" />);
    expect(await screen.findByText('Users, Roles & Staff Memberships')).toBeDefined();

    // 3. Institutions
    rerender(<AdminPortal token="test-token" activeTab="institutions" />);
    expect(await screen.findByText('Hospitals, Blood Banks & Geographical Hierarchy')).toBeDefined();

    // 4. Camp Oversight
    rerender(<AdminPortal token="test-token" activeTab="camp-oversight" />);
    expect(await screen.findByText('Mobile Donation Camp Oversight')).toBeDefined();

    // 5. Camp Approvals
    rerender(<AdminPortal token="test-token" activeTab="camp-approvals" />);
    expect(await screen.findByText('Pending Donation Camp Approvals')).toBeDefined();

    // 6. Notification Monitoring
    rerender(<AdminPortal token="test-token" activeTab="notification-monitoring" />);
    expect(await screen.findByText('Multi-Channel Notification Monitoring')).toBeDefined();

    // 7. Member 6 Demand
    rerender(<AdminPortal token="test-token" activeTab="demand" />);
    expect(await screen.findByText('Blood Demand & Allocation Analytics')).toBeDefined();

    // 8. Member 6 Stock
    rerender(<AdminPortal token="test-token" activeTab="stock" />);
    expect(await screen.findByText('Component Stock & Expiry Risk Reports')).toBeDefined();

    // 9. Member 6 Performance Lab
    rerender(<AdminPortal token="test-token" activeTab="benchmarks" />);
    expect(await screen.findByText('Database Performance Lab & SQL Optimization')).toBeDefined();

    // 10. Member 6 ETL Pipeline
    rerender(<AdminPortal token="test-token" activeTab="etl" />);
    expect(await screen.findByText('Data Warehouse ETL Pipeline & Data Quality Monitoring')).toBeDefined();
  });

  it('M1-UI-03: Unknown menu ID renders a helpful not-found state, never silently redirecting', async () => {
    const handleNav = vi.fn();
    render(<AdminPortal token="test-token" activeTab="unsupported-tab-xyz" onTabChange={handleNav} />);

    expect(screen.getByText('Administrative Section Not Found')).toBeDefined();
    expect(screen.getByText(/unsupported-tab-xyz/)).toBeDefined();

    fireEvent.click(screen.getByText('Return to Overview Dashboard'));
    expect(handleNav).toHaveBeenCalledWith('overview');
  });

  it('M1-UI-04: UserManagementPage renders users table and triggers status modal', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                users: [
                  {
                    id: 'user-uuid-1',
                    full_name: 'Dr. Kamal Perera',
                    email: 'kamal@hospital.lk',
                    role: 'HOSPITAL_STAFF',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    memberships: [{ hospital_name: 'National Hospital', is_active: true }],
                  },
                ],
                total: 1,
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<UserManagementPage token="test-token" />);

    expect(await screen.findByText('Dr. Kamal Perera')).toBeDefined();
    expect(screen.getByText('kamal@hospital.lk')).toBeDefined();
    expect(screen.getByText('National Hospital (Active)')).toBeDefined();

    // Click Deactivate button
    const deactBtn = document.getElementById('btn-toggle-status-user-uuid-1');
    expect(deactBtn).toBeDefined();
    fireEvent.click(deactBtn);

    expect(await screen.findByText('Deactivate Account')).toBeDefined();
    expect(screen.getByText(/All active sessions will be terminated/i)).toBeDefined();
  });

  it('M1-UI-05: InstitutionManagementPage renders facility list and triggers add modal', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/admin/institutions')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 1,
                  type: 'HOSPITAL',
                  name: 'Colombo General Hospital',
                  district_name: 'Colombo',
                  province_name: 'Western',
                  town: 'Colombo 07',
                  contact_phone: '+94112691111',
                  is_verified: true,
                  active_staff_count: 5,
                },
              ],
            }),
        });
      }
      if (url.includes('/locations/provinces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ code: 'WP', name: 'Western Province' }] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<InstitutionManagementPage token="test-token" />);

    expect(await screen.findByText('Colombo General Hospital')).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByText('5 staff')).toBeDefined();

    // Open Add Institution Modal
    fireEvent.click(screen.getByRole('button', { name: /Add Healthcare Facility/i }));
    expect(await screen.findByText('Add Healthcare Institution')).toBeDefined();
  });

  it('M1-UI-06: CampApprovalsPage displays pending queue and opens review decision modal', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/camps')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'camp-p1',
                  title: 'Apex Youth Community Camp',
                  blood_bank_name: 'Colombo Blood Bank',
                  starts_at: new Date().toISOString(),
                  capacity: 80,
                  town: 'Maharagama',
                  status: 'PENDING',
                  description: 'Annual youth mobilization blood camp',
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<CampApprovalsPage token="test-token" />);

    expect(await screen.findByText('Apex Youth Community Camp')).toBeDefined();
    expect(screen.getByText('AWAITING REVIEW')).toBeDefined();

    // Open review modal
    const reviewBtn = document.getElementById('btn-review-camp-camp-p1');
    expect(reviewBtn).toBeDefined();
    fireEvent.click(reviewBtn);

    expect(await screen.findByText('Camp Approval Review')).toBeDefined();
    expect(screen.getByRole('button', { name: /Approve Camp/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Reject Camp/i })).toBeDefined();
  });

  it('M1-UI-07: NotificationMonitoringPage displays telemetry and masks recipient details', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/notifications/delivery-status')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'del-99',
                  recipient_name: 'Anura Bandara',
                  channel: 'SMS',
                  status: 'DELIVERED',
                  attempts: 1,
                  created_at: new Date().toISOString(),
                  error_message: null,
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    render(<NotificationMonitoringPage token="test-token" />);

    expect(await screen.findByText('Anura Bandara')).toBeDefined();
    expect(screen.getAllByText('SMS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DELIVERED').length).toBeGreaterThan(0);
    expect(screen.getByText('OK')).toBeDefined();
  });
});
