import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import axios from '../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Zap, ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle, RefreshCw, Loader2, Upload, X, FileText, Clock, Download
} from 'lucide-react';
import { saveToHistory, getHistory } from '../utils/historyUtils';
import { exportFlashcardsPDF } from '../utils/exportPDF';
import HistoryPanel from '../components/HistoryPanel';

const FEATURE = 'flashcards';

const Flashcards = ({ user }) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [numCards, setNumCards] = useState(8);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [review, setReview] = useState(new Set());
  const [phase, setPhase] = useState('input');
  const [file, setFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
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

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') { toast.error('Only PDF files are supported'); return; }
    setFile(selected);
    setInputText('');
    toast.success('PDF selected!');
  };

  const removeFile = () => { setFile(null); };

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!file && (!inputText.trim() || inputText.trim().length < 30)) {
      toast.error('Please upload a PDF or enter at least 30 characters');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('num_cards', numCards);
        res = await axios.post('/api/flashcards/generate', formData);
      } else {
        res = await axios.post('/api/flashcards/generate', { text: inputText, num_cards: numCards });
      }
      const data = res.data;
      if (data.success && data.flashcards?.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentIndex(0);
        setFlipped(false);
        setKnown(new Set());
        setReview(new Set());
        setPhase('study');
        // Save to history
        const title = file?.name || (inputText.slice(0, 50) || 'Flashcards');
        setTopicTitle(title);
        await saveToHistory(FEATURE, user?.uid, title, { flashcards: data.flashcards, title });
        await refreshHistory();
        toast.success(`${data.flashcards.length} flashcards generated!`);
      } else {
        toast.error(data.error || 'Failed to generate flashcards');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  // ── Study controls ─────────────────────────────────────────────────────────
  const handleFlip = () => setFlipped(f => !f);

  const handleNav = (dir) => {
    setFlipped(false);
    setCurrentIndex(i => Math.max(0, Math.min(flashcards.length - 1, i + dir)));
  };

  const markKnown = () => {
    setKnown(k => new Set([...k, currentIndex]));
    setReview(r => { const s = new Set(r); s.delete(currentIndex); return s; });
    if (currentIndex < flashcards.length - 1) { setFlipped(false); setCurrentIndex(i => i + 1); }
  };

  const markReview = () => {
    setReview(r => new Set([...r, currentIndex]));
    setKnown(k => { const s = new Set(k); s.delete(currentIndex); return s; });
    if (currentIndex < flashcards.length - 1) { setFlipped(false); setCurrentIndex(i => i + 1); }
  };

  const resetStudy = () => { setCurrentIndex(0); setFlipped(false); setKnown(new Set()); setReview(new Set()); };

  const card = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  return (
    <div className="min-h-screen py-8 px-4">
      {showHistory && (
        <HistoryPanel
          feature={FEATURE}
          userId={user?.uid}
          items={historyItems}
          onRestore={(data) => {
            setFlashcards(data.flashcards || []);
            setTopicTitle(data.title || 'Flashcards');
            setCurrentIndex(0); setFlipped(false);
            setKnown(new Set()); setReview(new Set());
            setPhase('study');
          }}
          onRefresh={refreshHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 animate-fade-in flex items-start justify-between">
          <div>
            <button onClick={() => navigate('/dashboard')} className="mb-3 flex items-center space-x-2 text-white hover:text-indigo-200 transition-all">
              <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back to Dashboard</span>
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">🃏 Flashcard Generator</h1>
            <p className="text-white/80 text-lg">Turn your notes or PDFs into interactive study flashcards</p>
          </div>
          <button
            onClick={() => { setShowHistory(true); refreshHistory(); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition-all border border-white/30 flex-shrink-0"
          >
            <Clock className="w-4 h-4" /><span>History</span>
            {historyItems.length > 0 && (
              <span className="bg-white/30 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{historyItems.length}</span>
            )}
          </button>
        </div>

        {phase === 'input' ? (
          // ── INPUT PHASE ──────────────────────────────────────────────────────
          <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Paste Text or Upload PDF</h2>

            {/* PDF Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF (Optional)</label>
              {file ? (
                <div className="border border-indigo-300 bg-indigo-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                  </div>
                  <button onClick={removeFile} className="p-1 hover:bg-indigo-200 rounded transition-colors" title="Remove">
                    <X className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-all cursor-pointer">
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="fc-pdf-upload" />
                  <label htmlFor="fc-pdf-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Click to upload PDF or drag and drop</p>
                    <p className="text-gray-400 text-xs mt-1">PDF up to 10MB</p>
                  </label>
                </div>
              )}
            </div>

            <div className="text-center text-gray-400 text-sm my-3 flex items-center">
              <div className="flex-1 h-px bg-gray-200" /><span className="px-3">OR</span><div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Text Input */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste Study Material</label>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={!!file}
                className="input-field min-h-[200px] font-mono text-sm w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={file ? "PDF uploaded — click Generate Flashcards" : "Paste your notes, textbook chapter, or study material here..."}
              />
              {!file && (
                <p className="text-xs text-gray-400 mt-1 text-right">{inputText.length} characters</p>
              )}
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Number of cards:</label>
                <select
                  value={numCards}
                  onChange={e => setNumCards(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[5, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n} cards</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || (!file && inputText.trim().length < 30)}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Generating flashcards...</span></>
                : <><Zap className="w-5 h-5" /><span>Generate Flashcards</span></>
              }
            </button>
          </Card>
        ) : (
          // ── STUDY PHASE ──────────────────────────────────────────────────────
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card><div className="text-center"><p className="text-2xl font-bold text-gray-800">{flashcards.length}</p><p className="text-gray-500 font-medium text-sm">Total Cards</p></div></Card>
              <Card><div className="text-center"><p className="text-2xl font-bold text-green-600">{known.size}</p><p className="text-gray-500 font-medium text-sm">Known ✓</p></div></Card>
              <Card><div className="text-center"><p className="text-2xl font-bold text-orange-500">{review.size}</p><p className="text-gray-500 font-medium text-sm">Review Again</p></div></Card>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-white text-sm mb-1">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="bg-white h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Flashcard with flip or Completion Screen */}
            {(known.size + review.size === flashcards.length && flashcards.length > 0) ? (
              <Card className="mb-4 text-center py-16">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-4xl font-black text-gray-800 mb-3">Deck Completed! 🎉</h2>
                <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                  Awesome job! You've gone through all <strong>{flashcards.length}</strong> cards. 
                  You mastered <strong className="text-green-600">{known.size}</strong> and marked <strong className="text-orange-500">{review.size}</strong> for review.
                </p>
                <div className="flex justify-center flex-wrap gap-4">
                  {review.size > 0 && (
                    <button 
                      onClick={() => {
                        setFlashcards(flashcards.filter((_, i) => review.has(i)));
                        setCurrentIndex(0); setFlipped(false); setKnown(new Set()); setReview(new Set());
                      }}
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Study {review.size} Review Card{review.size > 1 ? 's' : ''}
                    </button>
                  )}
                  <button onClick={resetStudy} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" /> Restart Deck
                  </button>
                  <button onClick={() => { setPhase('input'); setFlashcards([]); }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Create New Deck
                  </button>
                </div>
              </Card>
            ) : (
              <>
                <div className="mb-4" style={{ perspective: '1000px' }}>
                  <div
                    onClick={handleFlip}
                    className="cursor-pointer select-none"
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.5s',
                      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      minHeight: '260px',
                      position: 'relative',
                    }}
                  >
                    {/* Front */}
                    <div
                      style={{ backfaceVisibility: 'hidden', position: 'absolute', width: '100%', height: '100%' }}
                      className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center justify-center border-b-4 border-indigo-100 transition-all hover:shadow-indigo-500/10"
                    >
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">❓ Question — Click to reveal</span>
                      <p className="text-2xl font-bold text-gray-800 text-center leading-relaxed max-w-2xl">{card?.question}</p>
                      {known.has(currentIndex) && <span className="absolute bottom-6 text-green-500 text-sm font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Marked as Known</span>}
                      {review.has(currentIndex) && <span className="absolute bottom-6 text-orange-500 text-sm font-bold flex items-center gap-1"><RefreshCw className="w-4 h-4"/> Marked for Review</span>}
                    </div>
                    {/* Back */}
                    <div
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', width: '100%', height: '100%' }}
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-10 flex flex-col items-center justify-center border-b-4 border-indigo-700"
                    >
                      <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4 flex items-center gap-1"><Zap className="w-4 h-4"/> Answer</span>
                      <p className="text-xl text-white text-center leading-relaxed font-medium max-w-2xl">{card?.answer}</p>
                    </div>
                  </div>
                  {/* spacer */}
                  <div style={{ minHeight: '260px', visibility: 'hidden' }} />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <button onClick={() => handleNav(-1)} disabled={currentIndex === 0}
                    className="flex items-center space-x-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all disabled:opacity-40">
                    <ChevronLeft className="w-5 h-5" /><span>Prev</span>
                  </button>
                  <div className="flex gap-4">
                    <button onClick={markReview}
                      className="flex items-center space-x-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-lg hover:-translate-y-1">
                      <RefreshCw className="w-5 h-5" /><span>Review Again</span>
                    </button>
                    <button onClick={markKnown}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:-translate-y-1">
                      <CheckCircle className="w-5 h-5" /><span>I Know This!</span>
                    </button>
                  </div>
                  <button onClick={() => handleNav(1)} disabled={currentIndex === flashcards.length - 1}
                    className="flex items-center space-x-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all disabled:opacity-40">
                    <span>Next</span><ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}

            {/* Bottom actions */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={resetStudy} className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all">
                <RotateCcw className="w-4 h-4" /><span>Restart</span>
              </button>
              <button onClick={() => { setPhase('input'); setFlashcards([]); }}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all">
                <Zap className="w-4 h-4" /><span>New Cards</span>
              </button>
              <button
                onClick={() => { exportFlashcardsPDF(flashcards, topicTitle); toast.success('Opening print dialog...'); }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all">
                <Download className="w-4 h-4" /><span>Export PDF</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
