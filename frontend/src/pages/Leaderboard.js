import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { getLeaderboard } from '../api/services';
import { Trophy, Medal, Award, TrendingUp, Flame, ArrowLeft } from 'lucide-react';

const Leaderboard = ({ user }) => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await getLeaderboard();
      if (response.success) {
        setLeaderboard(response.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 1:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 2:
        return <Medal className="w-8 h-8 text-orange-600" />;
      default:
        return <div className="w-8 h-8 flex items-center justify-center text-gray-600 font-bold">{index + 1}</div>;
    }
  };

  const getRankBadge = (index) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 2:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-r from-indigo-500 to-purple-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center space-x-2 text-white hover:text-indigo-200 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="mb-8 animate-fade-in text-center">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-indigo-100 text-lg">
            Top performers this month
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8 animate-slide-up">
            {/* 2nd Place */}
            <div className="mt-8">
              <Card className="text-center">
                <div className="bg-gradient-to-r from-gray-300 to-gray-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{leaderboard[1]?.name}</h3>
                <p className="text-2xl font-bold text-gray-600 mb-1">{leaderboard[1]?.points}</p>
                <p className="text-sm text-gray-500">points</p>
                <div className="flex items-center justify-center mt-2 text-orange-600">
                  <Flame className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{leaderboard[1]?.streak} day streak</span>
                </div>
              </Card>
            </div>

            {/* 1st Place */}
            <div>
              <Card className="text-center border-4 border-yellow-400">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1 text-lg">{leaderboard[0]?.name}</h3>
                <p className="text-3xl font-bold text-yellow-600 mb-1">{leaderboard[0]?.points}</p>
                <p className="text-sm text-gray-500">points</p>
                <div className="flex items-center justify-center mt-2 text-orange-600">
                  <Flame className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{leaderboard[0]?.streak} day streak</span>
                </div>
                <div className="mt-3 bg-yellow-100 text-yellow-800 text-xs font-bold py-1 px-3 rounded-full inline-block">
                  👑 CHAMPION
                </div>
              </Card>
            </div>

            {/* 3rd Place */}
            <div className="mt-8">
              <Card className="text-center">
                <div className="bg-gradient-to-r from-orange-400 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{leaderboard[2]?.name}</h3>
                <p className="text-2xl font-bold text-orange-600 mb-1">{leaderboard[2]?.points}</p>
                <p className="text-sm text-gray-500">points</p>
                <div className="flex items-center justify-center mt-2 text-orange-600">
                  <Flame className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{leaderboard[2]?.streak} day streak</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
            All Rankings
          </h2>

          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    index < 3
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{player.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-indigo-600">
                          <Award className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">{player.points} points</span>
                        </div>
                        <div className="flex items-center text-orange-600">
                          <Flame className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">{player.streak} days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < 3 && (
                    <div className={`${getRankBadge(index)} text-white text-xs font-bold py-1 px-3 rounded-full`}>
                      TOP {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No rankings yet. Be the first to earn points!</p>
            </div>
          )}
        </Card>

        {/* How to Earn Points */}
        <Card className="mt-8 bg-gradient-to-r from-green-500 to-teal-500 text-white">
          <h3 className="text-xl font-bold mb-3">💎 How to Earn Points</h3>
          <ul className="space-y-2 text-green-50">
            <li>
              • Keep your daily streak alive: <strong>+5 points</strong> every day you stay consistent.
            </li>
            <li>
              • Finish AI-generated quizzes with confidence: <strong>score × 5 points</strong> per quiz submission.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;
