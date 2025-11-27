import { useState, useRef } from 'react';
import type { Column as ColumnType, Card, Label } from '../types';
import { CardComponent } from './Card';

interface ColumnProps {
  column: ColumnType;
  cards: Card[];
  labels: Label[];
  cardLabels: Map<string, Label[]>;
  isDarkMode: boolean;
  onUpdateColumn: (column: ColumnType) => void;
  onDeleteColumn: (id: string) => void;
  onCreateCard: (columnId: string, title: string) => void;
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onAddLabel: (cardId: string, labelId: string) => void;
  onRemoveLabel: (cardId: string, labelId: string) => void;
  onCardDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onCardDragEnd: () => void;
  onCardDrop: (columnId: string, position: number) => void;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd: () => void;
  onColumnDrop: (position: number) => void;
  draggedCardId: string | null;
  draggedColumnId: string | null;
}

export function ColumnComponent({
  column,
  cards,
  labels,
  cardLabels,
  isDarkMode,
  onUpdateColumn,
  onDeleteColumn,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onAddLabel,
  onRemoveLabel,
  onCardDragStart,
  onCardDragEnd,
  onCardDrop,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  draggedCardId,
  draggedColumnId
}: ColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.name);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onUpdateColumn({ ...column, name: editTitle.trim() });
    } else {
      setEditTitle(column.name);
    }
    setIsEditingTitle(false);
  };

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onCreateCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCardId) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const cardHeight = 80;
      const index = Math.min(Math.floor(y / cardHeight), sortedCards.length);
      setDropIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCardId && dropIndex !== null) {
      onCardDrop(column.id, dropIndex);
    }
    setDropIndex(null);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const bgClass = isDarkMode ? 'bg-gray-800' : 'bg-gray-100';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const headerBgClass = isDarkMode ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div
      ref={columnRef}
      draggable={!isEditingTitle && !isAddingCard}
      onDragStart={(e) => onColumnDragStart(e, column.id)}
      onDragEnd={onColumnDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        if (draggedColumnId && draggedColumnId !== column.id) {
          onColumnDrop(column.position);
        }
      }}
      className={`${bgClass} rounded-lg w-72 flex-shrink-0 flex flex-col max-h-full ${
        draggedColumnId === column.id ? 'opacity-50' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`${headerBgClass} rounded-t-lg p-3 cursor-grab`}>
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              className={`flex-1 p-1 rounded text-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
              autoFocus
            />
          ) : (
            <h3
              className={`font-semibold ${textClass} cursor-pointer flex-1`}
              onClick={() => setIsEditingTitle(true)}
            >
              {column.name}
            </h3>
          )}
          <div className="flex items-center gap-2 ml-2">
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {cards.length}
            </span>
            <button
              onClick={() => onDeleteColumn(column.id)}
              className={`p-1 rounded hover:bg-opacity-20 hover:bg-red-500 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              title="Delete column"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {sortedCards.map((card, index) => (
          <div key={card.id}>
            {/* Drop indicator */}
            {dropIndex === index && draggedCardId && (
              <div className="h-1 bg-blue-500 rounded my-1" />
            )}
            <CardComponent
              card={card}
              labels={cardLabels.get(card.id) || []}
              allLabels={labels}
              isDarkMode={isDarkMode}
              onUpdate={onUpdateCard}
              onDelete={onDeleteCard}
              onAddLabel={onAddLabel}
              onRemoveLabel={onRemoveLabel}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
            />
          </div>
        ))}
        {/* Drop indicator at end */}
        {dropIndex === sortedCards.length && draggedCardId && (
          <div className="h-1 bg-blue-500 rounded my-1" />
        )}
      </div>

      {/* Add Card Section */}
      <div className="p-2 border-t border-opacity-20" style={{ borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}>
        {isAddingCard ? (
          <div className="space-y-2">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              className={`w-full p-2 rounded border resize-none text-sm ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCard}
                className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Add Card
              </button>
              <button
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className={`py-1 px-3 rounded text-sm ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className={`w-full p-2 rounded text-sm flex items-center gap-2 ${
              isDarkMode 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            } transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
