import React from 'react';

function HistoryDrawer({
  drawerOpen,
  setDrawerOpen,
  loadingHistory,
  history,
  handleSelectHistoryItem,
  handleDeleteHistory
}) {
  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setDrawerOpen(false)}
      ></div>
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl p-6 flex flex-col z-10 transition-transform duration-300">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            📜 Match History
          </h2>
          <button 
            onClick={() => setDrawerOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center">
            <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            <p className="font-semibold text-sm">No scans in history</p>
            <p className="text-xs text-gray-400 mt-1">Logged-in scans appear here automatically.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  handleSelectHistoryItem(item);
                  setDrawerOpen(false);
                }}
                className="p-4 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer transition flex justify-between items-center group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold 
                      ${item.score >= 70 ? 'text-green-500' : item.score >= 40 ? 'text-yellow-500' : 'text-red-500'}
                    `}>
                      {item.score}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(item.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    Resume: {item.resume_text.substring(0, 50)}...
                  </p>
                </div>
                <button 
                  onClick={(e) => handleDeleteHistory(item.id, e)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-2"
                  title="Delete History Item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryDrawer;
