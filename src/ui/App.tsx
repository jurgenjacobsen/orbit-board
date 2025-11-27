import { useEffect, useState, useCallback } from 'react';
import { Sidebar, KanbanBoard } from './components';
import type { Board, Card, Column, Label } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [cardLabels, setCardLabels] = useState<Map<string, Label[]>>(new Map());
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load dark mode setting
        const darkModeResult = await window.electronAPI.getSetting('darkMode');
        if (darkModeResult.success && darkModeResult.data === 'true') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }

        // Load boards
        const boardsResult = await window.electronAPI.getBoards();
        if (boardsResult.success) {
          setBoards(boardsResult.data);
          if (boardsResult.data.length > 0) {
            setSelectedBoardId(boardsResult.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load board data when selected board changes
  useEffect(() => {
    if (!selectedBoardId) {
      setColumns([]);
      setCards([]);
      setLabels([]);
      setCardLabels(new Map());
      return;
    }

    const loadBoardData = async () => {
      try {
        const [columnsResult, cardsResult, labelsResult] = await Promise.all([
          window.electronAPI.getColumns(selectedBoardId),
          window.electronAPI.getCardsByBoard(selectedBoardId),
          window.electronAPI.getLabels(selectedBoardId),
        ]);

        if (columnsResult.success) setColumns(columnsResult.data);
        if (cardsResult.success) setCards(cardsResult.data);
        if (labelsResult.success) setLabels(labelsResult.data);

        // Load card labels
        if (cardsResult.success && cardsResult.data.length > 0) {
          const labelsMap = new Map<string, Label[]>();
          for (const card of cardsResult.data) {
            const cardLabelsResult = await window.electronAPI.getCardLabels(card.id);
            if (cardLabelsResult.success) {
              labelsMap.set(card.id, cardLabelsResult.data);
            }
          }
          setCardLabels(labelsMap);
        }
      } catch (error) {
        console.error('Failed to load board data:', error);
      }
    };

    loadBoardData();
  }, [selectedBoardId]);

  // Board operations
  const handleCreateBoard = useCallback(async (name: string, description: string) => {
    const newBoard = { id: generateId(), name, description };
    const result = await window.electronAPI.createBoard(newBoard);
    if (result.success) {
      const boardsResult = await window.electronAPI.getBoards();
      if (boardsResult.success) {
        setBoards(boardsResult.data);
        setSelectedBoardId(newBoard.id);
      }
    }
  }, []);

  const handleUpdateBoard = useCallback(async (board: Board) => {
    const result = await window.electronAPI.updateBoard(board);
    if (result.success) {
      setBoards((prev) => prev.map((b) => (b.id === board.id ? board : b)));
    }
  }, []);

  const handleDeleteBoard = useCallback(async (id: string) => {
    const result = await window.electronAPI.deleteBoard(id);
    if (result.success) {
      setBoards((prev) => prev.filter((b) => b.id !== id));
      if (selectedBoardId === id) {
        const remaining = boards.filter((b) => b.id !== id);
        setSelectedBoardId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  }, [selectedBoardId, boards]);

  // Column operations
  const handleCreateColumn = useCallback(async (name: string) => {
    if (!selectedBoardId) return;
    const newColumn = {
      id: generateId(),
      board_id: selectedBoardId,
      name,
      position: columns.length,
    };
    const result = await window.electronAPI.createColumn(newColumn);
    if (result.success) {
      setColumns((prev) => [...prev, { ...newColumn, created_at: new Date().toISOString() }]);
    }
  }, [selectedBoardId, columns.length]);

  const handleUpdateColumn = useCallback(async (column: Column) => {
    const result = await window.electronAPI.updateColumn(column);
    if (result.success) {
      setColumns((prev) => prev.map((c) => (c.id === column.id ? column : c)));
    }
  }, []);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const result = await window.electronAPI.deleteColumn(columnId);
    if (result.success) {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setCards((prev) => prev.filter((c) => c.column_id !== columnId));
    }
  }, []);

  const handleReorderColumns = useCallback(async (updates: { id: string; position: number }[]) => {
    const result = await window.electronAPI.updateColumnsPositions(updates);
    if (result.success) {
      setColumns((prev) =>
        prev.map((col) => {
          const update = updates.find((u) => u.id === col.id);
          return update ? { ...col, position: update.position } : col;
        })
      );
    }
  }, []);

  // Card operations
  const handleCreateCard = useCallback(async (columnId: string, title: string) => {
    const columnCards = cards.filter((c) => c.column_id === columnId);
    const newCard = {
      id: generateId(),
      column_id: columnId,
      title,
      description: null,
      notes: null,
      due_date: null,
      position: columnCards.length,
    };
    const result = await window.electronAPI.createCard(newCard);
    if (result.success) {
      setCards((prev) => [...prev, { ...newCard, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
    }
  }, [cards]);

  const handleUpdateCard = useCallback(async (card: Card) => {
    const result = await window.electronAPI.updateCard(card);
    if (result.success) {
      setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    }
  }, []);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    const result = await window.electronAPI.deleteCard(cardId);
    if (result.success) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setCardLabels((prev) => {
        const next = new Map(prev);
        next.delete(cardId);
        return next;
      });
    }
  }, []);

  const handleMoveCard = useCallback(async (updates: { id: string; column_id: string; position: number }[]) => {
    const result = await window.electronAPI.updateCardsPositions(updates);
    if (result.success) {
      setCards((prev) =>
        prev.map((card) => {
          const update = updates.find((u) => u.id === card.id);
          return update ? { ...card, column_id: update.column_id, position: update.position } : card;
        })
      );
    }
  }, []);

  // Label operations
  const handleCreateLabel = useCallback(async (name: string, color: string) => {
    if (!selectedBoardId) return;
    const newLabel = { id: generateId(), name, color, board_id: selectedBoardId };
    const result = await window.electronAPI.createLabel(newLabel);
    if (result.success) {
      setLabels((prev) => [...prev, newLabel]);
    }
  }, [selectedBoardId]);

  const handleAddLabelToCard = useCallback(async (cardId: string, labelId: string) => {
    const result = await window.electronAPI.addLabelToCard(cardId, labelId);
    if (result.success) {
      const label = labels.find((l) => l.id === labelId);
      if (label) {
        setCardLabels((prev) => {
          const next = new Map(prev);
          const current = next.get(cardId) || [];
          next.set(cardId, [...current, label]);
          return next;
        });
      }
    }
  }, [labels]);

  const handleRemoveLabelFromCard = useCallback(async (cardId: string, labelId: string) => {
    const result = await window.electronAPI.removeLabelFromCard(cardId, labelId);
    if (result.success) {
      setCardLabels((prev) => {
        const next = new Map(prev);
        const current = next.get(cardId) || [];
        next.set(cardId, current.filter((l) => l.id !== labelId));
        return next;
      });
    }
  }, []);

  // Dark mode
  const handleToggleDarkMode = useCallback(async () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    await window.electronAPI.setSetting('darkMode', String(newDarkMode));
  }, [darkMode]);

  // Export/Import
  const handleExport = useCallback(async () => {
    await window.electronAPI.exportData();
  }, []);

  const handleImport = useCallback(async () => {
    const result = await window.electronAPI.importData();
    if (result.success) {
      // Reload all data
      const boardsResult = await window.electronAPI.getBoards();
      if (boardsResult.success) {
        setBoards(boardsResult.data);
        if (boardsResult.data.length > 0) {
          setSelectedBoardId(boardsResult.data[0].id);
        } else {
          setSelectedBoardId(null);
        }
      }
    }
  }, []);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${darkMode ? 'dark' : ''}`}>
      <div className="h-full flex bg-gray-50 dark:bg-gray-900 w-full">
        <Sidebar
          boards={boards}
          selectedBoardId={selectedBoardId}
          onSelectBoard={setSelectedBoardId}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onExport={handleExport}
          onImport={handleImport}
        />

        <div className="flex-1 h-full overflow-hidden">
          {selectedBoard ? (
            <KanbanBoard
              board={selectedBoard}
              columns={columns}
              cards={cards}
              labels={labels}
              cardLabels={cardLabels}
              onUpdateBoard={handleUpdateBoard}
              onCreateColumn={handleCreateColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onReorderColumns={handleReorderColumns}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onMoveCard={handleMoveCard}
              onCreateLabel={handleCreateLabel}
              onAddLabelToCard={handleAddLabelToCard}
              onRemoveLabelFromCard={handleRemoveLabelFromCard}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <span className="text-6xl mb-4">🪐</span>
              <h2 className="text-xl font-semibold mb-2">Welcome to Orbit Board</h2>
              <p className="text-sm">Create a board to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
