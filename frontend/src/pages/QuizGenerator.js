import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { generateQuiz, submitQuizResult } from '../api/services';
import toast from 'react-hot-toast';
import { Upload, FileText, ListChecks, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const QuizGenerator = ({ user }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      toast.success('PDF selected successfully!');
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!file && !text.trim()) {
      toast.error('Please upload a PDF or paste some text');
      return;
    }

    setLoading(true);
    setQuiz([]);
    setAnswers({});
    setScore(null);

    try {
      const formData = new FormData();
      formData.append('user_id', user.uid);
      formData.append('num_questions', numQuestions);
      if (text.trim()) {
        formData.append('text', text.trim());
      }
      if (file) {
        formData.append('file', file);
      }

      const response = await generateQuiz(formData);

      if (response.success) {
        setQuiz(response.quiz || []);
        toast.success('Quiz generated! Answer the questions to check your knowledge.');
      } else {
        throw new Error(response.error || 'Failed to generate quiz');
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index, option) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz.length) {
      toast.error('Please generate a quiz first');
      return;
    }

    const unanswered = quiz.some((_, idx) => !answers[idx]);
    if (unanswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);

    try {
      let correct = 0;
      quiz.forEach((question, index) => {
        if (answers[index] === question.answer) {
          correct += 1;
        }
      });

      setScore({ correct, total: quiz.length });

      const response = await submitQuizResult({
        user_id: user.uid,
        user_name: user.displayName || user.email || 'Learner',
        email: user.email || '',
        score: correct,
        total_questions: quiz.length,
      });
      if (response.success) {
        toast.success(`You scored ${correct} / ${quiz.length}. Points earned: ${response.points_earned}`);
      } else {
        throw new Error(response.error || 'Failed to submit quiz results');
      }
    } catch (error) {
      console.error('Quiz submission error:', error);
      toast.error(error.message || 'Failed to submit quiz results');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-4xl font-bold text-white mb-2">🧠 AI Quiz Generator</h1>
          <p className="text-indigo-100 text-lg">
            Generate instant quizzes from your study materials and climb the leaderboard!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1 animate-slide-up space-y-6">
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Upload className="w-6 h-6 mr-2 text-indigo-600" />
                Upload Material
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="quiz-file-upload"
                  />
                  <label htmlFor="quiz-file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      {file ? file.name : 'Click to upload PDF or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PDF up to 10MB</p>
                  </label>
                </div>
              </div>

              <div className="text-center text-gray-500 my-4">OR</div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Text / Summary
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input-field min-h-[150px]"
                  placeholder="Paste your notes or summary here..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="5"
                  max="15"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="input-field"
                />
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <ListChecks className="w-5 h-5" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </Card>
          </div>

          {/* Quiz Section */}
          <div className="lg:col-span-2 animate-slide-up">
            <Card className="min-h-[600px] flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                Quiz
              </h2>

              {!quiz.length ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                  <ListChecks className="w-16 h-16 text-gray-300 mb-4" />
                  <p>Generate a quiz to start practicing.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {quiz.map((question, index) => (
                      <Card key={index} className="border border-gray-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-gray-800 font-medium">{question.question}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {question.options.map((option, optionIdx) => {
                            const isSelected = answers[index] === option;
                            const isCorrect = score && question.answer === option;
                            const isIncorrect = score && isSelected && !isCorrect;

                            return (
                              <button
                                key={optionIdx}
                                onClick={() => handleAnswerSelect(index, option)}
                                disabled={!!score}
                                className={`p-3 rounded-lg border transition-all text-left ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                                } ${
                                  isCorrect ? 'border-green-500 bg-green-50 text-green-700' : ''
                                } ${
                                  isIncorrect ? 'border-red-500 bg-red-50 text-red-700' : ''
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {score && (
                          <p className="mt-3 text-sm text-gray-600">
                            Correct answer: <strong>{question.answer}</strong> — {question.explanation}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {score && (
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <p className="text-gray-800 font-semibold">
                          Score: {score.correct} / {score.total}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submitting || !!score}
                      className="btn-primary px-6 flex items-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Submit Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;

