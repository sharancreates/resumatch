import React, { useState } from 'react';
import axios from 'axios';
import ScrollReveal from './ScrollReveal';
import ScorecardModal from './ScorecardModal';

export default function LandingPage({ onGetStarted, onLogin }) {
  // Live Public Scanner State
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scansRemaining, setScansRemaining] = useState(3);
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setScanError("Please select a PDF or DOCX file.");
      return;
    }

    setSelectedFile(file);
    setScanError('');

    // Extract text via /api/parse-pdf
    const formData = new FormData();
    formData.append("file", file);

    try {
      setScanning(true);
      const res = await axios.post("/api/parse-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.text) {
        setResumeText(res.data.text);
      }
    } catch (err) {
      console.error("File extraction error:", err);
      setScanError("Failed to parse file. Please paste your resume text directly.");
    } finally {
      setScanning(false);
    }
  };

  const runLiveScan = async (e) => {
    e.preventDefault();
    setScanError('');

    if (!resumeText.trim() || !jobText.trim()) {
      setScanError("Please provide both your resume and the target job description.");
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const res = await axios.post("/api/analyze/public", {
        resume: resumeText,
        job: jobText,
        client_id: localStorage.getItem('resumatch_guest_id') || undefined
      });

      if (res.data?.status === 'success') {
        const data = res.data.data;
        setScanResult(data);
        if (typeof data.scans_remaining === 'number') {
          setScansRemaining(data.scans_remaining);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 429) {
        setScanError(typeof msg === 'string' ? msg : "You have used all 3 free scans. Sign in or grab a Sprint Pass for unlimited scans!");
      } else {
        setScanError(typeof msg === 'string' ? msg : "Scan could not be completed. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  };

  const faqs = [
    {
      q: "I have no corporate experience. How does ResuMatch help me?",
      a: "Most resume tools assume you have 5 years in tech. ResuMatch is built specifically for freshers: we score your personal, academic, and internship projects, ensure your tech stack is formatted correctly, check for measurable results, and audit critical links like GitHub and LinkedIn."
    },
    {
      q: "Is the scan really free with no login or credit card?",
      a: "Yes! You get 3 free complete scans directly on this page without creating an account or entering any credit card. You get your overall ATS match score and your top 3 missing tech skills immediately."
    },
    {
      q: "How does the hybrid match engine work?",
      a: "Campus placement bots use two filters: exact keyword matching (40%) and semantic contextual meaning (60%). Our dual engine scores both: making sure you have the exact required tools (like 'React', 'FastAPI') while understanding that 'built microservices' matches 'backend engineering'."
    },
    {
      q: "What is your student privacy policy?",
      a: "We comply strictly with India's DPDP Act. We never train AI models on your resume, never share or sell student data, and offer one-click resume deletion. Your resume belongs solely to you."
    }
  ];

  const getScoreBadge = (score) => {
    if (score >= 80) return { text: "✓ Placement Ready", color: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30" };
    if (score >= 60) return { text: "⚠ Needs Minor Polish", color: "text-amber-400 bg-amber-950/40 border-amber-500/30" };
    return { text: "✕ High Rejection Risk", color: "text-rose-400 bg-rose-950/40 border-rose-500/30" };
  };

  return (
    <div className="bg-[#0B0F19] text-gray-100 min-h-screen overflow-x-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-10%] w-[55%] h-[65%] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none"></div>

      {/* NAVBAR */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25">
            RM
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">ResuMatch <span className="text-indigo-400 text-xs uppercase px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30">Freshers</span></span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-400">
          <a href="#scanner" className="hover:text-white transition">Free Scanner</a>
          <a href="#features" className="hover:text-white transition">Why Freshers Love Us</a>
          <a href="#pricing" className="hover:text-white transition">Student Pricing</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={onLogin}
            className="text-xs font-bold text-gray-300 hover:text-white transition px-3 py-1.5"
          >
            Sign In
          </button>
          <button 
            onClick={onGetStarted}
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
          >
            Create Account
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 relative z-10 text-center space-y-6">
        <ScrollReveal delay={100}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            <span>🎓</span> Built for 2024–2026 Campus Drives & First Jobs in India
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15] text-white max-w-4xl mx-auto">
            Upload your resume, paste a job. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-purple-400">
              Get a better resume in 2 minutes.
            </span>
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Built for freshers, priced for students. Stop getting filtered out by campus bots. Check missing tech skills, weak project bullets, and ATS layout traps before you apply.
          </p>
        </ScrollReveal>
      </section>

      {/* LIVE NO-SIGNUP SCANNER WIDGET */}
      <section id="scanner" className="max-w-5xl mx-auto px-6 pb-24 relative z-10">
        <ScrollReveal delay={350}>
          <div className="bg-[#111827]/80 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-2">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>⚡</span> Instant Free Scan (No Signup Required)
                </h2>
                <p className="text-xs text-gray-400">Paste your resume & target job description to get your match score instantly.</p>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/20 text-indigo-300 text-xs font-bold self-start sm:self-auto">
                {scansRemaining} of 3 Free Scans Remaining
              </div>
            </div>

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                ⚠️ {scanError}
              </div>
            )}

            <form onSubmit={runLiveScan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Resume Input Area */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-300">1. Your Resume</label>
                    <label className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold">
                      <span>📁 Upload PDF / DOCX</span>
                      <input 
                        type="file" 
                        accept=".pdf,.docx" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="text-[11px] text-gray-400 font-mono truncate bg-gray-900/60 px-2 py-1 rounded border border-gray-800">
                      📄 {selectedFile.name}
                    </div>
                  )}
                  <textarea
                    rows={8}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume text here (or upload a PDF/DOCX file)..."
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono transition"
                  />
                </div>

                {/* Job Description Input Area */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300">2. Target Job Description</label>
                  <textarea
                    rows={8}
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    placeholder="Paste the job requirements from LinkedIn, Internshala, or campus placement drive..."
                    className="w-full bg-[#0B0F19] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono transition"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <span className="text-[11px] text-gray-400">
                  🔒 We never train AI models on your resume or share your data.
                </span>
                <button
                  type="submit"
                  disabled={scanning}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
                >
                  {scanning ? 'Analyzing Resume & JD...' : 'Run Free Scan ⚡'}
                </button>
              </div>
            </form>

            {/* REAL SCAN RESULT CARD */}
            {scanResult && (
              <div className="mt-8 pt-6 border-t border-gray-800 space-y-6 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-[#0F172A] border border-indigo-500/40 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xl">
                  {/* Score Dial */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-2 border-b md:border-b-0 md:border-r border-gray-800 pb-4 md:pb-0">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <div className="text-4xl font-black text-white">{scanResult.score}%</div>
                    </div>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${getScoreBadge(scanResult.score).color}`}>
                      {getScoreBadge(scanResult.score).text}
                    </span>
                  </div>

                  {/* Breakdown & Gaps */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-300">
                        <span>Exact Keywords Overlap (40% weight):</span>
                        <span className="font-bold text-indigo-400">{scanResult.breakdown?.lexical}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${scanResult.breakdown?.lexical}%` }}></div>
                      </div>

                      <div className="flex justify-between text-xs text-gray-300 pt-1">
                        <span>Semantic Context & Meaning (60% weight):</span>
                        <span className="font-bold text-purple-400">{scanResult.breakdown?.semantic}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${scanResult.breakdown?.semantic}%` }}></div>
                      </div>
                    </div>

                    {/* Top 3 Missing Gaps */}
                    {scanResult.top_missing_skills?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
                        <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                          <span>Top Missing Tech Skills to Add:</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            +{scanResult.all_missing_count} total detected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {scanResult.top_missing_skills.map((skill, i) => (
                            <span key={i} className="text-xs font-mono px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 font-semibold">
                              + {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fresher Readiness & Quick Fix Preview */}
                    {scanResult.fresher_audit && (
                      <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                            <span>🎓</span> Fresher Readiness: {scanResult.fresher_audit.fresher_score}% ({scanResult.fresher_audit.readiness_verdict})
                          </span>
                        </div>
                        {scanResult.fresher_audit.critical_fixes?.length > 0 && (
                          <div className="text-[11px] text-rose-300 flex items-start gap-1">
                            <span>👉</span> <span>{scanResult.fresher_audit.critical_fixes[0]}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Triggers */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setScorecardModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                      >
                        <span>📲</span> Share Scorecard (WhatsApp / LinkedIn)
                      </button>
                      <button
                        onClick={onGetStarted}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                      >
                        Unlock Full AI Bullet Rewriter →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </section>

      {/* FRESHER-FOCUSED FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white">Why Freshers Love ResuMatch</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              We look past corporate years of experience and grade what fresh graduates actually have: projects, coursework, and core skills.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScrollReveal delay={100}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 transition space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400">
                🎯
              </div>
              <h3 className="text-sm font-bold text-white">Campus ATS Scanner</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                40% exact keyword match + 60% semantic similarity so campus recruitment bots don't discard your application.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 transition space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400">
                🛠
              </div>
              <h3 className="text-sm font-bold text-white">Project Quality Checker</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Audits your college projects for explicit tech stacks, your personal role, and measurable outcomes.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 transition space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400">
                ✍️
              </div>
              <h3 className="text-sm font-bold text-white">Weak Verb Detector</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Flags passive language ("worked on", "assisted") and turns them into strong action verbs ("architected", "built").
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 transition space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400">
                📄
              </div>
              <h3 className="text-sm font-bold text-white">1-Page ATS Safe Layout</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Catches formatting traps like tables, photos, or multi-columns that break Indian hiring portals.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* STUDENT PRICING SECTION */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white">Priced for Students, Not US Executives</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              No expensive recurring monthly subscriptions. Grab a micro-pass when your placement season starts.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-[#111827]/50 border border-gray-800 p-8 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Free Tier</span>
              <div className="text-3xl font-black text-white">₹0</div>
              <p className="text-xs text-gray-400">Get your baseline score and top skill gaps before campus tests.</p>
              <ul className="text-xs space-y-2.5 text-gray-300">
                <li className="flex items-center gap-2">✓ 3 full ATS scans (no signup needed)</li>
                <li className="flex items-center gap-2">✓ Top 3 missing tech skills</li>
                <li className="flex items-center gap-2">✓ Shareable WhatsApp scorecard</li>
                <li className="flex items-center gap-2 text-gray-500">✕ AI bullet rewriter</li>
              </ul>
            </div>
            <button 
              onClick={() => {
                const el = document.getElementById('scanner');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs transition"
            >
              Start Free Scan
            </button>
          </div>

          {/* Sprint Pass */}
          <div className="bg-[#1E1B4B]/50 border-2 border-indigo-500 p-8 rounded-3xl space-y-6 flex flex-col justify-between relative shadow-2xl">
            <div className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
              ⚡ Most Popular for Campus Drives
            </div>
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Sprint Pass</span>
              <div className="text-3xl font-black text-white">₹199 <span className="text-xs font-normal text-gray-400">/ 14 days</span></div>
              <p className="text-xs text-gray-300">Perfect for an active 2-week campus drive or internship rush.</p>
              <ul className="text-xs space-y-2.5 text-gray-200">
                <li className="flex items-center gap-2">✓ <strong>Unlimited</strong> resume & JD scans</li>
                <li className="flex items-center gap-2">✓ Grounded AI bullet rewriter</li>
                <li className="flex items-center gap-2">✓ "Tailor to this Job" 1-click generator</li>
                <li className="flex items-center gap-2">✓ 3-4 fresher ATS templates (PDF & DOCX)</li>
                <li className="flex items-center gap-2">✓ One-tap Razorpay UPI payment</li>
              </ul>
            </div>
            <button 
              onClick={onGetStarted}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
            >
              Get Sprint Pass (₹199)
            </button>
          </div>

          {/* Placement Season */}
          <div className="bg-[#111827]/50 border border-gray-800 p-8 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Placement Season</span>
              <div className="text-3xl font-black text-white">₹499 <span className="text-xs font-normal text-gray-400">/ 3 months</span></div>
              <p className="text-xs text-gray-400">For students navigating the entire 3-month placement cycle.</p>
              <ul className="text-xs space-y-2.5 text-gray-300">
                <li className="flex items-center gap-2">✓ Everything in Sprint Pass</li>
                <li className="flex items-center gap-2">✓ Full 90 days access</li>
                <li className="flex items-center gap-2">✓ Priority Gemini AI suggestions</li>
                <li className="flex items-center gap-2">✓ Job Application Tracker</li>
              </ul>
            </div>
            <button 
              onClick={onGetStarted}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs transition"
            >
              Get Placement Pass (₹499)
            </button>
          </div>
        </div>
      </section>

      {/* STUDENT PRIVACY TRUST BANNER */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <span>🛡️</span> 100% Student Data Privacy Pledge (DPDP Act)
            </h4>
            <p className="text-xs text-gray-400">
              We never train AI models on your resumes, never sell student data, and provide 1-click data deletion.
            </p>
          </div>
          <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/80 px-3 py-1.5 rounded-full border border-indigo-500/30 whitespace-nowrap">
            Encrypted & Private
          </span>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-gray-400">Honest answers for students and campus applicants.</p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-800 rounded-2xl overflow-hidden bg-[#111827]/40">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left text-xs font-bold text-gray-200 hover:text-white flex items-center justify-between transition"
              >
                <span>{faq.q}</span>
                <span className="text-indigo-400">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-gray-800/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-600">
        <p>© 2026 ResuMatch AI — Built for freshers in India. All rights reserved.</p>
      </footer>

      {/* SCORECARD MODAL */}
      <ScorecardModal 
        isOpen={scorecardModalOpen}
        onClose={() => setScorecardModalOpen(false)}
        scorecard={scanResult}
      />
    </div>
  );
}
