import React, { useEffect } from 'react';

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
  useEffect(() => {
    if (!authModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, setAuthModalOpen]);

  if (!authModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setAuthModalOpen(false)}
      ></div>

      {/* Modal Box */}
      <div 
        className="relative bg-white dark:bg-[#0D131F] rounded-2xl max-w-sm w-full shadow-2xl p-6 z-10 border border-gray-200 dark:border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="auth-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button 
            type="button"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close dialog"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs rounded-lg font-medium">
            ⚠️ {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input 
              id="auth-email-input"
              type="email" 
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full p-3 text-sm bg-gray-50 dark:bg-[#080B11] border border-gray-200 dark:border-white/[0.08] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-900 dark:text-gray-100 placeholder-gray-500"
              placeholder="candidate@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password-input" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input 
              id="auth-password-input"
              type="password" 
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-3 text-sm bg-gray-50 dark:bg-[#080B11] border border-gray-200 dark:border-white/[0.08] rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-900 dark:text-gray-100 placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-600/20 transition min-h-[44px]"
          >
            {isRegister ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.06] pt-4">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError('');
            }}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
