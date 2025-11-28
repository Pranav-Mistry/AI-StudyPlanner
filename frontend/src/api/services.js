import axios from './axios';

// Study Plan Services
export const generateStudyPlan = async (data) => {
  const response = await axios.post('/api/study-plan/generate', data);
  return response.data;
};

// Syllabus Services
export const uploadSyllabus = async (formData) => {
  const response = await axios.post('/api/syllabus/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Notes Services
export const summarizeNotes = async (text) => {
  const response = await axios.post('/api/notes/summarize', { text });
  return response.data;
};

// AI Assistant Services
export const explainConcept = async (concept) => {
  try {
    const response = await axios.post('/api/explain', { concept });
    return {
      success: true,
      explanation: response.data.explanation || response.data.message,
      ...response.data
    };
  } catch (error) {
    console.error('Explain Concept Error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to explain concept'
    };
  }
};

export const answerQuestion = async ({ question, context }) => {
  try {
    const response = await axios.post('/api/qa', { 
      question: question.trim(),
      context: context.trim()
    });
    
    return {
      success: true,
      answer: response.data.answer || response.data.message,
      confidence: response.data.confidence,
      ...response.data
    };
  } catch (error) {
    console.error('Answer Question Error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get answer'
    };
  }
};

// Progress Services
export const updateProgress = async (data) => {
  const response = await axios.post('/api/progress/update', data);
  return response.data;
};

export const getProgress = async (userId) => {
  const response = await axios.get(`/api/progress/${userId}`);
  return response.data;
};

// Quiz Services
export const generateQuiz = async (formData) => {
  const response = await axios.post('/api/quiz/generate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const submitQuizResult = async (data) => {
  const response = await axios.post('/api/quiz/submit', data);
  return response.data;
};

// Leaderboard Services
export const getLeaderboard = async () => {
  const response = await axios.get('/api/leaderboard');
  return response.data;
};

// Health Check
export const healthCheck = async () => {
  const response = await axios.get('/health');
  return response.data;
};
