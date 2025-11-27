import { useState, useEffect } from 'react';
import type { Card, Label } from '../types';

interface CardModalProps {
  card: Card;
  labels: Label[];
  cardLabels: Label[];
  onSave: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onClose: () => void;
  onAddLabel: (cardId: string, labelId: string) => void;
  onRemoveLabel: (cardId: string, labelId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
}

const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
];

export function CardModal({
  card,
  labels,
  cardLabels,
  onSave,
  onDelete,
  onClose,
  onAddLabel,
  onRemoveLabel,
  onCreateLabel,
}: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [notes, setNotes] = useState(card.notes || '');
  const [dueDate, setDueDate] = useState(card.due_date || '');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        ...card,
        title: title.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        due_date: dueDate || null,
      });
    }
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName('');
    }
  };

  const isLabelAttached = (labelId: string) => {
    return cardLabels.some((l) => l.id === labelId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-xl font-semibold bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 -ml-2"
              placeholder="Card title"
            />
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Labels Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {cardLabels.map((label) => (
                <span
                  key={label.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium text-white cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: label.color }}
                  onClick={() => onRemoveLabel(card.id, label.id)}
                  title="Click to remove"
                >
                  {label.name}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              ))}
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-full hover:border-blue-500 hover:text-blue-500"
              >
                + Add Label
              </button>
            </div>

            {showLabelPicker && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="space-y-2 mb-3">
                  {labels
                    .filter((l) => !isLabelAttached(l.id))
                    .map((label) => (
                      <button
                        key={label.id}
                        onClick={() => onAddLabel(card.id, label.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label.name}</span>
                      </button>
                    ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="New label name"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-6 h-6 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-700' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCreateLabel}
                    className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</h4>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {dueDate && (
                <button
                  onClick={() => setDueDate('')}
                  className="p-2 text-gray-400 hover:text-red-500"
                  title="Clear due date"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                if (confirm('Delete this card? This cannot be undone.')) {
                  onDelete(card.id);
                }
              }}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            >
              Delete Card
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
