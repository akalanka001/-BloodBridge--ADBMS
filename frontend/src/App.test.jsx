import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from './App.jsx';

describe('BloodBridge Frontend Application', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/locations/districts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ code: 'CO', name: 'Colombo', province_code: 'WP' }] }),
        });
      }
      if (url.includes('/camps')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                camp_id: '11111111-1111-1111-1111-111111111111',
                title: 'DEMO Community Donation Camp',
                town: 'Colombo 07',
                district_name: 'Colombo',
                starts_at: '2026-11-20T09:00:00+05:30',
                ends_at: '2026-11-20T14:00:00+05:30',
                capacity: 100,
                coordinating_blood_bank: 'National Blood Centre',
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the BloodBridge branding and navbar', async () => {
    window.location.hash = '#home';
    await act(async () => { render(<App />); });
    expect(screen.getAllByText(/Blood/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bridge/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Home/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Find Camps/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Donor/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Hospital/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Blood Bank/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Admin/i })).toBeDefined();
  });

  it('renders landing hero section and call to action', async () => {
    window.location.hash = '#home';
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Every drop connects/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Become a Donor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Explore Donation Camps/i })).toBeDefined();
  });

  it('renders core feature cards on landing page', async () => {
    window.location.hash = '#home';
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Give blood, give hope/i)).toBeDefined();
    expect(screen.getByText(/Coordinate urgent needs/i)).toBeDefined();
    expect(screen.getByText(/Track available units/i)).toBeDefined();
  });

  it('renders Find Camps page with district filter', async () => {
    window.location.hash = '#camps';
    await act(async () => { render(<App />); });
    expect(await screen.findByText(/Filter by district/i)).toBeDefined();
    expect(screen.getByRole('heading', { name: /Donation camps/i })).toBeDefined();
  });

  it('renders Donor dashboard preview', async () => {
    window.location.hash = '#donor';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Your donation journey/i })).toBeDefined();
    expect(screen.getAllByText(/Donor Portal/i).length).toBeGreaterThan(0);
  });

  it('renders Hospital dashboard preview', async () => {
    window.location.hash = '#hospital';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Coordinated emergency requests/i })).toBeDefined();
    expect(screen.getAllByText(/Hospital Portal/i).length).toBeGreaterThan(0);
  });

  it('renders Blood Bank dashboard preview', async () => {
    window.location.hash = '#bank';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Manage your blood bank/i })).toBeDefined();
    expect(screen.getAllByText(/Blood Bank Portal/i).length).toBeGreaterThan(0);
  });

  it('renders Admin dashboard preview', async () => {
    window.location.hash = '#admin';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Operational insights/i })).toBeDefined();
    expect(screen.getAllByText(/Admin Portal/i).length).toBeGreaterThan(0);
  });

  it('renders sign up page with form inputs', async () => {
    window.location.hash = '#signup';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Join the BloodBridge community/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined();
  });

  it('renders login page with credentials form', async () => {
    window.location.hash = '#login';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Sign in/i }).length).toBeGreaterThan(0);
  });
});
