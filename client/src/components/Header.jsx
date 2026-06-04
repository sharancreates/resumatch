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
  handleUpgrade
}) {
  return (
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
        <div className={`text-xs font-mono px-3 py-1 rounded-full border hidden sm:block
          ${serverStatus.includes("Online") 
            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
            : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
          }`}>
          Server: {serverStatus}
        </div>

        {/* Premium Upgrade Actions */}
        {token && (
          isPremium ? (
            <span className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-sm select-none flex items-center gap-1 animate-pulse">
              💎 Premium
            </span>
          ) : (
            <button 
              onClick={handleUpgrade}
              className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow hover:from-amber-600 hover:to-orange-700 transition transform hover:scale-105"
            >
              ⚡ Upgrade
            </button>
          )
        )}

        {/* Auth Buttons */}
        {token ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDrawerOpen(true)}
              className="text-xs flex items-center gap-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition font-semibold"
            >
              📜 History ({historyLength})
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
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
            className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold shadow"
          >
            Sign In
          </button>
        )}

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
  );
}

export default Header;
