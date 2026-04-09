import { useState } from 'react';
import api from '../lib/api';

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'summarize'
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Hello! I am your Academic AI Assistant. Ask me a question or provide a document to chat with.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [storeId, setStoreId] = useState(null);
  
  // Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Summarize State
  const [summaryInput, setSummaryInput] = useState('');
  const [summaryResult, setSummaryResult] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Search Papers State
  const [searchQuery, setSearchQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingPaperUrl, setLoadingPaperUrl] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file.name);
    setUploadLoading(true);
    
    const formData = new FormData();
    formData.append('document', file);
    const newStoreId = 'doc_' + Date.now();
    formData.append('storeId', newStoreId);

    try {
      await api.post('/ai/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStoreId(newStoreId);
      setChatHistory(prev => [...prev, { role: 'ai', text: `Document "${file.name}" processed! Ask me questions about it.` }]);
    } catch (error) {
      console.error(error);
      alert('Failed to upload document.');
      setUploadedFile(null);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const currInput = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: currInput }]);
    setChatLoading(true);

    try {
      const response = await api.post('/ai/chat', { 
        question: currInput,
        storeId: storeId || 'default' 
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: response.data.answer }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'error', text: 'Failed to process chat. Check backend connection.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!summaryInput.trim()) return;
    
    setSummaryLoading(true);
    setSummaryResult('');

    try {
      const response = await api.post('/ai/summarize', { text: summaryInput });
      setSummaryResult(response.data.summary);
    } catch (error) {
      console.error(error);
      setSummaryResult('Error: Failed to fetch summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSearchPapers = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const response = await api.get(`/ai/search-papers?query=${encodeURIComponent(searchQuery)}`);
      setPapers(response.data.papers || []);
    } catch (error) {
      console.error(error);
      alert('Failed to search papers');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddPaperToContext = async (paper) => {
    if (!paper.openAccessPdf?.url) {
      alert("This paper doesn't have an open access PDF available.");
      return;
    }
    
    setLoadingPaperUrl(paper.paperId || paper.url);
    const newStoreId = 'doc_' + Date.now();

    try {
      await api.post('/ai/upload-url', { 
        pdfUrl: paper.openAccessPdf.url,
        storeId: newStoreId
      });
      setStoreId(newStoreId);
      setUploadedFile(paper.title);
      setChatHistory(prev => [...prev, { role: 'ai', text: `Paper "${paper.title}" processed! Ask me questions about it.` }]);
    } catch (error) {
      console.error(error);
      alert('Failed to process the paper PDF. It might be protected.');
    } finally {
      setLoadingPaperUrl(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6 w-full max-w-full">
      <div className="border-b border-slate-100 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
          <span>🤖</span>
          <span>Academic AI Research Assistant</span>
        </h3>
        <div className="flex bg-white rounded-md p-1 shadow-sm border border-indigo-100 items-center justify-between">
          <button 
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'chat' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'summarize' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('summarize')}
          >
            Summarize
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row h-[75vh] min-h-[600px] border-b border-slate-50 w-full max-w-full">
        {/* LEFT PANEL: Chat / Summarize */}
        <div className="flex-1 border-b xl:border-b-0 xl:border-r border-slate-200 bg-slate-50 p-4 flex flex-col min-w-0">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              {/* File Upload Banner */}
              <div className="mb-4 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-700 truncate pr-4">
                  <span className="text-lg">📄</span>
                  <span className="truncate">Context: <span className="font-medium text-indigo-700">{uploadedFile || 'General (No Doc)'}</span></span>
                </div>
                <div>
                  <label className="cursor-pointer whitespace-nowrap bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-md border border-indigo-200 transition-colors">
                    {uploadLoading ? 'Uploading...' : 'Upload PDF'}
                    <input type="file" accept="application/pdf" className="hidden" disabled={uploadLoading} onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto overflow-x-hidden mb-4 flex flex-col gap-3 min-h-0 w-full relative">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 text-sm break-words whitespace-pre-wrap ${
                      msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 
                      msg.role === 'error' ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none' : 
                      'bg-slate-100 text-slate-800 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 rounded-lg rounded-bl-none p-3 text-sm animate-pulse">
                      AI is thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 flex-shrink-0">
                <input 
                  type="text"
                  placeholder="Ask about your academic topic..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                />
                <button 
                  onClick={handleChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  title="Send"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab === 'summarize' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex flex-col gap-2 h-1/2">
                  <label className="text-sm font-semibold text-slate-700 pl-1">Source Text</label>
                  <textarea 
                    className="w-full h-full p-3 bg-white border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Paste your academic findings or article here to generate a summary..."
                    value={summaryInput}
                    onChange={(e) => setSummaryInput(e.target.value)}
                  />
                </div>
                <div className="flex justify-end flex-shrink-0">
                  <button 
                    onClick={handleSummarize}
                    disabled={summaryLoading || !summaryInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 flex gap-2 items-center rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {summaryLoading && <span className="animate-spin text-sm">↻</span>}
                    Generate Summary
                  </button>
                </div>
                <div className="flex flex-col gap-2 h-1/2">
                  <label className="text-sm font-semibold text-slate-700 pl-1">Summary Result</label>
                  <div className="w-full h-full p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm text-slate-800 overflow-y-auto">
                    {summaryLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-purple-200 rounded w-full border-b border-purple-200"></div>
                        <div className="h-3 bg-purple-200 rounded w-5/6"></div>
                        <div className="h-3 bg-purple-200 rounded w-4/6"></div>
                      </div>
                    ) : summaryResult ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{summaryResult}</p>
                    ) : (
                      <p className="text-slate-400 italic">Your summary will appear here...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Search Papers */}
        <div className="w-full xl:w-[40%] xl:max-w-[40%] bg-white p-4 flex flex-col border-t xl:border-t-0 border-slate-200 min-w-0">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <span className="text-xl">📚</span>
            <h4 className="font-bold text-slate-800">Research Papers</h4>
          </div>
          
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <input 
              type="text"
              placeholder="Topic (e.g. Transformers)"
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchPapers()}
            />
            <button 
              onClick={handleSearchPapers}
              disabled={searchLoading || !searchQuery.trim()}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {searchLoading ? '...' : 'Search'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {papers.length === 0 && !searchLoading && !hasSearched && (
              <div className="text-center text-slate-400 text-sm mt-10">
                Search for a topic to find academic papers via OpenAlex.
              </div>
            )}

            {papers.length === 0 && !searchLoading && hasSearched && (
              <div className="text-center text-slate-500 font-medium text-sm mt-10">
                No results found. Try adjusting your keywords!
              </div>
            )}
            
            {searchLoading && (
               <div className="text-center text-indigo-500 text-sm mt-10 animate-pulse">
                Searching academic databases...
              </div>
            )}

            {papers.map((paper, idx) => (
              <div key={paper.paperId || idx} className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <h5 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2" title={paper.title}>
                  {paper.title}
                </h5>
                <p className="text-xs text-slate-500 mb-2 truncate">
                  {paper.authors?.map(a => a.name).join(', ') || 'Unknown Authors'} • {paper.year || 'Unknown Year'}
                </p>
                {paper.abstract && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">
                    {paper.abstract}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <a 
                    href={paper.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View Source
                  </a>
                  {paper.openAccessPdf?.url ? (
                    <button 
                      onClick={() => handleAddPaperToContext(paper)}
                      disabled={loadingPaperUrl === (paper.paperId || paper.url)}
                      className="ml-auto flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-60"
                    >
                      {loadingPaperUrl === (paper.paperId || paper.url) ? (
                        <>↻ Processing...</>
                      ) : (
                        <>+ Add to Chat</>
                      )}
                    </button>
                  ) : (
                     <span className="ml-auto text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded">
                        No PDF Info
                     </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
