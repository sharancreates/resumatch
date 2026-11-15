import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BulletRewriterModal({
  isOpen,
  onClose,
  analysisId,
  initialBullet = '',
  missingKeywords = [],
  onApplyBullet,
  token,
  API_URL = ''
}) {
  const [bulletText, setBulletText] = useState(initialBullet);
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rewrittenData, setRewrittenData] = useState(null);
  const [userMetric, setUserMetric] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialBullet) {
      setBulletText(initialBullet);
      setRewrittenData(null);
      setUserMetric('');
      setError('');
    }
  }, [initialBullet]);

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

  const handleRewrite = async () => {
    if (!bulletText.trim()) {
      setError("Please enter a bullet point to rewrite.");
      return;
    }

    setLoading(true);
    setError('');
    setRewrittenData(null);
    setUserMetric('');

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await axios.post(`${API_URL}/api/analyze/${analysisId}/rewrite-bullet`, {
        bullet: bulletText,
        target_keyword: selectedKeyword || undefined
      }, { headers });

      if (res.data?.status === 'success') {
        setRewrittenData(res.data.data);
      }
    } catch (err) {
      console.error("Rewrite error:", err);
      const msg = err.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : "Failed to generate rewrite. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Compute final display text with user metric substituted dynamically
  const getFinalBulletText = () => {
    if (!rewrittenData) return '';
    let text = rewrittenData.rewritten;
    const placeholder = rewrittenData.metric_placeholder;
    if (placeholder && userMetric.trim()) {
      text = text.replace(placeholder, userMetric.trim());
    }
    return text;
  };

  const handleCopy = () => {
    const textToCopy = getFinalBulletText();
    if (navigator.clipboard && textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    const textToApply = getFinalBulletText();
    if (onApplyBullet && textToApply) {
      onApplyBullet(textToApply);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bullet-modal-title"
    >
      <div 
        className="relative w-full max-w-xl bg-[#0D131F] border border-white/[0.08] rounded-3xl p-6 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto"
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
            <span>⚡</span> Grounded AI Bullet Rewriter
          </div>
          <h3 id="bullet-modal-title" className="text-xl font-black text-white tracking-tight">
            Strengthen Bullet with Real Impact
          </h3>
          <p className="text-xs text-gray-400">
            Replaces passive verbs ("worked on") and weaves in missing tech skills without fabricating fake numbers.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Input: Original Bullet */}
        <div className="space-y-2">
          <label htmlFor="original-bullet-textarea" className="text-xs font-bold text-gray-300 flex justify-between">
            <span>1. Original Bullet Point</span>
            <span className="text-[10px] text-gray-400">e.g. from your projects or experience</span>
          </label>
          <textarea
            id="original-bullet-textarea"
            rows={3}
            value={bulletText}
            onChange={(e) => setBulletText(e.target.value)}
            placeholder="Paste a weak bullet point (e.g. 'worked on developing a dashboard with react')..."
            className="w-full bg-[#080B11] border border-white/[0.08] rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono transition"
          />
        </div>

        {/* Input: Optional Missing Skill to Weave In */}
        {missingKeywords.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300">
              2. Select Missing Job Keyword to Weave In (Optional):
            </label>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.slice(0, 6).map((kw, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedKeyword(selectedKeyword === kw ? '' : kw)}
                  className={`text-xs px-2.5 py-1.5 min-h-[36px] rounded-lg border font-medium transition ${
                    selectedKeyword === kw
                      ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                      : 'bg-[#080B11] border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.15]'
                  }`}
                >
                  {selectedKeyword === kw ? '✓ ' : '+ '} {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Trigger */}
        <button
          type="button"
          onClick={handleRewrite}
          disabled={loading || !bulletText.trim()}
          className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            loading 
              ? 'bg-blue-600/70 cursor-wait' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Grounding bullet with active verbs...</span>
            </>
          ) : (
            <>
              <span>⚡</span> Rewrite Bullet Point
            </>
          )}
        </button>

        {/* Rewritten Output Section */}
        {rewrittenData && (
          <div className="space-y-4 pt-4 border-t border-white/[0.08] animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>✓</span> AI Grounded Rewrite (No Fabricated Metrics)
              </span>

              {/* Dynamic Preview Box */}
              <div className="p-4 rounded-xl bg-[#080B11] border border-blue-500/30 text-xs text-gray-200 leading-relaxed font-mono space-y-2">
                <p>• {getFinalBulletText()}</p>
              </div>
            </div>

            {/* Editable Real Metric Input */}
            {rewrittenData.metric_placeholder && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <label htmlFor="user-metric-input" className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                  <span>✍️ Add Your Real Metric / Result:</span>
                  <span className="text-[10px] text-gray-400 font-normal">Never lie to recruiters</span>
                </label>
                <input
                  id="user-metric-input"
                  type="text"
                  value={userMetric}
                  onChange={(e) => setUserMetric(e.target.value)}
                  placeholder="e.g., serving 400+ active students, cutting load time by 35%, 15k rows"
                  className="w-full bg-[#080B11] border border-white/[0.08] rounded-lg p-2 text-xs text-amber-200 placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono transition"
                />
                <p className="text-[10px] text-gray-400">
                  Type your real numbers above. The bullet preview updates automatically!
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-3 min-h-[44px] bg-[#090D15] hover:bg-white/[0.06] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-white/[0.08]"
              >
                <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied to Clipboard!' : 'Copy Rewritten Bullet'}
              </button>

              {onApplyBullet && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25"
                >
                  <span>✓</span> Apply to Resume
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
