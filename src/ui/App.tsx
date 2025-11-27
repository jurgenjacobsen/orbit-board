import { useEffect, useState } from 'react'
import './App.css'
import { useKanban } from './hooks/useKanban'
import { useDarkMode } from './hooks/useDarkMode'
import { BoardList } from './components/BoardList'
import { BoardComponent } from './components/Board'

function App() {
  const { isDarkMode, toggleDarkMode, isLoading: isDarkModeLoading } = useDarkMode();
  const {
    boards,
    currentBoard,
    columns,
    cards,
    labels,
    cardLabels,
    loading,
    error,
    setError,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    selectBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    createLabel,
    updateLabel,
    deleteLabel,
    addLabelToCard,
    removeLabelFromCard
  } = useKanban();

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (error) {
      setNotification(error);
      const timer = setTimeout(() => {
        setNotification(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  const handleExport = async () => {
    const result = await window.electronAPI.exportData();
    if (result.success) {
      setNotification('Data exported successfully!');
      setTimeout(() => setNotification(null), 3000);
    } else if (result.error !== 'Export cancelled') {
      setNotification('Export failed: ' + result.error);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.importData();
    if (result.success) {
      setNotification('Data imported successfully!');
      setTimeout(() => setNotification(null), 3000);
      await fetchBoards();
    } else if (result.error !== 'Import cancelled') {
      setNotification('Import failed: ' + result.error);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (isDarkModeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : 'light'}>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.includes('failed') || notification.includes('Error')
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}>
          {notification}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main content */}
      {currentBoard ? (
        <BoardComponent
          board={currentBoard}
          columns={columns}
          cards={cards}
          labels={labels}
          cardLabels={cardLabels}
          isDarkMode={isDarkMode}
          onBack={() => selectBoard(null)}
          onCreateColumn={createColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
          onMoveColumn={moveColumn}
          onCreateCard={createCard}
          onUpdateCard={updateCard}
          onDeleteCard={deleteCard}
          onMoveCard={moveCard}
          onCreateLabel={createLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onAddLabel={addLabelToCard}
          onRemoveLabel={removeLabelFromCard}
        />
      ) : (
        <BoardList
          boards={boards}
          isDarkMode={isDarkMode}
          onSelectBoard={selectBoard}
          onCreateBoard={createBoard}
          onDeleteBoard={deleteBoard}
          onToggleDarkMode={toggleDarkMode}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
    </div>
  )
}

export default App
