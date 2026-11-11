import React from 'react';

function AuthModal({
  authModalOpen,
  setAuthModalOpen,
  isRegister,
  setIsRegister,
  authError,
  setAuthError,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  handleAuthSubmit
}) {
  if (!authModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setAuthModalOpen(false)}
      ></div>

      {/* Modal Box */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 z-10 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg font-medium">
            ⚠️ {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-800 dark:text-gray-200 placeholder-gray-400"
              placeholder="candidate@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-800 dark:text-gray-200 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition"
          >
            {isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError('');
            }}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
