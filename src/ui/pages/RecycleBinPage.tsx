import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Trash2, Layout, Columns, CheckSquare, X, RotateCcw } from "lucide-react";
import { getApi } from "../utils/mockApi";
import type { Board } from "../../types";
import { useConfirm } from "../hooks/useConfirm";

export default function RecycleBinPage() {
    const confirm = useConfirm();
    const [deletedBoards, setDeletedBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);

    const loadDeletedItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const api = getApi();

            // Get deleted boards
            const boardsResult = await api.getBoards({ includeDeleted: true });
            if (boardsResult.success && boardsResult.data) {
                setDeletedBoards(boardsResult.data.filter((b: Board) => b.deleted_at));
            }
        } catch (error) {
            console.error("Failed to load deleted items:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDeletedItems();
    }, [loadDeletedItems]);

    useEffect(() => {
        getApi().setDiscordActivity('Managing Recycle Bin', 'Idle');
    }, []);

    const restoreBoard = async (id: string) => {
        try {
            const api = getApi();
            const result = await api.restoreBoard(id);
            if (result.success) {
                await loadDeletedItems();
            }
        } catch (error) {
            console.error("Failed to restore board:", error);
        }
    };

    const permanentlyDeleteBoard = async (id: string) => {
        const confirmed = await confirm({
            title: "Permanently Delete",
            message: "Are you sure you want to PERMANENTLY delete this board and everything in it? This cannot be undone.",
            isDanger: true
        });
        if (!confirmed) return;

        try {
            const api = getApi();
            const result = await api.deleteBoard(id, true);
            if (result.success) {
                await loadDeletedItems();
            }
        } catch (error) {
            console.error("Failed to permanently delete board:", error);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedBoardIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRestore = async () => {
        if (selectedBoardIds.length === 0) return;
        try {
            const api = getApi();
            const result = await api.bulkRestoreBoards(selectedBoardIds);
            if (result.success) {
                setSelectedBoardIds([]);
                setIsSelectionMode(false);
                await loadDeletedItems();
            }
        } catch (error) {
            console.error("Failed to bulk restore boards:", error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedBoardIds.length === 0) return;
        const confirmed = await confirm({
            title: "Bulk Delete",
            message: `Are you sure you want to PERMANENTLY delete ${selectedBoardIds.length} selected boards? This cannot be undone.`,
            isDanger: true
        });
        if (!confirmed) return;

        try {
            const api = getApi();
            const result = await api.bulkDeleteBoards(selectedBoardIds, true);
            if (result.success) {
                setSelectedBoardIds([]);
                setIsSelectionMode(false);
                await loadDeletedItems();
            }
        } catch (error) {
            console.error("Failed to bulk delete boards:", error);
        }
    };

    const handleEmptyRecycleBin = async () => {
        if (deletedBoards.length === 0) return;
        const confirmed = await confirm({
            title: "Empty Recycle Bin",
            message: "Are you sure you want to PERMANENTLY delete ALL items in the recycle bin? This cannot be undone.",
            isDanger: true
        });
        if (!confirmed) return;

        try {
            const api = getApi();
            const result = await api.emptyRecycleBin();
            if (result.success) {
                setSelectedBoardIds([]);
                setIsSelectionMode(false);
                await loadDeletedItems();
            }
        } catch (error) {
            console.error("Failed to empty recycle bin:", error);
        }
    };

    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-start justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight'>Recycle Bin</h2>
                    <p className='text-gray-500 tracking-wide truncate'>
                        Manage your deleted boards here.
                    </p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {isSelectionMode ? (
                        <>
                            <button
                                onClick={handleBulkRestore}
                                disabled={selectedBoardIds.length === 0}
                                className='flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium'
                            >
                                <RotateCcw className='h-4 w-4' />
                                Restore Selected ({selectedBoardIds.length})
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedBoardIds.length === 0}
                                className='flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium'
                            >
                                <Trash2 className='h-4 w-4' />
                                Delete Selected ({selectedBoardIds.length})
                            </button>
                            <button
                                onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedBoardIds([]);
                                }}
                                className='flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium'
                            >
                                <X className='h-4 w-4' />
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsSelectionMode(true)}
                                disabled={deletedBoards.length === 0}
                                className='flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium'
                            >
                                <CheckSquare className='h-4 w-4' />
                                Select Multiple
                            </button>
                            <button
                                onClick={handleEmptyRecycleBin}
                                disabled={deletedBoards.length === 0}
                                className='flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium'
                            >
                                <Trash2 className='h-4 w-4' />
                                Delete All
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className='p-6'>
                <section>
                    <h3 className='text-xl font-medium mb-4 flex items-center gap-2'>
                        <Layout className='h-5 w-5 text-blue-600' />
                        Deleted Boards
                    </h3>

                    {isLoading ? (
                        <p className='text-gray-500 italic'>Loading...</p>
                    ) : deletedBoards.length > 0 ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                            {deletedBoards.map(board => (
                                <div
                                    key={board.id}
                                    onClick={() => isSelectionMode && toggleSelection(board.id)}
                                    className={`p-4 bg-white border border-gray-300 rounded-lg group transition-all ${
                                        isSelectionMode
                                            ? 'cursor-pointer hover:border-blue-400'
                                            : 'border-gray-200'
                                    } ${
                                        selectedBoardIds.includes(board.id)
                                            ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50'
                                            : ''
                                    }`}
                                >
                                    <div className='flex justify-between items-start mb-2'>
                                        <div className="flex items-center gap-2">
                                            {isSelectionMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBoardIds.includes(board.id)}
                                                    onChange={() => {}} // Handled by parent div
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                                                />
                                            )}
                                            <h4 className='font-bold text-lg'>{board.name}</h4>
                                        </div>
                                        <span className='text-xs text-gray-400'>
                                            Deleted: {new Date(board.deleted_at!).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className='text-sm text-gray-600 mb-4 line-clamp-2'>
                                        {board.description || "No description"}
                                    </p>
                                    {!isSelectionMode && (
                                        <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    restoreBoard(board.id);
                                                }}
                                                className='cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 rounded border border-green-300 hover:bg-green-100 transition-colors text-sm font-medium'
                                            >
                                                <RefreshCw className='h-4 w-4' />
                                                Restore
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    permanentlyDeleteBoard(board.id);
                                                }}
                                                className='cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-700 rounded border border-red-300 hover:bg-red-100 transition-colors text-sm font-medium'
                                            >
                                                <Trash2 className='h-4 w-4' />
                                                Delete Forever
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl'>
                            <Trash2 className='h-12 w-12 text-gray-300 mx-auto mb-2' />
                            <p className='text-gray-500'>The recycle bin is empty.</p>
                        </div>
                    )}
                </section>

                <section className='mt-12 opacity-50'>
                    <h3 className='text-xl font-medium mb-4 flex items-center gap-2'>
                        <Columns className='h-5 w-5 text-purple-500' />
                        Deleted Columns & Cards
                    </h3>
                    <p className='text-sm text-gray-500 italic'>
                        Restoring a board will also restore all its columns and cards.
                        Direct restoration of individual columns and cards from the recycle bin is coming soon.
                    </p>
                </section>
            </main>
        </div>
    );
}
