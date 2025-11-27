import { useState, useRef } from 'react';
import type { Card as CardType, Label } from '../types';

interface CardProps {
  card: CardType;
  labels: Label[];
  allLabels: Label[];
  isDarkMode: boolean;
  onUpdate: (card: CardType) => void;
  onDelete: (id: string) => void;
  onAddLabel: (cardId: string, labelId: string) => void;
  onRemoveLabel: (cardId: string, labelId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onDragEnd: () => void;
}

export function CardComponent({
  card,
  labels,
  allLabels,
  isDarkMode,
  onUpdate,
  onDelete,
  onAddLabel,
  onRemoveLabel,
  onDragStart,
  onDragEnd
}: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');
  const [editDueDate, setEditDueDate] = useState(card.due_date || '');
  const cardRef = useRef<HTMLDivElement>(null);

  const getDueDateStatus = () => {
    if (!card.due_date) return null;
    const now = new Date();
    const dueDate = new Date(card.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  };

  const handleSave = () => {
    onUpdate({
      ...card,
      title: editTitle,
      description: editDescription || null,
      due_date: editDueDate || null
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setEditDescription(card.description || '');
    setEditDueDate(card.due_date || '');
    setIsEditing(false);
  };

  const dueDateStatus = getDueDateStatus();
  const bgClass = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const borderClass = isDarkMode ? 'border-gray-600' : 'border-gray-200';

  return (
    <div
      ref={cardRef}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, card.id, card.column_id)}
      onDragEnd={onDragEnd}
      className={`${bgClass} ${textClass} rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing border ${borderClass} hover:shadow-md transition-shadow`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            placeholder="Card title"
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className={`w-full p-2 rounded border resize-none ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            placeholder="Description (optional)"
            rows={3}
          />
          <div>
            <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Due Date</label>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className={`flex-1 py-1 px-3 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {labels.map(label => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h4 className="font-medium mb-1">{card.title}</h4>

          {/* Description preview */}
          {card.description && (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2 mb-2`}>
              {card.description}
            </p>
          )}

          {/* Due date */}
          {card.due_date && (
            <div className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded ${
              dueDateStatus === 'overdue' ? 'bg-red-500 text-white' :
              dueDateStatus === 'today' ? 'bg-orange-500 text-white' :
              dueDateStatus === 'soon' ? 'bg-yellow-500 text-gray-900' :
              isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(card.due_date).toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-2 border-t border-opacity-30" style={{ borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}>
            <button
              onClick={() => setIsEditing(true)}
              className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Edit
            </button>
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Labels
            </button>
            <button
              onClick={() => onDelete(card.id)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          </div>

          {/* Label picker */}
          {showLabelPicker && (
            <div className={`mt-2 p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium mb-2">Toggle Labels</div>
              <div className="flex flex-wrap gap-1">
                {allLabels.map(label => {
                  const isSelected = labels.some(l => l.id === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => isSelected ? onRemoveLabel(card.id, label.id) : onAddLabel(card.id, label.id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-opacity ${
                        isSelected ? 'opacity-100 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: label.color, color: 'white' }}
                    >
                      {label.name}
                    </button>
                  );
                })}
                {allLabels.length === 0 && (
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No labels created
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
