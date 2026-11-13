import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulletRewriterModal from '../components/BulletRewriterModal';
import JobTailorModal from '../components/JobTailorModal';

describe('BulletRewriterModal Component', () => {
  it('renders modal header, textarea, and missing keyword tags', () => {
    render(
      <BulletRewriterModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
        initialBullet="worked on building a backend dashboard"
        missingKeywords={["Docker", "PostgreSQL", "FastAPI"]}
      />
    );

    expect(screen.getByText(/Grounded AI Bullet Rewriter/i)).toBeInTheDocument();
    expect(screen.getByText(/Strengthen Bullet with Real Impact/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/worked on building a backend dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Docker/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ PostgreSQL/i)).toBeInTheDocument();
  });

  it('selects and deselects missing keyword chips', () => {
    render(
      <BulletRewriterModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
        initialBullet="worked on building APIs"
        missingKeywords={["FastAPI"]}
      />
    );

    const chip = screen.getByText(/\+ FastAPI/i);
    fireEvent.click(chip);
    expect(screen.getByText(/✓ FastAPI/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/✓ FastAPI/i));
    expect(screen.getByText(/\+ FastAPI/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BulletRewriterModal
        isOpen={false}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('JobTailorModal Component', () => {
  it('displays premium lock banner when user is on free tier', () => {
    const mockUpgrade = vi.fn();
    render(
      <JobTailorModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
        missingKeywords={["Docker"]}
        isPremium={false}
        handleUpgrade={mockUpgrade}
      />
    );

    expect(screen.getByText(/Student Premium Feature/i)).toBeInTheDocument();
    expect(screen.getByText(/Sprint Pass \(₹199 \/ 14 days\)/i)).toBeInTheDocument();

    const upgradeBtn = screen.getByRole('button', { name: /Upgrade to Sprint Pass/i });
    fireEvent.click(upgradeBtn);
    expect(mockUpgrade).toHaveBeenCalledTimes(1);
  });

  it('renders tailor action button when user is premium', () => {
    render(
      <JobTailorModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
        missingKeywords={["Docker", "FastAPI"]}
        isPremium={true}
      />
    );

    expect(screen.getByText(/Generate Tailored Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Docker/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ FastAPI/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <JobTailorModal
        isOpen={false}
        onClose={vi.fn()}
        analysisId="test-analysis-1"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
