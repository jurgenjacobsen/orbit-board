import './App.css'
import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Settings, User, Menu, X } from 'lucide-react';
import HomePage from './pages/HomePage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import BoardPage from './pages/BoardPage.tsx';

function App() {
    const [isExpanded, setIsExpanded] = useState(true);

    const navLinks = [
        { to: '/', label: 'Overview', icon: Home },
        { to: '/profile', label: 'Profile', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <Router>
            <div className={`min-h-screen dark:bg-gray-900 dark:text-white bg-white text-gray-900`}>
                <aside className={
                    `fixed top-0 left-0 h-screen ${isExpanded ? 'w-72' : 'w-24'} transition-all duration-300`
                }>
                    <div className='m-4 h-[calc(100vh-2rem)] rounded-lg overflow-hidden flex flex-col shadow-lg ring-1 ring-gray-700'>
                        {/* Header */}
                        <div className={`flex items-center ${isExpanded ? 'px-4 justify-between' : 'justify-center'} my-2`}>
                            <h1 className={`text-2xl font-bold ${isExpanded ? 'block' : 'hidden'} transition-all duration-300 whitespace-nowrap`}>
                                Orbit Board
                            </h1>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className='p-2 rounded-lg hover:bg-gray-100 mx-2 cursor-pointer transition-all duration-300'
                                aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                            >
                                {isExpanded ? <X className='h-6 w-6'/> : <Menu className='h-6 w-6' />}
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className='flex-1 mt-4 space-y-2'>
                            {navLinks.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className='block'
                                >
                                    <div className={`flex ${isExpanded ? 'py-3 px-4' : 'justify-center p-3'} rounded-lg transition-all duration-300 hover:bg-gray-100 mx-2`}>
                                        <Icon className='h-6 w-6'/>
                                        {
                                            isExpanded &&
                                            (<span className={`ml-4 ${isExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 whitespace-nowrap`}>
                                                {label}
                                            </span>)
                                        }
                                    </div>
                                </Link>
                            ))}
                        </nav>

                        {/* Footer */}
                        <footer className={`p-4 text-left text-sm ${isExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 whitespace-nowrap`}>
                            © 2026 Orbit Board
                        </footer>
                    </div>
                </aside>
                <main className={`h-screen overflow-y-auto ${isExpanded ? 'ml-72' : 'ml-24'} transition-all duration-300 mt-4`}>
                    <Routes>
                        <Route path='/' element={<HomePage />} />
                        <Route path='/board/:boardId' element={<BoardPage />} />
                        <Route path='/settings' element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App
