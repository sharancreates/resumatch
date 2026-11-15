import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import StudentPricingModal from '../components/StudentPricingModal';

vi.mock('axios');

describe('StudentPricingModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        status: 'success',
        referral_code: 'CAMPUS26',
        share_url: 'https://resumatch.io/?ref=CAMPUS26',
        total_referrals: 0,
        pending_towards_next: 0,
        days_earned: 0
      }
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <StudentPricingModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders student pricing tiers (Free, Sprint Pass, Placement Season)', () => {
    render(
      <StudentPricingModal
        isOpen={true}
        onClose={vi.fn()}
        token="test-token"
      />
    );

    expect(screen.getByText(/Built for Freshers. Priced for Students./i)).toBeInTheDocument();
    expect(screen.getByText('Sprint Pass')).toBeInTheDocument();
    expect(screen.getByText('Placement Season')).toBeInTheDocument();
    expect(screen.getByText('₹199')).toBeInTheDocument();
    expect(screen.getByText('₹499')).toBeInTheDocument();
  });

  it('displays instant UPI checkout and campus license callouts', () => {
    render(
      <StudentPricingModal
        isOpen={true}
        onClose={vi.fn()}
        token="test-token"
      />
    );

    expect(screen.getByText(/Instant UPI One-Tap Checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/College Placement Cells & TPOs/i)).toBeInTheDocument();
  });

  it('initiates checkout order when clicking Get Sprint Pass', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        status: 'mock',
        amount: 19900,
        plan_id: 'sprint_pass'
      }
    });

    // Mock window.confirm to cancel so it stops after order creation
    window.confirm = vi.fn(() => false);

    render(
      <StudentPricingModal
        isOpen={true}
        onClose={vi.fn()}
        token="test-token"
        API_URL=""
      />
    );

    const sprintButton = screen.getByRole('button', { name: /Get Sprint Pass \(₹199\)/i });
    fireEvent.click(sprintButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/billing/order',
        { plan_id: 'sprint_pass' },
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' }
        })
      );
    });
  });

  it('switches to viral referral tab and displays share link', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        status: 'success',
        referral_code: 'CAMPUS26',
        share_url: 'https://resumatch.io/?ref=CAMPUS26',
        total_referrals: 2,
        pending_towards_next: 2,
        days_earned: 0
      }
    });

    render(
      <StudentPricingModal
        isOpen={true}
        onClose={vi.fn()}
        token="test-token"
        initialTab="referral"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Invite 3 Friends → Get 7 Days Free!/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://resumatch.io/?ref=CAMPUS26')).toBeInTheDocument();
      expect(screen.getByText(/Share on WhatsApp College Groups/i)).toBeInTheDocument();
    });
  });
});

