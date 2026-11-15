import React, { useState, useEffect } from 'react';

export default function ScorecardModal({ isOpen, onClose, scorecard }) {
  const [copied, setCopied] = useState(false);

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

  if (!isOpen || !scorecard) return null;

  const score = scorecard.score ?? 75;
  const fresherScore = scorecard.fresher_score ?? scorecard.fresher_audit?.fresher_score;
  const verdict = scorecard.readiness_verdict ?? scorecard.fresher_audit?.readiness_verdict;
  const lexical = scorecard.lexical_score ?? scorecard.breakdown?.lexical ?? 65;
  const semantic = scorecard.semantic_score ?? scorecard.breakdown?.semantic ?? 80;
  const missing = scorecard.top_missing_skills ?? scorecard.missing ?? [];
  const cardId = scorecard.id || scorecard.scorecard_id || 'preview';

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?sc=${cardId}` 
    : `https://resumatch.ai/?sc=${cardId}`;

  const shareMessage = `🎯 I just scored ${score}% on my resume match for campus placement on ResuMatch! Check your fresher resume match score for free: ${shareUrl}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = () => {
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(liUrl, '_blank', 'noopener,noreferrer');
  };

  const getScoreColor = (val) => {
    if (val >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
    if (val >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/30';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-modal-title"
    >
      <div 
        className="relative w-full max-w-md bg-[#0D131F] border border-white/[0.08] rounded-3xl p-6 shadow-2xl text-white space-y-6"
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

        {/* Card Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
            🎓 ResuMatch Fresher Scorecard
          </div>
          <h3 id="scorecard-modal-title" className="text-xl font-black tracking-tight text-white">Your Campus ATS Match</h3>
          <p className="text-xs text-gray-400">Share with batchmates & placement cell groups</p>
        </div>

        {/* Visual Score Card Preview */}
        <div className="p-5 rounded-2xl bg-[#080B11] border border-white/[0.08] space-y-5 shadow-inner">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className={`relative w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-lg ${getScoreColor(score)}`}>
              <span className="text-3xl font-black font-mono">{score}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Match Score</span>
            </div>
            {fresherScore !== undefined && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300">
                🎓 Fresher Readiness: {fresherScore}% {verdict ? `(${verdict})` : ''}
              </span>
            )}
          </div>

          {/* Lexical vs Semantic Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-300 text-[11px]">
              <span>Exact Keywords Match:</span>
              <span className="font-bold text-blue-400 font-mono">{lexical}%</span>
            </div>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${lexical}%` }}></div>
            </div>

            <div className="flex justify-between text-gray-300 text-[11px] pt-1">
              <span>Context & Meaning Match:</span>
              <span className="font-bold text-teal-400 font-mono">{semantic}%</span>
            </div>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${semantic}%` }}></div>
            </div>
          </div>

          {/* Missing Top Skills */}
          {missing.length > 0 && (
            <div className="border-t border-white/[0.08] pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Top Missing Tech Keywords:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((sk, idx) => (
                  <span key={idx} className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    + {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 py-3 px-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              type="button"
              onClick={handleLinkedInShare}
              className="flex items-center justify-center gap-2 py-3 px-3 min-h-[44px] bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
            >
              <span>💼</span> LinkedIn
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3 px-4 min-h-[44px] bg-[#080B11] hover:bg-white/[0.06] border border-white/[0.08] text-gray-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            {copied ? '✓ Link Copied to Clipboard!' : '🔗 Copy Shareable Link'}
          </button>
        </div>

        {/* Student Privacy Note */}
        <p className="text-[10px] text-center text-gray-500">
          🔒 DPDP Compliant: Your full resume text and contact info are never made public.
        </p>
      </div>
    </div>
  );
}
