import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { RegisterPage } from './auth/AuthPages.jsx';
import { DonorPortal } from './donor/DonorPortal.jsx';
import { IntakePortal } from './intake/IntakePortal.jsx';
import { TransfersPortal } from './transfers/TransfersPortal.jsx';
import { AdminPortal } from './admin/AdminPortal.jsx';
import { CampCard } from './camps/CampsPage.jsx';

describe('BloodBridge Domain Portals & Action Verification', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Online Self-Registration: renders fields, defaults consent to false, and posts to /auth/register-donor', async () => {
    const onDone = vi.fn();
    const districts = [{ code: 'CO', name: 'Colombo' }, { code: 'KD', name: 'Kandy' }];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Account created' }),
    });

    render(<RegisterPage districts={districts} onDone={onDone} />);

    expect(screen.getByText(/Donor registration/i)).toBeDefined();
    const nameInput = screen.getByPlaceholderText(/Your name/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const districtSelect = screen.getByRole('combobox', { name: /District/i });
    const contactConsent = screen.getByRole('checkbox', { name: /I agree to be contacted/i });
    const campConsent = screen.getByRole('checkbox', { name: /Notify me about approved local donation camps/i });

    // Explicit opt-in check: must default to false
    expect(contactConsent.checked).toBe(false);
    expect(campConsent.checked).toBe(false);

    fireEvent.change(nameInput, { target: { value: 'Nimal Perera' } });
    fireEvent.change(emailInput, { target: { value: 'nimal@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123#' } });
    fireEvent.change(districtSelect, { target: { value: 'CO' } });
    fireEvent.click(contactConsent);

    fireEvent.click(screen.getByRole('button', { name: /Create donor account/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/auth/register-donor');
    const body = JSON.parse(options.body);
    expect(body.fullName).toBe('Nimal Perera');
    expect(body.email).toBe('nimal@example.com');
    expect(body.availableForContact).toBe(true);
    expect(body.campNotificationsOptIn).toBe(false);
    expect(onDone).toHaveBeenCalled();
  });

  it('2. Walk-in Registration: requires explicit consent checkboxes and posts to /donor-intake/walk-ins', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'walkin-donor-123', full_name: 'Walkin Sunimal' } }),
    });

    render(<IntakePortal token="mock-staff-token" userBankId={1} />);

    // Switch to enroll tab
    fireEvent.click(screen.getByRole('button', { name: /Walk-in Enrollment/i }));

    const nameInput = document.getElementById('walkin-name');
    const phoneInput = document.getElementById('walkin-phone');
    const nicInput = document.getElementById('walkin-nic');
    const emergencyConsent = document.getElementById('walkin-consent-emergency');
    const campConsent = document.getElementById('walkin-consent-camps');

    // Consent must default to false
    expect(emergencyConsent.checked).toBe(false);
    expect(campConsent.checked).toBe(false);

    fireEvent.change(nameInput, { target: { value: 'Sunimal Silva' } });
    fireEvent.change(phoneInput, { target: { value: '0771234567' } });
    fireEvent.change(nicInput, { target: { value: '199512345678' } });
    fireEvent.click(emergencyConsent);

    fireEvent.click(document.getElementById('btn-enroll-walkin'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/donor-intake/walk-ins');
    const body = JSON.parse(options.body);
    expect(body.fullName).toBe('Sunimal Silva');
    expect(body.phone).toBe('0771234567');
    expect(body.allowEmergencyContact).toBe(true);
    expect(body.optInCampNotifications).toBe(false);
    expect(body.bloodBankId).toBe(1);
  });

  it('3. Donor Search: posts search query to /donor-intake/lookup and displays matching results', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            donor_id: 'd-101',
            full_name: 'Anura Bandara',
            blood_type_code: 'O+',
            phone: '0719876543',
            registration_origin: 'STAFF_WALKIN',
          },
        ],
      }),
    });

    render(<IntakePortal token="mock-staff-token" userBankId={1} />);

    fireEvent.change(document.getElementById('lookup-nic'), { target: { value: '199012345678' } });
    fireEvent.click(document.getElementById('btn-donor-search'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/donor-intake/lookup');
    const body = JSON.parse(options.body);
    expect(body.nationalId).toBe('199012345678');

    expect(await screen.findByText('Anura Bandara')).toBeDefined();
    expect(screen.getByText(/STAFF_WALKIN/i)).toBeDefined();
  });

  it('4. Account Claim Submission: DonorPortal submits link claim to /donors/me/link-claims', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'claim-999', status: 'PENDING' } }),
    });

    render(
      <DonorPortal
        profile={{ available_for_contact: false, camp_notifications_opt_in: false }}
        token="mock-donor-token"
      />
    );

    fireEvent.change(document.getElementById('claim-donor-id'), {
      target: { value: '88888888-8888-8888-8888-888888888888' },
    });
    fireEvent.change(document.getElementById('claim-notes'), {
      target: { value: 'Past donation under NIC 198512345678' },
    });
    fireEvent.click(document.getElementById('btn-submit-claim'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/donors/me/link-claims');
    const body = JSON.parse(options.body);
    expect(body.donorId).toBe('88888888-8888-8888-8888-888888888888');
    expect(body.verificationNotes).toBe('Past donation under NIC 198512345678');
  });

  it('5. Administrator Claim Approval: AdminPortal loads pending claims and approves via /approve endpoint', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            {
              id: 'claim-1234',
              claimant_name: 'Sunil Online',
              claimant_email: 'sunil@test.lk',
              donor_name: 'Sunil Walkin',
              donor_phone: '0772223334',
              blood_type_code: 'A+',
              verification_notes: 'NIC verified',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { metrics: { total_donors: 120 } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'claim-1234', status: 'APPROVED' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { metrics: { total_donors: 120 } } }),
      });

    render(<AdminPortal token="mock-admin-token" />);

    expect(await screen.findByText(/Sunil Online/i)).toBeDefined();
    const approveBtn = document.getElementById('btn-approve-claim-claim-1234');
    expect(approveBtn).toBeDefined();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const approveCall = calls.find(([url]) => url.includes('/admin/donor-link-claims/claim-1234/approve'));
      expect(approveCall).toBeDefined();
    });
  });

  it('6. Visit Check-in & Clinical Assessment: posts check-in and assessment decision to API', async () => {
    // Visit check-in response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'visit-555', status: 'CHECKED_IN' } }),
    });

    render(<IntakePortal token="mock-staff-token" userBankId={1} />);

    fireEvent.click(screen.getByRole('button', { name: /Visit Check-in/i }));

    fireEvent.change(document.getElementById('visit-donor-id'), {
      target: { value: 'donor-uuid-777' },
    });
    fireEvent.change(document.getElementById('visit-notes'), {
      target: { value: 'Routine donation intake' },
    });

    fireEvent.click(document.getElementById('btn-checkin-visit'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(global.fetch.mock.calls[0][0]).toContain('/donor-intake/visits');

    // Clinical Assessment post
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'assess-999', status: 'PASSED' } }),
    });

    fireEvent.change(document.getElementById('assess-hemoglobin'), { target: { value: '14.5' } });
    fireEvent.change(document.getElementById('assess-weight'), { target: { value: '68' } });
    fireEvent.click(document.getElementById('btn-save-assessment'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    expect(global.fetch.mock.calls[1][0]).toContain('/donor-intake/visits/visit-555/assessment');
    const assessBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(assessBody.status).toBe('PASSED');
    expect(assessBody.hemoglobin_g_dl).toBe(14.5);
  });

  it('7. Collection Recording: posts collection data with confirmed blood type and volume to /donor-intake/collections', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'donation-333', process_status: 'COLLECTED' } }),
    });

    render(<IntakePortal token="mock-staff-token" userBankId={1} />);

    fireEvent.click(screen.getByRole('button', { name: /Record Collection/i }));

    fireEvent.change(document.getElementById('collect-visit-id'), { target: { value: 'visit-555' } });
    fireEvent.change(document.getElementById('collect-donor-id'), { target: { value: 'donor-uuid-777' } });
    fireEvent.change(document.getElementById('collect-volume'), { target: { value: '450' } });
    fireEvent.change(document.getElementById('collect-bag-serial'), { target: { value: 'BAG-2026-001' } });

    fireEvent.click(document.getElementById('btn-save-collection'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(global.fetch.mock.calls[0][0]).toContain('/donor-intake/collections');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.visitId).toBe('visit-555');
    expect(body.collectedVolumeMl).toBe(450);
    expect(body.bagSerial).toBe('BAG-2026-001');
  });

  it('8. Transfer Dispatch and Receipt: verifies dispatch and 3-arg receipt with condition notes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'trf-1', transfer_code: 'TRF-001', source_bank_name: 'Colombo Central', target_bank_name: 'Kandy Base', status: 'REQUESTED' },
          { id: 'trf-2', transfer_code: 'TRF-002', source_bank_name: 'Galle Hospital', target_bank_name: 'Colombo Central', status: 'IN_TRANSIT' },
        ],
      }),
    });

    render(<TransfersPortal token="mock-bank-token" userBankId={1} />);

    expect(await screen.findByText('TRF-001')).toBeDefined();
    expect(screen.getByText('TRF-002')).toBeDefined();

    // Test Dispatch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'trf-1', status: 'IN_TRANSIT' } }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    fireEvent.change(document.getElementById('dispatch-transfer-id'), { target: { value: 'trf-1' } });
    fireEvent.click(document.getElementById('btn-dispatch-transfer'));

    await waitFor(() => {
      const dispatchCall = global.fetch.mock.calls.find(([url]) => url.includes('/transfers/trf-1/dispatch'));
      expect(dispatchCall).toBeDefined();
    });

    // Test Receipt with Notes
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'trf-2', status: 'RECEIVED' } }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    fireEvent.change(document.getElementById('receive-transfer-id'), { target: { value: 'trf-2' } });
    fireEvent.change(document.getElementById('receive-notes'), { target: { value: 'Cold chain verified at 4°C' } });
    fireEvent.click(document.getElementById('btn-receive-transfer'));

    await waitFor(() => {
      const receiveCall = global.fetch.mock.calls.find(([url]) => url.includes('/transfers/trf-2/receive'));
      expect(receiveCall).toBeDefined();
      const body = JSON.parse(receiveCall[1].body);
      expect(body.notes).toBe('Cold chain verified at 4°C');
    });
  });

  it('9. Camp Counter Distinction: displays registered seats and total capacity as distinct metrics', () => {
    const mockCamp = {
      camp_id: 'camp-101',
      title: 'Moratuwa University Blood Camp',
      town: 'Moratuwa',
      district_name: 'Colombo',
      starts_at: '2026-11-25T09:00:00+05:30',
      coordinating_blood_bank: 'Kalubowila Blood Bank',
      registered_donors: 35,
      capacity: 100,
    };

    render(<CampCard camp={mockCamp} />);

    expect(screen.getByText(/Moratuwa University Blood Camp/i)).toBeDefined();
    // Verify registered and capacity are separate
    expect(screen.getByText('35')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    const capacityElem = document.querySelector('.camp-capacity-stat');
    expect(capacityElem.textContent).toContain('Registered: 35 / Capacity: 100');
  });
});
