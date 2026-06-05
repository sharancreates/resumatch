import { useState } from 'react';
import ScrollReveal from './ScrollReveal';

export default function LandingPage({ onGetStarted, onLogin }) {
  // Sandbox Teaser State
  const [sandboxResume, setSandboxResume] = useState('');
  const [sandboxJob, setSandboxJob] = useState('');
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const runSandboxScan = (e) => {
    e.preventDefault();
    if (!sandboxResume.trim() || !sandboxJob.trim()) {
      alert("Please paste both your resume and the job description in the sandbox.");
      return;
    }

    setSandboxLoading(true);
    setSandboxResult(null);

    // Simulated scan calculation for the public teaser
    setTimeout(() => {
      const resumeWords = sandboxResume.toLowerCase().split(/\W+/);
      const jobWords = sandboxJob.toLowerCase().split(/\W+/);
      
      const uniqueJobWords = Array.from(new Set(jobWords)).filter(w => w.length > 3);
      const matchedWords = uniqueJobWords.filter(w => resumeWords.includes(w));
      const missingWords = uniqueJobWords.filter(w => !resumeWords.includes(w)).slice(0, 4);

      const matchPct = Math.round((matchedWords.length / uniqueJobWords.length) * 100) || 45;
      
      setSandboxResult({
        score: Math.min(matchPct, 95),
        missing: missingWords.length > 0 ? missingWords : ["Python", "FastAPI", "Agile", "REST APIs"],
        lexical: Math.min(matchPct - 5, 90),
        semantic: Math.min(matchPct + 10, 95)
      });
      setSandboxLoading(false);
    }, 1200);
  };

  const faqs = [
    {
      q: "How does the ATS score matching engine work?",
      a: "Our core engine performs a hybrid analysis. First, a lexical parser evaluates keyword match density and missing key terms. Second, a semantic AI model (Sentence-Transformers) assesses contextual similarity, ensuring you get scored for meaning and industry synonym fits, not just exact letter matching."
    },
    {
      q: "Can I manage multiple workspaces for team recruitment?",
      a: "Yes! ResuMatch is fully multi-tenant. You can create separate workspace environments (e.g. for different departments, client accounts, or agencies), invite coworkers, assign access roles (Viewer, Recruiter, Admin), and collaborate together."
    },
    {
      q: "Is there a developer API key system?",
      a: "ResuMatch exposes RESTful endpoints for integration into custom HR platforms or job portals. Users on the Pro and Team plans can generate scoped API keys directly from their developer configurations panel with adjustable rate limit boundaries."
    },
    {
      q: "What are the limitations of the free sandbox tier?",
      a: "The Free tier includes 10 resume scans, basic match tracking, and 1 workspace organization. Upgrading to a premium Pro or Team subscription unlocks unlimited scans, advanced AI recommendations, PDF exports, and developer key credentials."
    }
  ];

  return (
    <div className="bg-[#0B0F19] text-gray-100 min-h-screen overflow-x-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-10%] w-[55%] h-[65%] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none"></div>

      {/* NAVBAR */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25">
            RM
          </div>
          <span className="text-lg font-black tracking-tight text-white">ResuMatch</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#sandbox" className="hover:text-white transition">Live Sandbox</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
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
            Get Started Free
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-6">
          <ScrollReveal delay={100}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-wider uppercase">
              🚀 Powering modern recruiters & job seekers
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Optimize your resume. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-purple-400">
                Beat the ATS screening.
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-base text-gray-400 max-w-xl leading-relaxed">
              Use hybrid lexical matching and semantic AI scoring to check keyword fits, bridge experience gaps, rewrite bullet points, and land interviews with confidence.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400} className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={onGetStarted}
              className="px-7 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/25 transition transform active:scale-95 text-xs"
            >
              Analyze Your Resume Now
            </button>
            <a 
              href="#sandbox"
              className="px-7 py-4 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-bold rounded-xl transition text-xs flex items-center gap-2"
            >
              Try Live Sandbox ⚡
            </a>
          </ScrollReveal>
        </div>

        {/* HERO MOCKUP GRAPHIC */}
        <div className="lg:col-span-5 relative">
          <ScrollReveal delay={450}>
            <div className="relative mx-auto max-w-[380px] bg-gradient-to-b from-[#1E293B]/70 to-[#0F172A]/90 border border-gray-800 p-6 rounded-3xl shadow-2xl backdrop-blur-sm space-y-6">
              {/* Header inside mockup */}
              <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">resumatch_report.json</span>
              </div>

              {/* Matching Circle */}
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-gray-800" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-indigo-500 stroke-dasharray-[78,100]" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" strokeDasharray="78, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white">78%</span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">ATS Score</span>
                  </div>
                </div>
                <p className="text-[10px] text-green-400 font-bold bg-green-950/35 border border-green-900/30 px-3 py-1 rounded-full">
                  ✓ High Match Potential
                </p>
              </div>

              {/* Feedback badges */}
              <div className="space-y-2 border-t border-gray-800/60 pt-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Identified Missing Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-red-950/30 text-red-400 border border-red-900/20 px-2 py-0.5 rounded font-mono">FastAPI</span>
                  <span className="text-[9px] bg-red-950/30 text-red-400 border border-red-900/20 px-2 py-0.5 rounded font-mono">AWS RDS</span>
                  <span className="text-[9px] bg-red-950/30 text-red-400 border border-red-900/20 px-2 py-0.5 rounded font-mono">Kubernetes</span>
                </div>
              </div>
            </div>

            {/* Float badges decorations */}
            <div className="absolute top-10 left-[-40px] bg-indigo-600/90 text-white text-[10px] font-bold py-2 px-4 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
              <span>💎</span> Semantic Match: High Context
            </div>
            <div className="absolute bottom-10 right-[-30px] bg-purple-600/90 text-white text-[10px] font-bold py-2 px-4 rounded-xl shadow-xl flex items-center gap-2">
              <span>⚡</span> Parse Speed: 1.2s
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white">Full-Stack SaaS Platform Built to Convert</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Explore the advanced features that make ResuMatch the ultimate tool for job seekers, recruiters, and dev integrations.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <ScrollReveal delay={100}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 hover:bg-[#111827]/75 transition group space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400 group-hover:scale-110 transition">
                🔍
              </div>
              <h3 className="text-sm font-bold text-white">Hybrid Match Engine</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Uses lexical pattern matches and neural semantic similarity to rate resume relevancy.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 hover:bg-[#111827]/75 transition group space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400 group-hover:scale-110 transition">
                👥
              </div>
              <h3 className="text-sm font-bold text-white">Multi-Tenant Workspaces</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Invite team members, configure custom workflows, and isolate candidates by workspaces.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 hover:bg-[#111827]/75 transition group space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400 group-hover:scale-110 transition">
                🔑
              </div>
              <h3 className="text-sm font-bold text-white">Developer API Scopes</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Register hourly rate-limited API keys and trigger scan webhooks directly into your HR pipelines.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <div className="bg-[#111827]/40 border border-gray-800 p-6 rounded-2xl hover:border-indigo-500/30 hover:bg-[#111827]/75 transition group space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/20 flex items-center justify-center text-lg text-indigo-400 group-hover:scale-110 transition">
                📑
              </div>
              <h3 className="text-sm font-bold text-white">Structured PDF Exports</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Generate clean, printer-friendly reports of scoring breakdowns and recommendations on scan completions.
              </p>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* LIVE SANDBOX TEASER */}
      <section id="sandbox" className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white">Interactive Sandbox Playground</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Test drive the lexical parsing logic right now. Paste any text below to run a simulation.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="bg-gradient-to-b from-[#111827]/60 to-[#0F172A]/80 border border-gray-800 p-8 rounded-3xl max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Input form */}
            <form onSubmit={runSandboxScan} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Paste Sandbox Resume</label>
                <textarea 
                  value={sandboxResume}
                  onChange={(e) => setSandboxResume(e.target.value)}
                  placeholder="e.g. Software engineer with experience building web applications using React, Javascript, Node.js..."
                  className="w-full h-36 p-3 text-xs bg-gray-900/50 border border-gray-850 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-gray-300 placeholder-gray-650"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Paste Job Description</label>
                <textarea 
                  value={sandboxJob}
                  onChange={(e) => setSandboxJob(e.target.value)}
                  placeholder="e.g. Seeking a developer experienced in Python, React, FastAPI, Javascript, and REST APIs."
                  className="w-full h-36 p-3 text-xs bg-gray-900/50 border border-gray-850 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-gray-300 placeholder-gray-650"
                />
              </div>

              <button 
                type="submit"
                disabled={sandboxLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition transform active:scale-95"
              >
                {sandboxLoading ? "Processing Scan..." : "Execute Sandbox Scan"}
              </button>
            </form>

            {/* Results mockup preview */}
            <div className="bg-[#0B0F19] rounded-2xl p-6 border border-gray-850 h-[384px] flex flex-col justify-between">
              {sandboxResult ? (
                <div className="space-y-6 animate-fade-in flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-gray-850 pb-4">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Sandbox Report</p>
                      <h4 className="text-xs font-bold text-gray-300">Simulated Analysis</h4>
                    </div>
                    <span className="text-xs font-black text-indigo-400 bg-indigo-950/45 px-2.5 py-1 rounded-lg border border-indigo-900/35">
                      {sandboxResult.score}% Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111827]/40 p-3.5 rounded-xl border border-gray-850/50">
                      <span className="text-[9px] text-gray-500 font-bold block mb-1">LEXICAL FIT</span>
                      <span className="text-sm font-black text-indigo-300 font-mono">{sandboxResult.lexical}%</span>
                    </div>
                    <div className="bg-[#111827]/40 p-3.5 rounded-xl border border-gray-850/50">
                      <span className="text-[9px] text-gray-500 font-bold block mb-1">SEMANTIC FIT</span>
                      <span className="text-sm font-black text-purple-300 font-mono">{sandboxResult.semantic}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Recommended Keywords to Add:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sandboxResult.missing.map((word, i) => (
                        <span key={i} className="text-[9px] bg-red-950/30 text-red-400 border border-red-900/20 px-2.5 py-1 rounded-lg font-semibold font-mono">
                          + {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-950/20 border border-indigo-900/20 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[9px] text-indigo-400 font-bold">Want deep AI suggestions & PDF exports?</span>
                    <button 
                      onClick={onGetStarted}
                      className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg transition"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                  <span className="text-3xl">💻</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-400">Teaser Output Awaiting Input</h4>
                    <p className="text-[10px] text-gray-650 max-w-xs leading-relaxed">
                      Enter a resume and job description to verify lexical scan outputs.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white font-extrabold tracking-tight">Flexible SaaS Pricing Plans</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Start with our free sandbox or scale up to get full team collaboration and REST API pipelines.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* Card 1: Free Sandbox */}
          <ScrollReveal delay={100} className="flex">
            <div className="bg-[#111827]/20 border border-gray-850 p-8 rounded-3xl flex flex-col justify-between flex-1 relative hover:border-gray-800 transition">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-300">Free Sandbox</h3>
                  <p className="text-xs text-gray-500 mt-1">Perfect for trying out the engine.</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$0</span>
                  <span className="text-xs text-gray-500">/ forever</span>
                </div>
                <ul className="space-y-3 text-xs text-gray-400 border-t border-gray-850 pt-6">
                  <li className="flex items-center gap-2">✓ 10 Resume Scans</li>
                  <li className="flex items-center gap-2">✓ Basic Keyword Matching</li>
                  <li className="flex items-center gap-2">✓ 1 Organization Workspace</li>
                  <li className="flex items-center gap-2 text-gray-650">✗ Advanced AI Recommendations</li>
                  <li className="flex items-center gap-2 text-gray-650">✗ Developer API Access</li>
                </ul>
              </div>
              <button 
                onClick={onGetStarted}
                className="w-full mt-8 py-3 bg-gray-900/60 hover:bg-gray-800 border border-gray-850 text-white font-bold rounded-xl text-xs transition"
              >
                Sign Up Free
              </button>
            </div>
          </ScrollReveal>

          {/* Card 2: Pro Tier */}
          <ScrollReveal delay={200} className="flex">
            <div className="bg-[#111827]/40 border-2 border-indigo-500 p-8 rounded-3xl flex flex-col justify-between flex-1 relative shadow-xl shadow-indigo-500/5 hover:bg-[#111827]/60 transition">
              <div className="absolute top-[-14px] right-6 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                Most Popular
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-indigo-400">Pro Tier</h3>
                  <p className="text-xs text-gray-400 mt-1">For serious job hunters and designers.</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$19</span>
                  <span className="text-xs text-indigo-400">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-gray-300 border-t border-gray-800 pt-6">
                  <li className="flex items-center gap-2 text-indigo-400">✓ Unlimited Scan History</li>
                  <li className="flex items-center gap-2">✓ Advanced AI Recommendations</li>
                  <li className="flex items-center gap-2">✓ Bullet Point Rewrite Suggestions</li>
                  <li className="flex items-center gap-2">✓ Structured PDF Report Exports</li>
                  <li className="flex items-center gap-2">✓ 1 Developer API Key</li>
                </ul>
              </div>
              <button 
                onClick={onGetStarted}
                className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/20"
              >
                Go Pro Now
              </button>
            </div>
          </ScrollReveal>

          {/* Card 3: Team Recruiter */}
          <ScrollReveal delay={300} className="flex">
            <div className="bg-[#111827]/20 border border-gray-850 p-8 rounded-3xl flex flex-col justify-between flex-1 relative hover:border-gray-800 transition">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-300">Team / Agency</h3>
                  <p className="text-xs text-gray-500 mt-1">For staffing bureaus & recruiters.</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$49</span>
                  <span className="text-xs text-gray-500">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-gray-400 border-t border-gray-850 pt-6">
                  <li className="flex items-center gap-2">✓ Everything in Pro Tier</li>
                  <li className="flex items-center gap-2">✓ Up to 5 Team Workspace seats</li>
                  <li className="flex items-center gap-2">✓ 5 Developer API keys</li>
                  <li className="flex items-center gap-2">✓ 10,000 API Requests / hr</li>
                  <li className="flex items-center gap-2">✓ Collaborative Scoring metrics</li>
                </ul>
              </div>
              <button 
                onClick={onGetStarted}
                className="w-full mt-8 py-3 bg-gray-900/60 hover:bg-gray-800 border border-gray-850 text-white font-bold rounded-xl text-xs transition"
              >
                Contact Sales
              </button>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 border-t border-gray-900 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-gray-400">
              Find answers to the most common queries about ResuMatch.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <ScrollReveal key={idx} delay={idx * 50}>
              <div 
                className="bg-[#111827]/25 border border-gray-850 rounded-2xl overflow-hidden cursor-pointer hover:border-gray-800 transition"
                onClick={() => toggleFaq(idx)}
              >
                <div className="p-5 flex items-center justify-between text-xs font-bold text-gray-200">
                  <span>{faq.q}</span>
                  <span className="text-indigo-400 font-bold text-lg select-none">
                    {activeFaq === idx ? '−' : '+'}
                  </span>
                </div>
                
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-gray-850/40 pt-3.5 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* MARKETING FOOTER */}
      <footer className="border-t border-gray-900 bg-[#070A10]/95 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-500 font-semibold">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-[11px]">
              RM
            </div>
            <span className="text-gray-300 font-bold">ResuMatch Platform</span>
          </div>
          
          <p>© {new Date().getFullYear()} ResuMatch. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-gray-300 transition">Terms</a>
            <a href="#features" className="hover:text-gray-300 transition">Privacy</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-gray-300 transition">LinkedIn</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
