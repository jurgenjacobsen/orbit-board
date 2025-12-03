import './App.css'
import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Settings, User, Menu, X } from 'lucide-react';
import HomePage from './pages/HomePage.tsx';
import Logo from '../assets/icon.png'

function App() {
    const [isExpanded, setIsExpanded] = useState(true);

    const navLinks = [
        { to: '/', label: 'Overview', icon: Home },
        { to: '/settings', label: 'Settings', icon: Settings },
        { to: '/profile', label: 'Profile', icon: User },
    ];

    return (
        <Router>
            <div className='min-h-screen'>
                <aside className={
                    `fixed top-0 left-0 h-screen ${isExpanded ? 'w-72' : 'w-20'} flex flex-col transition-all duration-300`
                }>
                    <div className='m-4 h-full rounded-lg overflow-hidden'>
                        {/* Header */}
                        <div className={`flex items-center ${isExpanded ? 'px-4 justify-between' : 'justify-center'} my-2`}>
                            <h1 className={`text-2xl font-bold ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'} transition-opacity duration-500  whitespace-nowrap`}>
                                Orbit Board
                            </h1>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className='p-2 rounded-lg'
                            >
                                {isExpanded ? <X /> : <Menu />}
                            </button>
                        </div>
                    </div>
                </aside>
                <main>

                </main>
            </div>
        </Router>
    );
}

export default App
