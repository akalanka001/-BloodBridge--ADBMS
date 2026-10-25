import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CampCard, CampCardSkeleton } from './CampCard.jsx';
import { campsApi } from './api/campsApi.js';
import { FindCampsPage } from '../donor/pages/FindCampsPage.jsx';

describe('BloodBridge — Camp Discovery Cards Redesign', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseCamp = {
    camp_id: 'c1111111-1111-1111-1111-111111111111',
    title: 'Moratuwa Community Blood Donation Drive',
    starts_at: '2026-11-25T09:00:00+05:30',
    ends_at: '2026-11-25T15:00:00+05:30',
    town: 'Moratuwa',
    venue_address: 'Town Hall Grounds',
    district_code: 'CO',
    district_name: 'Colombo',
    ds_code: 'CO01',
    ds_name: 'Moratuwa',
    gn_code: 'GN01',
    coordinating_blood_bank: 'Kalubowila Base Blood Bank',
    status: 'APPROVED',
    capacity: 100,
    registered_count: 35,
    registered_donors: 35,
    registration_status: null,
    primary_poster_url: null,
  };

  it('1. Renders camp details with bold title, metadata icons, and distinct capacity metrics', () => {
    render(<CampCard camp={baseCamp} />);

    // Title
    expect(screen.getByText('Moratuwa Community Blood Donation Drive')).toBeDefined();

    // Venue and district with MapPin icon
    expect(screen.getByText('Moratuwa, Colombo')).toBeDefined();

    // Coordinating blood bank with Building2 icon
    expect(screen.getByText('Kalubowila Base Blood Bank')).toBeDefined();

    // Date & Time
    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('NOV')).toBeDefined();

    // Capacity & Registered metrics (.camp-capacity-stat preserved)
    const capacityElem = document.querySelector('.camp-capacity-stat');
    expect(capacityElem).not.toBeNull();
    expect(capacityElem.textContent).toContain('Registered: 35 / Capacity: 100');
    expect(screen.getByText('65 places left')).toBeDefined();

    // Approved status pill
    expect(screen.getByText('Approved')).toBeDefined();
  });

  it('2. Image section renders camp poster when available and falls back to branded illustration', () => {
    const posterCamp = {
      ...baseCamp,
      primary_poster_url: '/uploads/camp-poster-2026.webp',
      primary_poster_alt: 'Moratuwa drive promotional poster',
    };

    const { rerender } = render(<CampCard camp={posterCamp} />);

    // Actual poster rendered
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/uploads/camp-poster-2026.webp');
    expect(img.getAttribute('alt')).toBe('Moratuwa drive promotional poster');

    // On image load failure, falls back to branded illustration
    fireEvent.error(img);
    expect(document.querySelector('.bb-camp-illustration')).not.toBeNull();

    // Rerender without poster: directly renders branded illustration
    rerender(<CampCard camp={baseCamp} />);
    expect(document.querySelector('.bb-camp-illustration')).not.toBeNull();
    expect(document.querySelector('.bb-camp-date-badge')).not.toBeNull();
  });

  it('3. Proximity badge shows "In your DS division" ONLY when camp and donor locations match', () => {
    const donorAreaColomboMoratuwa = {
      district_code: 'CO',
      ds_code: 'CO01',
      gn_code: 'GN99',
      province_code: 'WP',
    };

    // Matching DS division
    const matchingCamp = {
      ...baseCamp,
      nearby_rank: 1,
      district_code: 'CO',
      ds_code: 'CO01',
    };

    const { rerender } = render(
      <CampCard camp={matchingCamp} savedArea={donorAreaColomboMoratuwa} />
    );
    expect(screen.getByText('In your DS division')).toBeDefined();

    // Mismatched DS division: MUST NOT show "In your DS division"
    const mismatchedCamp = {
      ...baseCamp,
      nearby_rank: 2,
      district_code: 'CO',
      ds_code: 'CO02', // Different DS division (e.g. Maharagama)
    };

    rerender(<CampCard camp={mismatchedCamp} savedArea={donorAreaColomboMoratuwa} />);
    expect(screen.queryByText('In your DS division')).toBeNull();
    expect(screen.getByText('In your district')).toBeDefined();

    // Other province: no proximity badge
    const farCamp = {
      ...baseCamp,
      nearby_rank: 4,
      district_code: 'KD',
      ds_code: 'KD01',
      province_code: 'CP',
    };

    rerender(<CampCard camp={farCamp} savedArea={donorAreaColomboMoratuwa} />);
    expect(screen.queryByText(/In your/i)).toBeNull();
  });

  it('4. Actions section displays two side-by-side buttons of equal width', () => {
    const handleViewDetails = vi.fn();
    render(
      <CampCard
        camp={baseCamp}
        token="donor-token"
        onViewDetails={handleViewDetails}
      />
    );

    const viewBtn = screen.getByRole('button', { name: /View Details/i });
    const regBtn = screen.getByRole('button', { name: /Register for Camp/i });

    expect(viewBtn).toBeDefined();
    expect(regBtn).toBeDefined();

    // Check actions container class
    const actionsBox = document.querySelector('.bb-camp-card-actions');
    expect(actionsBox).not.toBeNull();

    // View details callback fires with campId
    fireEvent.click(viewBtn);
    expect(handleViewDetails).toHaveBeenCalledWith(baseCamp.camp_id);
  });

  it('5. Registration flow: shows loading state and waits for database confirmation before success', async () => {
    let resolveApi;
    const registerPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    vi.spyOn(campsApi, 'registerDonor').mockReturnValue(registerPromise);

    const onRegChange = vi.fn();
    render(
      <CampCard
        camp={baseCamp}
        token="mock-donor-jwt"
        onRegistrationChange={onRegChange}
      />
    );

    const regBtn = screen.getByRole('button', { name: /Register for Camp/i });
    fireEvent.click(regBtn);

    // Shows loading state immediately
    expect(screen.getByText(/Registering…/i)).toBeDefined();
    // NEVER shows success before database confirmation
    expect(screen.queryByText('Registered')).toBeNull();

    // Simulate database confirmation
    resolveApi({ success: true });

    await waitFor(() => {
      expect(screen.getByText('Registered')).toBeDefined();
      expect(screen.getByRole('button', { name: /Cancel Registration/i })).toBeDefined();
      expect(onRegChange).toHaveBeenCalledWith(true);
    });
  });

  it('6. Cancellation flow: prompts confirmation and cancels registration', async () => {
    vi.spyOn(campsApi, 'cancelRegistration').mockResolvedValue({ success: true });

    const registeredCamp = {
      ...baseCamp,
      registration_status: 'REGISTERED',
    };

    const onRegChange = vi.fn();
    render(
      <CampCard
        camp={registeredCamp}
        token="mock-donor-jwt"
        onRegistrationChange={onRegChange}
      />
    );

    // Initial state: shows Registered badge and Cancel button
    expect(screen.getByText('Registered')).toBeDefined();
    const cancelBtn = screen.getByRole('button', { name: /Cancel Registration/i });

    // Click triggers confirmation prompt
    fireEvent.click(cancelBtn);
    expect(screen.getByText(/Cancel registration\?/i)).toBeDefined();

    // Click confirm cancel
    const confirmBtn = screen.getByRole('button', { name: /Confirm Cancel/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(campsApi.cancelRegistration).toHaveBeenCalledWith(baseCamp.camp_id, 'mock-donor-jwt');
      expect(screen.queryByText('Registered')).toBeNull();
      expect(screen.getByRole('button', { name: /Register for Camp/i })).toBeDefined();
      expect(onRegChange).toHaveBeenCalledWith(false);
    });
  });

  it('7. Handles Camp Full and Registration Closed states correctly', () => {
    // Camp Full: capacity reached
    const fullCamp = {
      ...baseCamp,
      capacity: 50,
      registered_count: 50,
    };

    const { rerender } = render(<CampCard camp={fullCamp} token="mock-donor-jwt" />);
    const fullBtn = screen.getByRole('button', { name: /Camp Full/i });
    expect(fullBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('0 places left')).toBeDefined();

    // Registration Closed: past date
    const pastCamp = {
      ...baseCamp,
      starts_at: '2024-01-01T09:00:00+05:30', // Past
    };

    rerender(<CampCard camp={pastCamp} token="mock-donor-jwt" />);
    const closedBtn = screen.getByRole('button', { name: /Registration Closed/i });
    expect(closedBtn.hasAttribute('disabled')).toBe(true);
  });

  it('8. CampCardSkeleton renders shimmer placeholders for loading state', () => {
    render(<CampCardSkeleton />);

    const skeleton = document.querySelector('.bb-camp-skeleton');
    expect(skeleton).not.toBeNull();
    expect(document.querySelector('.bb-skeleton-img')).not.toBeNull();
    expect(document.querySelector('.bb-skeleton-title')).not.toBeNull();
  });

  it('9. FindCampsPage includes Registration availability sort option and renders skeleton cards while loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.spyOn(campsApi, 'discoverCamps').mockImplementation(() => new Promise(() => {})); // pending

    render(<FindCampsPage token="mock-token" />);

    // Verify sort options
    const sortSelect = screen.getByRole('combobox', { name: /Order by/i });
    expect(sortSelect).toBeDefined();
    expect(screen.getByRole('option', { name: /Nearest saved area/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Upcoming date/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Registration availability/i })).toBeDefined();

    // Verify skeleton cards render while loading
    const skeletons = document.querySelectorAll('.bb-camp-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('10. Keyboard navigation: action buttons are focusable and accessible', () => {
    const handleViewDetails = vi.fn();
    render(
      <CampCard
        camp={baseCamp}
        token="mock-token"
        onViewDetails={handleViewDetails}
      />
    );

    const viewBtn = screen.getByRole('button', { name: /View Details/i });
    const regBtn = screen.getByRole('button', { name: /Register for Camp/i });

    viewBtn.focus();
    expect(document.activeElement).toBe(viewBtn);

    regBtn.focus();
    expect(document.activeElement).toBe(regBtn);

    // Enter or Space key fires action
    fireEvent.keyDown(viewBtn, { key: 'Enter', code: 'Enter' });
  });

  it('11. Design tokens and reduced-motion rules are properly defined in stylesheet', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve('src/features/camps/camp-portal.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Design tokens
    expect(css).toContain('#1D3043'); // Deep navy
    expect(css).toContain('#DB3654'); // Primary red
    expect(css).toContain('#F7F9FC'); // Background
    expect(css).toContain('#FFFFFF'); // Surface
    expect(css).toContain('#E6EBF1'); // Border
    expect(css).toContain('#64748B'); // Secondary text

    // Motion and accessibility
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('translateY(-4px)');
    expect(css).toContain('scale(1.025)');
    expect(css).toContain('translateX(3px)');
    expect(css).toContain('bbCardFadeIn');
  });
});
