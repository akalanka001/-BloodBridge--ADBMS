import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DonorPortal } from './DonorPortal.jsx';
import { AvailabilityToggle } from './components/AvailabilityToggle.jsx';
import { DonationJourneyChart } from './components/DonationJourneyChart.jsx';
import { NextReviewCard } from './components/NextReviewCard.jsx';
import { InvitationCard } from './components/InvitationCard.jsx';

describe('Member 2 — Donor Dashboard UI & Subpages (M2 Frontend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('M2-UI-01: AvailabilityToggle renders status and fires onToggle callback', () => {
    const handleToggle = vi.fn();
    render(<AvailabilityToggle isAvailable={true} onToggle={handleToggle} />);

    expect(screen.getByText('AVAILABLE')).toBeDefined();
    expect(screen.getByText('Ready to help')).toBeDefined();

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);
    expect(handleToggle).toHaveBeenCalledWith(false);
  });

  it('M2-UI-02: NextReviewCard renders review countdown and mandatory clearance disclaimer', () => {
    const reviewInfo = {
      is_deferred: false,
      days_until_review: 42,
      earliest_review_date: '2026-12-05',
      deferral_status: 'NONE',
      clearance_disclaimer:
        'Calculated date represents earliest administrative assessment review and does not constitute medical transfusion clearance.',
    };

    render(<NextReviewCard reviewInfo={reviewInfo} />);

    expect(screen.getByText(/Earliest Review in 42 days/i)).toBeDefined();
    expect(
      screen.getByText(/does not constitute medical transfusion clearance/i),
    ).toBeDefined();
  });

  it('M2-UI-03: NextReviewCard displays warning and reason when temporary deferral is active', () => {
    const reviewInfo = {
      is_deferred: true,
      deferral_status: 'TEMPORARY_DEFERRAL',
      deferral_reason: 'Low hemoglobin level (11.8 g/dL)',
      deferral_until: '2026-11-20',
      clearance_disclaimer: 'Clinical clearance required.',
    };

    render(<NextReviewCard reviewInfo={reviewInfo} />);

    expect(screen.getByText(/Temporary Deferral Active/i)).toBeDefined();
    expect(screen.getByText(/Low hemoglobin level/i)).toBeDefined();
  });

  it('M2-UI-04: DonationJourneyChart renders SVG curve with data points and handles empty state', () => {
    const journey = [
      { month: 'Jan', count: 1, total_volume_ml: 450 },
      { month: 'May', count: 2, total_volume_ml: 900 },
    ];

    const { rerender } = render(
      <DonationJourneyChart journey={journey} totalDonations={3} />,
    );
    expect(screen.getByText('Jan')).toBeDefined();
    expect(screen.getByText('May')).toBeDefined();

    // Rerender with empty state
    rerender(<DonationJourneyChart journey={[]} totalDonations={0} />);
    expect(screen.getByText(/No verified donations recorded yet/i)).toBeDefined();
  });

  it('M2-UI-05: InvitationCard renders details without exposing patient info and handles action', async () => {
    const invitation = {
      id: 'inv-123',
      blood_bank_name: 'Colombo Central Blood Bank',
      area_description: 'Colombo District',
      blood_type_code: 'O+',
      urgency: 'URGENT',
      title: 'Urgent Trauma Appeal',
      message: 'Urgent units required for surgical emergencies.',
      status: 'PENDING',
      expires_at: '2026-10-31T00:00:00Z',
    };

    const handleRespond = vi.fn().mockResolvedValue({});

    render(<InvitationCard invitation={invitation} onRespond={handleRespond} />);

    expect(screen.getByText('Colombo Central Blood Bank')).toBeDefined();
    expect(screen.getByText('Urgent Trauma Appeal')).toBeDefined();
    expect(screen.queryByText(/Patient ID/i)).toBeNull();

    const interestedBtn = screen.getByRole('button', { name: /Interested/i });
    fireEvent.click(interestedBtn);

    expect(handleRespond).toHaveBeenCalledWith('inv-123', 'INTERESTED');
  });

  it('M2-UI-06: DonorPortal renders overview tab with KPIs and summary by default', async () => {
    const mockProfile = {
      fullName: 'Amara Perera',
      email: 'amara@example.com',
      blood_type_code: 'O+',
      district_name: 'Colombo',
      available_for_contact: true,
      donation_count: 6,
    };

    render(
      <DonorPortal
        profile={mockProfile}
        token="mock-donor-token"
        activeTab="overview"
      />,
    );

    expect(screen.getByText(/Amara Perera/i)).toBeDefined();
    expect(screen.getByText('Your donations')).toBeDefined();
    expect(screen.getByText('Donation status')).toBeDefined();
  });
});
