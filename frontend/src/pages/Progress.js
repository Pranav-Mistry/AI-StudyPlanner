import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { getProgress } from '../api/services';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, Award, Calendar, CheckCircle, ArrowLeft } from 'lucide-react';

const Progress = ({ user }) => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
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
  };

  // Mock data for charts (replace with real data from backend)
  const weeklyData = [
    { day: 'Mon', hours: 2, topics: 3 },
    { day: 'Tue', hours: 3, topics: 4 },
    { day: 'Wed', hours: 1.5, topics: 2 },
    { day: 'Thu', hours: 4, topics: 5 },
    { day: 'Fri', hours: 2.5, topics: 3 },
    { day: 'Sat', hours: 5, topics: 6 },
    { day: 'Sun', hours: 3, topics: 4 },
  ];

  const monthlyProgress = [
    { week: 'Week 1', completed: 15, target: 20 },
    { week: 'Week 2', completed: 18, target: 20 },
    { week: 'Week 3', completed: 22, target: 20 },
    { week: 'Week 4', completed: 19, target: 20 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading progress...</div>
      </div>
    );
  }

  const totalTopics = progressData?.plans?.reduce((acc, plan) => {
    return acc + (plan.plan?.schedule?.length || 0);
  }, 0) || 0;

  const completedTopics = progressData?.plans?.reduce((acc, plan) => {
    return acc + (plan.completed_topics?.length || 0);
  }, 0) || 0;

  const completionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

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
          <p className="text-indigo-100 text-lg">
            Track your learning journey and achievements
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-slide-up">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-indigo-600">{completionRate}%</p>
              </div>
              <Target className="w-12 h-12 text-indigo-600" />
            </div>
          </Card>

          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">Topics Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTopics}</p>
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
              </div>
              <Award className="w-12 h-12 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Study Hours */}
          <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
              Weekly Study Hours
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Topics Completed */}
          <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Topics Completed (Weekly)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="topics" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Monthly Progress */}
        <Card className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-indigo-600" />
            Monthly Progress vs Target
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#6366f1" name="Completed" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Study Plans List */}
        <Card>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Study Plans</h2>
          {progressData?.plans?.length > 0 ? (
            <div className="space-y-4">
              {progressData.plans.map((plan, index) => {
                const planTopics = plan.plan?.schedule?.length || 0;
                const planCompleted = plan.completed_topics?.length || 0;
                const planProgress = planTopics > 0 ? Math.round((planCompleted / planTopics) * 100) : 0;

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">
                        Study Plan {index + 1}
                      </h3>
                      <span className="text-sm font-medium text-indigo-600">
                        {planProgress}% Complete
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${planProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {planCompleted} of {planTopics} topics completed
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No study plans yet. Create one to start tracking your progress!</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Progress;
