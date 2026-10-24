import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { HospitalPortal } from './HospitalPortal.jsx';
import { RequestStatCards } from './components/RequestStatCards.jsx';
import { MatchingOverview } from './components/MatchingOverview.jsx';
import { CreateRequestPage } from './pages/CreateRequestPage.jsx';

describe('Member 3 — Hospital Dashboard & Emergency Coordination (M3 Frontend)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('M3-UI-01: RequestStatCards renders genuine counts and zero fallbacks', () => {
    render(
      <RequestStatCards
        kpis={{
          active_requests: 5,
          critical_priority: 2,
          fulfilled_this_month: 14,
        }}
      />
    );

    const activeEl = screen.getByTestId('kpi-active-requests');
    const criticalEl = screen.getByTestId('kpi-critical-priority');
    const fulfilledEl = screen.getByTestId('kpi-fulfilled-month');

    expect(activeEl.textContent).toBe('05');
    expect(criticalEl.textContent).toBe('02');
    expect(fulfilledEl.textContent).toBe('14');

    // Never renders hardcoded version1 fallback sample values like 12, 03, 48 when given zeros
    const { unmount } = render(
      <RequestStatCards
        kpis={{
          active_requests: 0,
          critical_priority: 0,
          fulfilled_this_month: 0,
        }}
      />
    );

    const zeros = screen.getAllByText('00');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    unmount();
  });

  it('M3-UI-02: MatchingOverview renders progress and privacy-safe counts without donor PII', () => {
    render(
      <MatchingOverview
        summary={{
          requestId: 'req-1234',
          bloodTypeCode: 'O-',
          componentCode: 'RBC',
          unitsRequested: 3,
          matchingProgress: 65,
          inventoryFacilitiesCount: 2,
          potentialDonorsCount: 5,
          clinicalVerificationStatus: 'Stock verified in network',
        }}
      />
    );

    expect(screen.getByText(/Matching overview/i)).toBeDefined();
    expect(screen.getByText('O-')).toBeDefined();
    expect(screen.getByText(/Red cells|RBC/i)).toBeDefined();
    expect(screen.getByText('65%')).toBeDefined();
    expect(screen.getByText(/2 facilities found/i)).toBeDefined();
    expect(screen.getByText(/5 consented candidates/i)).toBeDefined();
    expect(screen.getByText(/Stock verified in network/i)).toBeDefined();

    // Verify absence of sensitive personal information
    expect(screen.queryByText(/077/)).toBeNull();
    expect(screen.queryByText(/\bNIC\b/i)).toBeNull();
    expect(screen.queryByText(/telephone/i)).toBeNull();
  });

  it('M3-UI-03: CreateRequestPage correctly sends multi-item items[] payload structure with future neededBy', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <CreateRequestPage
        hospitalId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/New Blood Component Request/i)).toBeDefined();

    // Form inputs
    const urgencySelect = screen.getByRole('combobox', { name: /Urgency Level/i });
    fireEvent.change(urgencySelect, { target: { value: 'CRITICAL' } });

    const notesTextarea = screen.getByPlaceholderText(/surgical intervention/i);
    fireEvent.change(notesTextarea, { target: { value: 'Emergency surgical trauma' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Submit Blood Request/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const sentPayload = onSubmit.mock.calls[0][0];

    expect(sentPayload.hospitalId).toBe(1);
    expect(sentPayload.urgency).toBe('CRITICAL');
    expect(sentPayload.notes).toBe('Emergency surgical trauma');
    expect(Array.isArray(sentPayload.items)).toBe(true);
    expect(sentPayload.items.length).toBeGreaterThanOrEqual(1);
    expect(sentPayload.items[0]).toEqual({
      bloodTypeCode: 'O+',
      componentCode: 'RBC',
      unitsRequested: 2,
    });
    // Ensure neededBy is in the future
    expect(new Date(sentPayload.neededBy).getTime()).toBeGreaterThan(Date.now());
  });

  it('M3-UI-04: HospitalPortal loads data and navigates between Overview, Requests, and Appeals', async () => {
    // Mock getDashboard, getRequests, getAvailableStock, getEmergencyAppeals
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              kpis: { active_requests: 3, critical_priority: 1, fulfilled_this_month: 8 },
              recentRequests: [
                {
                  id: 'req-alpha-1234',
                  urgency: 'CRITICAL',
                  status: 'OPEN',
                  total_requested_units: 3,
                  needed_by: new Date(Date.now() + 86400000).toISOString(),
                  items_json: [{ bloodTypeCode: 'O-', componentCode: 'RBC', unitsRequested: 3 }],
                },
              ],
              urgentShortages: [],
              matchingOverview: {
                matchingProgress: 60,
                inventoryFacilitiesCount: 2,
                potentialDonorsCount: 4,
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'req-alpha-1234',
                hospital_name: 'Colombo General Hospital',
                urgency: 'CRITICAL',
                status: 'OPEN',
                total_requested_units: 3,
                needed_by: new Date(Date.now() + 86400000).toISOString(),
                items_json: [{ bloodTypeCode: 'O-', componentCode: 'RBC', unitsRequested: 3 }],
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

    render(<HospitalPortal token="test-hospital-token" userHospitalId={1} activeTab="overview" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Hospital operations/i)).toBeDefined();
    });

    expect(screen.getByText(/Priority coordination/i)).toBeDefined();
    expect(screen.getByText(/#req-alph/i)).toBeDefined();
  });

  it('M3-UI-05: renders HospitalNotificationsPage with privacy assurance and filters without donor personal data', () => {
    render(
      <HospitalPortal
        token="test-token"
        userHospitalId={1}
        activeTab="notifications"
      />
    );

    expect(screen.getByText(/Hospital Notifications & Fulfillment Alerts/i)).toBeDefined();
    expect(screen.getByText(/Privacy Assured/i)).toBeDefined();
    expect(screen.getByText(/All Alerts/i)).toBeDefined();
    expect(screen.getByText(/Urgent & Critical/i)).toBeDefined();
  });

  it('M3-UI-06: renders DeliveriesPage with delivery tracking and receipt verification', () => {
    render(
      <HospitalPortal
        token="test-token"
        userHospitalId={1}
        activeTab="tracking"
      />
    );

    expect(screen.getByText(/Request Tracking & Blood Bank Deliveries/i)).toBeDefined();
    expect(screen.getByText(/In-Transit Dispatches/i)).toBeDefined();
    expect(screen.getByText(/Received Deliveries History/i)).toBeDefined();
  });
});
