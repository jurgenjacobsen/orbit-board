import { useState, useCallback } from 'react';
import { Board, Column, Card, Label } from '../types';

export function useKanban() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [cardLabels, setCardLabels] = useState<Map<string, Label[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateId = () => crypto.randomUUID();

  // Board operations
  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getBoards();
      if (result.success) {
        setBoards(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBoard = useCallback(async (name: string, description?: string) => {
    const board = { id: generateId(), name, description: description || null };
    const result = await window.electronAPI.createBoard(board);
    if (result.success) {
      await fetchBoards();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [fetchBoards]);

  const updateBoard = useCallback(async (board: Board) => {
    const result = await window.electronAPI.updateBoard(board);
    if (result.success) {
      await fetchBoards();
    } else {
      setError(result.error);
    }
  }, [fetchBoards]);

  const deleteBoard = useCallback(async (id: string) => {
    const result = await window.electronAPI.deleteBoard(id);
    if (result.success) {
      await fetchBoards();
      if (currentBoard?.id === id) {
        setCurrentBoard(null);
        setColumns([]);
        setCards([]);
      }
    } else {
      setError(result.error);
    }
  }, [fetchBoards, currentBoard]);

  const selectBoard = useCallback(async (board: Board | null) => {
    if (!board) {
      setCurrentBoard(null);
      setColumns([]);
      setCards([]);
      setLabels([]);
      setCardLabels(new Map());
      return;
    }
    setCurrentBoard(board);
    setLoading(true);
    try {
      const [columnsResult, cardsResult, labelsResult] = await Promise.all([
        window.electronAPI.getColumns(board.id),
        window.electronAPI.getCardsByBoard(board.id),
        window.electronAPI.getLabels(board.id)
      ]);

      if (columnsResult.success) {
        setColumns(columnsResult.data);
      }
      if (cardsResult.success) {
        setCards(cardsResult.data);
      }
      if (labelsResult.success) {
        setLabels(labelsResult.data);
      }

      // Fetch card labels for all cards
      if (cardsResult.success) {
        const labelMap = new Map<string, Label[]>();
        for (const card of cardsResult.data) {
          const labelsRes = await window.electronAPI.getCardLabels(card.id);
          if (labelsRes.success) {
            labelMap.set(card.id, labelsRes.data);
          }
        }
        setCardLabels(labelMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Column operations
  const createColumn = useCallback(async (name: string) => {
    if (!currentBoard) return;
    const column = {
      id: generateId(),
      board_id: currentBoard.id,
      name,
      position: columns.length
    };
    const result = await window.electronAPI.createColumn(column);
    if (result.success) {
      setColumns(prev => [...prev, { ...column, created_at: new Date().toISOString() }]);
    } else {
      setError(result.error);
    }
  }, [currentBoard, columns.length]);

  const updateColumn = useCallback(async (column: Column) => {
    const result = await window.electronAPI.updateColumn(column);
    if (result.success) {
      setColumns(prev => prev.map(c => c.id === column.id ? column : c));
    } else {
      setError(result.error);
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    const result = await window.electronAPI.deleteColumn(id);
    if (result.success) {
      setColumns(prev => prev.filter(c => c.id !== id));
      setCards(prev => prev.filter(c => c.column_id !== id));
    } else {
      setError(result.error);
    }
  }, []);

  const moveColumn = useCallback(async (columnId: string, newPosition: number) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const updatedColumns = [...columns];
    const oldPosition = column.position;

    // Reorder columns
    updatedColumns.forEach(c => {
      if (c.id === columnId) {
        c.position = newPosition;
      } else if (oldPosition < newPosition) {
        if (c.position > oldPosition && c.position <= newPosition) {
          c.position--;
        }
      } else {
        if (c.position >= newPosition && c.position < oldPosition) {
          c.position++;
        }
      }
    });

    const sortedColumns = updatedColumns.sort((a, b) => a.position - b.position);
    setColumns(sortedColumns);

    const result = await window.electronAPI.updateColumnsPositions(
      sortedColumns.map((c, i) => ({ id: c.id, position: i }))
    );
    if (!result.success) {
      setError(result.error);
    }
  }, [columns]);

  // Card operations
  const createCard = useCallback(async (columnId: string, title: string, description?: string) => {
    const columnCards = cards.filter(c => c.column_id === columnId);
    const card = {
      id: generateId(),
      column_id: columnId,
      title,
      description: description || null,
      notes: null,
      due_date: null,
      position: columnCards.length
    };
    const result = await window.electronAPI.createCard(card);
    if (result.success) {
      const newCard = {
        ...card,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCards(prev => [...prev, newCard]);
      setCardLabels(prev => new Map(prev).set(card.id, []));
    } else {
      setError(result.error);
    }
  }, [cards]);

  const updateCard = useCallback(async (card: Card) => {
    const result = await window.electronAPI.updateCard(card);
    if (result.success) {
      setCards(prev => prev.map(c => c.id === card.id ? card : c));
    } else {
      setError(result.error);
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const result = await window.electronAPI.deleteCard(id);
    if (result.success) {
      setCards(prev => prev.filter(c => c.id !== id));
      setCardLabels(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } else {
      setError(result.error);
    }
  }, []);

  const moveCard = useCallback(async (cardId: string, targetColumnId: string, newPosition: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const sourceColumnId = card.column_id;
    const isMovingColumns = sourceColumnId !== targetColumnId;

    let updatedCards = [...cards];

    if (isMovingColumns) {
      // Remove from source column and update positions
      const sourceCards = updatedCards
        .filter(c => c.column_id === sourceColumnId && c.id !== cardId)
        .sort((a, b) => a.position - b.position);
      sourceCards.forEach((c, i) => { c.position = i; });

      // Add to target column
      const targetCards = updatedCards
        .filter(c => c.column_id === targetColumnId)
        .sort((a, b) => a.position - b.position);

      // Insert at new position
      targetCards.forEach(c => {
        if (c.position >= newPosition) {
          c.position++;
        }
      });

      // Update the moved card
      updatedCards = updatedCards.map(c => {
        if (c.id === cardId) {
          return { ...c, column_id: targetColumnId, position: newPosition };
        }
        return c;
      });
    } else {
      // Moving within same column
      const columnCards = updatedCards
        .filter(c => c.column_id === sourceColumnId)
        .sort((a, b) => a.position - b.position);

      const oldPosition = card.position;
      columnCards.forEach(c => {
        if (c.id === cardId) {
          c.position = newPosition;
        } else if (oldPosition < newPosition) {
          if (c.position > oldPosition && c.position <= newPosition) {
            c.position--;
          }
        } else {
          if (c.position >= newPosition && c.position < oldPosition) {
            c.position++;
          }
        }
      });
    }

    setCards(updatedCards);

    const result = await window.electronAPI.updateCardsPositions(
      updatedCards.map(c => ({ id: c.id, column_id: c.column_id, position: c.position }))
    );
    if (!result.success) {
      setError(result.error);
    }
  }, [cards]);

  // Label operations
  const createLabel = useCallback(async (name: string, color: string) => {
    if (!currentBoard) return;
    const label = {
      id: generateId(),
      name,
      color,
      board_id: currentBoard.id
    };
    const result = await window.electronAPI.createLabel(label);
    if (result.success) {
      setLabels(prev => [...prev, label]);
    } else {
      setError(result.error);
    }
  }, [currentBoard]);

  const updateLabel = useCallback(async (label: Label) => {
    const result = await window.electronAPI.updateLabel(label);
    if (result.success) {
      setLabels(prev => prev.map(l => l.id === label.id ? label : l));
    } else {
      setError(result.error);
    }
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    const result = await window.electronAPI.deleteLabel(id);
    if (result.success) {
      setLabels(prev => prev.filter(l => l.id !== id));
      // Remove from all cards
      setCardLabels(prev => {
        const newMap = new Map(prev);
        newMap.forEach((labels, cardId) => {
          newMap.set(cardId, labels.filter(l => l.id !== id));
        });
        return newMap;
      });
    } else {
      setError(result.error);
    }
  }, []);

  const addLabelToCard = useCallback(async (cardId: string, labelId: string) => {
    const result = await window.electronAPI.addLabelToCard(cardId, labelId);
    if (result.success) {
      const label = labels.find(l => l.id === labelId);
      if (label) {
        setCardLabels(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(cardId) || [];
          if (!existing.find(l => l.id === labelId)) {
            newMap.set(cardId, [...existing, label]);
          }
          return newMap;
        });
      }
    } else {
      setError(result.error);
    }
  }, [labels]);

  const removeLabelFromCard = useCallback(async (cardId: string, labelId: string) => {
    const result = await window.electronAPI.removeLabelFromCard(cardId, labelId);
    if (result.success) {
      setCardLabels(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(cardId) || [];
        newMap.set(cardId, existing.filter(l => l.id !== labelId));
        return newMap;
      });
    } else {
      setError(result.error);
    }
  }, []);

  return {
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
  };
}
