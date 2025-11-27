import { useState } from 'react';
import type { Board, Card, Column, Label } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { CardModal } from './CardModal';

interface KanbanBoardProps {
  board: Board;
  columns: Column[];
  cards: Card[];
  labels: Label[];
  cardLabels: Map<string, Label[]>;
  onUpdateBoard: (board: Board) => void;
  onCreateColumn: (name: string) => void;
  onUpdateColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onReorderColumns: (columns: { id: string; position: number }[]) => void;
  onCreateCard: (columnId: string, title: string) => void;
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCard: (cards: { id: string; column_id: string; position: number }[]) => void;
  onCreateLabel: (name: string, color: string) => void;
  onAddLabelToCard: (cardId: string, labelId: string) => void;
  onRemoveLabelFromCard: (cardId: string, labelId: string) => void;
}

export function KanbanBoard({
  board,
  columns,
  cards,
  labels,
  cardLabels,
  onUpdateBoard,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onReorderColumns,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onCreateLabel,
  onAddLabelToCard,
  onRemoveLabelFromCard,
}: KanbanBoardProps) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(board.name);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedCardSourceColumn, setDraggedCardSourceColumn] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const getCardsByColumn = (columnId: string) => {
    return cards.filter((c) => c.column_id === columnId).sort((a, b) => a.position - b.position);
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onCreateColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== board.name) {
      onUpdateBoard({ ...board, name: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // Card drag & drop
  const handleCardDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('sourceColumnId', columnId);
    setDraggedCardId(cardId);
    setDraggedCardSourceColumn(columnId);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');

    if (!cardId) return;

    const targetCards = getCardsByColumn(targetColumnId);
    const newPosition = targetCards.length;

    // Update all cards positions
    const updates: { id: string; column_id: string; position: number }[] = [];

    if (sourceColumnId === targetColumnId) {
      // Reorder within same column - just update positions
      targetCards.forEach((card, idx) => {
        updates.push({ id: card.id, column_id: targetColumnId, position: idx });
      });
    } else {
      // Move to different column
      updates.push({ id: cardId, column_id: targetColumnId, position: newPosition });
    }

    if (updates.length > 0) {
      onMoveCard(updates);
    }

    setDraggedCardId(null);
    setDraggedCardSourceColumn(null);
  };

  // Column drag & drop
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('columnId', columnId);
    setDraggedColumnId(columnId);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData('columnId');

    if (!sourceColumnId || sourceColumnId === targetColumnId) {
      setDraggedColumnId(null);
      return;
    }

    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const sourceIndex = sortedColumns.findIndex((c) => c.id === sourceColumnId);
    const targetIndex = sortedColumns.findIndex((c) => c.id === targetColumnId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      return;
    }

    // Remove source and insert at target position
    const reordered = [...sortedColumns];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Update positions
    const updates = reordered.map((col, idx) => ({ id: col.id, position: idx }));
    onReorderColumns(updates);

    setDraggedColumnId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setEditedTitle(board.name);
                setIsEditingTitle(false);
              }
            }}
            className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <h2
            onClick={() => {
              setEditedTitle(board.name);
              setIsEditingTitle(true);
            }}
            className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-blue-500 dark:hover:text-blue-400"
          >
            {board.name}
          </h2>
        )}
        {board.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-4">{board.description}</p>
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full items-start">
          {columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={getCardsByColumn(column.id)}
                cardLabels={cardLabels}
                onEditCard={setEditingCard}
                onCreateCard={onCreateCard}
                onEditColumn={onUpdateColumn}
                onDeleteColumn={onDeleteColumn}
                onDragStart={handleCardDragStart}
                onDragOver={handleCardDragOver}
                onDrop={handleCardDrop}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
              />
            ))}

          {/* Add Column Button */}
          {isAddingColumn ? (
            <div className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') {
                    setNewColumnName('');
                    setIsAddingColumn(false);
                  }
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                >
                  Add Column
                </button>
                <button
                  onClick={() => {
                    setNewColumnName('');
                    setIsAddingColumn(false);
                  }}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex-shrink-0 w-72 h-12 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800/30 hover:bg-gray-200 dark:hover:bg-gray-800/50 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Column
            </button>
          )}
        </div>
      </div>

      {/* Card Edit Modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          labels={labels}
          cardLabels={cardLabels.get(editingCard.id) || []}
          onSave={(card) => {
            onUpdateCard(card);
            setEditingCard(null);
          }}
          onDelete={(cardId) => {
            onDeleteCard(cardId);
            setEditingCard(null);
          }}
          onClose={() => setEditingCard(null)}
          onAddLabel={onAddLabelToCard}
          onRemoveLabel={onRemoveLabelFromCard}
          onCreateLabel={onCreateLabel}
        />
      )}
    </div>
  );
}
