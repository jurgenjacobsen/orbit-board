import type { Card, Label } from '../types';

interface KanbanCardProps {
  card: Card;
  labels: Label[];
  onEdit: (card: Card) => void;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
}

export function KanbanCard({ card, labels, onEdit, onDragStart }: KanbanCardProps) {
  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const isDueSoon = card.due_date && !isOverdue && 
    new Date(card.due_date).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, card.column_id)}
      onClick={() => onEdit(card)}
      className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow"
    >
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        {card.title}
      </h4>

      {card.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {card.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs">
        {card.due_date && (
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded ${
              isOverdue
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : isDueSoon
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(card.due_date)}
          </span>
        )}

        {card.notes && (
          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
