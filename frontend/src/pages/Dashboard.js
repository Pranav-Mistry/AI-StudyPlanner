import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { getProgress } from '../api/services';
import axios from '../api/axios';
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
  Layers,
  CalendarDays,
  ChevronRight,
  ListChecks
} from 'lucide-react';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalPlans: 0,
    completedPlans: 0,
    totalTopics: 0,
    completedTopics: 0,
    streak: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    fetchUserProgress();
    fetchExams();
  }, [user]);

  const fetchUserProgress = async () => {
    try {
      const response = await getProgress(user.uid);
      if (response && response.success) {
        const userData = response.user || {};
        const plans = response.plans || [];

        let totalPlans = 0;
        let completedPlans = 0;
        let totalTopics = 0;
        let completedTopics = 0;

        if (Array.isArray(plans)) {
          plans.forEach((plan) => {
            if (plan && plan.plan && Array.isArray(plan.plan.schedule)) {
              const scheduleLength = plan.plan.schedule.length;
              if (scheduleLength > 0) {
                totalPlans += 1;
                // Calculate if plan is fully completed
                const completedDays = Array.isArray(plan.completed_days) ? plan.completed_days.length : 0;
                if (completedDays >= scheduleLength) {
                  completedPlans += 1;
                }
              }
              plan.plan.schedule.forEach(day => {
                totalTopics += (day.topics || []).length;
              });
            }
            if (plan && Array.isArray(plan.completed_topics)) {
              completedTopics += plan.completed_topics.length;
            }
          });
        }

        setStats({
          totalPlans,
          completedPlans,
          totalTopics,
          completedTopics,
          streak: userData.streak || 0,
          points: userData.total_points || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    if (!user?.uid) return;
    try {
      const res = await axios.get(`/api/exams/${user.uid}`);
      if (res.data.success) {
        const parsedExams = res.data.exams || [];
        const upcoming = parsedExams
          .filter(e => {
            const days = Math.round((new Date(e.date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
            return days >= 0;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        setExams(upcoming);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
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
      title: 'Flashcard Generator',
      description: 'Create interactive flashcards from your notes or PDFs',
      icon: Layers,
      link: '/flashcards',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      title: 'Quiz Generator',
      description: 'Test your knowledge with AI-generated quizzes',
      icon: ListChecks,
      link: '/quiz',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      title: 'Exam Countdown',
      description: 'Track your upcoming exams and stay on schedule',
      icon: CalendarDays,
      link: '/exams',
      color: 'from-orange-500 to-amber-600',
    },
    {
      title: 'Progress Tracker',
      description: 'Detailed analytics and insights into your study habits',
      icon: TrendingUp,
      link: '/progress',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Leaderboard',
      description: 'Challenge yourself and see how you rank among others',
      icon: Trophy,
      link: '/leaderboard',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  const statCards = [
    { label: 'Total Plans', value: stats.totalPlans, icon: Target, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completedPlans, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Streak', value: `${stats.streak} days`, icon: Flame, color: 'bg-orange-500' },
    { label: 'Points', value: stats.points, icon: Award, color: 'bg-purple-500' },
  ];

  const completionPercentage = stats.totalTopics > 0 
    ? Math.round((stats.completedTopics / stats.totalTopics) * 100) 
    : 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.displayName || 'Student'}! 👋
          </h1>
          <p className="text-indigo-100 text-lg">Your AI-powered study companion is ready.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-slide-up">
          {statCards.map((stat, i) => (
            <Card key={i} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-slide-up">
          {/* Progress Widget */}
          <div className="lg:col-span-2">
            <Link to="/study-plan" className="block">
              <Card hover className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                    Overall Progress
                  </h3>
                  <span className="text-2xl font-black text-indigo-600">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{stats.completedTopics} topics completed</span>
                  <span>{stats.totalTopics} total topics</span>
                </div>
              </Card>
            </Link>
          </div>

          {/* Exam Widget */}
          <div className="lg:col-span-1">
            <Link to="/exams" className="block h-full">
              <Card hover className="h-full bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-0 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center">
                    <CalendarDays className="w-5 h-5 mr-2 text-indigo-300" />
                    Upcoming Exams
                  </h3>
                  <ChevronRight className="w-5 h-5 opacity-50" />
                </div>
                <div className="space-y-4">
                  {exams.length === 0 ? (
                    <div className="text-center py-4 bg-white/10 rounded-xl">
                      <p className="text-sm opacity-80">No exams added</p>
                    </div>
                  ) : (
                    exams.map(exam => {
                      const days = Math.round((new Date(exam.date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={exam.id} className="flex items-center justify-between bg-white/10 p-3 rounded-xl">
                          <div className="min-w-0 mr-3">
                            <p className="text-sm font-bold truncate">{exam.name}</p>
                            <p className="text-xs opacity-60 truncate">{exam.subject}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${days <= 3 ? 'bg-red-500' : 'bg-green-500'}`}>
                              {days === 0 ? 'Today' : `${days}d`}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <h2 className="text-2xl font-bold text-white mb-6">Explore Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          {features.map((feature, i) => (
            <Link key={i} to={feature.link}>
              <Card hover className="h-full flex flex-col">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 md:line-clamp-none">{feature.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-indigo-600 font-bold text-sm">
                  <span>Open Tool</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
