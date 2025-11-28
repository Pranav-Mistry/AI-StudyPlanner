import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { summarizeNotes } from '../api/services';
import toast from 'react-hot-toast';
import { FileText, Sparkles, Copy, Loader2, ArrowLeft } from 'lucide-react';

const NoteSummarizer = ({ user }) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to summarize');
      return;
    }

    setLoading(true);

    try {
      const response = await summarizeNotes(inputText);
      if (response.success) {
        setSummary(response.summary);
        toast.success('Summary generated successfully!');
      } else {
        toast.error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard!');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center space-x-2 text-white hover:text-indigo-200 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">📝 Smart Notes Summarizer</h1>
          <p className="text-indigo-100 text-lg">
            Transform long notes into concise summaries using AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="animate-slide-up">
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                Your Notes
              </h2>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input-field min-h-[400px] font-mono text-sm"
                placeholder="Paste your notes here... (lectures, textbook chapters, study material, etc.)"
              />

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{inputText.length} characters</span>
                <span>{inputText.split(/\s+/).filter(w => w).length} words</span>
              </div>

              <button
                onClick={handleSummarize}
                disabled={loading || !inputText.trim()}
                className="w-full btn-primary mt-4 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Summarizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Summary</span>
                  </>
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
                {summary && (
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                )}
              </div>

              {!summary ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Your AI-generated summary will appear here
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg min-h-[400px]">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Tips Section */}
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
