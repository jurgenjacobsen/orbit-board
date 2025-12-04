import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Trash2, Edit2 } from "lucide-react";
import { getApi } from "../utils/mockApi";

declare global {
    interface Window {
        api: any;
    }
}

interface Board {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Column {
    id: string;
    board_id: string;
    name: string;
    position: number;
    created_at: string;
}

interface Card {
    id: string;
    column_id: string;
    title: string;
    description: string | null;
    notes: string | null;
    due_date: string | null;
    position: number;
    created_at: string;
    updated_at: string;
}

export default function BoardPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [cards, setCards] = useState<{ [columnId: string]: Card[] }>({});
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");
    const [isAddingCard, setIsAddingCard] = useState<string | null>(null);
    const [newCardTitle, setNewCardTitle] = useState("");
    const [draggedCard, setDraggedCard] = useState<Card | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    useEffect(() => {
        if (boardId) {
            loadBoard();
            loadColumns();
        }
    }, [boardId]);

    const loadBoard = async () => {
        try {
            const api = getApi();
            const result = await api.getBoard(boardId);
            if (result.success) {
                setBoard(result.data);
            }
        } catch (error) {
            console.error("Failed to load board:", error);
        }
    };

    const loadColumns = async () => {
        try {
            const api = getApi();
            const result = await api.getColumns(boardId);
            if (result.success) {
                const sortedColumns = result.data.sort((a: Column, b: Column) => a.position - b.position);
                setColumns(sortedColumns);
                
                // Load cards for each column
                for (const column of sortedColumns) {
                    await loadCards(column.id);
                }
            }
        } catch (error) {
            console.error("Failed to load columns:", error);
        }
    };

    const loadCards = async (columnId: string) => {
        try {
            const api = getApi();
            const result = await api.getCards(columnId);
            if (result.success) {
                const sortedCards = result.data.sort((a: Card, b: Card) => a.position - b.position);
                setCards(prev => ({ ...prev, [columnId]: sortedCards }));
            }
        } catch (error) {
            console.error("Failed to load cards:", error);
        }
    };

    const createColumn = async () => {
        if (!newColumnName.trim() || !boardId) return;

        try {
            const api = getApi();
            const column = {
                id: crypto.randomUUID(),
                board_id: boardId,
                name: newColumnName,
                position: columns.length,
            };

            const result = await api.createColumn(column);
            if (result.success) {
                await loadColumns();
                setIsAddingColumn(false);
                setNewColumnName("");
            }
        } catch (error) {
            console.error("Failed to create column:", error);
        }
    };

    const deleteColumn = async (columnId: string) => {
        if (!confirm("Are you sure you want to delete this column? All cards in it will be deleted.")) return;

        try {
            const api = getApi();
            const result = await api.deleteColumn(columnId);
            if (result.success) {
                await loadColumns();
            }
        } catch (error) {
            console.error("Failed to delete column:", error);
        }
    };

    const createCard = async (columnId: string) => {
        if (!newCardTitle.trim()) return;

        try {
            const api = getApi();
            const columnCards = cards[columnId] || [];
            const card = {
                id: crypto.randomUUID(),
                column_id: columnId,
                title: newCardTitle,
                description: null,
                notes: null,
                due_date: null,
                position: columnCards.length,
            };

            const result = await api.createCard(card);
            if (result.success) {
                await loadCards(columnId);
                setIsAddingCard(null);
                setNewCardTitle("");
            }
        } catch (error) {
            console.error("Failed to create card:", error);
        }
    };

    const deleteCard = async (cardId: string, columnId: string) => {
        if (!confirm("Are you sure you want to delete this card?")) return;

        try {
            const api = getApi();
            const result = await api.deleteCard(cardId);
            if (result.success) {
                await loadCards(columnId);
            }
        } catch (error) {
            console.error("Failed to delete card:", error);
        }
    };

    const updateCard = async (card: Card) => {
        try {
            const api = getApi();
            const result = await api.updateCard(card);
            if (result.success) {
                await loadCards(card.column_id);
                setEditingCard(null);
            }
        } catch (error) {
            console.error("Failed to update card:", error);
        }
    };

    const handleDragStart = (card: Card) => {
        setDraggedCard(card);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        setDraggedOverColumn(columnId);
    };

    const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        if (!draggedCard) return;

        // If dropped in the same column, do nothing
        if (draggedCard.column_id === targetColumnId) {
            setDraggedCard(null);
            setDraggedOverColumn(null);
            return;
        }

        // Update card's column
        const targetCards = cards[targetColumnId] || [];
        const updatedCard = {
            ...draggedCard,
            column_id: targetColumnId,
            position: targetCards.length,
        };

        try {
            const api = getApi();
            const result = await api.updateCard(updatedCard);
            if (result.success) {
                // Reload both columns
                await loadCards(draggedCard.column_id);
                await loadCards(targetColumnId);
            }
        } catch (error) {
            console.error("Failed to move card:", error);
        }

        setDraggedCard(null);
        setDraggedOverColumn(null);
    };

    if (!board) {
        return <div className='p-6'>Loading...</div>;
    }

    return (
        <div className='h-screen flex flex-col'>
            <header className='pt-4 border-b border-gray-300 mx-6 pb-4'>
                <div className='flex items-center gap-4'>
                    <button
                        onClick={() => navigate('/')}
                        className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
                    >
                        <ArrowLeft className='h-6 w-6' />
                    </button>
                    <div>
                        <h2 className='text-3xl font-semibold'>{board.name}</h2>
                        {board.description && (
                            <p className='text-gray-600 dark:text-gray-400 mt-1'>{board.description}</p>
                        )}
                    </div>
                </div>
            </header>
            <main className='flex-1 overflow-x-auto p-6'>
                <div className='flex gap-4 h-full'>
                    {columns.map((column) => (
                        <div
                            key={column.id}
                            className={`flex-shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 flex flex-col ${
                                draggedOverColumn === column.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-800'
                            }`}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className='flex items-center justify-between mb-4'>
                                <h3 className='text-lg font-semibold'>{column.name}</h3>
                                <button
                                    onClick={() => deleteColumn(column.id)}
                                    className='p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600'
                                    title='Delete column'
                                >
                                    <Trash2 className='h-4 w-4' />
                                </button>
                            </div>
                            <div className='flex-1 overflow-y-auto space-y-2 mb-2'>
                                {(cards[column.id] || []).map((card) => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={() => handleDragStart(card)}
                                        className='bg-white dark:bg-gray-700 p-3 rounded shadow cursor-move hover:shadow-md transition-shadow'
                                    >
                                        <div className='flex items-start justify-between'>
                                            <h4 className='font-medium flex-1'>{card.title}</h4>
                                            <div className='flex gap-1'>
                                                <button
                                                    onClick={() => setEditingCard(card)}
                                                    className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600'
                                                    title='Edit card'
                                                >
                                                    <Edit2 className='h-3 w-3' />
                                                </button>
                                                <button
                                                    onClick={() => deleteCard(card.id, column.id)}
                                                    className='p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600'
                                                    title='Delete card'
                                                >
                                                    <Trash2 className='h-3 w-3' />
                                                </button>
                                            </div>
                                        </div>
                                        {card.description && (
                                            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>{card.description}</p>
                                        )}
                                        {card.due_date && (
                                            <p className='text-xs text-gray-500 mt-2'>Due: {new Date(card.due_date).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {isAddingCard === column.id ? (
                                <div className='space-y-2'>
                                    <input
                                        type='text'
                                        placeholder='Card title'
                                        value={newCardTitle}
                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                        className='w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                        autoFocus
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                createCard(column.id);
                                            }
                                        }}
                                    />
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={() => createCard(column.id)}
                                            className='flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600'
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddingCard(null);
                                                setNewCardTitle("");
                                            }}
                                            className='flex-1 bg-gray-300 dark:bg-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-700'
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingCard(column.id)}
                                    className='flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                >
                                    <Plus className='h-4 w-4' />
                                    <span>Add card</span>
                                </button>
                            )}
                        </div>
                    ))}
                    {isAddingColumn ? (
                        <div className='flex-shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 bg-gray-50 dark:bg-gray-800'>
                            <input
                                type='text'
                                placeholder='Column name'
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className='w-full p-2 mb-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                autoFocus
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        createColumn();
                                    }
                                }}
                            />
                            <div className='flex gap-2'>
                                <button
                                    onClick={createColumn}
                                    className='flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600'
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddingColumn(false);
                                        setNewColumnName("");
                                    }}
                                    className='flex-1 bg-gray-300 dark:bg-gray-600 px-3 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-700'
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingColumn(true)}
                            className='flex-shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-2'
                        >
                            <Plus className='h-5 w-5' />
                            <span>Add column</span>
                        </button>
                    )}
                </div>
            </main>

            {/* Card Edit Modal */}
            {editingCard && (
                <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
                    <div className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl'>
                        <h3 className='text-2xl font-semibold mb-4'>Edit Card</h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Title</label>
                                <input
                                    type='text'
                                    value={editingCard.title}
                                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Description</label>
                                <textarea
                                    value={editingCard.description || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Notes</label>
                                <textarea
                                    value={editingCard.notes || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Due Date</label>
                                <input
                                    type='date'
                                    value={editingCard.due_date || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, due_date: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600'
                                />
                            </div>
                        </div>
                        <div className='flex gap-2 mt-6'>
                            <button
                                onClick={() => updateCard(editingCard)}
                                className='flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setEditingCard(null)}
                                className='flex-1 bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-700'
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
