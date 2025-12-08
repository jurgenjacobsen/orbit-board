import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Trash2, Edit2, Save } from "lucide-react";
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

    // Column Creation State
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");

    // Column Editing State
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [tempColumnName, setTempColumnName] = useState("");

    // Card Creation/Editing/Drag State
    const [isAddingCard, setIsAddingCard] = useState<string | null>(null);
    const [newCardTitle, setNewCardTitle] = useState("");
    const [draggedCard, setDraggedCard] = useState<Card | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    // Column Drag State
    const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);

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

    const deleteBoard = async (boardId: string) => {
        if (!confirm("Are you sure you want to delete this board? All columns and cards in it will be deleted.")) return;
        try {
            const api = getApi();
            const result = await api.deleteBoard(boardId);
            if (result.success) {
                navigate('/');
            }
        } catch (error) {
            console.error("Failed to delete board:", error);
        }
    };

    // --- Update Column Name Logic ---
    const startEditingColumn = (column: Column) => {
        setEditingColumnId(column.id);
        setTempColumnName(column.name);
    };

    const updateColumnName = async (columnId: string) => {
        const trimmedName = tempColumnName.trim();
        if (!trimmedName) {
            setEditingColumnId(null);
            return;
        }

        const originalColumn = columns.find(c => c.id === columnId);
        if (originalColumn && originalColumn.name === trimmedName) {
            setEditingColumnId(null);
            return;
        }

        try {
            const api = getApi();
            const result = await api.updateColumn({ ...originalColumn, id: columnId, name: trimmedName });

            if (result.success) {
                await loadColumns();
            }
        } catch (error) {
            console.error("Failed to update column:", error);
        }
        setEditingColumnId(null);
    };

    // --- Column Drag and Drop Logic ---
    const handleColumnDragStart = (e: React.DragEvent, column: Column) => {
        // Prevent card drag handler from firing if we grabbed the column
        e.stopPropagation();
        setDraggedColumn(column);
    };

    const handleColumnDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Ensure we are dragging a column, not a card
        if (!draggedColumn) return;

        // If dropped on itself, do nothing
        if (draggedColumn.id === targetColumnId) {
            setDraggedColumn(null);
            return;
        }

        const currentColumns = [...columns];
        const sourceIndex = currentColumns.findIndex(c => c.id === draggedColumn.id);
        const targetIndex = currentColumns.findIndex(c => c.id === targetColumnId);

        // Reorder array locally
        const [removed] = currentColumns.splice(sourceIndex, 1);
        currentColumns.splice(targetIndex, 0, removed);

        // Optimistically update state
        setColumns(currentColumns);

        // Update positions in API
        try {
            const api = getApi();
            const updates = currentColumns.map((col, index) => {
                // Only update if position actually changed
                if (col.position !== index) {
                    return api.updateColumn({ ...col, position: index });
                }
                return Promise.resolve();
            });
            await Promise.all(updates);
        } catch (error) {
            console.error("Failed to reorder columns:", error);
            // Revert on error (optional, but good practice)
            loadColumns();
        }

        setDraggedColumn(null);
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

    const handleDragStart = (e: React.DragEvent, card: Card) => {
        // Prevent column drag start from firing
        e.stopPropagation();
        setDraggedCard(card);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        // Only allow card drop visuals if we are actually dragging a card
        if(draggedCard) {
            setDraggedOverColumn(columnId);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        // If we are dragging a column, this is the wrong handler (though stopPropagation in columnDrop handles most cases)
        if (draggedColumn) {
             // Pass to column drop handler logic if needed,
             // but usually better to separate the drop zones or use conditional logic here.
             // Since the drop zone is the column div, we can reuse this event or split them.
             // For clarity, we will handle column drop inside the column wrapper onDrop.
             return;
        }

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
                <div className="flex items-center justify-between">
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={() => navigate('/')}
                            className='p-2 rounded-lg bg-gray-100 hover:bg-gray-200 duration-300 transition-colors cursor-pointer'
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
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => (board.id)}
                            className='p-2 rounded-lg bg-gray-100  duration-300 transition-colors cursor-pointer hover:bg-gray-200'
                        >
                            <Edit2 className='h-6 w-6' />
                        </button>
                        <button
                            onClick={() => deleteBoard(board.id)}
                            className='p-2 rounded-lg bg-gray-100  duration-300 transition-colors cursor-pointer hover:bg-red-500/75'
                        >
                            <Trash2 className='h-6 w-6' />
                        </button>
                    </div>
                </div>
            </header>
            <main className='flex-1 overflow-x-auto p-6'>
                <div className='flex gap-4 h-[calc(100%-1rem)]'>
                    {columns.map((column) => (
                        <div
                            key={column.id}
                            draggable
                            onDragStart={(e) => handleColumnDragStart(e, column)}
                            onDragOver={(e) => {
                                // Decide whether to show card drag over or column drag over effects
                                if (draggedCard) {
                                    handleDragOver(e, column.id);
                                } else if (draggedColumn) {
                                    handleColumnDragOver(e);
                                }
                            }}
                            onDrop={(e) => {
                                if (draggedCard) {
                                    handleDrop(e, column.id);
                                } else if (draggedColumn) {
                                    handleColumnDrop(e, column.id);
                                }
                            }}
                            className={`shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 flex flex-col transition-opacity duration-200 ${
                                draggedOverColumn === column.id && draggedCard ? 'bg-blue-100 ' : 'bg-gray-50'
                            } ${draggedColumn?.id === column.id ? 'opacity-50 border-dashed border border-indigo-600 ' : ''}`}
                        >
                            <div className='flex items-center justify-between mb-4 min-h-8 cursor-grab active:cursor-grabbing'>
                                {editingColumnId === column.id ? (
                                    // --- Edit Mode ---
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={tempColumnName}
                                            onChange={(e) => setTempColumnName(e.target.value)}
                                            onBlur={() => updateColumnName(column.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') updateColumnName(column.id);
                                                if (e.key === 'Escape') setEditingColumnId(null);
                                            }}
                                            className="flex-1 p-1 text-lg font-semibold border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking input
                                        />
                                        <button
                                            onClick={() => updateColumnName(column.id)}
                                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                                            title="Save name"
                                        >
                                            <Save className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    // --- Display Mode ---
                                    <>
                                        <h3
                                            className='text-lg font-semibold hover:bg-gray-200 px-1 rounded truncate flex-1 select-none cursor-text'
                                            onClick={() => startEditingColumn(column)}
                                            onDoubleClick={() => startEditingColumn(column)}
                                            title="Double-click to edit, Drag to reorder"
                                        >
                                            {column.name}
                                        </h3>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => deleteColumn(column.id)}
                                                className='p-1 rounded hover:bg-red-100 text-red-600'
                                                title='Delete column'
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className='flex-1 overflow-y-auto space-y-2 mb-2'>
                                {(cards[column.id] || []).map((card) => (
                                    <div
                                        key={card.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card)}
                                        className='bg-white p-3 rounded shadow cursor-move hover:shadow-md transition-shadow'
                                    >
                                        <div className='flex items-start justify-between'>
                                            <h4 className='font-medium flex-1'>{card.title}</h4>
                                            <div className='flex gap-1'>
                                                <button
                                                    onClick={() => setEditingCard(card)}
                                                    className='p-1 rounded hover:bg-gray-100'
                                                    title='Edit card'
                                                >
                                                    <Edit2 className='h-3 w-3' />
                                                </button>
                                                <button
                                                    onClick={() => deleteCard(card.id, column.id)}
                                                    className='p-1 rounded hover:bg-red-100 text-red-600'
                                                    title='Delete card'
                                                >
                                                    <Trash2 className='h-3 w-3' />
                                                </button>
                                            </div>
                                        </div>
                                        {card.description && (
                                            <p className='text-sm text-gray-600 mt-1'>{card.description}</p>
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
                                        className='w-full p-2 border border-gray-300 rounded'
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
                                            className='flex-1 bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400'
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingCard(column.id)}
                                    className='flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-200 text-gray-600'
                                >
                                    <Plus className='h-4 w-4' />
                                    <span>Add card</span>
                                </button>
                            )}
                        </div>
                    ))}
                    {isAddingColumn ? (
                        <div className='shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 bg-gray-50'>
                            <input
                                type='text'
                                placeholder='Column name'
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className='w-full p-2 mb-2 border border-gray-300 rounded'
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
                                    className='flex-1 bg-gray-300 px-3 py-2 rounded hover:bg-gray-400 '
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingColumn(true)}
                            className='shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 hover:bg-gray-100 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-300'
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
                    <div className='bg-white rounded-lg p-6 w-full max-w-2xl'>
                        <h3 className='text-2xl font-semibold mb-4'>Edit Card</h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Title</label>
                                <input
                                    type='text'
                                    value={editingCard.title}
                                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded '
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Description</label>
                                <textarea
                                    value={editingCard.description || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded '
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Notes</label>
                                <textarea
                                    value={editingCard.notes || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded '
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Due Date</label>
                                <input
                                    type='date'
                                    value={editingCard.due_date || ""}
                                    onChange={(e) => setEditingCard({ ...editingCard, due_date: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded '
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
                                className='flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400'
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
