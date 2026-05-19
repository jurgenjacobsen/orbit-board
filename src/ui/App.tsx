import './App.css'
import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, User, Menu, X, SquareLibrary, Calendar } from 'lucide-react';
import OverviewPage from './pages/OverviewPage.tsx';
import BoardsPage from './pages/BoardsPage.tsx';
import BoardPage from './pages/BoardPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import RecycleBinPage from './pages/RecycleBinPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import { ConfirmProvider } from './components/ConfirmProvider';
import CalendarPage from './pages/CalendarPage.tsx';

interface NavLink {
    to: string;
    label: string;
    icon: React.ElementType;
}

function Sidebar({ isExpanded, toggleSidebar, navLinks }: { isExpanded: boolean; toggleSidebar: () => void, navLinks: NavLink[] }) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                if (e.key === 'Escape') (e.target as HTMLElement).blur();
                return;
            }

            // Global Navigation Shortcuts: G then ...
            if (e.key.toLowerCase() === 'g') {
                const onNextKey = (nextE: KeyboardEvent) => {
                    const key = nextE.key.toLowerCase();
                    if (key === 'o') navigate('/');
                    if (key === 'b') navigate('/boards');
                    if (key === 'p') navigate('/profile');
                    if (key === 's') navigate('/settings');
                    if (key === 'c') navigate('/calendar');
                    if (key === 'r') navigate('/recycle-bin');
                    window.removeEventListener('keydown', onNextKey);
                };
                window.addEventListener('keydown', onNextKey, { once: true });
                setTimeout(() => window.removeEventListener('keydown', onNextKey), 1000);
            }

            // Focus search
            if (e.key === '/') {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const isActive = (to: string) => {
        const currentPath = location.pathname;
        if (to === '/') return currentPath === '/';
        return currentPath.startsWith(to);
    }

    return (
        <aside className={
                    `fixed top-0 left-0 ${isExpanded ? 'w-72' : 'w-24'} transition-all duration-300`
                }>
                    <div className='m-4 h-[calc(100vh-2rem)] rounded-lg overflow-hidden flex flex-col ring-1 ring-gray-700 bg-white'>
                        {/* Header */}
                        <div className={`flex items-center ${isExpanded ? 'justify-between m-4' : 'justify-center m-2'}`}>
                            <h1 className={`text-2xl font-bold ${isExpanded ? 'block' : 'hidden'} transition-all duration-300 whitespace-nowrap`}>
                                Orbit Board
                            </h1>
                            <button
                                onClick={() => toggleSidebar()}
                                className={`${isExpanded ? 'p-2' : 'p-3'} rounded-lg hover:bg-gray-100 cursor-pointer transition-all duration-300`}
                                aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                            >
                                {isExpanded ? <X className='h-6 w-6'/> : <Menu className='h-6 w-6' />}
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav className='flex-1 space-y-4'>
                            {navLinks.map(({ to, label, icon: Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className='block'
                                >
                                    <div className={`
                                        flex ${isExpanded ? 'py-3 px-4 mx-4' : 'justify-center p-3 mx-2'} rounded-lg transition-all duration-300 hover:bg-gray-100
                                        ${
                                            isActive(to)
                                            ? 'bg-gray-5 ring ring-gray-300'
                                            : 'hover:bg-gray-100 text-gray-700'
                                        }
                                    `}>
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
    );
}


function App() {
    const [isExpanded, setIsExpanded] = useState(true);

    const navLinks = [
        { to: '/', label: 'Overview', icon: Home },
        { to: '/boards', label: 'Boards', icon: SquareLibrary },
        { to: '/calendar', label: 'Calendar', icon: Calendar },
        { to: '/profile', label: 'Profile', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <ConfirmProvider>
            <Router>
                <AppContent isExpanded={isExpanded} setIsExpanded={setIsExpanded} navLinks={navLinks} />
            </Router>
        </ConfirmProvider>
    );
}

function AppContent({ isExpanded, setIsExpanded, navLinks }: { isExpanded: boolean; setIsExpanded: (v: boolean) => void; navLinks: NavLink[] }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (window.api?.onNavigate) {
            const unsubscribe = window.api.onNavigate((path: string) => {
                navigate(path);
            });
            return () => unsubscribe();
        }
    }, [navigate]);

    return (
        <div className={` text-gray-900 bg-gray-50 min-h-screen`}>
            <Sidebar isExpanded={isExpanded} toggleSidebar={() => setIsExpanded(!isExpanded)} navLinks={navLinks} />
            <main className={`h-screen overflow-y-auto ${isExpanded ? 'ml-72' : 'ml-24'} transition-all duration-300 pt-4`}>
                <Routes>
                    <Route path='/' element={<OverviewPage />} />
                    <Route path='/boards' element={<BoardsPage />} />
                    <Route path='/board/:boardId' element={<BoardPage />} />
                    <Route path='/recycle-bin' element={<RecycleBinPage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    <Route path='/calendar' element={<CalendarPage />} />
                    <Route path='/settings' element={<SettingsPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App
