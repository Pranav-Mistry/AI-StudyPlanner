import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { getProgress } from '../api/services';
import toast from 'react-hot-toast';
import {
  BookOpen,
  FileText,
  Bot,
  TrendingUp,
  Trophy,
  Target,
  Clock,
  Flame,
  Award,
  CheckCircle,
} from 'lucide-react';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalTopics: 0,
    completedTopics: 0,
    streak: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProgress();
  }, [user]);

  const fetchUserProgress = async () => {
    try {
      const response = await getProgress(user.uid);
      if (response && response.success) {
        const userData = response.user || {};
        const plans = response.plans || [];

        let totalPlans = 0;
        let completedPlans = 0;

        if (Array.isArray(plans)) {
          plans.forEach((plan) => {
            if (plan && plan.plan && Array.isArray(plan.plan.schedule)) {
              const scheduleLength = plan.plan.schedule.length;
              if (scheduleLength > 0) {
                totalPlans += 1;
                const completedDays = Array.isArray(plan.completed_days) ? plan.completed_days.length : 0;

                // If all days are marked completed, treat the whole plan as completed
                if (completedDays >= scheduleLength) {
                  completedPlans += 1;
                }
              }
            }
          });
        }

        setStats({
          totalTopics: totalPlans,
          completedTopics: completedPlans,
          streak: userData.streak || 0,
          points: userData.total_points || 0,
        });
      } else {
        // Handle case where response doesn't have success flag
        console.warn('Unexpected response format:', response);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      // Show error toast for network errors or API errors
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Backend server is not running. Please start the backend server on port 5000.', {
          duration: 5000,
        });
      } else if (error.response?.data?.error) {
        toast.error(`Error: ${error.response.data.error}`, {
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: 'Study Plan Generator',
      description: 'AI-powered personalized study plans based on your syllabus',
      icon: BookOpen,
      link: '/study-plan',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Notes Summarizer',
      description: 'Summarize long notes into concise, easy-to-understand points',
      icon: FileText,
      link: '/summarizer',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'AI Assistant',
      description: 'Get explanations and answers to your study questions',
      icon: Bot,
      link: '/assistant',
      color: 'from-green-500 to-teal-500',
    },
    {
      title: 'Progress Tracker',
      description: 'Track your learning progress with detailed analytics',
      icon: TrendingUp,
      link: '/progress',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Leaderboard',
      description: 'Compete with others and climb the ranks',
      icon: Trophy,
      link: '/leaderboard',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'Quiz Generator',
      description: 'Create quizzes from your notes and earn points',
      icon: BookOpen,
      link: '/quiz',
      color: 'from-teal-500 to-emerald-500',
    },
  ];

  const statCards = [
    {
      label: 'Total Plans',
      value: stats.totalTopics,
      icon: Target,
      color: 'bg-blue-500',
    },
    {
      label: 'Completed Plans',
      value: stats.completedTopics,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      label: 'Streak',
      value: `${stats.streak} days`,
      icon: Flame,
      color: 'bg-orange-500',
    },
    {
      label: 'Points',
      value: stats.points,
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  const completionPercentage = stats.totalTopics > 0 
    ? Math.round((stats.completedTopics / stats.totalTopics) * 100) 
    : 0;
  const planFinished = stats.totalTopics > 0 && stats.completedTopics === stats.totalTopics;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.displayName || 'Student'}! 👋
          </h1>
          <p className="text-indigo-100 text-lg">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
          {statCards.map((stat, index) => (
            <Card key={index} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Progress Bar */}
        {stats.totalTopics > 0 && (
          <Link to="/study-plan" className="block">
            <Card className="mb-8 animate-slide-up cursor-pointer transition-shadow hover:shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Overall Progress</h3>
              <span className="text-2xl font-bold text-indigo-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
                {planFinished
                  ? 'All plans completed! Tap to review or create a new one.'
                  : `${stats.completedTopics} of ${stats.totalTopics} plans completed · Tap to manage your plans`}
            </p>
          </Card>
          </Link>
        )}

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link key={index} to={feature.link}>
                <Card hover className="h-full">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                  <div className="mt-4 flex items-center text-indigo-600 font-medium">
                    <span>Get Started</span>
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <Card className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-start space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">💡 Pro Tip</h3>
              <p className="text-indigo-100">
                Study consistently every day to maintain your streak and earn more points! 
                Upload your syllabus to get started with an AI-generated study plan.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
