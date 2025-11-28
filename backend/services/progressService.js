const Progress = require('../models/progress');

class ProgressService {
  // Create or update user's progress
  static async updateProgress(userId, topics) {
    try {
      // Check if progress exists for user
      let progress = await Progress.findOne({ userId });
      
      if (!progress) {
        // Create new progress document if it doesn't exist
        progress = new Progress({
          userId,
          topics: topics.map(topic => ({
            topicId: topic.id || Math.random().toString(36).substr(2, 9),
            title: topic.title,
            status: 'not_started'
          })),
          totalTopics: topics.length
        });
      } else {
        // Update existing topics or add new ones
        topics.forEach(topic => {
          const existingTopic = progress.topics.find(t => t.title === topic.title);
          if (!existingTopic) {
            progress.topics.push({
              topicId: topic.id || Math.random().toString(36).substr(2, 9),
              title: topic.title,
              status: 'not_started'
            });
            progress.totalTopics += 1;
          }
        });
      }

      await progress.save();
      return progress;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Update topic status
  static async updateTopicStatus(userId, topicId, status) {
    try {
      const progress = await Progress.findOne({ userId });
      if (!progress) {
        throw new Error('Progress not found');
      }

      const topic = progress.topics.id(topicId);
      if (!topic) {
        throw new Error('Topic not found');
      }

      topic.status = status;
      topic.lastUpdated = new Date();
      
      if (status === 'completed') {
        topic.completedAt = new Date();
        if (!topic.startedAt) {
          topic.startedAt = new Date();
        }
      } else if (status === 'in_progress' && !topic.startedAt) {
        topic.startedAt = new Date();
      }

      // Recalculate progress
      const completed = progress.topics.filter(t => t.status === 'completed').length;
      progress.completedTopics = completed;
      progress.progressPercentage = Math.round((completed / progress.topics.length) * 100);
      progress.lastUpdated = new Date();

      await progress.save();
      return progress;
    } catch (error) {
      console.error('Error updating topic status:', error);
      throw error;
    }
  }

  // Get user progress
  static async getUserProgress(userId) {
    try {
      const progress = await Progress.findOne({ userId });
      if (!progress) {
        return {
          totalTopics: 0,
          completedTopics: 0,
          progressPercentage: 0,
          topics: []
        };
      }
      return progress;
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  // Add study time to a topic
  static async addStudyTime(userId, topicId, minutes) {
    try {
      const progress = await Progress.findOne({ userId });
      if (!progress) {
        throw new Error('Progress not found');
      }

      const topic = progress.topics.id(topicId);
      if (!topic) {
        throw new Error('Topic not found');
      }

      topic.timeSpent = (topic.timeSpent || 0) + minutes;
      topic.lastStudied = new Date();
      
      if (topic.status === 'not_started') {
        topic.status = 'in_progress';
        topic.startedAt = topic.startedAt || new Date();
      }

      await progress.save();
      return progress;
    } catch (error) {
      console.error('Error adding study time:', error);
      throw error;
    }
  }
}

module.exports = ProgressService;
