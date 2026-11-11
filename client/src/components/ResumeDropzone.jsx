import { useState, useRef } from 'react';

function ResumeDropzone({
  resume,
  setResume,
  uploading,
  parseResumeFile
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      parseResumeFile(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      parseResumeFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors relative"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">1. Your Resume</label>
        
        {/* Document Upload Button */}
        <div className="relative">
          <input 
            type="file" 
            accept=".pdf,.docx" 
            onChange={handleChange}
            ref={fileInputRef}
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="text-xs flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition font-semibold"
          >
            {uploading ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Parsing...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Upload Resume
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea 
          className={`w-full h-48 p-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none text-gray-800 dark:text-gray-200 placeholder-gray-400
            ${dragActive ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500' : ''}
          `}
          placeholder="Paste text or drag & drop PDF/DOCX here..."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />

        {/* Drag Over Active Overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-indigo-50/90 dark:bg-gray-800/90 border-2 border-dashed border-indigo-500 dark:border-indigo-400 rounded-lg flex flex-col items-center justify-center gap-2 pointer-events-none z-10 transition-all duration-200">
            <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Drop PDF or DOCX Resume here</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">Documents will be parsed automatically</p>
          </div>
        )}

        {/* Custom Upload/Parse Indicator */}
        {uploading && (
          <div className="absolute inset-0 bg-gray-50/70 dark:bg-gray-900/70 rounded-lg flex flex-col items-center justify-center gap-2 z-10">
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Extracting document text...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeDropzone;
