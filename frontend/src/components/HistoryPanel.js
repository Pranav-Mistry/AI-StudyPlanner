import React from 'react';
import { Clock, Trash2, ChevronRight, HistoryIcon, X } from 'lucide-react';
import { formatHistoryDate, deleteFromHistory } from '../utils/historyUtils';

/**
 * Reusable history panel — slides in from the right or shows as a sidebar.
 * Props:
 *   feature     (string)  — e.g. 'summarizer'
 *   userId      (string)
 *   items       (array)   — history items from getHistory()
 *   onRestore   (fn)      — called with item.data when user clicks an item
 *   onRefresh   (fn)      — refresh history after deletion
 *   onClose     (fn)      — close the panel
 */
const HistoryPanel = ({ feature, userId, items, onRestore, onRefresh, onClose }) => {
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteFromHistory(feature, userId, id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backdropFilter: 'blur(2px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">History</h2>
            <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{items.length}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/40 text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
              <Clock className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No history yet</p>
              <p className="text-sm mt-1">Your saved items will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(item => (
                <li
                  key={item.id}
                  onClick={() => { onRestore(item.data); onClose(); }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-indigo-50 cursor-pointer group transition-all"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatHistoryDate(item.createdAt)}</p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
