import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
const API_URL = "https://resumatch-cm7x.onrender.com";

function App() {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // New state for PDF upload
  const [serverStatus, setServerStatus] = useState("Checking...");
  
  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // Health Check on Load
  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then(res => setServerStatus(res.data.status === "alive" ? "Online 🟢" : "Offline 🔴"))
      .catch(() => setServerStatus("Offline 🔴"));
  }, []);

  const handleAnalyze = async () => {
    if (!resume.trim() || !job.trim()) {
        alert("Please paste both your resume and the job description.");
        return;
    }

    setLoading(true);
    setResult(null); 
    
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/analyze', {
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

  // NEW: Handle PDF Upload
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
      const response = await axios.post('http://127.0.0.1:5000/api/parse-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Auto-fill the resume text area
      setResume(response.data.text);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to parse PDF. Please copy-paste text manually.");
    } finally {
      setUploading(false);
      // Reset input so user can upload same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">ResuMatch <span className="text-indigo-400">AI</span></h1>
            <p className="text-sm text-gray-500 mt-1">Hybrid Logic: Keywords + Semantic Meaning</p>
          </div>
          <div className={`text-xs font-mono px-3 py-1 rounded-full border ${serverStatus.includes("Online") ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
            Server: {serverStatus}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: Inputs */}
          <div className="space-y-6">
            
            {/* Resume Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-700">1. Your Resume</label>
                
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
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-semibold"
                  >
                    {uploading ? (
                      <span>Parsing PDF...</span>
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
                className="w-full h-48 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Paste text or upload PDF..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>
            
            {/* Job Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">2. Job Description</label>
              <textarea 
                className="w-full h-48 p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Paste the job description here..."
                value={job}
                onChange={(e) => setJob(e.target.value)}
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || serverStatus.includes("Offline")}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95
                ${loading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl'}
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Hybrid AI Analysis...
                </span>
              ) : "Analyze Match"}
            </button>
          </div>

          {/* RIGHT: Results */}
          <div className="space-y-6">
            {!result ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p>Results will appear here</p>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
                
                {/* Total Score */}
                <div className="text-center mb-8 relative">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Overall Match Score</h2>
                  <div className={`text-7xl font-black 
                    ${result.score >= 70 ? 'text-green-500' : result.score >= 40 ? 'text-yellow-500' : 'text-red-500'}
                  `}>
                    {result.score}%
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase
                    ${result.score >= 70 ? 'bg-green-100 text-green-700' : result.score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                  `}>
                    {result.score >= 70 ? 'High Match 🚀' : result.score >= 40 ? 'Potential Match ⚠️' : 'Low Match ❌'}
                  </div>
                </div>

                {/* The Breakdown (Lexical vs Semantic) */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Keywords</div>
                    <div className="text-xl font-bold text-indigo-600">{result.breakdown.lexical.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-400">Exact word matches</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Meaning</div>
                    <div className="text-xl font-bold text-purple-600">{result.breakdown.semantic.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-400">Context & Synonyms</div>
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Missing Keywords
                  </h3>
                  
                  {result.missing.length === 0 ? (
                     <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                       ✨ Incredible! No major keywords missing.
                     </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.missing.map((word, index) => (
                        <span key={index} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 shadow-sm">
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