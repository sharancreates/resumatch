import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from '../components/LandingPage';

beforeAll(() => {
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        this.callback([{ isIntersecting: true, target }]);
      }
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('LandingPage Component (Fresher Experience)', () => {
  it('renders student-first headline and brand copy', () => {
    render(<LandingPage onGetStarted={vi.fn()} onLogin={vi.fn()} />);

    // Fresher Headline
    expect(screen.getByText(/Upload your resume, paste a job/i)).toBeInTheDocument();
    expect(screen.getByText(/Get a better resume in 2 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Built for freshers, priced for students/i)).toBeInTheDocument();
    expect(screen.getByText(/Built for 2024–2026 Campus Drives/i)).toBeInTheDocument();
  });

  it('renders live no-signup free scanner widget and inputs', () => {
    render(<LandingPage onGetStarted={vi.fn()} onLogin={vi.fn()} />);

    // Free scanner heading & remaining count
    expect(screen.getByText(/Instant Free Scan \(No Signup Required\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of 3 Free Scans Remaining/i)).toBeInTheDocument();

    // Inputs
    expect(screen.getByText(/1\. Your Resume/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Target Job Description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your resume text here/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste the job requirements/i)).toBeInTheDocument();

    // Action button
    expect(screen.getByRole('button', { name: /Run Free ATS Match Scan/i })).toBeInTheDocument();
  });

  it('renders DPDP privacy guarantee banner and student pricing', () => {
    render(<LandingPage onGetStarted={vi.fn()} onLogin={vi.fn()} />);

    // DPDP banner
    expect(screen.getByText(/100% Student Privacy Guarantee \(DPDP Act 2023 Compliant\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero training on your resumes/i)).toBeInTheDocument();

    // Student pricing
    expect(screen.getByText(/Student Micro-Pricing/i)).toBeInTheDocument();
    expect(screen.getByText(/Sprint Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement Season/i)).toBeInTheDocument();
  });

  it('triggers onLogin and onGetStarted callbacks on navigation clicks', () => {
    const mockLogin = vi.fn();
    const mockGetStarted = vi.fn();

    render(<LandingPage onGetStarted={mockGetStarted} onLogin={mockLogin} />);

    // Header buttons
    const signInBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(signInBtn);
    expect(mockLogin).toHaveBeenCalledTimes(1);

    const createAccountBtn = screen.getByRole('button', { name: /^Create Account$/i });
    fireEvent.click(createAccountBtn);
    expect(mockGetStarted).toHaveBeenCalledTimes(1);
  });

  it('validates empty inputs before running free scan', () => {
    render(<LandingPage onGetStarted={vi.fn()} onLogin={vi.fn()} />);

    const scanBtn = screen.getByRole('button', { name: /Run Free ATS Match Scan/i });
    fireEvent.click(scanBtn);

    expect(screen.getByText(/Please provide both your resume and the target job description/i)).toBeInTheDocument();
  });
});
