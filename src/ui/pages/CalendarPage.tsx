import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Hash } from 'lucide-react';
import { getApi } from '../utils/mockApi';
import type { Card, Board } from '../../types';
import { useNavigate } from 'react-router-dom';
import { PluginSlot } from '../components/PluginProvider';

interface EnrichedCard extends Card {
    boardName?: string;
    boardId?: string;
}

type ViewMode = 'month' | 'week' | 'forward';

export default function CalendarPage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [cards, setCards] = useState<EnrichedCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [draggedCard, setDraggedCard] = useState<EnrichedCard | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const api = getApi();
            const boardsResult = await api.getBoards();
            if (boardsResult.success && boardsResult.data) {
                const allCards: EnrichedCard[] = [];
                await Promise.all(boardsResult.data.map(async (board: Board) => {
                    const cardsResult = await api.getCardsByBoard(board.id);
                    if (cardsResult.success && cardsResult.data) {
                        allCards.push(...cardsResult.data.map(card => ({
                            ...card,
                            boardName: board.name,
                            boardId: board.id
                        })));
                    }
                }));
                setCards(allCards.filter(c => c.due_date));
            }
        } catch (error) {
            console.error("Failed to load calendar data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else if (viewMode === 'week') {
            const prevWeek = new Date(currentDate);
            prevWeek.setDate(currentDate.getDate() - 7);
            setCurrentDate(prevWeek);
        } else {
            const prev10 = new Date(currentDate);
            prev10.setDate(currentDate.getDate() - 10);
            setCurrentDate(prev10);
        }
    };

    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        } else if (viewMode === 'week') {
            const nextWeek = new Date(currentDate);
            nextWeek.setDate(currentDate.getDate() + 7);
            setCurrentDate(nextWeek);
        } else {
            const next10 = new Date(currentDate);
            next10.setDate(currentDate.getDate() + 10);
            setCurrentDate(next10);
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleDragStart = (e: React.DragEvent, card: EnrichedCard) => {
        setDraggedCard(card);
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, date: Date, hour?: number) => {
        e.preventDefault();
        if (!draggedCard) return;

        const newDueDate = new Date(date);
        if (hour !== undefined) {
            newDueDate.setHours(hour, 0, 0, 0);
        } else if (draggedCard.due_date) {
            const oldDate = new Date(draggedCard.due_date);
            newDueDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
        } else {
            newDueDate.setHours(12, 0, 0);
        }

        const updatedCard = { ...draggedCard, due_date: newDueDate.toISOString() };

        try {
            const api = getApi();
            const result = await api.updateCard(updatedCard);
            if (result.success) {
                setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
            }
        } catch (error) {
            console.error("Failed to update card due date:", error);
        } finally {
            setDraggedCard(null);
        }
    };

    const generateCalendarDays = () => {
        const days = [];
        if (viewMode === 'month') {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const totalDays = daysInMonth(year, month);
            const firstDay = firstDayOfMonth(year, month);

            const prevMonthDays = daysInMonth(year, month - 1);
            for (let i = firstDay - 1; i >= 0; i--) {
                days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
            }
            for (let i = 1; i <= totalDays; i++) {
                days.push({ date: new Date(year, month, i), isCurrentMonth: true });
            }
            const remainingSlots = 42 - days.length;
            for (let i = 1; i <= remainingSlots; i++) {
                days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
            }
        } else if (viewMode === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                days.push({ date: day, isCurrentMonth: true });
            }
        } else if (viewMode === 'forward') {
            for (let i = 0; i < 10; i++) {
                const day = new Date(currentDate);
                day.setDate(currentDate.getDate() + i);
                days.push({ date: day, isCurrentMonth: true });
            }
        }
        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const getWeekNumber = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getCardsForDate = (date: Date, hour?: number) => {
        return cards.filter(card => {
            if (!card.due_date) return false;
            const d = new Date(card.due_date);
            const sameDate = d.getDate() === date.getDate() &&
                            d.getMonth() === date.getMonth() &&
                            d.getFullYear() === date.getFullYear();
            if (!sameDate) return false;
            if (hour !== undefined) {
                return d.getHours() === hour;
            }
            return true;
        }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    };

    const calendarDays = generateCalendarDays();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="flex flex-col h-full ">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-6 pb-4 flex flex-col md:flex-row items-center justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 uppercase tracking-tight'>Calendar</h2>
                    <p className='text-gray-500 tracking-wide truncate hidden lg:block'>
                        Schedule and manage your cards.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    {/* View Selector */}
                    <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1 space-x-1">
                        {(['month', 'week', 'forward'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-all cursor-pointer capitalize duration-300
                                    ${viewMode === mode ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {mode === 'forward' ? '10 Days' : mode}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white rounded-lg ring-1 ring-gray-300 p-1 text-sm">
                            <button
                                onClick={handlePrev}
                                className=" hover:bg-gray-100 rounded-md transition-colors cursor-pointer p-1"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleToday}
                                className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                            >
                                Today
                            </button>
                            <button
                                onClick={handleNext}
                                className="hover:bg-gray-100 rounded-md transition-colors cursor-pointer p-1"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-300 font-bold text-sm text-gray-800 min-w-[150px] text-center whitespace-nowrap">
                            {viewMode === 'month' ? `${monthName} ${year}` :
                             viewMode === 'week' ? `Week ${getWeekNumber(currentDate)}` :
                             `From ${currentDate.toLocaleDateString()}`}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
                {viewMode !== 'forward' && (
                    <div className={`grid ${viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-7'} gap-px bg-gray-300 border border-gray-300 rounded-t-lg overflow-hidden`}>
                        {viewMode === 'week' && <div className="bg-gray-100 py-2"></div>}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-gray-100 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>
                )}

                <div className={`flex-1 overflow-y-auto overflow-x-hidden relative bg-gray-300 border-x border-b border-gray-300 ${viewMode !== 'forward' ? 'rounded-b-lg' : 'rounded-lg border-t'}`}>
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        </div>
                    )}

                    {viewMode === 'week' ? (
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-gray-300 gap-px">
                            {hours.map(hour => (
                                <div key={hour} className="contents">
                                    <div className="bg-gray-50 p-2 text-[10px] font-bold text-gray-400 text-right border-b border-gray-100 flex items-start justify-end pt-1">
                                        {hour.toString().padStart(2, '0')}:00
                                    </div>
                                    {calendarDays.map((day, idx) => {
                                        const dateCards = getCardsForDate(day.date, hour);
                                        const dayIsToday = isToday(day.date);
                                        return (
                                            <div
                                                key={`${idx}-${hour}`}
                                                className={`bg-white p-1 min-h-[60px] border-b border-gray-100 transition-colors hover:bg-gray-50/50`}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, day.date, hour)}
                                            >
                                                {hour === 0 && (
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className={`text-[10px] font-bold flex items-center justify-center h-5 w-5 rounded-full ${dayIsToday ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>
                                                            {day.date.getDate()}
                                                        </div>
                                                        <PluginSlot slotId="calendar-day" date={day.date} viewMode={viewMode} />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1">
                                                    {dateCards.map(card => (
                                                        <div
                                                            key={card.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, card)}
                                                            onClick={() => navigate(`/board/${card.boardId}`)}
                                                            className="group relative p-1.5 text-[10px] bg-white ring-1 ring-gray-200 rounded shadow-sm hover:ring-gray-400 hover:shadow-md transition-all cursor-pointer overflow-hidden border-l-2"
                                                            style={{ borderLeftColor: '#3b82f6' }}
                                                        >
                                                            <div className="font-bold truncate">{card.title}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`grid gap-px bg-gray-300 h-full
                            ${viewMode === 'month' ? 'grid-cols-7 grid-rows-6' :
                              'grid-cols-2 md:grid-cols-5 grid-rows-5 md:grid-rows-2'}`}>

                            {calendarDays.map((day, idx) => {
                                const dateCards = getCardsForDate(day.date);
                                const dayIsToday = isToday(day.date);

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white p-2 flex flex-col gap-1 min-h-[120px] transition-colors ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'text-gray-900'}`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day.date)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`text-sm font-semibold flex items-center justify-center h-7 w-7 rounded-full ${dayIsToday ? 'bg-gray-900 text-white' : ''}`}>
                                                    {day.date.getDate()}
                                                </div>
                                                <PluginSlot slotId="calendar-day" date={day.date} viewMode={viewMode} />
                                            </div>
                                            {(viewMode === 'forward' || (viewMode === 'week' && day.date.getDate() === 1)) && (
                                                <span className="text-[10px] font-bold uppercase text-gray-400">
                                                    {day.date.toLocaleString('default', { month: 'short' })}
                                                </span>
                                            )}
                                            {viewMode === 'forward' && (
                                                <span className="text-[10px] font-bold uppercase text-gray-500">
                                                    {day.date.toLocaleString('default', { weekday: 'short' })}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[150px] scrollbar-hide">
                                            {dateCards.map(card => (
                                                <div
                                                    key={card.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, card)}
                                                    onClick={() => navigate(`/board/${card.boardId}`)}
                                                    className="group relative p-2 text-xs bg-white ring-1 ring-gray-200 rounded shadow-sm hover:ring-gray-400 hover:shadow-md transition-all cursor-pointer overflow-hidden border-l-4"
                                                    style={{ borderLeftColor: '#3b82f6' }}
                                                >
                                                    <div className="font-bold truncate mb-0.5">{card.title}</div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                        <Hash className="h-3 w-3" />
                                                        <span className="truncate">{card.boardName}</span>
                                                    </div>
                                                    {card.due_date && (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{new Date(card.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

