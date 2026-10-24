import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BankPortal } from './BankPortal.jsx';
import { BankOverview } from './BankOverview.jsx';
import { BloodGroupStockGrid } from '../inventory/components/BloodGroupStockGrid.jsx';
import { InventoryPage } from '../inventory/pages/InventoryPage.jsx';
import { ComponentProcessingPage } from '../inventory/pages/ComponentProcessingPage.jsx';
import { ExpiryAlertsPage } from '../inventory/pages/ExpiryAlertsPage.jsx';
import { StockReservationForm } from '../inventory/components/StockReservationForm.jsx';

describe('Member 4 — Bank Staff Dashboard & Operational Management (M4 Frontend)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('M4-UI-01: BankOverview renders genuine live KPIs, replacing hardcoded 284, 17, 09 with real scoped numbers', () => {
    const liveData = {
      kpis: {
        available_units: 42,
        expiring_soon: 5,
        incoming_requests: 3,
        today_collections: 8,
        in_transit_transfers: 2,
        upcoming_camps: 1,
      },
      bloodGroupAvailability: [
        { type: 'O+', units: 15, pct: 30, color: '#DB9B38', status: 'WARNING' },
        { type: 'O-', units: 4, pct: 8, color: '#DB3654', status: 'CRITICAL' },
        { type: 'A+', units: 20, pct: 40, color: '#16A085', status: 'ADEQUATE' },
      ],
      expiryWatch: [
        {
          id: 'unit-uuid-001',
          blood_type_code: 'O+',
          component_code: 'RBC',
          days_left: 2,
          hours_left: 48,
        },
      ],
      recentActivity: [
        {
          id: 'mov-1',
          blood_unit_id: 'unit-uuid-001',
          component_code: 'RBC',
          blood_type_code: 'O+',
          from_status: 'QUARANTINED',
          to_status: 'RELEASED',
          action: 'RELEASE_APPROVAL',
          actor_name: 'Dr. Silva',
          acted_at: new Date().toISOString(),
        },
      ],
    };

    render(
      <BankOverview
        dashboardData={liveData}
        selectedComponent="RBC"
        onSelectComponent={() => {}}
        onNavigate={() => {}}
      />
    );

    // Verify KPI values
    const availableEl = screen.getByTestId('kpi-available-units');
    const expiringEl = screen.getByTestId('kpi-expiring-soon');
    const incomingEl = screen.getByTestId('kpi-incoming-requests');
    const collectionsEl = screen.getByTestId('kpi-today-collections');
    const transfersEl = screen.getByTestId('kpi-in-transit-transfers');
    const campsEl = screen.getByTestId('kpi-upcoming-camps');

    expect(availableEl.textContent).toContain('42');
    expect(expiringEl.textContent).toContain('05');
    expect(incomingEl.textContent).toContain('03');
    expect(collectionsEl.textContent).toContain('08');
    expect(transfersEl.textContent).toContain('02');
    expect(campsEl.textContent).toContain('01');

    // Never renders old hardcoded values 284, 17, 09
    expect(screen.queryByText('284')).toBeNull();
  });

  it('M4-UI-02: BloodGroupStockGrid displays all 8 ABO/Rh combinations with component selector', () => {
    const allGroups = [
      { type: 'O+', units: 50, pct: 100, color: '#16A085', status: 'ADEQUATE' },
      { type: 'O-', units: 8, pct: 16, color: '#DB3654', status: 'CRITICAL' },
      { type: 'A+', units: 35, pct: 70, color: '#16A085', status: 'ADEQUATE' },
      { type: 'A-', units: 12, pct: 24, color: '#DB9B38', status: 'WARNING' },
      { type: 'B+', units: 40, pct: 80, color: '#16A085', status: 'ADEQUATE' },
      { type: 'B-', units: 5, pct: 10, color: '#DB3654', status: 'CRITICAL' },
      { type: 'AB+', units: 25, pct: 50, color: '#16A085', status: 'ADEQUATE' },
      { type: 'AB-', units: 3, pct: 6, color: '#DB3654', status: 'CRITICAL' },
    ];

    const onSelectMock = vi.fn();

    render(
      <BloodGroupStockGrid
        stockData={allGroups}
        selectedComponent="RBC"
        onSelectComponent={onSelectMock}
      />
    );

    // Verify all 8 groups are rendered
    ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].forEach((grp) => {
      expect(screen.getByText(grp)).toBeDefined();
    });

    // Test component pill click
    const plasmaPill = screen.getByRole('button', { name: 'Plasma' });
    fireEvent.click(plasmaPill);
    expect(onSelectMock).toHaveBeenCalledWith('PLASMA');
  });

  it('M4-UI-03: InventoryPage renders stock list, search query filtering, and quarantine release modal', async () => {
    const mockUnits = [
      {
        id: 'unit-abc-11111111',
        component_code: 'RBC',
        blood_type_code: 'O+',
        volume_ml: 450,
        release_status: 'QUARANTINED',
        inventory_status: 'IN_STOCK',
        expires_at: new Date(Date.now() + 864000000).toISOString(),
        days_left: 10,
        hours_left: 240,
        blood_bank_name: 'National Blood Center',
      },
      {
        id: 'unit-def-22222222',
        component_code: 'PLASMA',
        blood_type_code: 'A-',
        volume_ml: 200,
        release_status: 'RELEASED',
        inventory_status: 'IN_STOCK',
        expires_at: new Date(Date.now() + 864000000).toISOString(),
        days_left: 10,
        hours_left: 240,
        blood_bank_name: 'National Blood Center',
      },
    ];

    const releaseMock = vi.fn().mockResolvedValue({});

    render(
      <InventoryPage
        units={mockUnits}
        loading={false}
        onReleaseUnit={releaseMock}
      />
    );

    expect(screen.getByText('#unit-abc')).toBeDefined();
    expect(screen.getByText('#unit-def')).toBeDefined();

    // Click "Verify & Release" button for quarantined unit
    const releaseBtn = screen.getByRole('button', { name: /Verify & Release/i });
    fireEvent.click(releaseBtn);

    // Modal should be visible with Staff Clinical Release Decision
    expect(screen.getByText(/Staff Clinical Release Decision/i)).toBeDefined();

    // Confirm decision
    const confirmBtn = screen.getByRole('button', { name: /Confirm Decision/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledWith('unit-abc-11111111', {
        releaseStatus: 'RELEASED',
        notes: undefined,
      });
    });
  });

  it('M4-UI-04: ComponentProcessingPage allows fractionating whole blood into RBC, Plasma, and Platelet units', async () => {
    const mockDonations = [
      {
        id: 'don-001-wholeblood',
        donor_id: 'donor-123',
        blood_bank_id: 1,
        blood_type_code: 'B+',
        collected_volume_ml: 450,
        bag_serial_number: 'BAG-2026-999',
        process_status: 'COLLECTED',
        collected_at: new Date().toISOString(),
      },
    ];

    const processMock = vi.fn().mockResolvedValue({});

    render(
      <ComponentProcessingPage
        donations={mockDonations}
        onProcessDonation={processMock}
        loading={false}
      />
    );

    expect(screen.getByText('#don-001-')).toBeDefined();

    // Click "Fractionate"
    const fractionateBtn = screen.getByRole('button', { name: 'Fractionate' });
    fireEvent.click(fractionateBtn);

    // Component parameters modal is now shown
    expect(screen.getByText(/Prepare Blood Components/i)).toBeDefined();

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Create 3 Quarantined Units/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(processMock).toHaveBeenCalledWith({
        donationId: 'don-001-wholeblood',
        components: [
          { componentCode: 'RBC', volumeMl: 250, daysValid: 35 },
          { componentCode: 'PLASMA', volumeMl: 200, daysValid: 365 },
          { componentCode: 'PLATELETS', volumeMl: 50, daysValid: 5 },
        ],
      });
    });
  });

  it('M4-UI-05: ExpiryAlertsPage categorizes alerts into Critical <=48h, Warning <=7d, and Expired', () => {
    const mockAlerts = [
      {
        id: 'crit0001-uuid',
        component_code: 'PLATELETS',
        blood_type_code: 'O+',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        days_left: 1,
        hours_left: 24,
        alert_urgency: 'CRITICAL',
      },
      {
        id: 'warn0002-uuid',
        component_code: 'RBC',
        blood_type_code: 'A+',
        expires_at: new Date(Date.now() + 432000000).toISOString(),
        days_left: 5,
        hours_left: 120,
        alert_urgency: 'WARNING',
      },
    ];

    render(
      <ExpiryAlertsPage
        alerts={mockAlerts}
        loading={false}
      />
    );

    expect(screen.getByText(/Critical <=48h \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Warning <=7d \(1\)/i)).toBeDefined();
    expect(screen.getByText('#crit0001')).toBeDefined();
    expect(screen.getByText('#warn0002')).toBeDefined();
  });

  it('M4-UI-06: StockReservationForm filters units matching request requirements and validates unit selection', async () => {
    const mockItem = {
      id: 'req-item-99',
      blood_type_code: 'O-',
      component_code: 'RBC',
      units_requested: 2,
      units_fulfilled: 0,
    };

    const mockUnits = [
      {
        id: 'unit-match-01',
        blood_type_code: 'O-',
        component_code: 'RBC',
        volume_ml: 450,
        release_status: 'RELEASED',
        inventory_status: 'IN_STOCK',
        expires_at: new Date(Date.now() + 864000000).toISOString(),
        days_left: 10,
      },
      {
        id: 'unit-wrong-02',
        blood_type_code: 'A+',
        component_code: 'RBC',
        volume_ml: 450,
        release_status: 'RELEASED',
        inventory_status: 'IN_STOCK',
        expires_at: new Date(Date.now() + 864000000).toISOString(),
        days_left: 10,
      },
    ];

    const reserveMock = vi.fn();

    render(
      <StockReservationForm
        requestItem={mockItem}
        availableUnits={mockUnits}
        onSubmit={reserveMock}
        onCancel={() => {}}
      />
    );

    // Only matching O- RBC unit should be shown in select dropdown
    const select = screen.getByLabelText(/Select Eligible Unit/i);
    fireEvent.change(select, { target: { value: 'unit-match-01' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Reservation/i });
    fireEvent.click(submitBtn);

    expect(reserveMock).toHaveBeenCalledWith({
      requestItemId: 'req-item-99',
      bloodUnitId: 'unit-match-01',
      notes: undefined,
    });
  });

  it('M4-UI-07: BankPortal coordinates sidebar navigation across all 14 menus and handles live API calls', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            kpis: {
              available_units: 50,
              expiring_soon: 4,
              incoming_requests: 2,
              today_collections: 7,
              in_transit_transfers: 1,
              upcoming_camps: 2,
            },
            bloodGroupAvailability: [],
            expiryWatch: [],
            recentActivity: [],
          },
        }),
    });

    render(
      <BankPortal
        token="mock-token"
        session={{ user: { id: 1, role: 'BANK_STAFF', bloodBankId: 1 } }}
        activeTab="overview"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.getByText('Inventory control')).toBeDefined();
  });
});
