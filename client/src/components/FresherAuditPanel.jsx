import React, { useState } from 'react';

export default function FresherAuditPanel({ audit }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedVerb, setCopiedVerb] = useState('');

  // Fallback if audit is missing or loading
  if (!audit) {
    return (
      <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        🎓 Fresher diagnostics loading or not available for this scan.
      </div>
    );
  }

  const score = audit.fresher_score ?? 70;
  const categories = audit.categories || {};
  const projectQuality = categories.project_quality || { score: 70, issues: [], passed: [], projects: [] };
  const linksSections = categories.links_and_sections || { score: 75, issues: [], passed: [] };
  const actionVerbs = categories.action_verbs || { score: 65, weak_phrases_count: 0, findings: [], issues: [], passed: [] };
  const atsLayout = categories.ats_layout || { score: 85, word_count: 400, estimated_pages: 1, issues: [], passed: [] };
  const criticalFixes = audit.critical_fixes || [];
  const quickWins = audit.quick_wins || [];

  const getVerdictBadge = (val) => {
    if (val >= 80) {
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30",
        label: "🎓 Campus Placement Ready",
        summary: "Strong projects, measurable metrics, and assertive action verbs. Excellent for campus drives."
      };
    }
    if (val >= 60) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30",
        label: "⚠️ Needs Polish Before Applying",
        summary: "Good foundation, but missing project numbers or contains passive verbs ('worked on')."
      };
    }
    return {
      bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30",
      label: "✕ High Rejection Risk",
      summary: "Critical gaps in projects, links (GitHub/LinkedIn), or ATS formatting. Fix before applying."
    };
  };

  const badge = getVerdictBadge(score);

  const handleCopyVerb = (verb) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verb);
      setCopiedVerb(verb);
      setTimeout(() => setCopiedVerb(''), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Overview & Score Ring */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white dark:from-indigo-950/30 dark:via-gray-800/50 dark:to-gray-900 border border-indigo-100 dark:border-indigo-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-white/80 dark:bg-gray-800 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
            <span>🎓</span> Fresher Readiness Index
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {badge.label}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md">
            {badge.summary}
          </p>
        </div>

        {/* Circular Gauge */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-md ${badge.bg}`}>
            <span className="text-2xl font-black">{score}%</span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">Readiness</span>
          </div>
        </div>
      </div>

      {/* 2. Critical Fixes & Quick Wins Alerts */}
      {criticalFixes.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
            <span>🚨</span> Must-Fix Before Campus Applications ({criticalFixes.length})
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-rose-900 dark:text-rose-200">
            {criticalFixes.map((fix, idx) => (
              <li key={idx} className="leading-relaxed">
                {fix}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Sub-Pillar Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 rounded-lg transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          📊 4-Pillar Scores
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-2 px-3 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'projects'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>🛠️</span> Project Quality ({projectQuality.score}%)
        </button>
        <button
          onClick={() => setActiveTab('verbs')}
          className={`py-2 px-3 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'verbs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>⚡</span> Action Verbs ({actionVerbs.score}%)
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 px-3 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'links'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>🔗</span> Links & Sections ({linksSections.score}%)
        </button>
        <button
          onClick={() => setActiveTab('layout')}
          className={`py-2 px-3 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'layout'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span>📄</span> ATS 1-Page Check ({atsLayout.score}%)
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      
      {/* --- OVERVIEW TAB --- */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setActiveTab('projects')}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 cursor-pointer transition text-center space-y-1"
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase">Projects</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{projectQuality.score}%</div>
              <div className="text-[10px] text-gray-400">{projectQuality.projects_with_metrics} of {projectQuality.project_count} quantified</div>
            </div>

            <div 
              onClick={() => setActiveTab('verbs')}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 cursor-pointer transition text-center space-y-1"
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase">Action Verbs</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400">{actionVerbs.score}%</div>
              <div className="text-[10px] text-gray-400">{actionVerbs.weak_phrases_count} passive phrases</div>
            </div>

            <div 
              onClick={() => setActiveTab('links')}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 cursor-pointer transition text-center space-y-1"
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase">Links & Proof</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">{linksSections.score}%</div>
              <div className="text-[10px] text-gray-400">{linksSections.github ? '✓ GitHub verified' : '✕ Missing GitHub'}</div>
            </div>

            <div 
              onClick={() => setActiveTab('layout')}
              className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 cursor-pointer transition text-center space-y-1"
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase">ATS Layout</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{atsLayout.score}%</div>
              <div className="text-[10px] text-gray-400">{atsLayout.word_count} words (~{atsLayout.estimated_pages} page)</div>
            </div>
          </div>

          {quickWins.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <span>💡</span> Quick Wins to Improve Your Score
              </span>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 pl-5 list-disc">
                {quickWins.map((win, idx) => (
                  <li key={idx}>{win}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* --- PROJECTS QUALITY TAB --- */}
      {activeTab === 'projects' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              Analyzed Projects ({projectQuality.project_count})
            </span>
            <span className="text-gray-400 text-[11px]">
              Campus rule: 2-3 technical projects with metrics
            </span>
          </div>

          {projectQuality.projects && projectQuality.projects.length > 0 ? (
            <div className="space-y-3">
              {projectQuality.projects.map((proj, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {proj.title}
                    </span>
                    <div className="flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        proj.has_metrics 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {proj.has_metrics ? '✓ Quantified' : '⚠️ Missing Numbers'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        proj.has_tech 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {proj.has_tech ? '✓ Stack Tagged' : '⚠️ Vague Stack'}
                      </span>
                    </div>
                  </div>

                  {proj.tech_stack && proj.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-gray-400">Stack:</span>
                      {proj.tech_stack.map((t, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {proj.issues && proj.issues.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 space-y-1">
                      {proj.issues.map((iss, iIdx) => (
                        <div key={iIdx} className="text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                          <span>👉</span> <span>{iss}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
              ⚠️ No projects recognized. Add a dedicated "Projects" section to highlight hands-on development experience.
            </div>
          )}
        </div>
      )}

      {/* --- ACTION VERBS & WEAK PHRASES TAB --- */}
      {activeTab === 'verbs' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              Weak Phrases Detected ({actionVerbs.weak_phrases_count})
            </span>
            {copiedVerb && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                ✓ Copied "{copiedVerb}" to clipboard!
              </span>
            )}
          </div>

          {actionVerbs.findings && actionVerbs.findings.length > 0 ? (
            <div className="space-y-3">
              {actionVerbs.findings.map((f, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-mono bg-white dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-800">
                    <span className="text-rose-600 dark:text-rose-400 font-bold line-through mr-1">
                      {f.weak_phrase}
                    </span>
                    <span>{f.context.replace(new RegExp(f.weak_phrase, 'i'), '')}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Replace with:
                    </span>
                    {f.suggested_replacements.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleCopyVerb(sug)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 transition cursor-pointer"
                        title="Click to copy replacement verb"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
              ✨ Excellent! Zero passive or weak starter phrases found. Your bullet points use strong action verbs.
            </div>
          )}
        </div>
      )}

      {/* --- LINKS & SECTIONS TAB --- */}
      {activeTab === 'links' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              linksSections.github 
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
            }`}>
              <div>
                <div className="font-bold">GitHub Profile</div>
                <div className="text-[10px] opacity-80">{linksSections.github || 'Missing link (Critical code proof)'}</div>
              </div>
              <span className="text-base font-black">{linksSections.github ? '✓' : '✕'}</span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              linksSections.linkedin 
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
            }`}>
              <div>
                <div className="font-bold">LinkedIn Profile</div>
                <div className="text-[10px] opacity-80">{linksSections.linkedin || 'Missing URL'}</div>
              </div>
              <span className="text-base font-black">{linksSections.linkedin ? '✓' : '⚠️'}</span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              linksSections.has_categorized_skills 
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
            }`}>
              <div>
                <div className="font-bold">Categorized Skills</div>
                <div className="text-[10px] opacity-80">Languages, Frameworks, Tools grouped</div>
              </div>
              <span className="text-base font-black">{linksSections.has_categorized_skills ? '✓' : '⚠️'}</span>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              linksSections.coursework_found && linksSections.coursework_found.length >= 2
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
            }`}>
              <div>
                <div className="font-bold">CS Fundamentals Coursework</div>
                <div className="text-[10px] opacity-80">
                  {linksSections.coursework_found?.length > 0 
                    ? linksSections.coursework_found.join(', ') 
                    : 'DSA, DBMS, OS, Networks'}
                </div>
              </div>
              <span className="text-base font-black">{linksSections.coursework_found?.length >= 2 ? '✓' : '⚠️'}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- ATS LAYOUT TAB --- */}
      {activeTab === 'layout' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Word Count & Length Check:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {atsLayout.word_count} words (Target: 350–600 words)
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  atsLayout.word_count <= 620 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (atsLayout.word_count / 650) * 100)}%` }}
              ></div>
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>{atsLayout.word_count <= 620 ? '✓ Safe 1-Page Layout' : '⚠️ High risk of spilling to 2 pages'}</span>
              <span>Estimated: ~{atsLayout.estimated_pages} page(s)</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {atsLayout.passed && atsLayout.passed.map((p, pIdx) => (
              <div key={pIdx} className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center gap-2">
                <span>✓</span> <span>{p}</span>
              </div>
            ))}
            {atsLayout.issues && atsLayout.issues.map((iss, iIdx) => (
              <div key={iIdx} className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30 flex items-center gap-2">
                <span>⚠️</span> <span>{iss.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
