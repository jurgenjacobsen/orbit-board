import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Trash2, Edit2, Save, Paperclip, File, X, Filter, Search, Archive, RefreshCw, Calendar } from "lucide-react";
import { getApi } from "../utils/mockApi";
import type { Board, Column, Card, Attachment, Label } from "../../types";
import Markdown from "../components/Markdown";
import { useConfirm } from "../hooks/useConfirm";
import { VirtualList } from "../components/VirtualList";
import CardItem from "../components/CardItem";

export default function BoardPage() {
    const { boardId } = useParams<{ boardId: string }>();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [cards, setCards] = useState<{ [columnId: string]: Card[] }>({});
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    // Filter State
    const [filterQuery, setFilterQuery] = useState("");
    const [filterLabels, setFilterLabels] = useState<string[]>([]);
    const [filterDueSoon, setFilterDueSoon] = useState(false);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    // UI States
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [tempColumnName, setTempColumnName] = useState("");
    const [isAddingCard, setIsAddingCard] = useState<string | null>(null);
    const [newCardTitle, setNewCardTitle] = useState("");
    const [draggedCard, setDraggedCard] = useState<Card | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);
    const [previewDescription, setPreviewDescription] = useState(false);
    const [previewNotes, setPreviewNotes] = useState(false);

    const loadLabels = useCallback(async () => {
        if (!boardId) return;
        try {
            const api = getApi();
            const result = await api.getLabels(boardId);
            if (result.success && result.data) {
                setAllLabels(result.data);
            }
        } catch (error) {
            console.error("Failed to load labels:", error);
        }
    }, [boardId]);

    const loadCards = useCallback(async (columnId: string) => {
        try {
            const api = getApi();
            const result = await api.getCards(columnId, { includeArchived: true });
            if (result.success && result.data) {
                const sortedCards = result.data.sort((a: Card, b: Card) => a.position - b.position);
                setCards(prev => ({ ...prev, [columnId]: sortedCards }));
            }
        } catch (error) {
            console.error("Failed to load cards:", error);
        }
    }, []);

    const loadColumns = useCallback(async () => {
        if (!boardId) return;
        try {
            const api = getApi();
            const result = await api.getColumns(boardId, { includeArchived: true });
            if (result.success && result.data) {
                const sortedColumns = result.data.sort((a: Column, b: Column) => a.position - b.position);
                setColumns(sortedColumns);
                // Load all cards in parallel for better performance
                await Promise.all(sortedColumns.map(column => loadCards(column.id)));
            }
        } catch (error) {
            console.error("Failed to load columns:", error);
        }
    }, [boardId, loadCards]);

    const loadBoard = useCallback(async () => {
        if (!boardId) return;
        try {
            const api = getApi();
            const result = await api.getBoard(boardId);
            if (result.success && result.data) {
                setBoard(result.data);
            }
        } catch (error) {
            console.error("Failed to load board:", error);
        }
    }, [boardId]);

    useEffect(() => {
        if (board) {
            getApi().setDiscordActivity(`Working on Board`, board.name, { boardName: board.name });
        }
    }, [board]);

    useEffect(() => {
        if (editingCard && board) {
            getApi().setDiscordActivity(`Editing Card`, editingCard.title, { boardName: board.name, cardTitle: editingCard.title });
        } else if (!editingCard && board) {
            getApi().setDiscordActivity(`Working on Board`, board.name, { boardName: board.name });
        }
    }, [editingCard, board]);

    useEffect(() => {
        if (boardId) {
            loadBoard();
            loadColumns();
            loadLabels();
        }
    }, [boardId, loadBoard, loadColumns, loadLabels]);

    const loadAttachments = useCallback(async (cardId: string) => {
        try {
            const api = getApi();
            const result = await api.getAttachments(cardId);
            if (result.success && result.data) {
                setAttachments(result.data);
            }
        } catch (error) {
            console.error("Failed to load attachments:", error);
        }
    }, []);

    useEffect(() => {
        if (editingCard) {
            loadAttachments(editingCard.id);
            setPreviewDescription(false);
            setPreviewNotes(false);
        } else {
            setAttachments([]);
        }
    }, [editingCard, loadAttachments]);

    const getFilteredCards = useCallback((columnId: string) => {
        const columnCards = cards[columnId] || [];
        return columnCards.filter(card => {
            if (!includeArchived && card.archived) return false;

            const query = filterQuery.toLowerCase();
            const matchesQuery = !query ||
                card.title.toLowerCase().includes(query) ||
                (card.description && card.description.toLowerCase().includes(query)) ||
                (card.notes && card.notes.toLowerCase().includes(query));

            const matchesLabels = filterLabels.length === 0 ||
                filterLabels.every(labelId => (card as Card & { labelIds?: string[] }).labelIds?.includes(labelId));

            let matchesDueSoon = true;
            if (filterDueSoon) {
                if (!card.due_date) {
                    matchesDueSoon = false;
                } else {
                    const dueDate = new Date(card.due_date);
                    const now = new Date();
                    const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
                    matchesDueSoon = diffDays >= -1 && diffDays <= 3;
                }
            }

            return matchesQuery && matchesLabels && matchesDueSoon;
        });
    }, [cards, filterQuery, filterLabels, filterDueSoon, includeArchived]);

    const toggleFilterLabel = (labelId: string) => {
        setFilterLabels(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingCard) return;
        try {
            const api = getApi();
            const fileData = {
                name: file.name,
                path: (file as File & { path?: string }).path || file.name,
                type: file.type,
                size: file.size,
            };
            const result = await api.addAttachment(editingCard.id, fileData);
            if (result.success) {
                await loadAttachments(editingCard.id);
                await loadCards(editingCard.column_id);
            }
        } catch (error) {
            console.error("Failed to upload attachment:", error);
        }
        e.target.value = '';
    };

    const removeAttachment = async (id: string) => {
        const confirmed = await confirm({
            title: "Remove Attachment",
            message: "Are you sure you want to remove this attachment?",
            isDanger: true
        });
        if (!confirmed) return;
        try {
            const api = getApi();
            const result = await api.removeAttachment(id);
            if (result.success && editingCard) {
                await loadAttachments(editingCard.id);
                await loadCards(editingCard.column_id);
            }
        } catch (error) {
            console.error("Failed to remove attachment:", error);
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
        const confirmed = await confirm({
            title: "Delete Column",
            message: "Are you sure you want to delete this column? All cards in it will be moved to the recycle bin.",
            isDanger: true
        });
        if (!confirmed) return;
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

    const archiveColumn = async (id: string) => {
        try {
            const api = getApi();
            const result = await api.archiveColumn(id);
            if (result.success) {
                await loadColumns();
            }
        } catch (error) {
            console.error("Failed to archive column:", error);
        }
    };

    const restoreColumn = async (id: string) => {
        try {
            const api = getApi();
            const result = await api.restoreColumn(id);
            if (result.success) {
                await loadColumns();
            }
        } catch (error) {
            console.error("Failed to restore column:", error);
        }
    };

    const deleteBoard = async (boardId: string) => {
        const confirmed = await confirm({
            title: "Delete Board",
            message: "Are you sure you want to delete this board? All columns and cards in it will be moved to the recycle bin.",
            isDanger: true
        });
        if (!confirmed) return;
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
            const result = await api.updateColumn({ ...originalColumn, id: columnId, name: trimmedName } as Column);
            if (result.success) {
                await loadColumns();
            }
        } catch (error) {
            console.error("Failed to update column:", error);
        }
        setEditingColumnId(null);
    };

    const handleColumnDragStart = (e: React.DragEvent, column: Column) => {
        e.stopPropagation();
        setDraggedColumn(column);
    };

    const handleColumnDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedColumn || draggedColumn.id === targetColumnId) {
            setDraggedColumn(null);
            return;
        }
        const currentColumns = [...columns];
        const sourceIndex = currentColumns.findIndex(c => c.id === draggedColumn.id);
        const targetIndex = currentColumns.findIndex(c => c.id === targetColumnId);
        const [removed] = currentColumns.splice(sourceIndex, 1);
        currentColumns.splice(targetIndex, 0, removed);
        setColumns(currentColumns);
        try {
            const api = getApi();
            const updates = currentColumns.map((col, index) => ({ id: col.id, position: index }));
            await api.updateColumnsPositions(updates);
        } catch (error) {
            console.error("Failed to reorder columns:", error);
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
        const confirmed = await confirm({
            title: "Delete Card",
            message: "Are you sure you want to delete this card? It will be moved to the recycle bin.",
            isDanger: true
        });
        if (!confirmed) return;
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

    const archiveCard = async (id: string, columnId: string) => {
        try {
            const api = getApi();
            const result = await api.archiveCard(id);
            if (result.success) {
                await loadCards(columnId);
            }
        } catch (error) {
            console.error("Failed to archive card:", error);
        }
    };

    const restoreCard = async (id: string, columnId: string) => {
        try {
            const api = getApi();
            const result = await api.restoreCard(id);
            if (result.success) {
                await loadCards(columnId);
            }
        } catch (error) {
            console.error("Failed to restore card:", error);
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
        e.stopPropagation();
        setDraggedCard(card);
    };

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if(draggedCard) {
            setDraggedOverColumn(columnId);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedColumn) return;
        if (!draggedCard || draggedCard.column_id === targetColumnId) {
            setDraggedCard(null);
            setDraggedOverColumn(null);
            return;
        }
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
                                <p className='text-gray-600 mt-1'>{board.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                const api = getApi();
                                const result = await api.exportCalendar({ boardId: board.id });
                                if (result.success) {
                                    alert(`Board calendar exported successfully to ${result.data}`);
                                } else if (result.error !== 'Export cancelled') {
                                    alert(`Failed to export board calendar: ${result.error}`);
                                }
                            }}
                            className='p-2 rounded-lg bg-gray-100 hover:bg-green-100 hover:text-green-600 duration-300 transition-colors cursor-pointer flex items-center gap-2'
                            title='Export board due dates to calendar (.ics)'
                        >
                            <Calendar className='h-5 w-5' />
                            <span className='text-sm font-medium whitespace-nowrap hidden sm:inline'>Export</span>
                        </button>
                        <button
                            onClick={() => setIsFilterVisible(!isFilterVisible)}
                            className={`p-2 rounded-lg duration-300 transition-colors cursor-pointer flex items-center gap-2 ${isFilterVisible || filterQuery || filterLabels.length > 0 || filterDueSoon || includeArchived ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                            title='Filter cards'
                        >
                            <Filter className='h-5 w-5' />
                            <span className='text-sm font-medium'>Filter</span>
                        </button>
                        <button
                            onClick={() => deleteBoard(board.id)}
                            className='p-2 rounded-lg bg-gray-100 duration-300 transition-colors cursor-pointer hover:bg-red-500/75'
                        >
                            <Trash2 className='h-5 w-5' />
                        </button>
                    </div>
                </div>

                {isFilterVisible && (
                    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2 mt-4'>
                        <div className='flex flex-wrap gap-4 items-center'>
                            <div className='relative flex-1 min-w-[200px]'>
                                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                                <input
                                    type='text'
                                    placeholder='Filter by title or description...'
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white'
                                />
                            </div>
                            <button
                                onClick={() => setFilterDueSoon(!filterDueSoon)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${filterDueSoon ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                            >
                                Due Soon
                            </button>
                            <button
                                onClick={() => setIncludeArchived(!includeArchived)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${includeArchived ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                            >
                                {includeArchived ? 'Hide Archived' : 'Show Archived'}
                            </button>
                            <button
                                onClick={() => {
                                    setFilterQuery("");
                                    setFilterLabels([]);
                                    setFilterDueSoon(false);
                                    setIncludeArchived(false);
                                }}
                                className='text-sm text-blue-600 hover:underline'
                            >
                                Clear all
                            </button>
                        </div>
                        {allLabels.length > 0 && (
                            <div className='flex flex-wrap gap-2 items-center'>
                                <span className='text-xs font-semibold uppercase text-gray-500 mr-2'>Labels:</span>
                                {allLabels.map(label => (
                                    <button
                                        key={label.id}
                                        onClick={() => toggleFilterLabel(label.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterLabels.includes(label.id) ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-60 hover:opacity-100'}`}
                                        style={{
                                            backgroundColor: label.color + '20',
                                            borderColor: label.color,
                                            color: label.color
                                        }}
                                    >
                                        {label.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main className='flex-1 overflow-x-auto p-6'>
                <div className='flex gap-4 h-[calc(100%-1rem)]'>
                    {columns.filter(c => includeArchived || !c.archived).map((column) => (
                        <div
                            key={column.id}
                            draggable
                            onDragStart={(e) => handleColumnDragStart(e, column)}
                            onDragOver={(e) => {
                                if (draggedCard) handleDragOver(e, column.id);
                                else if (draggedColumn) handleColumnDragOver(e);
                            }}
                            onDrop={(e) => {
                                if (draggedCard) handleDrop(e, column.id);
                                else if (draggedColumn) handleColumnDrop(e, column.id);
                            }}
                            className={`shrink-0 w-80 rounded-lg ring-1 ring-gray-700 p-4 flex flex-col transition-opacity duration-200 ${
                                draggedOverColumn === column.id && draggedCard ? 'bg-blue-50 ' : 'bg-gray-50'
                            } ${draggedColumn?.id === column.id ? 'opacity-50 border-dashed border border-indigo-600 ' : ''} ${column.archived ? 'opacity-60 bg-gray-200' : ''}`}
                        >
                            <div className='flex items-center justify-between mb-4 min-h-8 cursor-grab active:cursor-grabbing'>
                                {editingColumnId === column.id ? (
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
                                            onMouseDown={(e) => e.stopPropagation()}
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
                                    <>
                                        <h3
                                            className='text-lg font-semibold hover:bg-gray-200 px-1 rounded truncate flex-1 select-none cursor-text flex items-center gap-2'
                                            onClick={() => startEditingColumn(column)}
                                            title="Double-click to edit, Drag to reorder"
                                        >
                                            {column.archived && <Archive className='h-4 w-4 text-gray-500' />}
                                            {column.name}
                                        </h3>
                                        <div className="flex gap-1">
                                            {column.archived ? (
                                                <button
                                                    onClick={() => restoreColumn(column.id)}
                                                    className='p-1 rounded hover:bg-green-100 text-green-600'
                                                    title='Restore column'
                                                >
                                                    <RefreshCw className='h-4 w-4' />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => archiveColumn(column.id)}
                                                    className='p-1 rounded hover:bg-indigo-100 text-indigo-600'
                                                    title='Archive column'
                                                >
                                                    <Archive className='h-4 w-4' />
                                                </button>
                                            )}
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
                            <VirtualList
                                items={getFilteredCards(column.id)}
                                itemHeight={140}
                                containerClassName="flex-1 mb-2 pr-1"
                                renderItem={(card) => (
                                    <div className="pb-2 h-full">
                                        <CardItem
                                            card={card}
                                            columnId={column.id}
                                            onEdit={setEditingCard}
                                            onDelete={deleteCard}
                                            onArchive={archiveCard}
                                            onRestore={restoreCard}
                                            onDragStart={handleDragStart}
                                        />
                                    </div>
                                )}
                            />
                            {!column.archived && (
                                isAddingCard === column.id ? (
                                    <div className='space-y-2'>
                                        <input
                                            type='text'
                                            placeholder='Card title'
                                            value={newCardTitle}
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            className='w-full p-2 border border-gray-300 rounded'
                                            autoFocus
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') createCard(column.id);
                                            }}
                                        />
                                        <div className='flex gap-2'>
                                            <button onClick={() => createCard(column.id)} className='flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600' title='Confirm add card'>Add</button>
                                            <button onClick={() => { setIsAddingCard(null); setNewCardTitle(""); }} className='flex-1 bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400'>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingCard(column.id)} className='flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-200 text-gray-600'>
                                        <Plus className='h-4 w-4' />
                                        <span>Add card</span>
                                    </button>
                                )
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
                                className='w-full p-2 mb-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none'
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') createColumn();
                                }}
                            />
                            <div className='flex gap-2'>
                                <button
                                    onClick={createColumn}
                                    className='flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 font-medium'
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddingColumn(false);
                                        setNewColumnName("");
                                    }}
                                    className='flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-400 font-medium'
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
                    <div className='bg-white rounded-lg p-6 w-full max-w-2xl text-gray-900 max-h-[90vh] overflow-y-auto'>
                        <h3 className='text-2xl font-semibold mb-4 flex items-center justify-between'>
                            Edit Card
                            {editingCard.archived && <span className='text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center gap-1'><Archive className='h-3 w-3'/> Archived</span>}
                        </h3>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Title</label>
                                <input
                                    type='text'
                                    value={editingCard.title}
                                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                                    className='w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none'
                                />
                            </div>
                            <div>
                                <div className='flex items-center justify-between mb-1'>
                                    <label htmlFor='card-description' className='block text-sm font-medium'>Description</label>
                                    <div className='flex border border-gray-300 rounded overflow-hidden text-xs'>
                                        <button onClick={() => setPreviewDescription(false)} className={`px-2 py-1 ${!previewDescription ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Write</button>
                                        <button onClick={() => setPreviewDescription(true)} className={`px-2 py-1 ${previewDescription ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Preview</button>
                                    </div>
                                </div>
                                {previewDescription ? (
                                    <div className='w-full p-2 border border-gray-300 rounded min-h-20 bg-gray-50'><Markdown content={editingCard.description || "*No description*"} /></div>
                                ) : (
                                    <textarea id='card-description' value={editingCard.description || ""} onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })} className='w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none' rows={3} placeholder='Add a description...' />
                                )}
                            </div>
                            <div>
                                <div className='flex items-center justify-between mb-1'>
                                    <label htmlFor='card-notes' className='block text-sm font-medium'>Notes</label>
                                    <div className='flex border border-gray-300 rounded overflow-hidden text-xs'>
                                        <button onClick={() => setPreviewNotes(false)} className={`px-2 py-1 ${!previewNotes ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Write</button>
                                        <button onClick={() => setPreviewNotes(true)} className={`px-2 py-1 ${previewNotes ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Preview</button>
                                    </div>
                                </div>
                                {previewNotes ? (
                                    <div className='w-full p-2 border border-gray-300 rounded min-h-20 bg-gray-50'><Markdown content={editingCard.notes || "*No notes*"} /></div>
                                ) : (
                                    <textarea id='card-notes' value={editingCard.notes || ""} onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })} className='w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none' rows={3} placeholder='Add some notes...' />
                                )}
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Due Date</label>
                                <input type='date' value={editingCard.due_date || ""} onChange={(e) => setEditingCard({ ...editingCard, due_date: e.target.value })} className='w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none' />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-2'>Attachments</label>
                                <div className='space-y-2 mb-3'>
                                    {attachments.map(att => (
                                        <div key={att.id} className='flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-sm'>
                                            <div className='flex items-center gap-2 overflow-hidden'><File className='h-4 w-4 shrink-0 text-gray-400' /><span className='truncate' title={att.name}>{att.name}</span><span className='text-xs text-gray-400 shrink-0'>({(att.size / 1024).toFixed(1)} KB)</span></div>
                                            <button onClick={() => removeAttachment(att.id)} className='p-1 hover:bg-red-100 text-red-500 rounded' title='Remove attachment'><X className='h-4 w-4' /></button>
                                        </div>
                                    ))}
                                    {attachments.length === 0 && <p className='text-sm text-gray-500 italic'>No attachments yet.</p>}
                                </div>
                                <label className='flex items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer group'>
                                    <Plus className='h-4 w-4 text-gray-400 group-hover:text-blue-600' /><span className='text-sm text-gray-500 group-hover:text-blue-600 font-medium'>Add Attachment</span><input type='file' onChange={handleFileUpload} className='hidden' />
                                </label>
                            </div>
                        </div>
                        <div className='flex gap-2 mt-6'>
                            <button onClick={() => updateCard(editingCard)} className='flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium'>Save</button>
                            <button
                                onClick={async () => {
                                    const api = getApi();
                                    const result = await api.exportCalendar({ cardId: editingCard.id });
                                    if (result.success) {
                                        alert(`Card exported successfully to ${result.data}`);
                                    } else if (result.error !== 'Export cancelled') {
                                        alert(`Failed to export card: ${result.error}`);
                                    }
                                }}
                                className='flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium'
                            >
                                Export to Calendar
                            </button>
                            <button onClick={() => setEditingCard(null)} className='flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-medium'>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
