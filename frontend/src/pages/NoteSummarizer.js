import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { summarizeNotes } from '../api/services';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import { FileText, Sparkles, Copy, Loader2, ArrowLeft, Upload, X, Clock, Download } from 'lucide-react';
import { saveToHistory, getHistory } from '../utils/historyUtils';
import { exportSummaryPDF } from '../utils/exportPDF';
import HistoryPanel from '../components/HistoryPanel';

// Lightweight markdown → HTML converter
const parseMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[\-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul style="list-style:disc;padding-left:1.2em;margin:6px 0">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p style="margin:0">$1</p>');
};

const FEATURE = 'summarizer';

const NoteSummarizer = ({ user }) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  const refreshHistory = useCallback(async () => {
    if (user?.uid) {
      const items = await getHistory(FEATURE, user.uid);
      setHistoryItems(items);
    }
  }, [user?.uid]);

  React.useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setInputText('');
        toast.success('PDF file selected!');
      } else {
        toast.error('Please select a PDF file');
      }
    }
  };

  const handleRemoveFile = () => { setFile(null); };

  const handleSummarize = async () => {
    if (!inputText.trim() && !file) {
      toast.error('Please upload a PDF or enter some text to summarize');
      return;
    }
    setLoading(true);
    try {
      let response;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const axiosResponse = await axios.post('/api/notes/summarize', formData);
        response = axiosResponse.data;
      } else {
        response = await summarizeNotes(inputText);
      }
      if (response.success) {
        setSummary(response.summary);
        const title = (file?.name || inputText.slice(0, 60)) || 'Summary';
        await saveToHistory(FEATURE, user?.uid, title, { summary: response.summary, inputLength: inputText.length });
        await refreshHistory();
        toast.success('Summary generated successfully!');
      } else {
        toast.error(response.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard!');
  };

  const handleRestoreHistory = (data) => {
    setSummary(data.summary || '');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {/* History Panel */}
      {showHistory && (
        <HistoryPanel
          feature={FEATURE}
          userId={user?.uid}
          items={historyItems}
          onRestore={handleRestoreHistory}
          onRefresh={refreshHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Back Button + History */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-all">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <button
            onClick={() => { setShowHistory(true); refreshHistory(); }}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition-all border border-white/30"
          >
            <Clock className="w-4 h-4" /><span>History</span>
            {historyItems.length > 0 && (
              <span className="bg-white/30 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{historyItems.length}</span>
            )}
          </button>
        </div>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">📝 Smart Notes Summarizer</h1>
          <p className="text-white/80 text-lg">Transform long notes into concise summaries using AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="animate-slide-up">
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                Your Notes
              </h2>

              {/* PDF Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF (Optional)</label>
                {file ? (
                  <div className="border border-indigo-300 bg-indigo-50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <button onClick={handleRemoveFile} className="p-1 hover:bg-indigo-200 rounded transition-colors" title="Remove file">
                      <X className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-all cursor-pointer">
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Click to upload PDF or drag and drop</p>
                      <p className="text-sm text-white/80 mt-1">PDF up to 10MB</p>
                    </label>
                  </div>
                )}
              </div>

              <div className="text-center text-gray-500 my-4">OR</div>

              {/* Text Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Paste Text</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={!!file}
                  className="input-field min-h-[300px] font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder={file ? "PDF uploaded. Click 'Generate Summary' to proceed." : "Paste your notes here..."}
                />
                {!file && (
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <span>{inputText.length} characters</span>
                    <span>{inputText.split(/\s+/).filter(w => w).length} words</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSummarize}
                disabled={loading || (!inputText.trim() && !file)}
                className="w-full btn-primary mt-4 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Summarizing...</span></>
                ) : (
                  <><Sparkles className="w-5 h-5" /><span>Generate Summary</span></>
                )}
              </button>
            </Card>
          </div>

          {/* Output Section */}
          <div className="animate-slide-up">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-indigo-600" />
                  Summary
                </h2>
                <div className="flex items-center space-x-2">
                  {summary && (
                    <>
                      <button
                        onClick={() => { exportSummaryPDF(summary, inputText.length || 0); toast.success('Opening print dialog...'); }}
                        className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                        title="Export PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button onClick={handleCopy} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all" title="Copy">
                        <Copy className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!summary ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Your AI-generated summary will appear here</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg min-h-[400px]">
                  <div
                    className="text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(summary) }}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Tips */}
        <Card className="mt-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <h3 className="text-xl font-bold mb-3">💡 Tips for Better Summaries</h3>
          <ul className="space-y-2 text-blue-50">
            <li>• Paste complete paragraphs or sections for better context</li>
            <li>• Works best with educational content, lectures, and study material</li>
            <li>• Longer text (200+ words) produces more comprehensive summaries</li>
            <li>• Use summaries for quick revision before exams</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default NoteSummarizer;
