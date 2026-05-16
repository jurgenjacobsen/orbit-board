import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Layout, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { getApi } from "../utils/mockApi";
import type { Card } from "../../types";

interface OverviewData {
    upcoming: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
    recent: (Card & { columnName?: string; boardName?: string; boardId?: string })[];
}

export default function OverviewPage() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadOverviewData = useCallback(async () => {
        setIsLoading(true);
        try {
            const api = getApi();
            const result = await api.getOverviewData();
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Failed to load overview data:", error);
        } finally {
            setTimeout(() =>
            setIsLoading(false), 250); // Add a slight delay for better UX when refreshing
        }
    }, []);

    useEffect(() => {
        getApi().setDiscordActivity('Browsing Overview', 'Idle');
    }, []);

    useEffect(() => {
        loadOverviewData();
    }, [loadOverviewData]);

    const isOverdue = (dateStr: string) => {
        return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
    };

    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-start justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight'>Overview</h2>
                    <p className='text-gray-500 tracking-wide truncate'>Welcome back! Here's what's happening across your boards.</p>
                </div>
                <button
                    onClick={loadOverviewData}
                    disabled={isLoading}
                    className='p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-default'
                    title='Refresh data'
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <main className="p-6">
                {isLoading && !data ? (
                    <div className='p-8 flex items-center justify-center h-full text-gray-500 italic'>Loading Overview...</div>
                ) : (
                    <>
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-10'>
                            {/* Upcoming Tasks */}
                            <section>
                                <h3 className='text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800'>
                                    <Calendar className='h-6 w-6 text-blue-600' />
                                    Upcoming Due Dates
                                </h3>
                                <div className='space-y-4 border border-gray-300 rounded-xl p-4 bg-gray-50 h-100 overflow-y-auto overflow-x-hidden'>
                                    {data?.upcoming && data.upcoming.length > 0 ? (
                                        data.upcoming.map(card => (
                                            <Link
                                                key={card.id}
                                                to={`/board/${card.boardId}`}
                                                className='block p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group'
                                            >
                                                <div className='flex justify-between items-start mb-2'>
                                                    <h4 className='font-bold text-lg text-gray-900'>{card.title}</h4>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${isOverdue(card.due_date!) ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>
                                                        {isOverdue(card.due_date!) && <AlertCircle className='h-3 w-3' />}
                                                        {new Date(card.due_date!).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className='flex items-center gap-2 text-xs text-gray-400'>
                                                    <span className='font-medium text-gray-600'>{card.boardName}</span>
                                                    <ChevronRight className='h-3 w-3' />
                                                    <span>{card.columnName}</span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className='p-10 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl'>
                                            <Clock className='h-10 w-10 text-gray-300 mx-auto mb-3' />
                                            <p className='text-gray-500'>No upcoming tasks with due dates found.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Recent Activity */}
                            <section>
                                <h3 className='text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800'>
                                    <Clock className='h-6 w-6 text-purple-500' />
                                    Recent Activity
                                </h3>
                                <div className='space-y-4 border border-gray-300 rounded-xl p-4 bg-gray-50 h-100 overflow-y-auto overflow-x-hidden'>
                                    {data?.recent && data.recent.length > 0 ? (
                                        data.recent.map(card => (
                                            <Link
                                                key={card.id}
                                                to={`/board/${card.boardId}`}
                                                className='block p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group'
                                            >
                                                <h4 className='font-bold text-lg text-gray-900 mb-1'>{card.title}</h4>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center gap-2 text-xs text-gray-400'>
                                                        <span className='font-medium text-gray-600'>{card.boardName}</span>
                                                        <ChevronRight className='h-3 w-3' />
                                                        <span>{card.columnName}</span>
                                                    </div>
                                                    <span className='text-[10px] uppercase font-bold text-gray-500'>
                                                        Updated {new Date(card.updated_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className='p-10 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl'>
                                            <Layout className='h-10 w-10 text-gray-300 mx-auto mb-3' />
                                            <p className='text-gray-500'>No recent activity found.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Quick Links / Shortcuts */}
                        <section className='mt-16 pt-10 border-t border-gray-100'>
                            <h3 className='text-xl font-bold mb-6 text-gray-800'>Quick Actions</h3>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                <Link to="/boards" className='p-6 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors border border-blue-200'>
                                    <Layout className='h-8 w-8' />
                                    <span className='font-bold'>Manage Boards</span>
                                </Link>
                                <Link to="/recycle-bin" className='p-6 bg-red-50 text-red-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-100 transition-colors border border-red-100'>
                                    <AlertCircle className='h-8 w-8' />
                                    <span className='font-bold'>Recycle Bin</span>
                                </Link>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
