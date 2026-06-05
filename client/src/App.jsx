import { useState, useEffect } from 'react';
import axios from 'axios';
import AuthModal from './components/AuthModal';
import ResumeDropzone from './components/ResumeDropzone';
import JobTextArea from './components/JobTextArea';
import ResultDisplay from './components/ResultDisplay';
import LandingPage from './components/LandingPage';

const API_URL = import.meta.env.VITE_API_URL || ""; 

function App() {
  // Navigation & Views
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'scanner', 'team', 'apikeys'

  // Scanner States
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState("Checking...");
  
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [userName, setUserName] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Multi-Tenant Workspaces / Organizations
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [orgNameInput, setOrgNameInput] = useState('');
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // Team Members
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');

  // Developer API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [apiKeyName, setApiKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);

  // History / Scan Logs State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Premium / Billing States
  const [isPremium, setIsPremium] = useState(false);

  // Theme Mode
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

  // Server health check
  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then(res => setServerStatus(res.data.status === "alive" ? "Online" : "Offline"))
      .catch(() => setServerStatus("Offline"));
  }, []);

  // Fetch organizations & basic user profile details on login
  useEffect(() => {
    if (!token) {
      setIsPremium(false);
      setOrgs([]);
      setActiveOrg(null);
      setHistory([]);
      return;
    }

    const loadUserProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsPremium(response.data.data.is_premium || false);
        setUserName(response.data.data.name || '');
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    const loadOrganizations = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/orgs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const fetchedOrgs = response.data.data || [];
        setOrgs(fetchedOrgs);
        if (fetchedOrgs.length > 0) {
          // Default to the first organization workspace
          setActiveOrg(fetchedOrgs[0]);
        }
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
      }
    };

    loadUserProfile();
    loadOrganizations();
    fetchHistory();
  }, [token]);

  // Fetch team members when active organization workspace changes or Team tab becomes active
  useEffect(() => {
    if (!token || !activeOrg || activeTab !== 'team') return;

    const fetchOrgMembers = async () => {
      setLoadingMembers(true);
      try {
        const response = await axios.get(`${API_URL}/api/orgs/${activeOrg.id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMembers(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchOrgMembers();
  }, [token, activeOrg, activeTab]);

  // Fetch API keys when Developers tab is active
  useEffect(() => {
    if (!token || activeTab !== 'apikeys') return;

    const fetchKeys = async () => {
      setLoadingKeys(true);
      try {
        const response = await axios.get(`${API_URL}/api/apikeys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setApiKeys(response.data.data || []);
      } catch (error) {
        console.error("Failed to load developer keys:", error);
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchKeys();
  }, [token, activeTab]);

  // Sync isPremium if workspace subscription changes
  useEffect(() => {
    if (activeOrg) {
      setIsPremium(activeOrg.plan === 'PRO' || activeOrg.plan === 'TEAM');
    }
  }, [activeOrg]);

  // Check URL billing success redirection parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const upgradeStatus = urlParams.get('upgrade');
    if (upgradeStatus === 'success') {
      alert("Upgrade completed successfully! Your active workspace subscription has been upgraded to Premium.");
      window.history.replaceState({}, document.title, window.location.pathname);
      // reload organization lists
      if (token) {
        axios.get(`${API_URL}/api/orgs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(response => {
          const list = response.data.data || [];
          setOrgs(list);
          if (activeOrg) {
            const updated = list.find(o => o.id === activeOrg.id);
            if (updated) setActiveOrg(updated);
          }
        });
      }
    } else if (upgradeStatus === 'mock') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  // Scan History list
  const fetchHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpgrade = async () => {
    if (!token) {
      setAuthModalOpen(true);
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
            alert("Congratulations! Your active workspace organization has been upgraded to Premium.");
            // Refresh org lists
            const responseOrgs = await axios.get(`${API_URL}/api/orgs`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const fetched = responseOrgs.data.data || [];
            setOrgs(fetched);
            if (activeOrg) {
              const updated = fetched.find(o => o.id === activeOrg.id);
              if (updated) setActiveOrg(updated);
            }
          }
        }
      }
    } catch (err) {
      console.error("Upgrade checkout error:", err);
      alert("Failed to initiate billing session.");
    }
  };

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
        fetchHistory(); // Refresh metrics log
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

  // Create workspace Organization
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgNameInput.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/api/orgs`, {
        name: orgNameInput.strip ? orgNameInput.strip() : orgNameInput.trim()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newOrg = response.data.data;
      setOrgs(prev => [...prev, newOrg]);
      setActiveOrg(newOrg);
      setOrgNameInput('');
      setShowCreateOrg(false);
      alert("Workspace organization created successfully!");
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert(error.response?.data?.detail || "Creation failed.");
    }
  };

  // Invite member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrg) return;
    try {
      const response = await axios.post(`${API_URL}/api/orgs/${activeOrg.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setInviteEmail('');
      alert(response.data.message);
      // Reload member listing
      const res = await axios.get(`${API_URL}/api/orgs/${activeOrg.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMembers(res.data.data || []);
    } catch (error) {
      console.error("Invitation failed:", error);
      alert(error.response?.data?.detail || "Invitation failed.");
    }
  };

  // Remove member
  const handleRemoveMember = async (membershipId) => {
    if (!window.confirm("Are you sure you want to remove this member from the organization?")) return;
    try {
      await axios.delete(`${API_URL}/api/orgs/${activeOrg.id}/members/${membershipId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMembers(prev => prev.filter(m => m.id !== membershipId));
      alert("Member removed successfully.");
    } catch (error) {
      console.error("Remove failed:", error);
      alert(error.response?.data?.detail || "Failed to remove member.");
    }
  };

  // Generate API Key
  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!apiKeyName.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/api/apikeys`, {
        name: apiKeyName.trim()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newKey = response.data.data;
      setApiKeys(prev => [...prev, newKey]);
      setRevealedKey(newKey.raw_key);
      setApiKeyName('');
    } catch (error) {
      console.error("Failed to generate key:", error);
      alert(error.response?.data?.detail || "Generation failed.");
    }
  };

  // Revoke API Key
  const handleRevokeKey = async (keyId) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Any applications currently using it will fail to connect.")) return;
    try {
      await axios.delete(`${API_URL}/api/apikeys/${keyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      alert("API key successfully revoked.");
    } catch (error) {
      console.error("Revoke failed:", error);
      alert("Failed to revoke key.");
    }
  };

  const handleSelectHistoryItem = (item) => {
    setResume(item.resume_text);
    setJob(item.job_description);
    setResult({
      id: item.id,
      score: item.score,
      missing: JSON.parse(item.missing_keywords || "[]"),
      breakdown: {
        lexical: item.lexical_score,
        semantic: item.semantic_score
      },
      structure: JSON.parse(item.resume_structure || "{}")
    });
    setActiveTab('scanner');
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan from history?")) return;
    try {
      await axios.delete(`${API_URL}/api/history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(item => item.id !== id));
      if (result && result.id === id) {
        setResult(null);
      }
    } catch (error) {
      console.error("Failed to delete history item:", error);
      alert("Failed to delete item.");
    }
  };

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
      setAuthError(error.response?.data?.detail || "Authentication failed. Try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken('');
    setUserEmail('');
    setIsPremium(false);
    setHistory([]);
    setOrgs([]);
    setActiveOrg(null);
    setActiveTab('dashboard');
  };

  // Quota Calculations
  const scanLimit = isPremium ? 1000 : 10;
  const currentScans = history.length;
  const percentageQuota = Math.min((currentScans / scanLimit) * 100, 100);
  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length) 
    : 0;

  if (!token) {
    return (
      <>
        <LandingPage 
          onGetStarted={() => {
            setIsRegister(true);
            setAuthError('');
            setAuthModalOpen(true);
          }}
          onLogin={() => {
            setIsRegister(false);
            setAuthError('');
            setAuthModalOpen(true);
          }}
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
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">
      
      {/* 1. SIDEBAR SHELL */}
      <aside className="w-72 bg-white dark:bg-[#111827] border-r border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between shrink-0 shadow-sm">
        <div className="space-y-8">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/20">
              RM
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                ResuMatch <span className="text-indigo-600 dark:text-indigo-400 font-medium">SaaS</span>
              </h1>
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                API: {serverStatus}
              </span>
            </div>
          </div>

          {/* Org Selector Workspace */}
          {token && (
            <div className="bg-gray-50 dark:bg-[#1F2937]/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Active Workspace</label>
              
              {showCreateOrg ? (
                <form onSubmit={handleCreateOrg} className="space-y-2 mt-1">
                  <input
                    type="text"
                    placeholder="Workspace Name"
                    value={orgNameInput}
                    onChange={(e) => setOrgNameInput(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateOrg(false)}
                      className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-1 mt-1">
                  <select 
                    value={activeOrg?.id || ''} 
                    onChange={(e) => {
                      const selected = orgs.find(o => o.id === e.target.value);
                      if (selected) setActiveOrg(selected);
                    }}
                    className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-700 dark:text-gray-200 max-w-[150px] truncate"
                  >
                    {orgs.map(org => (
                      <option key={org.id} value={org.id} className="dark:bg-[#111827]">
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setShowCreateOrg(true)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + New
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Nav List */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                ${activeTab === 'dashboard' 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path></svg>
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('scanner')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                ${activeTab === 'scanner' 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              ATS Match Scanner
            </button>
            <button 
              onClick={() => {
                if (!token) { setAuthModalOpen(true); return; }
                setActiveTab('team');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                ${activeTab === 'team' 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Team Management
            </button>
            <button 
              onClick={() => {
                if (!token) { setAuthModalOpen(true); return; }
                setActiveTab('apikeys');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                ${activeTab === 'apikeys' 
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              Developer API
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Details */}
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
          
          {/* Active Quota progress */}
          {token && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                <span>Usage Limit</span>
                <span>{currentScans} / {scanLimit} Scans</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all" 
                  style={{ width: `${percentageQuota}%` }}
                ></div>
              </div>
              {!isPremium && (
                <button 
                  onClick={handleUpgrade}
                  className="w-full text-center text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 transition"
                >
                  ⚡ Upgrade to PRO
                </button>
              )}
            </div>
          )}

          {/* User Account / Login */}
          <div className="flex items-center justify-between gap-2">
            {token ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {userName || userEmail.split('@')[0]}
                  </p>
                  <button 
                    onClick={handleLogout}
                    className="text-[10px] font-semibold text-gray-400 hover:text-red-500"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setIsRegister(false);
                  setAuthError('');
                  setAuthModalOpen(true);
                }}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
              >
                Sign In / Register
              </button>
            )}

            {/* Dark mode */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition shrink-0"
              title="Toggle Dark Mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-10">
        
        {/* --- VIEW: DASHBOARD (OVERVIEW) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header banner */}
            <div>
              <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                Workspace Dashboard
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Overview of current ATS scans and account usage.
              </p>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Total Scans */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Total Scans Run</span>
                  <p className="text-3xl font-black text-gray-950 dark:text-white">{currentScans}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-xl">
                  📊
                </div>
              </div>

              {/* Card 2: Average Match Score */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Average ATS Score</span>
                  <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{avgScore}%</p>
                </div>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center font-bold text-xl">
                  🎯
                </div>
              </div>

              {/* Card 3: Subscription Tier */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Plan Subscription</span>
                  <p className="text-2xl font-black text-amber-500 uppercase tracking-tight flex items-center gap-1.5">
                    {isPremium ? "💎 PRO TIER" : "🎁 FREE TIER"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center font-bold text-xl">
                  👑
                </div>
              </div>

            </div>

            {/* Recent activity listing */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Recent Scan Logs
              </h3>

              {!token ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  Please sign in to view past scan logs.
                </div>
              ) : loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 space-y-2">
                  <p>No scans performed yet in this workspace.</p>
                  <button 
                    onClick={() => setActiveTab('scanner')}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Perform your first scan
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase text-[10px] font-bold">
                        <th className="pb-3 font-semibold">Match Score</th>
                        <th className="pb-3 font-semibold">Keywords Fit</th>
                        <th className="pb-3 font-semibold">Semantic Fit</th>
                        <th className="pb-3 font-semibold">Scan Date</th>
                        <th className="pb-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 5).map((item) => (
                        <tr 
                          key={item.id} 
                          className="border-b border-gray-50 dark:border-gray-800/40 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 cursor-pointer transition"
                          onClick={() => handleSelectHistoryItem(item)}
                        >
                          <td className="py-4">
                            <span className={`font-black text-sm px-2.5 py-1 rounded-lg
                              ${item.score >= 70 
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                                : item.score >= 40 
                                ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400' 
                                : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'}
                            `}>
                              {item.score}%
                            </span>
                          </td>
                          <td className="py-4 text-gray-500 dark:text-gray-400 font-mono">
                            {item.lexical_score}%
                          </td>
                          <td className="py-4 text-gray-500 dark:text-gray-400 font-mono">
                            {item.semantic_score}%
                          </td>
                          <td className="py-4 text-gray-400 font-medium">
                            {new Date(item.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                          </td>
                          <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleSelectHistoryItem(item)}
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 transition"
                              >
                                View
                              </button>
                              <button 
                                onClick={(e) => handleDeleteHistory(item.id, e)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                                title="Delete Scan"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length > 5 && (
                    <div className="text-center pt-4">
                      <p className="text-[11px] text-gray-400">
                        Showing recent 5 scans. Access remaining history items directly via scanner sidebar logs.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- VIEW: SCANNER --- */}
        {activeTab === 'scanner' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                  ATS Match Engine
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Upload resume files (PDF, DOCX) and paste a target job description to match compatibility.
                </p>
              </div>
              {history.length > 0 && (
                <div className="bg-white dark:bg-[#111827] px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  <span>📜 History contains {history.length} scans</span>
                </div>
              )}
            </div>

            {/* Split UI panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
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
                    ${loading ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/10 dark:bg-indigo-600 dark:hover:bg-indigo-500'}
                  `}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Comparing keywords & semantics...
                    </span>
                  ) : "Analyze Compatibility"}
                </button>

                {/* Scan History quick picker list */}
                {token && history.length > 0 && (
                  <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                    <h4 className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">
                      Load Scan From History
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {history.map((hItem) => (
                        <div 
                          key={hItem.id}
                          onClick={() => handleSelectHistoryItem(hItem)}
                          className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-[#1F2937]/30 dark:hover:bg-[#1F2937]/75 border border-gray-100 dark:border-gray-800 text-xs flex items-center justify-between cursor-pointer transition"
                        >
                          <span className="truncate pr-4 text-gray-600 dark:text-gray-300 font-medium">
                            Resume: {hItem.resume_text.substring(0, 30)}...
                          </span>
                          <span className={`font-black shrink-0 ${hItem.score >= 70 ? 'text-green-500' : hItem.score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {hItem.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Results display canvas */}
              <div>
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
        )}

        {/* --- VIEW: TEAM MANAGEMENT --- */}
        {activeTab === 'team' && (
          <div className="space-y-8 animate-fade-in">
            
            <div>
              <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                Team Workspace Members
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Manage organization access, roles, and invite coworkers.
              </p>
            </div>

            {/* Invite Form & Listing Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Left Form: Invite Member */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Invite Member
                </h3>
                <form onSubmit={handleInviteMember} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="coworker@company.com" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full mt-1 p-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Organization Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full mt-1 p-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-gray-700 dark:text-gray-200"
                    >
                      <option value="ADMIN">ADMIN (Invite/Remove members)</option>
                      <option value="RECRUITER">RECRUITER (Run and delete scans)</option>
                      <option value="VIEWER">VIEWER (View reports only)</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                  >
                    Send Invitation
                  </button>
                </form>
              </div>

              {/* Right Panel: Member Roster List */}
              <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-4">
                  Organization Roster ({activeOrg?.name})
                </h3>

                {loadingMembers ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No members logged. Try checking connection logs.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase text-[10px] font-bold">
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Workspace Role</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800/40">
                            <td className="py-4 font-bold text-gray-900 dark:text-white">
                              {m.name}
                            </td>
                            <td className="py-4 text-gray-500 dark:text-gray-400">
                              {m.email}
                            </td>
                            <td className="py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                                ${m.role === 'OWNER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' : m.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}
                              `}>
                                {m.role}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              {m.role !== 'OWNER' && m.user_id !== token && (
                                <button 
                                  onClick={() => handleRemoveMember(m.id)}
                                  className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- VIEW: DEVELOPER API CONFIG --- */}
        {activeTab === 'apikeys' && (
          <div className="space-y-8 animate-fade-in">
            
            <div>
              <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                Developer API Access
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Integrate ResuMatch semantic scoring algorithms directly into your custom platform pipelines.
              </p>
            </div>

            {/* Split layout: Generate key + list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Form: Generate Key */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Generate API Key
                </h3>
                <form onSubmit={handleGenerateKey} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Key Label Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Production Recruitment Pipeline" 
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      className="w-full mt-1 p-2.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition animate-fade-in"
                  >
                    Generate Credentials
                  </button>
                </form>

                {/* Secret Key disclosure alert */}
                {revealedKey && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                      ⚠️ Save key token safely (Shown only once)
                    </p>
                    <div className="bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-800 font-mono text-[10px] break-all select-all text-gray-800 dark:text-gray-200">
                      {revealedKey}
                    </div>
                    <button 
                      onClick={() => setRevealedKey(null)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline block text-right w-full"
                    >
                      I have saved this key
                    </button>
                  </div>
                )}
              </div>

              {/* Panel: Active Keys list */}
              <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-4">
                  Active Developer Keys
                </h3>

                {loadingKeys ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No API keys active. Generate one above to connect external services.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 uppercase text-[10px] font-bold">
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Token Prefix</th>
                          <th className="pb-3">Hourly Rate Limit</th>
                          <th className="pb-3">Created Date</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((k) => (
                          <tr key={k.id} className="border-b border-gray-50 dark:border-gray-800/40">
                            <td className="py-4 font-bold text-gray-900 dark:text-white">
                              {k.name}
                            </td>
                            <td className="py-4 font-mono text-gray-500 dark:text-gray-400">
                              {k.prefix}...
                            </td>
                            <td className="py-4 text-gray-500 dark:text-gray-400">
                              {k.rate_limit || 100} req/hr
                            </td>
                            <td className="py-4 text-gray-400 font-medium">
                              {new Date(k.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => handleRevokeKey(k.id)}
                                className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Auth credentials modal */}
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