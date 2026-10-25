import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DonorAccountPage } from './pages/DonorAccountPage.jsx';
import { donorApi } from './api/donorApi.js';

describe('BloodBridge — Compact My Account Page Redesign', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  const mockProfile = {
    id: 'd1111111-1111-1111-1111-111111111111',
    user_id: 'u1111111-1111-1111-1111-111111111111',
    fullName: 'Nimal Perera',
    full_name: 'Nimal Perera',
    email: 'donor@bloodbridge.lk',
    phone: '0771234567',
    birth_date: '1996-05-05T00:00:00.000Z',
    weight_kg: 68.0,
    blood_type_code: 'O+',
    is_medically_verified: true,
    province_code: 'WP',
    district_code: 'CO',
    district_name: 'Colombo',
    ds_code: 'CO01',
    ds_name: 'Maharagama',
    gn_code: 'GN01',
    town: 'Maharagama',
    available_for_contact: true,
    emergency_appeal_opt_in: true,
    camp_notifications_opt_in: true,
    in_app_alerts: true,
    sms_alerts: true,
    email_alerts: true,
    newsletter_opt_in: false,
  };

  it('1. Correct initial profile data in compact header and card sections', () => {
    render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    // Compact Header: Initials, Name, Verified Donor badge
    expect(screen.getByText('NP')).toBeDefined();
    expect(screen.getByText('Nimal Perera')).toBeDefined();
    expect(screen.getAllByText(/Verified Donor/i).length).toBeGreaterThan(0);

    // Contact info in header
    expect(screen.getAllByText('donor@bloodbridge.lk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0771234567').length).toBeGreaterThan(0);

    // 3 Mini stats in header
    expect(screen.getAllByText('O+').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5 May 1996/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/68 kg/).length).toBeGreaterThan(0);

    // Decorative thank you banner
    expect(screen.getByText('Thank you for being a BloodBridge donor')).toBeDefined();

    // Four navigation anchor pills
    expect(screen.getByRole('button', { name: /Personal Details/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Location/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Preferences/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Security & Linked Records/i })).toBeDefined();
  });

  it('2. Personal details edit and save flow invokes updateProfile and updates parent state', async () => {
    const handleUpdate = vi.fn();
    vi.spyOn(donorApi, 'updateProfile').mockResolvedValue({
      data: { ...mockProfile, fullName: 'Nimal Silva', phone: '0779998888' },
    });

    render(
      <DonorAccountPage
        profile={mockProfile}
        token="mock-donor-jwt"
        onProfileUpdate={handleUpdate}
      />
    );

    // Initially input is disabled
    const nameInput = document.getElementById('input-full-name');
    expect(nameInput.disabled).toBe(true);

    // Find and click Edit button in Personal Details card
    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]);

    // Now name input is enabled
    expect(nameInput.disabled).toBe(false);
    fireEvent.change(nameInput, { target: { value: 'Nimal Silva' } });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(donorApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Nimal Silva' }),
        'mock-donor-jwt'
      );
      expect(handleUpdate).toHaveBeenCalled();
    });
  });

  it('3. Cancel/discard personal changes cancels edits and reverts to profile data', () => {
    render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    const nameInput = document.getElementById('input-full-name');
    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]);

    fireEvent.change(nameInput, { target: { value: 'Temporary Name' } });
    expect(nameInput.value).toBe('Temporary Name');

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Value reverts and input becomes disabled again
    expect(nameInput.value).toBe('Nimal Perera');
    expect(nameInput.disabled).toBe(true);
  });

  it('4. Correct blood-group verification display: protects medically verified blood types from user modification', () => {
    // Medically verified profile
    const { rerender } = render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    expect(screen.getByText('Medically Verified')).toBeDefined();
    expect(screen.getByText(/confirmed by clinical laboratory testing/i)).toBeDefined();
    // Cannot be a select dropdown
    expect(screen.queryByRole('combobox', { name: /Blood Group/i })).toBeNull();

    // Unverified profile: select dropdown is available in edit mode
    const unverifiedProfile = {
      ...mockProfile,
      is_medically_verified: false,
    };

    rerender(<DonorAccountPage profile={unverifiedProfile} token="mock-donor-jwt" />);
    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]);

    const bloodSelect = document.querySelector('select[name="bloodTypeCode"]');
    expect(bloodSelect).not.toBeNull();
    expect(bloodSelect.disabled).toBe(false);
  });

  it('5. Location editing: saves locality updates and supports cancellation', async () => {
    const handleUpdate = vi.fn();
    vi.spyOn(donorApi, 'updateProfile').mockResolvedValue({
      data: { ...mockProfile, town: 'Bambalapitiya' },
    });

    render(
      <DonorAccountPage
        profile={mockProfile}
        token="mock-donor-jwt"
        onProfileUpdate={handleUpdate}
      />
    );

    const townInput = document.getElementById('input-town-locality');
    expect(townInput.disabled).toBe(true);

    // Click Location Edit button (second edit button)
    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[1]);

    expect(townInput.disabled).toBe(false);
    fireEvent.change(townInput, { target: { value: 'Bambalapitiya' } });

    const saveLocBtn = screen.getByRole('button', { name: /Save Location/i });
    fireEvent.click(saveLocBtn);

    await waitFor(() => {
      expect(donorApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ town: 'Bambalapitiya' }),
        'mock-donor-jwt'
      );
      expect(handleUpdate).toHaveBeenCalled();
    });
  });

  it('6. Preference toggle persistence: updates single preference without resetting other consent values', async () => {
    vi.spyOn(donorApi, 'updatePreferences').mockResolvedValue({ success: true });

    render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    const routineSwitch = screen.getByRole('switch', {
      name: /Available for Routine Invitations/i,
    });
    expect(routineSwitch.getAttribute('aria-checked')).toBe('true');

    // Toggle off
    fireEvent.click(routineSwitch);

    await waitFor(() => {
      expect(donorApi.updatePreferences).toHaveBeenCalledWith(
        { availableForContact: false },
        'mock-donor-jwt'
      );
    });

    // Check newsletter switch remained false (independent values)
    const newsletterSwitch = screen.getByRole('switch', {
      name: /BloodBridge Newsletter & Health Tips/i,
    });
    expect(newsletterSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('7. Security & Linked Records: displays credentials, toggles password info, and submits claims', async () => {
    vi.spyOn(donorApi, 'submitClaim').mockResolvedValue({ success: true });
    vi.spyOn(donorApi, 'getClaims').mockResolvedValue({
      data: [
        {
          id: 'claim-1',
          donor_id: '99999999-9999-9999-9999-999999999999',
          claimed_at: '2026-10-01T10:00:00Z',
          status: 'PENDING',
          verification_notes: 'Hospital donor receipt #4502',
        },
      ],
    });

    render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    // Credentials column
    expect(screen.getByText('AUTHENTICATED DONOR')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();

    // Toggle Change Password
    const changePassBtn = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(changePassBtn);
    expect(screen.getByText(/Account Password Management/i)).toBeDefined();

    // Claim submission
    const donorIdInput = document.getElementById('claim-donor-id');
    const notesInput = document.getElementById('claim-notes');
    const submitClaimBtn = document.getElementById('btn-submit-claim');

    fireEvent.change(donorIdInput, {
      target: { value: '99999999-9999-9999-9999-999999999999' },
    });
    fireEvent.change(notesInput, {
      target: { value: 'Hospital donor receipt #4502' },
    });
    fireEvent.click(submitClaimBtn);

    await waitFor(() => {
      expect(donorApi.submitClaim).toHaveBeenCalledWith(
        {
          donorId: '99999999-9999-9999-9999-999999999999',
          verificationNotes: 'Hospital donor receipt #4502',
        },
        'mock-donor-jwt'
      );
    });
  });

  it('8. Failed API request handling: shows accessible toast error and prevents crash', async () => {
    vi.spyOn(donorApi, 'updateProfile').mockRejectedValue(new Error('Database validation failed'));

    render(<DonorAccountPage profile={mockProfile} token="mock-donor-jwt" />);

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[0]);

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Database validation failed/i)).toBeDefined();
    });
  });

  it('9. Design tokens, layout dimensions, and reduced-motion rules defined in stylesheet', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve('src/features/donor/donor-account.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Design tokens verified
    expect(css).toContain('#1D3043'); // Primary navy
    expect(css).toContain('#203249'); // Sidebar navy
    expect(css).toContain('#DB3654'); // Primary red
    expect(css).toContain('#F7F9FC'); // Background
    expect(css).toContain('#FFFFFF'); // Surface
    expect(css).toContain('#E6EBF1'); // Border

    // Dimensions
    expect(css).toContain('1320px'); // Max width
    expect(css).toContain('min-height: 42px'); // Input height
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
