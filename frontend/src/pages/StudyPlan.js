import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import {
  deleteStudyPlan,
  generateStudyPlan,
  loadStudyPlan,
  saveStudyPlan as saveStudyPlanRequest,
  updateStudyPlanDayStatus,
  uploadSyllabus
} from '../api/services';
import toast from 'react-hot-toast';
import { Upload, Calendar, BookOpen, Clock, Loader2, ArrowLeft } from 'lucide-react';

const buildTopicKey = (dayNumber, topic) => `Day ${dayNumber}::${topic}`;

const filterCompletedKeys = (plan, storedKeys = []) => {
  if (!plan || !Array.isArray(plan.schedule)) {
    return [];
  }
  const validKeys = new Set();
  plan.schedule.forEach((day, index) => {
    const dayNumber = day.day || index + 1;
    (day.topics || []).forEach((topic) => {
      validKeys.add(buildTopicKey(dayNumber, topic));
    });
  });
  return (storedKeys || []).filter((key) => validKeys.has(key));
};

const StudyPlan = ({ user }) => {
  const navigate = useNavigate();
  const [syllabusText, setSyllabusText] = useState('');
  const [file, setFile] = useState(null);
  const [days, setDays] = useState(30);
  const [examDate, setExamDate] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completedDays, setCompletedDays] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);
  
  const allTopicKeys = useMemo(() => {
    if (!studyPlan || !Array.isArray(studyPlan.schedule)) {
      return [];
    }
    const keys = [];
    studyPlan.schedule.forEach((day, index) => {
      const dayNumber = day.day || index + 1;
      (day.topics || []).forEach((topic) => {
        keys.push(buildTopicKey(dayNumber, topic));
      });
    });
    return keys;
  }, [studyPlan]);

  const totalTopicsCount = allTopicKeys.length;
  const completionPercentage = totalTopicsCount
    ? Math.round((completedTopics.length / totalTopicsCount) * 100)
    : 0;
  const planCompleted =
    totalTopicsCount > 0 &&
    completionPercentage === 100 &&
    (studyPlan?.schedule?.length || 0) > 0 &&
    completedDays.length === (studyPlan?.schedule?.length || 0);

  // Load saved study plan and progress on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setStudyPlan(null);
        setPlanId(null);
        setCompletedTopics([]);
        setLoadingPlan(false);
        return;
      }

      try {
        const planData = await loadStudyPlan(user.uid);
        if (planData.success && planData.study_plan) {
          setStudyPlan(planData.study_plan);
          setPlanId(planData.plan_id || user.uid);
          setCompletedTopics(filterCompletedKeys(planData.study_plan, planData.completed_topics));
          setCompletedDays(planData.completed_days || []);
        } else {
          setStudyPlan(null);
          setPlanId(planData.plan_id || user.uid);
          setCompletedTopics([]);
          setCompletedDays([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load study data');
      } finally {
        setLoadingPlan(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    setCompletedTopics((prev) => prev.filter((key) => allTopicKeys.includes(key)));
  }, [allTopicKeys]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      toast.success('PDF file selected!');
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const saveStudyPlan = async (plan) => {
    if (!user) {
      toast.error('Please log in to save your study plan');
      return false;
    }

    setSaving(true);
    try {
      const data = await saveStudyPlanRequest({
        user_id: user.uid,
        study_plan: plan
      });
      if (data.success) {
        if (data.plan_id) {
          setPlanId(data.plan_id);
        }
        toast.success('Study plan saved successfully!');
        return true;
      } else {
        throw new Error(data.error || 'Failed to save study plan');
      }
    } catch (error) {
      console.error('Error saving study plan:', error);
      toast.error(error.message || 'Failed to save study plan');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!user) {
      toast.error('Please log in to generate a study plan');
      return;
    }
    if (!syllabusText && !file) {
      toast.error('Please provide syllabus text or upload a PDF');
      return;
    }

    setLoading(true);

    try {
      let syllabusContent = syllabusText;

      // If file is uploaded, extract text first
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', user.uid);

        const uploadResponse = await uploadSyllabus(formData);
        if (uploadResponse.success) {
          toast.success('Syllabus uploaded successfully!');
          if (uploadResponse.content) {
            syllabusContent = uploadResponse.content;
            setSyllabusText(uploadResponse.content);
          }
        }
      }

      // Generate study plan
      const response = await generateStudyPlan({
        syllabus: syllabusContent || 'Generate a comprehensive study plan',
        days: days,
        exam_date: examDate,
        user_id: user.uid,
      });

      if (response.success) {
        setStudyPlan(response.study_plan);
        setPlanId(response.plan_id || user.uid);
        setCompletedTopics([]);
        setCompletedDays([]);
        // Auto-save the generated plan
        await saveStudyPlan(response.study_plan);
      } else {
        throw new Error('Failed to generate study plan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!user || !planId) {
      toast.error('No study plan to delete');
      return;
    }
    const confirmDelete = window.confirm('Delete your current study plan? This cannot be undone.');
    if (!confirmDelete) {
      return;
    }

    setDeleting(true);
    try {
      const data = await deleteStudyPlan(user.uid);
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete study plan');
      }

      setStudyPlan(null);
      setPlanId(null);
      setCompletedTopics([]);
      setCompletedDays([]);
      toast.success('Study plan deleted');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Failed to delete study plan');
    } finally {
      setDeleting(false);
    }
  };

  const handleDayToggle = async (dayNumber) => {
    if (!user) {
      toast.error('Please log in to track your progress');
      return;
    }
    if (!planId) {
      toast.error('Save your plan before updating progress');
      return;
    }

    const isCompleted = completedDays.includes(dayNumber);

    try {
      const data = await updateStudyPlanDayStatus({
        user_id: user.uid,
        day: dayNumber,
        completed: !isCompleted,
      });
      if (!data.success) {
        throw new Error(data.error || 'Failed to update topic');
      }

      setCompletedDays(data.completed_days || []);
      setCompletedTopics(data.completed_topics || []);
      toast.success(!isCompleted ? `Day ${dayNumber} completed 🎉` : `Day ${dayNumber} reopened`);
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error(error.message || 'Unable to update topic status');
    }
  };

  if (loadingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          
          {studyPlan && (
            <div className="flex items-center space-x-3">
            <button
              onClick={() => saveStudyPlan(studyPlan)}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Save Plan</span>
                </>
              )}
            </button>
              <button
                onClick={handleDeletePlan}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Delete Plan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white mb-2">📚 AI Study Plan Generator</h1>
          <p className="text-indigo-100 text-lg">
            {studyPlan ? 'Your personalized study plan' : 'Upload your syllabus and get a personalized study plan'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 animate-slide-up">
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Upload className="w-6 h-6 mr-2 text-indigo-600" />
                Upload Syllabus
              </h2>

              {/* File Upload */}
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
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      {file ? file.name : 'Click to upload PDF or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PDF up to 10MB</p>
                  </label>
                </div>
              </div>

              <div className="text-center text-gray-500 my-4">OR</div>

              {/* Text Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Syllabus Text
                </label>
                <textarea
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  className="input-field min-h-[150px]"
                  placeholder="Paste your syllabus content here..."
                />
              </div>

              {/* Days Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days Available for Study
                </label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="input-field"
                  min="1"
                  max="365"
                />
              </div>

              {/* Exam Date */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Plan...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    <span>Generate Study Plan</span>
                  </>
                )}
              </button>
            </Card>
          </div>

          {/* Output Section */}
          <div className="animate-slide-up">
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                Your Study Plan
              </h2>

              {!studyPlan ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Your AI-generated study plan will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Overview */}
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-indigo-900 mb-2">📋 Overview</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Days</p>
                        <p className="font-bold text-indigo-900">{studyPlan.total_days}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Topics</p>
                        <p className="font-bold text-indigo-900">{studyPlan.total_topics}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Daily Topics</p>
                        <p className="font-bold text-indigo-900">{studyPlan.daily_topics}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                      <span>
                        {completedTopics.length} of {totalTopicsCount} topics completed
                      </span>
                      <span className="font-semibold text-indigo-700">{completionPercentage}%</span>
                    </div>
                    {planCompleted && (
                      <div className="mt-2 inline-flex items-center text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        Plan completed! 🎉
                      </div>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="max-h-[500px] overflow-y-auto space-y-3">
                    {studyPlan.schedule?.map((day, index) => {
                      const dayNumber = day.day || index + 1;
                      const topics = day.topics || [];
                      const isDayCompleted = completedDays.includes(dayNumber);
                      const completedForDay = topics.filter((topic) =>
                        completedTopics.includes(buildTopicKey(dayNumber, topic))
                      ).length;
                      return (
                      <div
                          key={`${dayNumber}-${index}`}
                          className={`border rounded-lg p-4 transition-all ${
                            isDayCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-indigo-300'
                          }`}
                      >
                          <div className="flex items-center justify-between mb-2 gap-3">
                            <label className="flex items-center space-x-3 font-semibold text-gray-800 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                checked={isDayCompleted}
                                onChange={() => handleDayToggle(dayNumber)}
                              />
                              <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-indigo-600" />
                                Day {dayNumber}
                              </span>
                            </label>
                            <div className="text-right">
                              <span className="block text-sm text-gray-500">{day.duration}</span>
                              <span className="text-xs font-semibold text-indigo-600">
                                {completedForDay}/{topics.length || 0} topics
                              </span>
                            </div>
                        </div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Focus: {day.focus || topics[0] || 'General review'}
                          </p>
                          <ul className="space-y-1 list-disc list-inside text-sm text-gray-700 pl-1">
                            {topics.map((topic) => (
                              <li key={buildTopicKey(dayNumber, topic)}>{topic}</li>
                          ))}
                        </ul>
                          {day.tips && (
                            <p className="text-xs text-gray-500 mt-3">
                              Tip: {day.tips}
                            </p>
                          )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
