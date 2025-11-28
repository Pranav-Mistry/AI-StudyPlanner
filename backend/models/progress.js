const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topics: [{
    topicId: String,
    title: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    startedAt: Date,
    completedAt: Date,
    timeSpent: {  // in minutes
      type: Number,
      default: 0
    },
    lastStudied: Date
  }],
  totalTopics: {
    type: Number,
    default: 0
  },
  completedTopics: {
    type: Number,
    default: 0
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update progress percentage when topics are updated
progressSchema.pre('save', function(next) {
  if (this.topics && this.topics.length > 0) {
    const completed = this.topics.filter(t => t.status === 'completed').length;
    this.completedTopics = completed;
    this.progressPercentage = Math.round((completed / this.topics.length) * 100);
  }
  next();
});

module.exports = mongoose.model('Progress', progressSchema);
