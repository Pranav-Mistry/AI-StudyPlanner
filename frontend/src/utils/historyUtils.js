import axios from '../api/axios';

export const saveToHistory = async (feature, userId, title, data) => {
  if (!userId) return null;
  try {
    const res = await axios.post('/api/history/save', {
      user_id: userId,
      feature,
      title,
      data
    });
    if (res.data.success) {
      return res.data.item;
    }
  } catch (err) {
    console.error('Error saving to history:', err);
  }
  return null;
};

export const updateHistory = async (feature, userId, id, newData, title = '') => {
  if (!userId) return null;
  try {
    const res = await axios.post('/api/history/save', {
      user_id: userId,
      feature,
      id,
      title, // If title isn't needed, the backend will just not update it, but we can pass it if we want.
      data: newData
    });
    if (res.data.success) {
      return res.data.item;
    }
  } catch (err) {
    console.error('Error updating history:', err);
  }
  return null;
};

export const getHistory = async (feature, userId) => {
  if (!userId) return [];
  try {
    const res = await axios.get(`/api/history/${userId}?feature=${feature}`);
    if (res.data.success) {
      return res.data.history || [];
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }
  return [];
};

export const deleteFromHistory = async (feature, userId, id) => {
  if (!userId) return;
  try {
    await axios.delete('/api/history/delete', {
      data: {
        user_id: userId,
        id: id
      }
    });
  } catch (err) {
    console.error('Error deleting history item:', err);
  }
};

export const clearHistory = async (feature, userId) => {
  if (!userId) return;
  try {
    await axios.delete('/api/history/delete', {
      data: {
        user_id: userId,
        clear_feature: feature
      }
    });
  } catch (err) {
    console.error('Error clearing history:', err);
  }
};

export const formatHistoryDate = (iso) => {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
