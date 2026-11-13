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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-[#0F172A] border border-indigo-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto"
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

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
            <span>⚡</span> Grounded AI Bullet Rewriter
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
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
          <label className="text-xs font-bold text-gray-300 flex justify-between">
            <span>1. Original Bullet Point</span>
            <span className="text-[10px] text-gray-400">e.g. from your projects or experience</span>
          </label>
          <textarea
            rows={3}
            value={bulletText}
            onChange={(e) => setBulletText(e.target.value)}
            placeholder="Paste a weak bullet point (e.g. 'worked on developing a dashboard with react')..."
            className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono transition"
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
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                    selectedKeyword === kw
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
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
          onClick={handleRewrite}
          disabled={loading || !bulletText.trim()}
          className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            loading 
              ? 'bg-indigo-500 cursor-wait' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
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
          <div className="space-y-4 pt-4 border-t border-gray-800/80 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>✓</span> AI Grounded Rewrite (No Fabricated Metrics)
              </span>

              {/* Dynamic Preview Box */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-[#1E293B]/80 to-[#0B0F19] border border-indigo-500/30 text-xs text-gray-200 leading-relaxed font-mono space-y-2">
                <p>• {getFinalBulletText()}</p>
              </div>
            </div>

            {/* Editable Real Metric Input */}
            {rewrittenData.metric_placeholder && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                  <span>✍️ Add Your Real Metric / Result:</span>
                  <span className="text-[10px] text-gray-400 font-normal">Never lie to recruiters</span>
                </label>
                <input
                  type="text"
                  value={userMetric}
                  onChange={(e) => setUserMetric(e.target.value)}
                  placeholder="e.g., serving 400+ active students, cutting load time by 35%, 15k rows"
                  className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg p-2 text-xs text-amber-200 placeholder-gray-600 focus:outline-none focus:border-amber-400 font-mono transition"
                />
                <p className="text-[10px] text-gray-400">
                  Type your real numbers above. The bullet preview updates automatically!
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-gray-700"
              >
                <span>{copied ? '✓' : '📋'}</span> {copied ? 'Copied to Clipboard!' : 'Copy Rewritten Bullet'}
              </button>

              {onApplyBullet && (
                <button
                  onClick={handleApply}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
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
