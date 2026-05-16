import { Plus, Search, Calendar, Tag, Archive, RefreshCw, Trash2, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { getApi } from "../utils/mockApi";
import type { Board, Card } from "../../types";

export default function BoardsPage() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");
    const [newBoardDescription, setNewBoardDescription] = useState("");

    // Editing Board State
    const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
    const [editBoardName, setEditBoardName] = useState("");
    const [editBoardDescription, setEditBoardDescription] = useState("");

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<(Card & { board_id?: string })[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [includeArchived, setIncludeArchived] = useState(false);

    const loadBoards = useCallback(async () => {
        try {
            const api = getApi();
            const result = await api.getBoards({ includeArchived: true });
            if (result.success && result.data) {
                setBoards(result.data);
            }
        } catch (error) {
            console.error("Failed to load boards:", error);
        }
    }, []);

    const startEditingBoard = (board: Board, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingBoardId(board.id);
        setEditBoardName(board.name);
        setEditBoardDescription(board.description || "");
    };

    const updateBoard = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editingBoardId || !editBoardName.trim()) return;

        try {
            const api = getApi();
            const boardToUpdate = boards.find(b => b.id === editingBoardId);
            if (!boardToUpdate) return;

            const result = await api.updateBoard({
                ...boardToUpdate,
                name: editBoardName,
                description: editBoardDescription || null,
            });

            if (result.success) {
                await loadBoards();
                setEditingBoardId(null);
            }
        } catch (error) {
            console.error("Failed to update board:", error);
        }
    };

    const archiveBoard = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const api = getApi();
            const result = await api.archiveBoard(id);
            if (result.success) {
                await loadBoards();
            }
        } catch (error) {
            console.error("Failed to archive board:", error);
        }
    };

    const restoreBoard = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const api = getApi();
            const result = await api.restoreBoard(id);
            if (result.success) {
                await loadBoards();
            }
        } catch (error) {
            console.error("Failed to restore board:", error);
        }
    };

    const deleteBoard = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this board? It will be moved to the recycle bin.")) return;
        try {
            const api = getApi();
            const result = await api.deleteBoard(id);
            if (result.success) {
                await loadBoards();
            }
        } catch (error) {
            console.error("Failed to delete board:", error);
        }
    };

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const api = getApi();
            const result = await api.searchCards(query);
            if (result.success && result.data) {
                setSearchResults(result.data as (Card & { board_id?: string })[]);
            }
        } catch (error) {
            console.error("Search failed:", error);
        }
    }, []);

    useEffect(() => {
        loadBoards();
    }, [loadBoards]);

    const filteredBoards = boards
        .filter(b => includeArchived || !b.archived)
        .slice()
        .sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
            const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
            return dateB - dateA;
        });

    const createBoard = async () => {
        if (!newBoardName.trim()) return;

        try {
            const api = getApi();
            const board = {
                id: crypto.randomUUID(),
                name: newBoardName,
                description: newBoardDescription || null,
            };

            const result = await api.createBoard(board as Board);
            if (result.success) {
                await loadBoards();
                setIsCreating(false);
                setNewBoardName("");
                setNewBoardDescription("");
            }
        } catch (error) {
            console.error("Failed to create board:", error);
        }
    };

    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-baseline justify-between'>
                <h2 className='text-3xl font-extrabold tracking-tight uppercase text-gray-900'>Boards</h2>
                <div className='flex items-center gap-4 w-1/2'>
                    <div className='relative flex-1'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                        <input
                            type='text'
                            placeholder='Global search cards...'
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none'
                        />
                    </div>
                    <button
                        onClick={() => setIncludeArchived(!includeArchived)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${includeArchived ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                    >
                        {includeArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                </div>
            </header>
            <main className='p-6'>
                {isSearching && (
                    <section className='mb-10'>
                        <h3 className='text-2xl font-semibold mb-4'>Search Results</h3>
                        {searchResults.length > 0 ? (
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                {searchResults.map(card => (
                                    <Link
                                        to={`/board/${card.board_id || 'unknown'}`}
                                        key={card.id}
                                        className='block'
                                    >
                                        <div className='p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow'>
                                            <h4 className='font-bold text-lg mb-1'>{card.title}</h4>
                                            {card.description && (
                                                <p className='text-sm text-gray-600 line-clamp-2 mb-2'>{card.description}</p>
                                            )}
                                            <div className='flex items-center gap-3 mt-2 text-xs text-gray-500'>
                                                {card.due_date && (
                                                    <div className='flex items-center gap-1'>
                                                        <Calendar className='h-3 w-3' />
                                                        <span>{new Date(card.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {card.attachmentCount! > 0 && (
                                                    <div className='flex items-center gap-1'>
                                                        <Tag className='h-3 w-3' />
                                                        <span>{card.attachmentCount}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className='text-gray-500 italic'>No cards found matching "{searchQuery}"</p>
                        )}
                        <hr className='mt-8 border-gray-200' />
                    </section>
                )}

                <section>
                    <div className='flex items-center justify-between mb-4'>
                        <h3 className='text-2xl font-semibold'>Manage Your Boards</h3>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {isCreating ? (
                            <div className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 bg-white'>
                                <h4 className='text-xl font-bold mb-4'>Create New Board</h4>
                                <input
                                    type='text'
                                    placeholder='Board Name'
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    className='w-full p-2 mb-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none'
                                    autoFocus
                                />
                                <textarea
                                    placeholder='Description (optional)'
                                    value={newBoardDescription}
                                    onChange={(e) => setNewBoardDescription(e.target.value)}
                                    className='w-full p-2 mb-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none'
                                    rows={3}
                                />
                                <div className='flex gap-2'>
                                    <button
                                        onClick={createBoard}
                                        className='flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium'
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewBoardName("");
                                            setNewBoardDescription("");
                                        }}
                                        className='flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-medium'
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsCreating(true)}
                                className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-shadow duration-300 bg-green-300/25 flex flex-col items-center justify-center cursor-pointer group'
                            >
                                <Plus className='h-8 w-8 text-green-700 group-hover:scale-110 transition-transform' />
                                <h4 className='text-xl font-bold text-green-800'>Create New Board</h4>
                            </div>
                        )}

                        {editingBoardId && (
                            <div className='rounded-lg shadow-md ring-1 ring-blue-500 p-4 bg-blue-50 border border-blue-200'>
                                <h4 className='text-xl font-bold mb-4'>Edit Board</h4>
                                <input
                                    type='text'
                                    placeholder='Board Name'
                                    value={editBoardName}
                                    onChange={(e) => setEditBoardName(e.target.value)}
                                    className='w-full p-2 mb-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white'
                                    autoFocus
                                />
                                <textarea
                                    placeholder='Description (optional)'
                                    value={editBoardDescription}
                                    onChange={(e) => setEditBoardDescription(e.target.value)}
                                    className='w-full p-2 mb-4 border border-blue-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white'
                                    rows={3}
                                />
                                <div className='flex gap-2'>
                                    <button
                                        onClick={updateBoard}
                                        className='flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium'
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingBoardId(null)}
                                        className='flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-medium'
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredBoards.map(board => board.id !== editingBoardId && (
                            <Link
                                to={`/board/${board.id}`}
                                key={board.id}
                                className={`group relative rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-all duration-300 overflow-hidden ${board.archived ? 'opacity-70 bg-gray-50 border-dashed' : 'bg-white'}`}
                                draggable={false}
                            >
                                {board.archived && (
                                    <div className='absolute top-0 right-0 bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1'>
                                        <Archive className='h-2.5 w-2.5' />
                                        Archived
                                    </div>
                                )}
                                <div className='flex flex-col h-full'>
                                    <h4 className='text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors'>{board.name}</h4>
                                    <p className='text-gray-600 mb-4 line-clamp-3 flex-1'>{board.description || "No description provided."}</p>
                                    <div className='flex items-center justify-between mt-auto pt-4 border-t border-gray-100'>
                                        <p className='text-xs text-gray-400'>Updated {new Date(board.updated_at).toLocaleDateString()}</p>
                                        <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                            {!board.archived && (
                                                <button
                                                    onClick={(e) => startEditingBoard(board, e)}
                                                    className='p-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                                                    title='Rename board'
                                                >
                                                    <Edit2 className='h-4 w-4' />
                                                </button>
                                            )}
                                            {board.archived ? (
                                                <button
                                                    onClick={(e) => restoreBoard(board.id, e)}
                                                    className='p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                                                    title='Restore board'
                                                >
                                                    <RefreshCw className='h-4 w-4' />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => archiveBoard(board.id, e)}
                                                    className='p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                                                    title='Archive board'
                                                >
                                                    <Archive className='h-4 w-4' />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => deleteBoard(board.id, e)}
                                                className='p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                                title='Delete board'
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
