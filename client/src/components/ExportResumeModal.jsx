import React, { useState } from 'react';
import axios from 'axios';

const TEMPLATES = [
  {
    id: "classic_tech",
    name: "Classic Tech",
    tag: "Software Engineering & Full-Stack",
    description: "High-density technical layout prioritizing grouped skills and project tech stacks with quantifiable metrics.",
    badge: "Most Popular",
    borderActive: "border-blue-500 ring-2 ring-blue-500/30",
    badgeColor: "bg-blue-900/60 text-blue-300 border-blue-500/30"
  },
  {
    id: "modern_minimal",
    name: "Modern Minimal",
    tag: "Frontend, Web & Startups",
    description: "Clean sans-serif design with subtle horizontal dividers. Ideal for web, frontend, and high-growth startup roles.",
    badge: "Clean Design",
    borderActive: "border-cyan-500 ring-2 ring-cyan-500/30",
    badgeColor: "bg-cyan-900/60 text-cyan-300 border-cyan-500/30"
  },
  {
    id: "data_analytics",
    name: "Data & Analytics",
    tag: "Data Science, Analytics & ML",
    description: "Emphasizes quantitative tool mastery (Python, SQL, Tableau, PyTorch), dataset scale, and predictive results.",
    badge: "Metrics Focused",
    borderActive: "border-teal-500 ring-2 ring-teal-500/30",
    badgeColor: "bg-teal-900/60 text-teal-300 border-teal-500/30"
  },
  {
    id: "campus_placement",
    name: "Campus Placement Standard",
    tag: "IIT / NIT / University Drives",
    description: "Strict single-page university hierarchy with academic credentials and CGPA/marks placed prominently first.",
    badge: "Placement Cell Safe",
    borderActive: "border-purple-500 ring-2 ring-purple-500/30",
    badgeColor: "bg-purple-900/60 text-purple-300 border-purple-500/30"
  }
];

export default function ExportResumeModal({
  isOpen,
  onClose,
  analysisId,
  resumeText = null,
  resumeVersionId = null,
  token,
  API_URL = '',
  onDownloadReport = null
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('classic_tech');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const payload = {
        template_id: selectedTemplate,
        format: selectedFormat,
        resume_text: resumeText || undefined,
        analysis_id: analysisId || undefined,
        resume_version_id: resumeVersionId || undefined
      };

      const res = await axios.post(`${API_URL}/api/resume/export`, payload, {
        headers,
        responseType: 'blob'
      });

      const mimeType = selectedFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename = `resume_${selectedTemplate}.${selectedFormat}`;
      const disposition = res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition']);
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Successfully exported ${filename}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Resume export failed:", err);
      let errMsg = "Failed to export resume. Please try again.";
      if (err.response && err.response.data) {
        if (err.response.data instanceof Blob) {
          try {
            const rawText = await err.response.data.text();
            const parsed = JSON.parse(rawText);
            errMsg = parsed.detail || errMsg;
          } catch {
            // Keep default errMsg
          }
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-[#0F172A] border border-indigo-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
            <span>📄</span> Fresher ATS Templates
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Export ATS-Compliant Fresher Resume
          </h3>
          <p className="text-xs text-gray-400">
            Strict single-page formatting tested against campus placement portals and multinational ATS parsers. Zero table traps or multi-column parsing bugs.
          </p>
        </div>

        {/* Format Selector: PDF vs DOCX */}
        <div className="bg-[#1E293B]/70 p-4 rounded-2xl border border-gray-800 space-y-3">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>💾</span> Step 1: Select Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                selectedFormat === 'pdf'
                  ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              <span className="text-2xl">📄</span>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  ATS-Safe PDF
                  {selectedFormat === 'pdf' && <span className="text-indigo-400 text-xs">● Selected</span>}
                </div>
                <div className="text-[11px] text-gray-400 leading-tight">
                  Strict 1-page layout. Best for online portals, LinkedIn, and emailing HR directly.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('docx')}
              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                selectedFormat === 'docx'
                  ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              <span className="text-2xl">📝</span>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Editable Word (DOCX)
                  {selectedFormat === 'docx' && <span className="text-indigo-400 text-xs">● Selected</span>}
                </div>
                <div className="text-[11px] text-gray-400 leading-tight">
                  Clean native headings & bullets. Required by college placement cells & campus portals.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Template Selection Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎨</span> Step 2: Choose Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition relative flex flex-col justify-between ${
                    isSelected
                      ? `bg-indigo-950/40 ${tmpl.borderActive} text-white`
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        {tmpl.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tmpl.badgeColor}`}>
                        {tmpl.badge}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">
                      {tmpl.tag}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">1 Page • ATS Compliant</span>
                    <span className={isSelected ? 'text-indigo-400 font-bold' : 'text-gray-600'}>
                      {isSelected ? '✓ Selected' : 'Click to select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs">
            {successMsg}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {onDownloadReport && (
            <button
              type="button"
              onClick={onDownloadReport}
              className="py-3 px-4 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-bold transition flex items-center justify-center gap-2 border border-gray-700"
            >
              <span>📊</span> Download Match Report
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating {selectedFormat.toUpperCase()}...
              </>
            ) : (
              <>
                <span>⬇️</span> Download {selectedFormat.toUpperCase()} ({TEMPLATES.find(t => t.id === selectedTemplate)?.name})
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

