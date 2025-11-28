import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudyPlan from './pages/StudyPlan';
import NoteSummarizer from './pages/NoteSummarizer';
import AIAssistant from './pages/AIAssistant';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import QuizGenerator from './pages/QuizGenerator';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <Toaster position="top-right" />
        
        {user && <Navbar user={user} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/study-plan" 
            element={user ? <StudyPlan user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/summarizer" 
            element={user ? <NoteSummarizer user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/assistant" 
            element={user ? <AIAssistant user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/progress" 
            element={user ? <Progress user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/leaderboard" 
            element={user ? <Leaderboard user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/quiz" 
            element={user ? <QuizGenerator user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
