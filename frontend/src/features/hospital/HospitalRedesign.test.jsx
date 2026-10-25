import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FindDonorsPage } from './pages/FindDonorsPage.jsx';
import { HospitalPortal } from './HospitalPortal.jsx';
import { HospitalNotificationsPage } from './pages/HospitalNotificationsPage.jsx';

const hospital = { hospitalId: 7, hospitalName: 'Synthetic hospital', provinceCode: 'WP', districtCode: 'CO', districtName: 'Colombo' };
const reply = data => Promise.resolve({ ok: true, json: async () => data });
const aggregate = (url, count) => {
  const params = new URL(url, 'http://localhost').searchParams;
  return { data: { candidateCount: count, appliedFilters: Object.fromEntries(params), queriedAt: '2026-10-25T10:00:00Z', definition: 'Potential candidates; assessment required.' } };
};
const geography = url => {
  if (url.includes('/locations/provinces')) return reply({ data: [{ code: 'WP', name: 'Western' }, { code: 'NP', name: 'Northern' }] });
  if (url.includes('/locations/districts')) return reply({ data: [{ code: 'CO', name: 'Colombo', province_code: 'WP' }, { code: 'JA', name: 'Jaffna', province_code: 'NP' }] });
  return reply({ data: [] });
};

describe('Hospital redesign workflows', () => {
  beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '#hospital?tab=requests'); });
  afterEach(() => vi.restoreAllMocks());

  it('queries geography automatically and prevents an older result overwriting a later area', async () => {
    let resolveOld;
    global.fetch = vi.fn(url => {
      if (!url.includes('/donor-candidates')) return geography(url);
      if (url.includes('districtCode=CO')) return new Promise(resolve => { resolveOld = () => resolve({ ok: true, json: async () => aggregate(url, 99) }); });
      return reply(aggregate(url, url.includes('districtCode=JA') ? 5 : 12));
    });
    render(<FindDonorsPage token="staff" hospital={hospital} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Candidate blood group' }), { target: { value: 'O+' } });
    await waitFor(() => expect(resolveOld).toBeDefined());
    fireEvent.change(screen.getByLabelText(/^Province/), { target: { value: 'NP' } });
    await screen.findByRole('option', { name: 'Jaffna' });
    fireEvent.change(screen.getByLabelText(/^District/), { target: { value: 'JA' } });
    await screen.findByText('5');
    resolveOld();
    await waitFor(() => expect(screen.queryByText('99')).toBeNull());
    expect(global.fetch.mock.calls.some(([url]) => url.includes('provinceCode=NP') && url.includes('districtCode=JA'))).toBe(true);
    expect(screen.queryByRole('button', { name: /search/i })).toBeNull();
  });

  it('uses the selected request item rather than the first item for donor search', async () => {
    global.fetch = vi.fn(url => url.includes('/donor-candidates') ? reply(aggregate(url, 0)) : geography(url));
    render(<FindDonorsPage token="staff" hospital={hospital} selectedRequest={{ id: 'request-1', items_json: [{ itemId: 'item-1', bloodTypeCode: 'O+', componentCode: 'RBC', unitsRequested: 2 }, { itemId: 'item-2', bloodTypeCode: 'AB-', componentCode: 'PLASMA', unitsRequested: 3 }] }} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Candidate request item' }), { target: { value: 'item-2' } });
    await waitFor(() => expect(global.fetch.mock.calls.some(([url]) => url.includes('requestItemId=item-2') && url.includes('bloodTypeCode=AB-'))).toBe(true));
    expect(screen.getByRole('combobox', { name: 'Candidate blood group' }).disabled).toBe(true);
    await screen.findByText('0');
    expect(screen.queryByText(/eligible donor/i)).toBeNull();
  });

  it('pages on the server and retains the selected page when returning from request creation', async () => {
    global.fetch = vi.fn(url => {
      if (url.includes('/hospital/context')) return reply({ data: hospital });
      if (url.includes('/hospital/dashboard')) return reply({ data: { kpis: {}, recentRequests: [], urgentShortages: [] } });
      if (url.includes('/hospital/reports')) return reply({ data: { total_requests: 21 } });
      if (/\/requests\?/.test(url)) {
        const params = new URL(url, 'http://localhost').searchParams;
        return reply({ data: [{ id: `request-page-${params.get('offset')}`, status: 'OPEN', urgency: 'ROUTINE', needed_by: '2026-11-10T10:00:00Z', total_requested_units: 2, items_json: [] }], pagination: { total: 21, limit: 10, offset: Number(params.get('offset')) } });
      }
      return reply({ data: [] });
    });
    render(<HospitalPortal token="staff" activeTab="requests" />);
    await screen.findByText('#request-');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('11–20 of 21');
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/requests?') && url.includes('offset=10'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'New request' }));
    await screen.findByText(/New Blood Component Request/);
    fireEvent.click(screen.getByRole('button', { name: /Back to blood requests/i }));
    await screen.findByText('11–20 of 21');
    expect(screen.queryByText(/Section not found/i)).toBeNull();
  });

  it('shows a truthful empty activity feed without inventing a synchronization event', () => {
    render(<HospitalNotificationsPage />);
    expect(screen.getByText('No notifications in this filter')).toBeDefined();
    expect(screen.queryByText(/National Blood Transfusion Network Synchronized/)).toBeNull();
  });
});
