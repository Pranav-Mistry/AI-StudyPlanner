const express = require('express');
const router = express.Router();
const ProgressService = require('../services/progressService');
const auth = require('../middleware/auth');

// Get user progress
router.get('/', auth, async (req, res) => {
  try {
    const progress = await ProgressService.getUserProgress(req.user.id);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update topic status
router.put('/topics/:topicId/status', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { status } = req.body;
    
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const progress = await ProgressService.updateTopicStatus(
      req.user.id,
      topicId,
      status
    );
    
    res.json(progress);
  } catch (error) {
    console.error('Error updating topic status:', error);
    res.status(500).json({ error: 'Failed to update topic status' });
  }
});

// Add study time to a topic
router.post('/topics/:topicId/study-time', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { minutes } = req.body;
    
    if (typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({ error: 'Invalid minutes value' });
    }

    const progress = await ProgressService.addStudyTime(
      req.user.id,
      topicId,
      minutes
    );
    
    res.json(progress);
  } catch (error) {
    console.error('Error adding study time:', error);
    res.status(500).json({ error: 'Failed to add study time' });
  }
});

// Initialize or update topics
router.post('/topics', auth, async (req, res) => {
  try {
    const { topics } = req.body;
    
    if (!Array.isArray(topics)) {
      return res.status(400).json({ error: 'Topics must be an array' });
    }

    const progress = await ProgressService.updateProgress(
      req.user.id,
      topics
    );
    
    res.json(progress);
  } catch (error) {
    console.error('Error initializing topics:', error);
    res.status(500).json({ error: 'Failed to initialize topics' });
  }
});

module.exports = router;
