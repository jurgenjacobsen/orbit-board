import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
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

export default function Home() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");
    const [newBoardDescription, setNewBoardDescription] = useState("");

    useEffect(() => {
        loadBoards();
    }, []);

    const loadBoards = async () => {
        try {
            const api = getApi();
            const result = await api.getBoards();
            if (result.success) {
                setBoards(result.data);
            }
        } catch (error) {
            console.error("Failed to load boards:", error);
        }
    };

    const createBoard = async () => {
        if (!newBoardName.trim()) return;

        try {
            const api = getApi();
            const board = {
                id: crypto.randomUUID(),
                name: newBoardName,
                description: newBoardDescription || null,
            };

            const result = await api.createBoard(board);
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
        <>
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Home</h2>
            </header>
            <main className='p-6'>
                <section>
                    <h3 className='text-2xl font-semibold mb-4'>Your Boards</h3>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {isCreating ? (
                            <div className='rounded-lg shadow-md ring-1 ring-gray-700 p-4'>
                                <h4 className='text-xl font-bold mb-4'>Create New Board</h4>
                                <input
                                    type='text'
                                    placeholder='Board Name'
                                    value={newBoardName}
                                    onChange={(e) => setNewBoardName(e.target.value)}
                                    className='w-full p-2 mb-2 border border-gray-300 rounded'
                                    autoFocus
                                />
                                <textarea
                                    placeholder='Description (optional)'
                                    value={newBoardDescription}
                                    onChange={(e) => setNewBoardDescription(e.target.value)}
                                    className='w-full p-2 mb-4 border border-gray-300 rounded'
                                    rows={3}
                                />
                                <div className='flex gap-2'>
                                    <button
                                        onClick={createBoard}
                                        className='flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewBoardName("");
                                            setNewBoardDescription("");
                                        }}
                                        className='flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 '
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsCreating(true)}
                                className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-all duration-300 bg-green-300/25 hover:bg-green-300/50  flex flex-col items-center justify-center cursor-pointer'
                            >
                                <Plus className='h-8 w-8'/>
                                <h4 className='text-xl font-bold'>Create New Board</h4>
                            </div>
                        )}
                        {boards.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map(board => (
                            <Link
                                to={`/board/${board.id}`}
                                key={board.id}
                                className=''
                                draggable={false}
                            >
                                <div className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-shadow duration-300'>
                                    <h4 className='text-xl font-bold mb-2'>{board.name}</h4>
                                    <p className='text-gray-600 mb-4'>{board.description || 'No description'}</p>
                                    <p className='text-sm text-gray-500'>Last edited: {new Date(board.updated_at).toLocaleDateString()}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
