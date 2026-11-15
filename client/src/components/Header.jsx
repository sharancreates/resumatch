import React from 'react';

function Header({
  serverStatus,
  token,
  userEmail,
  historyLength,
  setDrawerOpen,
  handleLogout,
  setAuthModalOpen,
  setIsRegister,
  setAuthError,
  darkMode,
  setDarkMode,
  isPremium,
  handleUpgrade,
  onOpenPricing,
  onOpenReferral
}) {
  const triggerPricing = onOpenPricing || handleUpgrade;

  return (
    <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-white/[0.06]">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
          ResuMatch <span className="text-blue-400 dark:text-blue-300">AI</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          The AI Resume Copilot Built for Freshers & Students
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Server Status Badge */}
        <div className={`text-xs font-mono px-3 py-1 rounded-full border hidden sm:block
          ${serverStatus.includes("Online") 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40" 
            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40"
          }`}>
          Server: {serverStatus}
        </div>

        {/* Viral Referral Badge */}
        {token && onOpenReferral && (
          <button
            onClick={onOpenReferral}
            className="text-xs hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-bold"
          >
            <span>🎁</span> Free Days
          </button>
        )}

        {/* Student Pass Upgrade Actions */}
        {token && (
          isPremium ? (
            <button
              onClick={triggerPricing}
              className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-sm select-none flex items-center gap-1 hover:brightness-105 transition"
            >
              🎓 Student Pass Active
            </button>
          ) : (
            <button 
              onClick={triggerPricing}
              className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-full shadow hover:from-blue-500 hover:to-sky-500 transition transform hover:scale-105 flex items-center gap-1"
            >
              ⚡ Student Pass (₹199)
            </button>
          )
        )}

        {/* Auth Buttons */}
        {token ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDrawerOpen(true)}
              className="text-xs flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition font-semibold"
            >
              📜 History ({historyLength})
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block font-mono">
              {userEmail}
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              setIsRegister(false);
              setAuthError('');
              setAuthModalOpen(true);
            }}
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-semibold shadow"
          >
            Sign In
          </button>
        )}

        {/* DARK MODE TOGGLE BUTTON */}
        <button 
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="min-w-[44px] min-h-[44px] rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition flex items-center justify-center"
          title="Toggle Dark Mode"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

export default Header;
