import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ResultDisplay({ result, isPremium, handleUpgrade, token, API_URL }) {
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugError, setSugError] = useState('');
  const [activeTab, setActiveTab] = useState('skills');

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
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in transition-colors">
      
      {/* Total Score */}
      <div className="text-center mb-6 relative">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Overall Match Score</h2>
        <div className={`text-7xl font-black 
          ${result.score >= 70 ? 'text-green-500 dark:text-green-400' : result.score >= 40 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}
        `}>
          {result.score}%
        </div>
        
        {/* Status Badge */}
        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase
          ${result.score >= 70 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : result.score >= 40 
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
        `}>
          {result.score >= 70 ? 'High Match 🚀' : result.score >= 40 ? 'Potential Match ⚠️' : 'Low Match ❌'}
        </div>
      </div>

      {/* PDF Export Action */}
      <div className="flex mb-6">
        <button
          onClick={handleDownloadPDF}
          className="w-full text-xs py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg transition font-bold shadow-sm flex items-center justify-center gap-1 border border-indigo-100 dark:border-indigo-900/20"
        >
          📥 Download PDF Report
        </button>
      </div>

      {/* The Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Keywords</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {result.breakdown && result.breakdown.lexical ? result.breakdown.lexical.toFixed(1) : result.lexical_score ? result.lexical_score.toFixed(1) : "0.0"}%
          </div>
          <div className="text-[10px] text-gray-400">Exact matches</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Meaning</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {result.breakdown && result.breakdown.semantic ? result.breakdown.semantic.toFixed(1) : result.semantic_score ? result.semantic_score.toFixed(1) : "0.0"}%
          </div>
          <div className="text-[10px] text-gray-400">Context/Synonyms</div>
        </div>
      </div>

      {/* Missing Keywords */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          Missing Keywords
        </h3>
        
        {!result.missing || result.missing.length === 0 ? (
           <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm text-center">
             ✨ Incredible! No major keywords missing.
           </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {result.missing.map((word, index) => (
              <span key={index} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/30 shadow-sm">
                {word}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Parsed Structure Section */}
      {result.structure && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            🕵️ Parsed Resume Sections
          </h3>
          
          {/* Contact Details Quick Badges */}
          {result.structure.contact_details && (
            <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
              {result.structure.contact_details.email && (
                <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md border border-gray-100 dark:border-gray-700">
                  📧 {result.structure.contact_details.email}
                </span>
              )}
              {result.structure.contact_details.phone && (
                <span className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md border border-gray-100 dark:border-gray-700">
                  📞 {result.structure.contact_details.phone}
                </span>
              )}
              {result.structure.contact_details.linkedin && (
                <a 
                  href={result.structure.contact_details.linkedin.startsWith('http') ? result.structure.contact_details.linkedin : `https://${result.structure.contact_details.linkedin}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 rounded-md border border-indigo-100/30 dark:border-indigo-900/30 hover:underline"
                >
                  🔗 LinkedIn
                </a>
              )}
            </div>
          )}

          {/* Section Selector Tab Buttons */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 mb-4 overflow-x-auto gap-2">
            {Object.keys(result.structure.sections || {}).map((secKey) => {
              const secText = result.structure.sections[secKey];
              if (!secText && secKey !== 'skills') return null;
              
              const isSelected = activeTab === secKey;
              return (
                <button
                  key={secKey}
                  onClick={() => setActiveTab(secKey)}
                  className={`py-2 px-3 text-xs font-semibold capitalize border-b-2 transition whitespace-nowrap
                    ${isSelected 
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}
                  `}
                >
                  {secKey}
                </button>
              );
            })}
          </div>

          {/* Tab Content Canvas */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100/50 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300 max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
            {result.structure.sections[activeTab] ? (
              result.structure.sections[activeTab]
            ) : (
              <span className="text-gray-400 italic">No content identified in this section.</span>
            )}
          </div>
        </div>
      )}

      {/* AI Bullet suggestions */}
      <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          💡 AI Bullet Suggestions
        </h3>
        
        {!token ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 text-gray-500 rounded-lg text-xs text-center border border-gray-100 dark:border-gray-700">
            Sign in to access AI suggestions.
          </div>
        ) : !isPremium ? (
          <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="filter blur-[3px] select-none space-y-2 opacity-50">
              <p className="text-xs">• Rewrite your experience with Python to focus on microservices.</p>
              <p className="text-xs">• Quantify development milestones to increase match likelihood.</p>
              <p className="text-xs">• Add projects featuring React components to prove frontend skills.</p>
            </div>
            
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/80 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">💎 Unlock AI-powered suggestions with Premium</p>
              <button 
                onClick={handleUpgrade}
                className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-bold shadow hover:from-amber-600 hover:to-orange-700 transition"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        ) : sugLoading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            <span>Generating suggestions...</span>
          </div>
        ) : sugError ? (
          <div className="text-xs text-red-500 py-2">{sugError}</div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sug, idx) => (
              <div key={idx} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 border border-indigo-100/30 dark:border-indigo-900/30 rounded-lg text-xs leading-relaxed">
                {sug}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default ResultDisplay;
