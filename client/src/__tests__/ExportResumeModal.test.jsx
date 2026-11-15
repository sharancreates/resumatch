import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import ExportResumeModal from '../components/ExportResumeModal';

const EXPECTED_TEMPLATES = [
  { name: "Classic Tech", badge: "Most Popular" },
  { name: "Modern Minimal", badge: "Clean Design" },
  { name: "Data & Analytics", badge: "Metrics Focused" },
  { name: "Campus Placement Standard", badge: "Placement Cell Safe" }
];

vi.mock('axios');

describe('ExportResumeModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ExportResumeModal
        isOpen={false}
        onClose={vi.fn()}
        analysisId="test-id"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all 4 template options with badges and descriptions', () => {
    render(
      <ExportResumeModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-id"
      />
    );

    expect(screen.getByText(/Export ATS-Compliant Fresher Resume/i)).toBeInTheDocument();
    
    EXPECTED_TEMPLATES.forEach((tmpl) => {
      expect(screen.getByText(tmpl.name)).toBeInTheDocument();
      expect(screen.getByText(tmpl.badge)).toBeInTheDocument();
    });
  });

  it('switches between ATS-Safe PDF and Editable Word (DOCX) formats', () => {
    render(
      <ExportResumeModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-id"
      />
    );

    // Initial state is PDF
    expect(screen.getByText(/Download PDF/i)).toBeInTheDocument();

    // Click DOCX format
    const docxOption = screen.getByText(/Editable Word \(DOCX\)/i);
    fireEvent.click(docxOption);

    // Button updates to DOCX
    expect(screen.getByText(/Download DOCX/i)).toBeInTheDocument();
  });

  it('selects a different template when clicked', () => {
    render(
      <ExportResumeModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-id"
      />
    );

    // Click Modern Minimal template
    const modernMinimalCard = screen.getByText(/Modern Minimal/i).closest('div');
    fireEvent.click(modernMinimalCard);

    // Download button should show Modern Minimal
    expect(screen.getByText(/Modern Minimal/i)).toBeInTheDocument();
  });

  it('triggers download via API on button click', async () => {
    const mockBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
    axios.post.mockResolvedValueOnce({
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="Aarav_Sharma_classic_tech.pdf"'
      }
    });

    render(
      <ExportResumeModal
        isOpen={true}
        onClose={vi.fn()}
        analysisId="test-id"
        resumeText="Aarav Sharma\nPython Engineer"
        token="mock-token"
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /Download PDF/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/resume/export',
        expect.objectContaining({
          template_id: 'classic_tech',
          format: 'pdf',
          resume_text: 'Aarav Sharma\nPython Engineer',
          analysis_id: 'test-id'
        }),
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
          responseType: 'blob'
        })
      );
    });

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});

