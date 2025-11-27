import { useState } from 'react';
import type { Card, Column, Label } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  cardLabels: Map<string, Label[]>;
  onEditCard: (card: Card) => void;
  onCreateCard: (columnId: string, title: string) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver: (e: React.DragEvent) => void;
  onColumnDrop: (e: React.DragEvent, columnId: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  cardLabels,
  onEditCard,
  onCreateCard,
  onEditColumn,
  onDeleteColumn,
  onDragStart,
  onDragOver,
  onDrop,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
}: KanbanColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.name);

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onCreateCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== column.name) {
      onEditColumn({ ...column, name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div
      onDragOver={(e) => {
        onColumnDragOver(e);
        onDragOver(e);
      }}
      onDrop={(e) => {
        onColumnDrop(e, column.id);
        onDrop(e, column.id);
      }}
      className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3 flex flex-col max-h-full"
    >
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onColumnDragStart(e, column.id);
        }}
        className="flex items-center justify-between mb-3 group cursor-grab active:cursor-grabbing"
      >
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') {
                setEditedName(column.name);
                setIsEditingName(false);
              }
            }}
            className="flex-1 px-2 py-1 text-sm font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
            autoFocus
            draggable={false}
          />
        ) : (
          <h3
            onClick={() => {
              setEditedName(column.name);
              setIsEditingName(true);
            }}
            className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-gray-900 dark:hover:text-white"
          >
            {column.name}
            <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal">
              {cards.length}
            </span>
          </h3>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete column "${column.name}" and all its cards?`)) {
              onDeleteColumn(column.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
          title="Delete column"
          draggable={false}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            labels={cardLabels.get(card.id) || []}
            onEdit={onEditCard}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      {isAddingCard ? (
        <div className="mt-2">
          <textarea
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Enter card title..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white resize-none"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddCard();
              }
              if (e.key === 'Escape') {
                setNewCardTitle('');
                setIsAddingCard(false);
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddCard}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
            >
              Add Card
            </button>
            <button
              onClick={() => {
                setNewCardTitle('');
                setIsAddingCard(false);
              }}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingCard(true)}
          className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Card
        </button>
      )}
    </div>
  );
}
