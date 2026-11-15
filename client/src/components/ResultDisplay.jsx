import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import FresherAuditPanel from './FresherAuditPanel';

const BulletRewriterModal = lazy(() => import('./BulletRewriterModal'));
const JobTailorModal = lazy(() => import('./JobTailorModal'));
const ExportResumeModal = lazy(() => import('./ExportResumeModal'));

function ResultDisplay({ result, isPremium, handleUpgrade, token, API_URL }) {
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugError, setSugError] = useState('');
  const [activeTab, setActiveTab] = useState('skills');
  const [mainView, setMainView] = useState('fresher');
  const [rewriterModalOpen, setRewriterModalOpen] = useState(false);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    if (!result || !result.id || !token || !isPremium) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setSugLoading(true);
      setSugError('');
      try {
        const res = await axios.get(`${API_URL}/api/analyze/${result.id}/suggestions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error("Suggestions fetch error:", err);
        setSugError("Failed to load suggestions.");
      } finally {
        setSugLoading(false);
      }
    };

    fetchSuggestions();
  }, [result, isPremium, token, API_URL]);

  const handleDownloadPDF = async () => {
    if (!result || !result.id) return;
    try {
      const response = await axios.get(`${API_URL}/api/history/${result.id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resumatch_report_${result.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF report. Make sure you are signed in.");
    }
  };

  if (!result) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>Results will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0D131F] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-white/[0.08] animate-fadeIn transition-colors">
      
      {/* Total Score */}
      <div className="text-center mb-6 relative">
        <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Overall Match Score</h2>
        <div className={`text-6xl sm:text-7xl font-black font-mono
          ${result.score >= 70 ? 'text-emerald-500 dark:text-emerald-400' : result.score >= 40 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}
        `}>
          {result.score}%
        </div>
        
        {/* Status Badge */}
        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase
          ${result.score >= 70 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
            : result.score >= 40 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'}
        `}>
          {result.score >= 70 ? 'High Match 🚀' : result.score >= 40 ? 'Potential Match ⚠️' : 'Low Match ❌'}
        </div>
      </div>

      {/* Action Toolbar: PDF Download, AI Bullet Rewriter, and Job Tailor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="text-xs py-3 px-3 min-h-[44px] bg-gray-50 dark:bg-[#080B11] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 rounded-xl transition font-bold shadow-sm flex items-center justify-center gap-1.5 border border-gray-200 dark:border-white/[0.08]"
        >
          <span>📥</span> Export Resume / PDF
        </button>

        <button
          type="button"
          onClick={() => setRewriterModalOpen(true)}
          className="text-xs py-3 px-3 min-h-[44px] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl transition font-bold shadow-sm flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800/50"
        >
          <span>⚡</span> Bullet Rewriter
        </button>

        <button
          type="button"
          onClick={() => setTailorModalOpen(true)}
          className="text-xs py-3 px-3 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5"
        >
          <span>🎯</span> Tailor to this Job
        </button>
      </div>

      {/* View Switcher: Fresher Audit vs Job Match */}
      <div className="flex bg-gray-100 dark:bg-[#080B11] p-1 rounded-xl mb-6 border border-gray-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => setMainView('fresher')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] ${
            mainView === 'fresher'
              ? 'bg-white dark:bg-[#0D131F] text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>🎓</span> Fresher Resume Audit
        </button>
        <button
          type="button"
          onClick={() => setMainView('match')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] ${
            mainView === 'match'
              ? 'bg-white dark:bg-[#0D131F] text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>🎯</span> Job Match & Breakdown
        </button>
      </div>

      {mainView === 'fresher' ? (
        <FresherAuditPanel audit={result.fresher_audit} structure={result.structure} />
      ) : (
        <>
          {/* The Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-[#080B11] p-4 rounded-xl text-center border border-gray-100 dark:border-white/[0.08]">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Keywords</div>
              <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {result.breakdown && result.breakdown.lexical ? result.breakdown.lexical.toFixed(1) : result.lexical_score ? result.lexical_score.toFixed(1) : "0.0"}%
              </div>
              <div className="text-[10px] text-gray-400">Exact matches (40%)</div>
            </div>
            <div className="bg-gray-50 dark:bg-[#080B11] p-4 rounded-xl text-center border border-gray-100 dark:border-white/[0.08]">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Meaning</div>
              <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
                {result.breakdown && result.breakdown.semantic ? result.breakdown.semantic.toFixed(1) : result.semantic_score ? result.semantic_score.toFixed(1) : "0.0"}%
              </div>
              <div className="text-[10px] text-gray-400">Context/Synonyms (60%)</div>
            </div>
          </div>

          {/* Missing Keywords */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Missing Keywords
            </h3>
            
            {!result.missing || result.missing.length === 0 ? (
               <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm text-center border border-emerald-200 dark:border-emerald-800/30">
                 ✨ Incredible! No major keywords missing.
               </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.missing.map((word, index) => (
                  <span key={index} className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 rounded-lg text-xs font-mono font-medium border border-rose-200 dark:border-rose-900/40 shadow-sm">
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Parsed Structure Section */}
          {result.structure && (
            <div className="mt-8 border-t border-gray-200 dark:border-white/[0.08] pt-6">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                🕵️ Parsed Resume Sections
              </h3>
              
              {/* Contact Details Quick Badges */}
              {result.structure.contact_details && (
                <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
                  {result.structure.contact_details.email && (
                    <span className="px-2 py-1 bg-gray-50 dark:bg-[#080B11] text-gray-600 dark:text-gray-300 rounded-md border border-gray-100 dark:border-white/[0.08]">
                      📧 {result.structure.contact_details.email}
                    </span>
                  )}
                  {result.structure.contact_details.phone && (
                    <span className="px-2 py-1 bg-gray-50 dark:bg-[#080B11] text-gray-600 dark:text-gray-300 rounded-md border border-gray-100 dark:border-white/[0.08]">
                      📞 {result.structure.contact_details.phone}
                    </span>
                  )}
                  {result.structure.contact_details.linkedin && (
                    <a 
                      href={result.structure.contact_details.linkedin.startsWith('http') ? result.structure.contact_details.linkedin : `https://${result.structure.contact_details.linkedin}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 rounded-md border border-blue-200/50 dark:border-blue-800/40 hover:underline"
                    >
                      🔗 LinkedIn
                    </a>
                  )}
                </div>
              )}

              {/* Section Selector Tab Buttons */}
              <div className="flex border-b border-gray-100 dark:border-white/[0.08] mb-4 overflow-x-auto gap-2">
                {Object.keys(result.structure.sections || {}).map((secKey) => {
                  const secText = result.structure.sections[secKey];
                  if (!secText && secKey !== 'skills') return null;
                  
                  const isSelected = activeTab === secKey;
                  return (
                    <button
                      key={secKey}
                      type="button"
                      onClick={() => setActiveTab(secKey)}
                      className={`py-2 px-3 text-xs font-semibold capitalize border-b-2 transition whitespace-nowrap min-h-[38px]
                        ${isSelected 
                          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                          : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}
                      `}
                    >
                      {secKey}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Canvas */}
              <div className="bg-gray-50 dark:bg-[#080B11] p-4 rounded-xl border border-gray-100/50 dark:border-white/[0.08] text-[11px] text-gray-600 dark:text-gray-300 max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
                {result.structure.sections[activeTab] ? (
                  result.structure.sections[activeTab]
                ) : (
                  <span className="text-gray-400 italic">No content identified in this section.</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Bullet suggestions */}
      <div className="mt-8 border-t border-gray-100 dark:border-white/[0.08] pt-6">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          💡 AI Bullet Suggestions
        </h3>
        
        {!token ? (
          <div className="p-4 bg-gray-50 dark:bg-[#080B11] text-gray-500 rounded-lg text-xs text-center border border-gray-100 dark:border-white/[0.08]">
            Sign in to access AI suggestions.
          </div>
        ) : !isPremium ? (
          <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.08] p-4 bg-gray-50 dark:bg-[#080B11]">
            <div className="filter blur-[3px] select-none space-y-2 opacity-50">
              <p className="text-xs">• Rewrite your experience with Python to focus on microservices.</p>
              <p className="text-xs">• Quantify development milestones to increase match likelihood.</p>
              <p className="text-xs">• Add projects featuring React components to prove frontend skills.</p>
            </div>
            
            <div className="absolute inset-0 bg-white/60 dark:bg-[#0D131F]/90 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">🎓 Unlock AI-powered suggestions with Student Pass</p>
              <button 
                type="button"
                onClick={handleUpgrade}
                className="text-[10px] px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow transition min-h-[38px]"
              >
                Get Student Pass (₹199)
              </button>
            </div>
          </div>
        ) : sugLoading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Generating suggestions...</span>
          </div>
        ) : sugError ? (
          <div className="text-xs text-rose-500 py-2">{sugError}</div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sug, idx) => (
              <div key={idx} className="p-3 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 border border-blue-100/50 dark:border-blue-800/40 rounded-lg text-xs leading-relaxed">
                {sug}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lazy-Loaded Modals */}
      <Suspense fallback={null}>
        {rewriterModalOpen && (
          <BulletRewriterModal
            isOpen={rewriterModalOpen}
            onClose={() => setRewriterModalOpen(false)}
            analysisId={result.id}
            missingKeywords={result.missing || []}
            token={token}
            API_URL={API_URL}
          />
        )}

        {tailorModalOpen && (
          <JobTailorModal
            isOpen={tailorModalOpen}
            onClose={() => setTailorModalOpen(false)}
            analysisId={result.id}
            missingKeywords={result.missing || []}
            isPremium={isPremium}
            handleUpgrade={handleUpgrade}
            token={token}
            API_URL={API_URL}
          />
        )}

        {exportModalOpen && (
          <ExportResumeModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            analysisId={result.id}
            token={token}
            API_URL={API_URL}
            onDownloadReport={handleDownloadPDF}
          />
        )}
      </Suspense>

    </div>
  );
}

export default ResultDisplay;
