import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, CalendarDays, Clock, BookOpen, Pencil, Check, X, Lightbulb } from 'lucide-react';
import axios from '../api/axios';

const STUDY_TIPS = [
  "Don't cram! Spaced repetition is proven to increase memory retention by 40%.",
  "Take breaks. The Pomodoro technique (25 min study, 5 min break) keeps your brain fresh.",
  "Teach the material to an imaginary friend. It's the fastest way to identify gaps in your understanding.",
  "Stay hydrated and prioritize 8 hours of sleep before your exam. A tired brain struggles to recall information.",
  "Test yourself with practice questions rather than just re-reading your notes. Active recall is key!",
  "Break down your syllabus into tiny, manageable chunks. Focus on one small section at a time to avoid feeling overwhelmed."
];

const subjectColors = [
  'from-indigo-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
];

const getDaysLeft = (dateStr) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam = new Date(dateStr); exam.setHours(0, 0, 0, 0);
  return Math.round((exam - today) / (1000 * 60 * 60 * 24));
};

const getUrgencyStyle = (days) => {
  if (days < 0) return { bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600', label: 'Past' };
  if (days === 0) return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Today! 🎯' };
  if (days <= 3) return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: `${days}d left 🚨` };
  if (days <= 7) return { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: `${days}d left ⚠️` };
  return { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: `${days}d left ✅` };
};

const EMPTY_FORM = { name: '', subject: '', date: '', notes: '' };

const ExamCountdown = ({ user }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = adding new, id = editing
  const [, tick] = useState(0);
  const [dailyTip, setDailyTip] = useState('');

  const loadExams = async () => {
    if (!user?.uid) return;
    try {
      const res = await axios.get(`/api/exams/${user.uid}`);
      if (res.data.success) {
        setExams(res.data.exams || []);
      }
    } catch (e) { console.error('Error loading exams', e); }
  };

  useEffect(() => {
    loadExams();
  }, [user?.uid]);

  // Refresh countdowns every minute
  useEffect(() => {
    const interval = setInterval(() => tick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDailyTip(STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]);
  }, []);

  const saveExams = async (updated) => {
    const sorted = [...updated].sort((a, b) => new Date(a.date) - new Date(b.date));
    setExams(sorted);
    if (user?.uid) {
      try {
        await axios.post('/api/exams/save', { user_id: user.uid, exams: sorted });
      } catch (e) { console.error('Error saving exams', e); }
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (exam) => {
    setEditingId(exam.id);
    setForm({ name: exam.name, subject: exam.subject || '', date: exam.date, notes: exam.notes || '' });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Enter exam name'); return; }
    if (!form.date) { toast.error('Select exam date'); return; }

    if (editingId) {
      // Update existing
      const updated = exams.map(e =>
        e.id === editingId
          ? { ...e, name: form.name.trim(), subject: form.subject.trim() || form.name.trim(), date: form.date, notes: form.notes.trim() }
          : e
      );
      await saveExams(updated);
      toast.success('Exam updated!');
    } else {
      // Add new
      const newExam = {
        id: Date.now().toString(),
        name: form.name.trim(),
        subject: form.subject.trim() || form.name.trim(),
        date: form.date,
        notes: form.notes.trim(),
        colorIdx: exams.length % subjectColors.length,
        createdAt: new Date().toISOString(),
      };
      await saveExams([...exams, newExam]);
      toast.success('Exam added!');
    }

    cancelForm();
  };

  const handleDelete = async (id) => {
    await saveExams(exams.filter(e => e.id !== id));
    if (editingId === id) cancelForm();
    toast.success('Exam removed');
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = exams.filter(e => getDaysLeft(e.date) >= 0);
  const past = exams.filter(e => getDaysLeft(e.date) < 0);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <button onClick={() => navigate('/dashboard')} className="mb-4 flex items-center space-x-2 text-white hover:text-indigo-200 transition-all">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back to Dashboard</span>
        </button>
        <div className="mb-8 animate-fade-in flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">📅 Exam Countdown</h1>
            <p className="text-white/80 text-lg">Track your upcoming exams and never miss a deadline</p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-white text-indigo-700 font-bold px-5 py-3 rounded-xl shadow-lg hover:bg-indigo-50 transition-all"
          >
            <Plus className="w-5 h-5" /><span>Add Exam</span>
          </button>
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <Card className="mb-6 border-2 border-indigo-300">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
              <span>{editingId ? 'Edit Exam' : 'Add New Exam'}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name *</label>
                <input
                  className="input-field w-full"
                  placeholder="e.g. Final Physics Exam"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  className="input-field w-full"
                  placeholder="e.g. Physics, Maths, History"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date *</label>
                <input
                  type="date"
                  min={today}
                  className="input-field w-full"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  className="input-field w-full"
                  placeholder="e.g. Chapters 1-5, MCQ format"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary flex items-center space-x-2 px-6">
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Save Changes' : 'Add Exam'}</span>
              </button>
              <button onClick={cancelForm} className="flex items-center space-x-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all">
                <X className="w-4 h-4" /><span>Cancel</span>
              </button>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {exams.length === 0 && (
          <Card>
            <div className="text-center py-16">
              <CalendarDays className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No exams added yet</h3>
              <p className="text-gray-500 mb-6">Add your upcoming exams to track countdowns</p>
              <button onClick={openAddForm} className="btn-primary flex items-center space-x-2 mx-auto">
                <Plus className="w-4 h-4" /><span>Add Your First Exam</span>
              </button>
            </div>
          </Card>
        )}

        {/* Upcoming Exams */}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-white font-bold text-xl mb-4 flex items-center space-x-2">
              <Clock className="w-5 h-5" /><span>Upcoming Exams</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {upcoming.map((exam) => {
                const days = getDaysLeft(exam.date);
                const { bar, badge, label } = getUrgencyStyle(days);
                const color = subjectColors[exam.colorIdx] || subjectColors[0];
                return (
                  <div key={exam.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                    {/* Color banner */}
                    <div className={`bg-gradient-to-r ${color} p-4 flex items-center justify-between`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg leading-tight">{exam.name}</p>
                          {exam.subject && exam.subject !== exam.name && (
                            <p className="text-white/80 text-sm">{exam.subject}</p>
                          )}
                        </div>
                      </div>
                      {/* Edit + Delete buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditForm(exam)}
                          title="Edit exam"
                          className="w-8 h-8 bg-white/20 hover:bg-white/40 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Pencil className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          title="Delete exam"
                          className="w-8 h-8 bg-white/20 hover:bg-red-400 rounded-lg flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-3xl font-black text-gray-800">
                            {days === 0 ? '🎯 Today!' : `${days}`}
                            {days > 0 && <span className="text-lg font-medium text-gray-500 ml-1">days</span>}
                          </p>
                          <p className="text-gray-500 text-sm mb-1 mt-1 font-medium">
                            {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${badge}`}>{label}</span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                        <div
                          className={`${bar} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.max(5, Math.min(100, 100 - (days / 60) * 100))}%` }}
                        />
                      </div>

                      {exam.notes && (
                        <p className="text-gray-600 text-sm bg-gray-50 rounded-lg px-3 py-2 italic">📌 {exam.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Past Exams */}
        {past.length > 0 && (
          <>
            <h2 className="text-white/70 font-bold text-lg mb-3">Past Exams</h2>
            <div className="space-y-2">
              {past.map(exam => (
                <div key={exam.id} className="bg-white/40 rounded-xl px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{exam.name}</span>
                    <span className="text-white/80 text-sm ml-3">
                      {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => openEditForm(exam)} title="Edit" className="text-gray-500 hover:text-white transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(exam.id)} title="Delete" className="text-white/50 hover:text-red-300 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* AI Study Tip Widget */}
        <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all transform group-hover:scale-110">
            <Lightbulb className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-white font-bold text-lg mb-2 flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-300" />
              <span>AI Study Tip</span>
            </h2>
            <p className="text-white/90 text-lg leading-relaxed italic">
              "{dailyTip}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamCountdown;
