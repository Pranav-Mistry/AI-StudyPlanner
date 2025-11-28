import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { explainConcept } from '../api/services';
import toast from 'react-hot-toast';
import { Bot, Send, Lightbulb, Loader2, ArrowLeft } from 'lucide-react';

const AIAssistant = ({ user }) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Input validation
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      toast.error('Please enter your question or concept');
      return;
    }

    setLoading(true);

    // Create user message
    const userMessage = {
      type: 'user',
      content: trimmedInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Update messages with user message immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      let response;
      
      // Call explain concept endpoint
      response = await explainConcept(trimmedInput);
      
      if (response && response.success) {
        const explanation = response.explanation || response.message || '';
        if (!explanation || explanation.trim().length === 0) {
          throw new Error('Received empty explanation from server');
        }
        const aiMessage = {
          type: 'ai',
          content: explanation,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        throw new Error(response?.error || 'Failed to generate explanation');
      }

      // Clear input only on success
      setInput('');
    } catch (error) {
      console.error('AI Assistant Error:', error);
      
      // Show error message to user
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
      
      // Add error message to chat
      const errorMessageObj = {
        type: 'ai',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prevMessages => [...prevMessages, errorMessageObj]);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-4xl font-bold text-white mb-2">🤖 AI Learning Assistant</h1>
          <p className="text-indigo-100 text-lg">
            Get simple explanations for any concept
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 animate-slide-up">
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Explain a Concept</h2>
              <p className="text-gray-600 text-sm">
                Type any concept you’re studying—AI will break it down with definitions, key points, examples, and study tips.
              </p>
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                <Lightbulb className="w-5 h-5 mb-2" />
                Try prompts like:
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>Explain quantum computing</li>
                  <li>What is photosynthesis?</li>
                  <li>Define reinforcement learning</li>
                </ul>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 animate-slide-up">
            <Card className="h-[600px] flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Bot className="w-6 h-6 mr-2 text-indigo-600" />
                AI Assistant
              </h2>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Ask me to explain any concept!
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.confidence && (
                          <p className="text-xs mt-2 opacity-75">
                            Confidence: {(message.confidence * 100).toFixed(0)}%
                          </p>
                        )}
                        <p className="text-xs mt-1 opacity-75">{message.timestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                  className="input-field flex-1"
                  placeholder="e.g., Explain cyber security"
                  disabled={loading}
                />
                <button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="btn-primary px-6 flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
