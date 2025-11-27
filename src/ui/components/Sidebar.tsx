import { useState } from 'react';
import type { Board } from '../types';

interface SidebarProps {
  boards: Board[];
  selectedBoardId: string | null;
  onSelectBoard: (id: string) => void;
  onCreateBoard: (name: string, description: string) => void;
  onDeleteBoard: (id: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function Sidebar({
  boards,
  selectedBoardId,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  darkMode,
  onToggleDarkMode,
  onExport,
  onImport,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      onCreateBoard(newBoardName.trim(), newBoardDescription.trim());
      setNewBoardName('');
      setNewBoardDescription('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-2xl">🪐</span>
          Orbit Board
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Boards
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
            title="Create new board"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {isCreating && (
          <div className="mb-4 p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
            <input
              type="text"
              placeholder="Board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateBoard}
                className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewBoardName('');
                  setNewBoardDescription('');
                }}
                className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {boards.map((board) => (
            <div
              key={board.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                selectedBoardId === board.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => onSelectBoard(board.id)}
            >
              <span className="truncate text-sm">{board.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${board.name}"? This cannot be undone.`)) {
                    onDeleteBoard(board.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                title="Delete board"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {boards.length === 0 && !isCreating && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No boards yet. Create one to get started!
          </p>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          {darkMode ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Light Mode
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark Mode
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button
            onClick={onImport}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
