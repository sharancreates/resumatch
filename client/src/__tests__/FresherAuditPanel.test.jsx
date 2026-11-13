import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FresherAuditPanel from '../components/FresherAuditPanel';

const MOCK_AUDIT = {
  fresher_score: 84,
  readiness_verdict: "Campus Placement Ready",
  categories: {
    project_quality: {
      score: 85,
      project_count: 2,
      projects_with_metrics: 2,
      projects_with_tech: 2,
      projects: [
        {
          title: "Distributed Task Queue",
          tech_stack: ["python", "redis", "fastapi"],
          metrics_found: ["25,000 tasks", "42%"],
          has_metrics: true,
          has_tech: true,
          issues: []
        },
        {
          title: "Placement Portal",
          tech_stack: ["react", "postgresql"],
          metrics_found: ["1,200 users"],
          has_metrics: true,
          has_tech: true,
          issues: ["Missing numbers"]
        }
      ],
      issues: [],
      passed: ["Contains 2 projects"]
    },
    links_and_sections: {
      score: 90,
      github: "github.com/aaravsharma",
      linkedin: "linkedin.com/in/aaravsharma",
      has_categorized_skills: true,
      coursework_found: ["data structures", "dbms", "operating systems"],
      issues: [],
      passed: ["GitHub included"]
    },
    action_verbs: {
      score: 80,
      weak_phrases_count: 1,
      findings: [
        {
          line_number: 12,
          weak_phrase: "worked on",
          context: "worked on designing distributed queue system",
          suggested_replacements: ["built", "engineered", "implemented"]
        }
      ],
      issues: [],
      passed: []
    },
    ats_layout: {
      score: 95,
      word_count: 420,
      estimated_pages: 1,
      issues: [],
      passed: ["Ideal length for a 1-page fresher resume (420 words)"]
    }
  },
  critical_fixes: ["Add numbers to Placement Portal"],
  quick_wins: ["Group skills into Languages, Frameworks, and Tools"]
};

describe('FresherAuditPanel Component', () => {
  it('renders overall readiness index, score gauge, and critical fixes', () => {
    render(<FresherAuditPanel audit={MOCK_AUDIT} />);

    expect(screen.getByText(/Fresher Readiness Index/i)).toBeInTheDocument();
    expect(screen.getByText(/84%/i)).toBeInTheDocument();
    expect(screen.getByText(/Campus Placement Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Add numbers to Placement Portal/i)).toBeInTheDocument();
  });

  it('navigates to Project Quality tab and shows tech stack and metrics', () => {
    render(<FresherAuditPanel audit={MOCK_AUDIT} />);

    const projectTab = screen.getByRole('button', { name: /Project Quality/i });
    fireEvent.click(projectTab);

    expect(screen.getByText(/Distributed Task Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/Placement Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/python/i)).toBeInTheDocument();
    expect(screen.getByText(/fastapi/i)).toBeInTheDocument();
    expect(screen.getAllByText(/✓ Quantified/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to Action Verbs tab and enables 1-click replacement verb copying', () => {
    // Mock navigator.clipboard
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    });

    render(<FresherAuditPanel audit={MOCK_AUDIT} />);

    const verbsTab = screen.getByRole('button', { name: /Action Verbs/i });
    fireEvent.click(verbsTab);

    expect(screen.getByText(/worked on/i)).toBeInTheDocument();
    const replacementBtn = screen.getByRole('button', { name: /\+ built/i });
    fireEvent.click(replacementBtn);

    expect(mockWriteText).toHaveBeenCalledWith('built');
  });

  it('navigates to Links & Sections tab and displays proof status', () => {
    render(<FresherAuditPanel audit={MOCK_AUDIT} />);

    const linksTab = screen.getByRole('button', { name: /Links & Sections/i });
    fireEvent.click(linksTab);

    expect(screen.getByText(/GitHub Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/github\.com\/aaravsharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Categorized Skills/i)).toBeInTheDocument();
  });

  it('renders fallback gracefully when audit data is missing', () => {
    render(<FresherAuditPanel audit={null} />);

    expect(screen.getByText(/Fresher diagnostics loading or not available/i)).toBeInTheDocument();
  });
});
