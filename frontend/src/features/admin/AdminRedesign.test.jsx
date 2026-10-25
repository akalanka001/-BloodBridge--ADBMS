import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AdministrativeLedger } from './pages/AdministrativeLedger.jsx';
import { CampOversightPage } from './pages/CampOversightPage.jsx';
import { CampApprovalsPage } from './pages/CampApprovalsPage.jsx';
import { normalizeAdminCamp } from './api/adminApi.js';
import { BenchmarkComparison } from '../analytics/components/BenchmarkComparison.jsx';
import { DemandAnalysisPage } from '../analytics/pages/DemandAnalysisPage.jsx';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mockJson = (data) => ({ ok: true, json: async () => data });

describe('Administrator portal regression fixes', () => {
  it('uses the authenticated management camp dataset and normalizes camp_id', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(mockJson({ data: [{ camp_id: 'camp-uuid', title: 'Synthetic camp', status: 'DRAFT', starts_at: '2026-12-01T09:00:00+05:30', ends_at: '2026-12-01T12:00:00+05:30', capacity: null }], pagination: { total: 1 } }));
    render(<CampOversightPage token="admin-token" />);
    expect(await screen.findByText('Synthetic camp')).toBeDefined();
    expect(fetch.mock.calls[0][0]).toContain('/camps/managed?');
    expect(normalizeAdminCamp({ camp_id: 'camp-uuid' }).id).toBe('camp-uuid');
    expect(screen.queryByText(/Section Not Found/)).toBeNull();
  });
  it('never offers an approval decision for an approved public camp', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockJson({ data: [{ camp_id: 'approved-id', title: 'Already approved', status: 'APPROVED' }], pagination: { total: 0 } }));
    render(<CampApprovalsPage token="admin-token" />);
    expect(await screen.findByText('No pending camps')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Review Decision/ })).toBeNull();
  });
  it('paginates all donor records using the server total and offset', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(mockJson({ data: [{ id: 'offline-donor', full_name: 'Synthetic walk-in', registration_origin: 'STAFF_WALKIN', has_online_account: false }], pagination: { total: 12 } }));
    render(<AdministrativeLedger token="admin-token" dataset="donors" />);
    expect((await screen.findAllByText('Synthetic walk-in')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('offset=10'))).toBe(true));
  });
  it('shows no benchmark measurements before a run', () => {
    render(<BenchmarkComparison />);
    expect(screen.getByText(/No benchmark result yet/)).toBeDefined();
    expect(screen.queryByText(/84%/)).toBeNull();
    expect(screen.queryByText(/0.12 ms/)).toBeNull();
  });
  it('treats zero demand as not applicable rather than a critical deficit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(mockJson({ data: [{ blood_type: 'O+', requested_units: 0, fulfilled_units: 0, fill_rate_pct: 0 }] }));
    render(<DemandAnalysisPage token="admin-token" />);
    expect(await screen.findByText('No demand')).toBeDefined();
    expect(screen.queryByText('Critical Deficit')).toBeNull();
  });
});
