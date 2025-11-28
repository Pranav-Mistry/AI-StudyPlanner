import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const ProgressTracker = ({ topics, onStatusChange, onStudyTimeAdd }) => {
  const handleStatusChange = async (topicId, currentStatus) => {
    let newStatus;
    if (currentStatus === 'not_started') {
      newStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      newStatus = 'completed';
    } else {
      newStatus = 'not_started';
    }
    
    try {
      await onStatusChange(topicId, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Study Progress</h2>
        
        {topics && topics.length > 0 ? (
          <div className="space-y-4">
            {topics.map((topic) => (
              <div 
                key={topic._id || topic.topicId} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleStatusChange(topic.topicId, topic.status)}
                    className="flex-shrink-0"
                    aria-label={`Mark as ${topic.status === 'completed' ? 'not started' : 'completed'}`}
                  >
                    {getStatusIcon(topic.status)}
                  </button>
                  <span className="font-medium">{topic.title}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    topic.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : topic.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusText(topic.status)}
                  </span>
                  {topic.timeSpent > 0 && (
                    <span className="text-sm text-gray-500">
                      {Math.floor(topic.timeSpent / 60)}h {topic.timeSpent % 60}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No topics added yet. Start by adding some topics to your study plan.</p>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
