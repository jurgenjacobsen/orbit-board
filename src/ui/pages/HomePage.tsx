import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
    const BOARDS = [ // Placeholder for boards data
        {
            id: 1,
            name: 'Project Alpha',
            description: 'Board for Project Alpha tasks and progress.',
            lastEdited: '2024-06-15'
        }
    ];
    return (
        <div>
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Home</h2>
            </header>
            <main className='p-6'>
                <section>
                    <h3 className='text-2xl font-semibold mb-4'>Your Boards</h3>
                    
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        <div className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-shadow duration-300 bg-green-300/25 flex flex-col items-center justify-center cursor-pointer'>
                            <Plus className='h-8 w-8'/>
                            <h4 className='text-xl font-bold'>Create New Board</h4>
                        </div>
                        {BOARDS.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime()).map(board => (
                            <Link
                                to={`/board/${board.id}`}
                                key={board.id}
                                className=''
                                draggable={false}
                            >
                                <div key={board.id} className='rounded-lg shadow-md ring-1 ring-gray-700 p-4 hover:shadow-lg transition-shadow duration-300'>
                                    <h4 className='text-xl font-bold mb-2'>{board.name}</h4>
                                    <p className='text-gray-600 mb-4'>{board.description}</p>
                                    <p className='text-sm text-gray-500'>Last edited: {board.lastEdited}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
