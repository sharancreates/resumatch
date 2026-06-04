import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import HistoryDrawer from './components/HistoryDrawer';
import ResumeDropzone from './components/ResumeDropzone';
import JobTextArea from './components/JobTextArea';
import ResultDisplay from './components/ResultDisplay';

const API_URL = import.meta.env.VITE_API_URL || ""; 

function App() {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState("Checking...");
  
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  // History State
  const [history, setHistory] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Billing Tier State
  const [isPremium, setIsPremium] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then(res => setServerStatus(res.data.status === "alive" ? "Online 🟢" : "Offline 🔴"))
      .catch(() => setServerStatus("Offline 🔴"));
  }, []);

  // Sync isPremium status if token is set
  useEffect(() => {
    if (!token) {
      setIsPremium(false);
      return;
    }
    const checkUserStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsPremium(response.data.data.is_premium || false);
      } catch (error) {
        console.error("Failed to verify user profile:", error);
      }
    };
    checkUserStatus();
  }, [token]);

  // Handle billing redirect success checking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const upgradeStatus = urlParams.get('upgrade');
    if (upgradeStatus === 'success') {
      alert("Thank you! Your payment was successful and your account is upgraded to Premium.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (upgradeStatus === 'mock') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleUpgrade = async () => {
    if (!token) {
      alert("Please sign in to upgrade to Premium.");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/billing/checkout-session`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.status === "success") {
        window.location.href = response.data.url;
      } else if (response.data.status === "mock") {
        const confirmMock = window.confirm("Stripe is not configured in this environment. Proceed with a Mock Upgrade to instantly grant Premium status?");
        if (confirmMock) {
          const mockUpgradeRes = await axios.post(`${API_URL}/api/billing/mock-upgrade`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (mockUpgradeRes.data.status === "success") {
            setIsPremium(true);
            alert("Congratulations! You are now upgraded to Premium.");
          }
        }
      }
    } catch (err) {
      console.error("Upgrade checkout error:", err);
      alert("Failed to initiate billing session.");
    }
  };

  // Fetch scan history if logged in
  const fetchHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(response.data.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [token]);

  const handleAnalyze = async () => {
    if (!resume.trim() || !job.trim()) {
        alert("Please paste both your resume and the job description.");
        return;
    }

    setLoading(true);
    setResult(null); 
    
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`${API_URL}/api/analyze`, {
        resume: resume,
        job: job
      }, { headers });

      setResult(response.data.data);
      if (token) {
        fetchHistory(); // Refresh history list
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to connect to server. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const parseResumeFile = async (file) => {
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'pdf' && fileExtension !== 'docx') {
      alert("Please upload a PDF or DOCX file.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`${API_URL}/api/parse-pdf`, formData, { headers });
      setResume(response.data.text);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to parse document. Please copy-paste text manually.");
    } finally {
      setUploading(false);
    }
  };

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput.trim() || !passwordInput) {
      setAuthError("Email and password are required.");
      return;
    }
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const response = await axios.post(`${API_URL}/api/auth/${endpoint}`, {
        email: emailInput,
        password: passwordInput
      });

      const { token: receivedToken, email: receivedEmail, is_premium: receivedIsPremium } = response.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('userEmail', receivedEmail);
      setToken(receivedToken);
      setUserEmail(receivedEmail);
      setIsPremium(receivedIsPremium || false);
      setAuthModalOpen(false);
      setEmailInput('');
      setPasswordInput('');
    } catch (error) {
      console.error("Auth failed:", error);
      setAuthError(error.response?.data?.error || "Authentication failed. Try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken('');
    setUserEmail('');
    setIsPremium(false);
    setHistory([]);
    setDrawerOpen(false);
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan from history?")) return;
    try {
      await axios.delete(`${API_URL}/api/history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to delete history item:", error);
      alert("Failed to delete item.");
    }
  };

  const handleSelectHistoryItem = (item) => {
    setResume(item.resume_text);
    setJob(item.job_description);
    setResult({
      score: item.score,
      missing: JSON.parse(item.missing_keywords || "[]"),
      lexical_score: item.lexical_score,
      semantic_score: item.semantic_score
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200 p-8">
      <div className="max-w-6xl mx-auto">
        <Header 
          serverStatus={serverStatus}
          token={token}
          userEmail={userEmail}
          historyLength={history.length}
          setDrawerOpen={setDrawerOpen}
          handleLogout={handleLogout}
          setAuthModalOpen={setAuthModalOpen}
          setIsRegister={setIsRegister}
          setAuthError={setAuthError}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isPremium={isPremium}
          handleUpgrade={handleUpgrade}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Inputs */}
          <div className="space-y-6">
            <ResumeDropzone 
              resume={resume}
              setResume={setResume}
              uploading={uploading}
              parseResumeFile={parseResumeFile}
            />

            <JobTextArea 
              job={job}
              setJob={setJob}
            />

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
            <ResultDisplay 
              result={result} 
              isPremium={isPremium} 
              handleUpgrade={handleUpgrade} 
              token={token} 
              API_URL={API_URL} 
            />
          </div>
        </div>
      </div>

      <HistoryDrawer 
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        loadingHistory={loadingHistory}
        history={history}
        handleSelectHistoryItem={handleSelectHistoryItem}
        handleDeleteHistory={handleDeleteHistory}
      />

      <AuthModal 
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        isRegister={isRegister}
        setIsRegister={setIsRegister}
        authError={authError}
        setAuthError={setAuthError}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handleAuthSubmit={handleAuthSubmit}
      />
    </div>
  );
}

export default App;