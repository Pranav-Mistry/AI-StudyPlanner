import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { getProgress } from '../api/services';
import { Target, Award, Calendar, CheckCircle, ArrowLeft, BookOpen, Brain } from 'lucide-react';

const Progress = ({ user }) => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const response = await getProgress(user.uid);
      if (response.success) {
        setProgressData(response);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading progress...</div>
      </div>
    );
  }

  // Calculate real progress from study plans
  const calculateStudyPlanProgress = () => {
    if (!progressData?.plans || progressData.plans.length === 0) {
      return {
        totalTopics: 0,
        completedTopics: 0,
        totalDays: 0,
        completedDays: 0,
        completionRate: 0
      };
    }

    let totalTopics = 0;
    let completedTopics = 0;
    let totalDays = 0;
    let completedDays = 0;

    progressData.plans.forEach((plan) => {
      // Count topics from schedule
      const schedule = plan.plan?.schedule || [];
      schedule.forEach((day) => {
        const dayTopics = day.topics || [];
        totalTopics += dayTopics.length;
        totalDays += 1;
      });

      // Count completed topics
      const completedTopicsList = plan.completed_topics || [];
      completedTopics += completedTopicsList.length;

      // Count completed days
      const completedDaysList = plan.completed_days || [];
      completedDays += completedDaysList.length;
    });

    const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      totalTopics,
      completedTopics,
      totalDays,
      completedDays,
      completionRate
    };
  };

  const studyPlanProgress = calculateStudyPlanProgress();
  const quizStats = progressData?.quiz_stats || {
    total_quizzes: 0,
    total_questions: 0,
    total_correct: 0,
    average_score: 0
  };

  // Progress Circle Component
  const ProgressCircle = ({ percentage, size = 120, strokeWidth = 8, color = '#6366f1', label, value }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{percentage}%</span>
            {value && <span className="text-xs text-gray-500">{value}</span>}
          </div>
        </div>
        {label && <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center space-x-2 text-white hover:text-indigo-200 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Progress Tracker</h1>
          <p className="text-white/80 text-lg">
            Track your learning journey and achievements
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-slide-up">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-indigo-600">{studyPlanProgress.completionRate}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  {studyPlanProgress.completedTopics} of {studyPlanProgress.totalTopics} topics
                </p>
              </div>
              <Target className="w-12 h-12 text-indigo-600" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Topics Completed</p>
                <p className="text-3xl font-bold text-green-600">{studyPlanProgress.completedTopics}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {studyPlanProgress.totalTopics} total topics
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">
                  {progressData?.user?.streak || 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">days in a row</p>
              </div>
              <Calendar className="w-12 h-12 text-orange-600" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total Points</p>
                <p className="text-3xl font-bold text-purple-600">
                  {progressData?.user?.total_points || 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">earned so far</p>
              </div>
              <Award className="w-12 h-12 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Progress Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Study Plan Progress */}
          <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
              Study Plan Progress
            </h2>
            <div className="flex flex-col items-center space-y-6">
              <ProgressCircle
                percentage={studyPlanProgress.completionRate}
                color="#6366f1"
                label="Overall Completion"
                value={`${studyPlanProgress.completedTopics}/${studyPlanProgress.totalTopics} topics`}
              />
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">{studyPlanProgress.completedDays}</p>
                  <p className="text-sm text-gray-600">Days Completed</p>
                  <p className="text-xs text-gray-400 mt-1">of {studyPlanProgress.totalDays} total</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{studyPlanProgress.completedTopics}</p>
                  <p className="text-sm text-gray-600">Topics Completed</p>
                  <p className="text-xs text-gray-400 mt-1">of {studyPlanProgress.totalTopics} total</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quiz Performance */}
          <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              Quiz Performance
            </h2>
            {quizStats && quizStats.total_quizzes > 0 ? (
              <div className="flex flex-col items-center space-y-6">
                <ProgressCircle
                  percentage={quizStats.average_score}
                  color="#8b5cf6"
                  label="Average Score"
                  value={`${quizStats.total_correct}/${quizStats.total_questions} correct`}
                />
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{quizStats.total_quizzes}</p>
                    <p className="text-sm text-gray-600">Quizzes Taken</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{quizStats.total_questions}</p>
                    <p className="text-sm text-gray-600">Questions Answered</p>
                  </div>
                </div>
                {progressData?.quiz_results && progressData.quiz_results.length > 0 && (
                  <div className="w-full mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Recent Quiz Results</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {progressData.quiz_results.slice(0, 5).map((quiz, index) => {
                        const quizScore = quiz.total_questions > 0 
                          ? Math.round((quiz.score / quiz.total_questions) * 100) 
                          : 0;
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">
                              Quiz {progressData.quiz_results.length - index}
                            </span>
                            <span className="text-sm font-semibold text-purple-600">
                              {quiz.score}/{quiz.total_questions} ({quizScore}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Brain className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-center">No quizzes taken yet</p>
                <p className="text-sm text-center mt-2">Take quizzes to track your performance!</p>
              </div>
            )}
          </Card>
        </div>

        {/* Study Plans List */}
        <Card>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
            Your Study Plans
          </h2>
          {progressData?.plans?.length > 0 ? (
            <div className="space-y-4">
              {progressData.plans.map((plan, index) => {
                // Calculate topics from schedule
                const schedule = plan.plan?.schedule || [];
                let planTotalTopics = 0;
                schedule.forEach((day) => {
                  planTotalTopics += (day.topics || []).length;
                });
                
                const planCompletedTopics = plan.completed_topics?.length || 0;
                const planProgress = planTotalTopics > 0 
                  ? Math.round((planCompletedTopics / planTotalTopics) * 100) 
                  : 0;

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-indigo-600" />
                        Study Plan {index + 1}
                      </h3>
                      <span className="text-sm font-medium text-indigo-600">
                        {planProgress}% Complete
                      </span>
                    </div>
                    
                    {/* Topics Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-700 font-medium">
                          {planCompletedTopics} / {planTotalTopics} topics
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${planProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Plan Info */}
                    {plan.plan?.total_days && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Total Days: {plan.plan.total_days}</span>
                          {plan.plan.daily_topics && (
                            <span>Daily Topics: {plan.plan.daily_topics}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No study plans yet. Create one to start tracking your progress!</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Progress;
