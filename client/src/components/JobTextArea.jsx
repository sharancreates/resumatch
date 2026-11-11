import React from 'react';

function JobTextArea({ job, setJob }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">2. Job Description</label>
      <textarea 
        className="w-full h-48 p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
        placeholder="Paste the job description here..."
        value={job}
        onChange={(e) => setJob(e.target.value)}
      />
    </div>
  );
}

export default JobTextArea;
