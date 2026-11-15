import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExportResumeModal from './ExportResumeModal';

export default function JobTailorModal({
  isOpen,
  onClose,
  analysisId,
  missingKeywords = [],
  isPremium = false,
  handleUpgrade,
  onTailoredSuccess,
  token,
  API_URL = ''
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tailoredData, setTailoredData] = useState(null);
  const [activeTab, setActiveTab] = useState('diff');
  const [copied, setCopied] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTailor = async () => {
    setLoading(true);
    setError('');
    setTailoredData(null);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await axios.post(`${API_URL}/api/analyze/${analysisId}/tailor`, {}, { headers });

      if (res.data?.status === 'success') {
        setTailoredData(res.data.data);
        if (onTailoredSuccess) {
          onTailoredSuccess(res.data.data);
        }
      }
    } catch (err) {
      console.error("Tailor error:", err);
      const msg = err.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : "Failed to tailor resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTailored = () => {
    if (navigator.clipboard && tailoredData?.tailored_text) {
      navigator.clipboard.writeText(tailoredData.tailored_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tailor-modal-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-[#0D131F] border border-white/[0.08] rounded-3xl p-6 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full text-gray-400 hover:text-white flex items-center justify-center transition"
          aria-label="Close dialog"
        >
          ✕
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
            <span>🎯</span> 1-Click Job Tailoring
          </div>
          <h3 id="tailor-modal-title" className="text-xl font-black text-white tracking-tight">
            Tailor Resume to Target Job
          </h3>
          <p className="text-xs text-gray-400">
            Automatically aligns project bullets with missing tech skills and generates a new version linked to this JD.
          </p>
        </div>

        {/* Locked for Free Users Banner */}
        {!isPremium && (
          <div className="p-5 rounded-2xl bg-[#090D15] border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase">
              <span>💎</span> Student Placement Feature
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              1-Click Job Tailoring and resume versioning are available on the student <strong className="text-white">Sprint Pass (₹199 / 14 days)</strong> or <strong className="text-white">Placement Season Pass (₹499)</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                if (handleUpgrade) handleUpgrade();
                onClose();
              }}
              className="px-4 py-2.5 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20"
            >
              ⚡ Upgrade to Sprint Pass (₹199)
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Tailor Execution Overview */}
        {isPremium && !tailoredData && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#090D15] border border-white/[0.08] space-y-2 text-xs">
              <span className="font-bold text-gray-300">Target Keywords Being Weaved In:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {missingKeywords.length > 0 ? (
                  missingKeywords.slice(0, 5).map((kw, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[11px] font-mono">
                      + {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No missing keywords detected. Tailoring will sharpen existing action verbs.</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTailor}
              disabled={loading}
              className={`w-full py-3.5 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                loading 
                  ? 'bg-blue-600/70 cursor-wait' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Weaving keywords & tailoring projects for this job...</span>
                </>
              ) : (
                <>
                  <span>🎯</span> Generate Tailored Resume (v+1)
                </>
              )}
            </button>
          </div>
        )}

        {/* Tailored Result View */}
        {tailoredData && (
          <div className="space-y-4 animate-fadeIn">
            {/* Version Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <span>✓ Successfully Created Resume Version v{tailoredData.version_number}</span>
              <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/20">
                {tailoredData.changes_summary?.length || 0} Bullets Improved
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex border-b border-white/[0.08] gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`pb-2 transition ${activeTab === 'diff' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                🔍 Changes Summary ({tailoredData.changes_summary?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('full')}
                className={`pb-2 transition ${activeTab === 'full' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                📄 Full Tailored Resume
              </button>
            </div>

            {/* Changes Diff List */}
            {activeTab === 'diff' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {tailoredData.changes_summary?.map((change, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#090D15] border border-white/[0.08] space-y-2 text-xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
                      <span>Bullet #{idx + 1}</span>
                      {change.keyword_added && (
                        <span className="text-blue-400 font-mono">
                          +{change.keyword_added} integrated
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 line-through text-[11px] font-mono">
                      {change.original}
                    </div>
                    <div className="text-emerald-300 text-xs font-mono font-medium pl-2 border-l-2 border-emerald-500">
                      {change.tailored}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Full Tailored Resume Text */}
            {activeTab === 'full' && (
              <div className="p-4 rounded-xl bg-[#080B11] border border-white/[0.08] text-[11px] text-gray-300 font-mono max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {tailoredData.tailored_text}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyTailored}
                className="flex-1 py-3 min-h-[44px] bg-[#090D15] hover:bg-white/[0.06] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-white/[0.08]"
              >
                <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied Tailored Resume!' : 'Copy Tailored Text'}
              </button>
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="flex-1 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25"
              >
                <span>📄</span> Export Resume
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 min-h-[44px] bg-[#090D15] hover:bg-white/[0.06] text-gray-300 rounded-xl text-xs font-bold transition border border-white/[0.08]"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Export Formatted Resume Modal */}
        <ExportResumeModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          analysisId={analysisId}
          resumeText={tailoredData?.tailored_text}
          token={token}
          API_URL={API_URL}
        />

      </div>
    </div>
  );
}
