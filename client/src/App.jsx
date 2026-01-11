import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- CONFIG ---
const API_URL = "https://resumatch-cm7x.onrender.com"; // Your Render Backend URL

function App() {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState("Checking...");
  
  // DARK MODE STATE
  // Check localStorage first, otherwise default to false (Light Mode)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  
  const fileInputRef = useRef(null);

  // --- EFFECTS ---

  // 1. Handle Dark Mode Class on <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 2. Health Check
  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then(res => setServerStatus(res.data.status === "alive" ? "Online 🟢" : "Offline 🔴"))
      .catch(() => setServerStatus("Offline 🔴"));
  }, []);

  // --- HANDLERS ---

  const handleAnalyze = async () => {
    if (!resume.trim() || !job.trim()) {
        alert("Please paste both your resume and the job description.");
        return;
    }

    setLoading(true);
    setResult(null); 
    
    try {
      const response = await axios.post(`${API_URL}/api/analyze`, {
        resume: resume,
        job: job
      });
      setResult(response.data.data);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to connect to server. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/parse-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResume(response.data.text);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to parse PDF. Please copy-paste text manually.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  return (
    // MAIN CONTAINER: Added dark:bg-gray-900 and dark:text-gray-100
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 tracking-tight">
              ResuMatch <span className="text-indigo-400 dark:text-indigo-200">AI</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Hybrid Logic: Keywords + Semantic Meaning
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Server Status Badge */}
            <div className={`text-xs font-mono px-3 py-1 rounded-full border 
              ${serverStatus.includes("Online") 
                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
                : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
              }`}>
              Server: {serverStatus}
            </div>

            {/* DARK MODE TOGGLE BUTTON */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Toggle Dark Mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: Inputs */}
          <div className="space-y-6">
            
            {/* Resume Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">1. Your Resume</label>
                
                {/* PDF Upload Button */}
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition font-semibold"
                  >
                    {uploading ? (
                      <span>Parsing...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea 
                className="w-full h-48 p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
                placeholder="Paste text or upload PDF..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>
            
            {/* Job Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">2. Job Description</label>
              <textarea 
                className="w-full h-48 p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
                placeholder="Paste the job description here..."
                value={job}
                onChange={(e) => setJob(e.target.value)}
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || serverStatus.includes("Offline")}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95
                ${loading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl dark:bg-indigo-600 dark:hover:bg-indigo-500'}
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Hybrid Analysis...
                </span>
              ) : "Analyze Match"}
            </button>
          </div>

          {/* RIGHT: Results */}
          <div className="space-y-6">
            {!result ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 transition-colors">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p>Results will appear here</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in transition-colors">
                
                {/* Total Score */}
                <div className="text-center mb-8 relative">
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

                {/* The Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Keywords</div>
                    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{result.breakdown.lexical.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-400">Exact matches</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center border border-gray-100 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Meaning</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{result.breakdown.semantic.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-400">Context/Synonyms</div>
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Missing Keywords
                  </h3>
                  
                  {result.missing.length === 0 ? (
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

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;