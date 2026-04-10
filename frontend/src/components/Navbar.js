import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { 
  Home, 
  BookOpen, 
  FileText, 
  Bot, 
  TrendingUp, 
  Trophy, 
  LogOut, 
  Menu, 
  X,
  ListChecks,
  UserCircle,
  Layers,
  CalendarDays
} from 'lucide-react';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard', bgColor: 'bg-blue-50', hoverBgColor: 'hover:bg-blue-100' },
    { to: '/study-plan', icon: BookOpen, label: 'Study Plan', bgColor: 'bg-purple-50', hoverBgColor: 'hover:bg-purple-100' },
    { to: '/summarizer', icon: FileText, label: 'Summarizer', bgColor: 'bg-green-50', hoverBgColor: 'hover:bg-green-100' },
    { to: '/assistant', icon: Bot, label: 'AI Assistant', bgColor: 'bg-pink-50', hoverBgColor: 'hover:bg-pink-100' },
    { to: '/quiz', icon: ListChecks, label: 'Quiz', bgColor: 'bg-yellow-50', hoverBgColor: 'hover:bg-yellow-100' },
    { to: '/flashcards', icon: Layers, label: 'Flashcards', bgColor: 'bg-teal-50', hoverBgColor: 'hover:bg-teal-100' },
    { to: '/exams', icon: CalendarDays, label: 'Exams', bgColor: 'bg-orange-50', hoverBgColor: 'hover:bg-orange-100' },
    { to: '/progress', icon: TrendingUp, label: 'Progress', bgColor: 'bg-indigo-50', hoverBgColor: 'hover:bg-indigo-100' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', bgColor: 'bg-red-50', hoverBgColor: 'hover:bg-red-100' },
  ];

  return (
    <nav className="bg-white shadow-lg relative z-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center mr-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-extrabold text-gray-800 tracking-tight whitespace-nowrap">
                  AI Study Planner
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 ${link.bgColor} ${link.hoverBgColor} hover:text-indigo-600 transition-all`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <link.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>
                </div>
              </Link>
            ))}
            
            <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                <UserCircle className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{user?.displayName || 'User'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 ${link.bgColor} ${link.hoverBgColor} hover:text-indigo-600 transition-all`}
                onClick={() => setIsOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
            
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 mb-2">
                <UserCircle className="w-5 h-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{user?.displayName || 'User'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
