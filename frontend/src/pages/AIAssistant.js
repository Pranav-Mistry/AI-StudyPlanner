import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { explainConcept } from '../api/services';
import toast from 'react-hot-toast';
import {
  Bot, Send, Lightbulb, Loader2, ArrowLeft,
  Plus, Trash2, Download, MessageSquare, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { saveToHistory, getHistory, deleteFromHistory, updateHistory, formatHistoryDate } from '../utils/historyUtils';
import { exportChatPDF } from '../utils/exportPDF';

// ── Markdown renderer ──────────────────────────────────────────────────────
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

const FEATURE = 'assistant';

const SUGGESTIONS = [
  'Explain machine learning in simple terms',
  'What is photosynthesis?',
  'How does the internet work?',
  'Explain quantum computing',
  'What is Newton\'s second law?',
  'Explain the water cycle',
];

const AIAssistant = ({ user }) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);       // current chat messages
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]); // sidebar list
  const [activeConvId, setActiveConvId] = useState(null); // id of ongoing conv
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const refreshConvList = useCallback(async () => {
    if (user?.uid) {
      setConversations(await getHistory(FEATURE, user.uid));
    }
  }, [user?.uid]);

  useEffect(() => { refreshConvList(); }, [refreshConvList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Start a brand new chat ────────────────────────────────────────────────
  const startNewChat = () => {
    setMessages([]);
    setActiveConvId(null);
    setInput('');
  };

  // ── Load a past conversation ──────────────────────────────────────────────
  const loadConversation = (conv) => {
    setMessages(conv.data.messages || []);
    setActiveConvId(conv.id);
    setInput('');
  };

  // ── Delete a conversation ─────────────────────────────────────────────────
  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    await deleteFromHistory(FEATURE, user?.uid, id);
    if (activeConvId === id) startNewChat();
    await refreshConvList();
    toast.success('Conversation deleted');
  };

  // ── Send a message ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) { toast.error('Please enter a question'); return; }

    setLoading(true);
    const userMsg = { type: 'user', content: trimmed, timestamp: new Date().toLocaleTimeString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await explainConcept(trimmed);
      if (response?.success) {
        const explanation = (response.explanation || response.message || '').trim();
        if (!explanation) throw new Error('Empty response');

        const aiMsg = { type: 'ai', content: explanation, timestamp: new Date().toLocaleTimeString() };
        const finalMsgs = [...newMessages, aiMsg];
        setMessages(finalMsgs);

        const convData = { messages: finalMsgs };

        if (activeConvId) {
          // ── UPDATE existing conversation ──────────────────────────────────
          await updateHistory(FEATURE, user?.uid, activeConvId, convData);
        } else {
          // ── CREATE new conversation (first message sets the title) ────────
          const title = trimmed.length > 70 ? trimmed.slice(0, 70) + '…' : trimmed;
          const saved = await saveToHistory(FEATURE, user?.uid, title, convData);
          if (saved) setActiveConvId(saved.id);
        }
        await refreshConvList();
      } else {
        throw new Error(response?.error || 'Failed to get response');
      }
    } catch (err) {
      const errMsg = {
        type: 'ai',
        content: `Sorry, I encountered an error: ${err.message}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(m => [...m, errMsg]);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (messages.length === 0) { toast.error('No conversation to export'); return; }
    const topic = messages.find(m => m.type === 'user')?.content || 'Chat';
    exportChatPDF(messages, topic);
    toast.success('Opening print dialog...');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white/10 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-white/20 flex-shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-all">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium text-sm">Dashboard</span>
        </button>
        <h1 className="text-lg font-bold text-white">🤖 AI Learning Assistant</h1>
        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
            <button onClick={handleExportPDF}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-all">
              <Download className="w-4 h-4" /><span>Export PDF</span>
            </button>
          )}
          <button onClick={() => setSidebarOpen(s => !s)}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all" title="Toggle History">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div style={{ width: 260, flexShrink: 0, background: '#111827', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* New Chat button */}
            <div style={{ padding: '12px', borderBottom: '1px solid #1f2937' }}>
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all text-sm"
              >
                <Plus className="w-4 h-4" /><span>New Chat</span>
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {conversations.length === 0 ? (
                <div className="text-center text-gray-500 py-10 px-3">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No conversations yet</p>
                  <p className="text-xs mt-1 opacity-70">Ask a question to start</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-1">Conversations</p>
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`group flex items-start justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${
                        activeConvId === conv.id
                          ? 'bg-indigo-700 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
                        <p className="text-sm font-medium truncate leading-snug">{conv.title}</p>
                        <p className={`text-xs mt-0.5 ${activeConvId === conv.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {formatHistoryDate(conv.updatedAt || conv.createdAt)}
                          {activeConvId === conv.id && <span className="ml-2 font-semibold">● Active</span>}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all mt-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #1f2937' }}>
              <p className="text-xs text-gray-600 text-center">
                {user?.displayName || 'User'} · {conversations.length} chat{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* ── RIGHT: Chat area ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          className="bg-white/5">

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Bot className="w-16 h-16 text-white/30 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  {activeConvId ? 'Continue your conversation' : 'What do you want to learn?'}
                </h2>
                <p className="text-white/50 mb-8 text-sm">Ask me to explain any concept, formula, or topic</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl text-left transition-all border border-white/10">
                      <Lightbulb className="w-3.5 h-3.5 inline mr-2 text-yellow-300" />{s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'ai' && (
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 shadow-md rounded-bl-sm'
                    }`}>
                      {msg.type === 'ai'
                        ? <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                        : <p className="text-sm">{msg.content}</p>
                      }
                      <p className={`text-xs mt-1.5 ${msg.type === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center mr-3 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-md">
                      <div className="flex space-x-1.5 items-center">
                        {[0, 150, 300].map(delay => (
                          <div key={delay} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 p-4 bg-white/10 backdrop-blur-sm border-t border-white/20">
            <div className="flex space-x-3 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !loading && handleSubmit()}
                className="flex-1 px-4 py-3 bg-white rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow text-sm"
                placeholder={activeConvId ? "Continue this conversation..." : "Ask me anything... e.g. What is deep learning?"}
                disabled={loading}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-all shadow"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
