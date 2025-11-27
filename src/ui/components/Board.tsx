import { useState } from 'react';
import type { Board as BoardType, Column, Card, Label } from '../types';
import { ColumnComponent } from './Column';

interface BoardProps {
  board: BoardType;
  columns: Column[];
  cards: Card[];
  labels: Label[];
  cardLabels: Map<string, Label[]>;
  isDarkMode: boolean;
  onBack: () => void;
  onCreateColumn: (name: string) => void;
  onUpdateColumn: (column: Column) => void;
  onDeleteColumn: (id: string) => void;
  onMoveColumn: (columnId: string, newPosition: number) => void;
  onCreateCard: (columnId: string, title: string) => void;
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (cardId: string, targetColumnId: string, newPosition: number) => void;
  onCreateLabel: (name: string, color: string) => void;
  onUpdateLabel: (label: Label) => void;
  onDeleteLabel: (id: string) => void;
  onAddLabel: (cardId: string, labelId: string) => void;
  onRemoveLabel: (cardId: string, labelId: string) => void;
}

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1e293b'
];

export function BoardComponent({
  board,
  columns,
  cards,
  labels,
  cardLabels,
  isDarkMode,
  onBack,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onMoveColumn,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCard,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onAddLabel,
  onRemoveLabel
}: BoardProps) {
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedCardSourceColumnId, setDraggedCardSourceColumnId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const handleCardDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggedCardId(cardId);
    setDraggedCardSourceColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragEnd = () => {
    setDraggedCardId(null);
    setDraggedCardSourceColumnId(null);
  };

  const handleCardDrop = (columnId: string, position: number) => {
    if (draggedCardId) {
      onMoveCard(draggedCardId, columnId, position);
    }
    setDraggedCardId(null);
    setDraggedCardSourceColumnId(null);
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
  };

  const handleColumnDrop = (targetPosition: number) => {
    if (draggedColumnId) {
      onMoveColumn(draggedColumnId, targetPosition);
    }
    setDraggedColumnId(null);
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onCreateColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    }
  };

  const handleAddLabel = () => {
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0]);
    }
  };

  const handleUpdateLabel = () => {
    if (editingLabel && editingLabel.name.trim()) {
      onUpdateLabel(editingLabel);
      setEditingLabel(null);
    }
  };

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const headerBgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';

  return (
    <div className={`flex flex-col h-screen ${bgClass}`}>
      {/* Header */}
      <header className={`${headerBgClass} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              <svg className={`w-5 h-5 ${textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className={`text-xl font-bold ${textClass}`}>{board.name}</h1>
              {board.description && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {board.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowLabelManager(!showLabelManager)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Labels
          </button>
        </div>

        {/* Label Manager */}
        {showLabelManager && (
          <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold mb-3 ${textClass}`}>Manage Labels</h3>

            {/* Existing Labels */}
            <div className="space-y-2 mb-4">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-2">
                  {editingLabel?.id === label.id ? (
                    <>
                      <input
                        type="text"
                        value={editingLabel.name}
                        onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                        className={`flex-1 p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                      />
                      <div className="flex gap-1">
                        {LABEL_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingLabel({ ...editingLabel, color })}
                            className={`w-6 h-6 rounded ${editingLabel.color === color ? 'ring-2 ring-white' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button onClick={handleUpdateLabel} className="text-green-500 hover:text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button onClick={() => setEditingLabel(null)} className="text-gray-400 hover:text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="flex-1 px-3 py-1 rounded text-sm font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                      <button
                        onClick={() => setEditingLabel(label)}
                        className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteLabel(label.id)}
                        className="p-1 rounded hover:bg-red-500 hover:bg-opacity-20"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* New Label Form */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="New label name"
                className={`flex-1 p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'}`}
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`w-6 h-6 rounded ${newLabelColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                onClick={handleAddLabel}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Board Content */}
      <main className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full">
          {sortedColumns.map(column => (
            <ColumnComponent
              key={column.id}
              column={column}
              cards={cards.filter(c => c.column_id === column.id)}
              labels={labels}
              cardLabels={cardLabels}
              isDarkMode={isDarkMode}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
              onCreateCard={onCreateCard}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
              onAddLabel={onAddLabel}
              onRemoveLabel={onRemoveLabel}
              onCardDragStart={handleCardDragStart}
              onCardDragEnd={handleCardDragEnd}
              onCardDrop={handleCardDrop}
              onColumnDragStart={handleColumnDragStart}
              onColumnDragEnd={handleColumnDragEnd}
              onColumnDrop={handleColumnDrop}
              draggedCardId={draggedCardId}
              draggedColumnId={draggedColumnId}
            />
          ))}

          {/* Add Column */}
          <div className="w-72 flex-shrink-0">
            {isAddingColumn ? (
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name"
                  className={`w-full p-2 rounded mb-2 ${isDarkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'}`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') {
                      setIsAddingColumn(false);
                      setNewColumnName('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddColumn}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Add Column
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnName('');
                    }}
                    className={`py-2 px-3 rounded ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className={`w-full p-3 rounded-lg flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-gray-800 bg-opacity-50 hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                    : 'bg-gray-200 bg-opacity-50 hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                } transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another column
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
