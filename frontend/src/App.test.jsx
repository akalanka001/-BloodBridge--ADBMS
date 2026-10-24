import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from './app/App.jsx';

describe('BloodBridge Frontend Application (Member 1)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/locations/districts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ code: 'CO', name: 'Colombo', province_code: 'WP' }] }),
        });
      }
      if (url.includes('/locations/provinces')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ code: 'WP', name: 'Western Province' }] }),
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

  // M1-A01: Public vs logged-out navigation
  it('M1-A01: renders public navigation with Home and Find Camps, NEVER exposing role tabs to unauthenticated visitors', async () => {
    window.location.hash = '#home';
    await act(async () => { render(<App />); });

    expect(screen.getAllByText(/Blood/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bridge/i).length).toBeGreaterThan(0);

    // Public links present
    expect(screen.getByRole('link', { name: /Home/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Find Camps/i })).toBeDefined();

    // Internal role preview tabs MUST NOT be exposed in public nav
    expect(screen.queryByRole('link', { name: /^Donor$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Hospital$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Blood Bank$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Admin$/i })).toBeNull();

    // Auth action buttons present
    expect(screen.getAllByRole('button', { name: /Sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Register/i }).length).toBeGreaterThan(0);
  });

  // M1-A02: Role-aware navigation when logged in
  it('M1-A02: shows Dashboard link, user badge, and Log out button when authenticated', async () => {
    sessionStorage.setItem('bb_session', JSON.stringify({
      token: 'mock.donor.token',
      user: { id: '00000000-0000-0000-0000-000000000001', role: 'DONOR', fullName: 'Anura Kumara', email: 'anura@example.com' },
    }));

    window.location.hash = '#donor';
    await act(async () => { render(<App />); });

    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Log out/i })).toBeDefined();
    expect(screen.getAllByText(/Anura/i).length).toBeGreaterThan(0);
  });

  // M1-A03: Direct hash route access denied without role
  it('M1-A03: denies direct hash route access to protected portals when unauthenticated and redirects with notice', async () => {
    window.location.hash = '#hospital';
    await act(async () => { render(<App />); });

    // Should redirect to login and show auth notice
    expect(screen.getAllByText(/Authentication required/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeDefined();
  });

  it('renders landing hero section and call to action', async () => {
    window.location.hash = '#home';
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Every drop connects/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Become a Donor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Explore Donation Camps/i })).toBeDefined();
  });

  it('renders Find Camps page with district filter', async () => {
    window.location.hash = '#camps';
    await act(async () => { render(<App />); });
    expect(await screen.findByText(/Filter by district/i)).toBeDefined();
    expect(screen.getByRole('heading', { name: /Donation camps/i })).toBeDefined();
  });

  // M1-A05 & eligibility: Donor registration form with age and weight criteria
  it('renders sign up page with Age (18+) and Weight (50+ kg) eligibility controls', async () => {
    window.location.hash = '#signup';
    await act(async () => { render(<App />); });

    expect(screen.getByRole('heading', { name: /Join the BloodBridge community/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeDefined();

    // Verify statutory eligibility notices and inputs
    expect(screen.getByText(/National Donor Eligibility Criteria/i)).toBeDefined();
    expect(screen.getByText(/at least 18 years of age/i)).toBeDefined();
    expect(screen.getAllByText(/at least 50 kg/i).length).toBeGreaterThan(0);

    // Verify presence of Date of birth and Weight inputs
    expect(screen.getByLabelText(/Date of birth/i)).toBeDefined();
    expect(screen.getByLabelText(/Weight in kg/i)).toBeDefined();
  });

  it('renders login page with credentials form and recovery links', async () => {
    window.location.hash = '#login';
    await act(async () => { render(<App />); });
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Forgot password/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Activate staff account/i })).toBeDefined();
  });
});
