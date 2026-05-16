import { useEffect, useState, useCallback, useMemo } from "react";
import { User, AtSign, Save, CheckCircle2, Layout, Calendar, Clock, ChevronRight } from "lucide-react";
import { getApi } from "../utils/mockApi";
import { Link } from "react-router-dom";
import type { UserProfile, Card } from "../../types";

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile>({
        name: "",
        username: "",
        avatar: "",
        bio: ""
    });
    const [activityData, setActivityData] = useState<{ [date: string]: number }>({});
    const [recentActivity, setRecentActivity] = useState<(Card & { boardName?: string; boardId?: string })[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const api = getApi();
            const profileResult = await api.getUserProfile();
            if (profileResult.success && profileResult.data) {
                setProfile(profileResult.data);
            }

            const statsResult = await api.getActivityStats();
            if (statsResult.success && statsResult.data) {
                setActivityData(statsResult.data);
            }

            const overviewResult = await api.getOverviewData();
            if (overviewResult.success && overviewResult.data) {
                setRecentActivity(overviewResult.data.recent);
            }
        } catch (error) {
            console.error("Failed to load profile data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        getApi().setDiscordActivity('Viewing Profile', 'Idle');
    }, []);

    const totalContributions = useMemo(() => {
        return Object.values(activityData).reduce((sum, count) => sum + count, 0);
    }, [activityData]);

    const activeStreak = useMemo(() => {
        const getLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let streak = 0;
        const checkDate = new Date();
        const todayStr = getLocalDateStr(checkDate);
        if (!activityData[todayStr]) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        while (true) {
            const dateStr = getLocalDateStr(checkDate);
            if (activityData[dateStr]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [activityData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const api = getApi();
            const result = await api.updateUserProfile(profile);
            if (result.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Failed to update profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const renderHeatmap = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const weeks = [];
        const startDate = new Date();
        // Go back 51 weeks + whatever days to get to the start of that week (Sunday)
        startDate.setDate(today.getDate() - (51 * 7) - today.getDay());
        startDate.setHours(0,0,0,0);

        const monthPositions: { [index: number]: string } = {};
        let lastMonthSeen = -1;
        let lastLabelWeek = -5; // Prevent labels within 5 weeks of each other

        for (let w = 0; w < 52; w++) {
            const weekDays = [];
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (w * 7));

            // Only add a label if it's a new month AND we haven't placed a label recently
            if (weekDate.getMonth() !== lastMonthSeen && (w - lastLabelWeek) > 3) {
                const monthName = weekDate.toLocaleString('default', { month: 'short' });
                let label = monthName;

                if (lastMonthSeen === -1) {
                    label = `${monthName} ${weekDate.getFullYear()}`;
                } else if (weekDate.getMonth() === 0) {
                    label = `${monthName} '${String(weekDate.getFullYear()).slice(-2)}`;
                }

                monthPositions[w] = label;
                lastMonthSeen = weekDate.getMonth();
                lastLabelWeek = w;
            }

            for (let d = 0; d < 7; d++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + (w * 7) + d);
                const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                const count = activityData[dateKey] || 0;
                weekDays.push({ date: dateKey, count, isFuture: current > today });
            }
            weeks.push(weekDays);
        }

        const getColor = (count: number, isFuture: boolean) => {
            if (isFuture) return 'bg-transparent';
            if (count === 0) return 'bg-gray-100';
            if (count < 2) return 'bg-green-200';
            if (count < 4) return 'bg-green-300';
            if (count < 6) return 'bg-green-500';
            return 'bg-green-700';
        };

        return (
            <div className='bg-white p-6 rounded-xl border border-gray-300 shadow-sm'>
                <h3 className='text-lg font-bold mb-4 flex items-center gap-2 text-gray-800'>
                    <Layout className='h-5 w-5 text-green-600' />
                    Board Activity Heatmap
                </h3>

                <div className='flex gap-2'>
                    {/* Y-Axis Labels - Aligned with grid rows */}
                    <div className='flex flex-col gap-1 pt-7 shrink-0 font-medium text-[9px] text-gray-400'>
                        <div className='h-3 flex items-center'></div> {/* Sun */}
                        <div className='h-3 flex items-center'>Mon</div> {/* Mon */}
                        <div className='h-3 flex items-center'></div> {/* Tue */}
                        <div className='h-3 flex items-center'>Wed</div> {/* Wed */}
                        <div className='h-3 flex items-center'></div> {/* Thu */}
                        <div className='h-3 flex items-center'>Fri</div> {/* Fri */}
                        <div className='h-3 flex items-center'></div> {/* Sat */}
                    </div>

                    <div className='overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200'>
                        <div className='inline-block'>
                            {/* Month Labels Row */}
                            <div className='flex gap-1 h-5 mb-2 relative'>
                                {weeks.map((_, wi) => (
                                    <div key={wi} className='w-3 shrink-0 text-[9px] text-gray-400 font-bold uppercase tracking-tight'>
                                        {monthPositions[wi] && (
                                            <span className='absolute whitespace-nowrap'>{monthPositions[wi]}</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Squares Grid */}
                            <div className='flex gap-1'>
                                {weeks.map((week, wi) => (
                                    <div key={wi} className='flex flex-col gap-1 shrink-0'>
                                        {week.map((day, di) => (
                                            <div
                                                key={di}
                                                title={day.isFuture ? "" : `${day.count} activities on ${day.date}`}
                                                className={`w-3 h-3 rounded-sm ${getColor(day.count, day.isFuture)} transition-colors duration-300`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className='mt-2 flex items-center justify-end gap-2 text-[10px] text-gray-500 font-medium'>
                    <span>Less</span>
                    <div className='w-3 h-3 bg-gray-100 rounded-sm' />
                    <div className='w-3 h-3 bg-green-200 rounded-sm' />
                    <div className='w-3 h-3 bg-green-300 rounded-sm' />
                    <div className='w-3 h-3 bg-green-500 rounded-sm' />
                    <div className='w-3 h-3 bg-green-700 rounded-sm' />
                    <span>More</span>
                </div>
            </div>
        );
    };

    if (isLoading && !profile.name) {
        return <div className='p-8 flex items-center justify-center h-full text-gray-500 italic'>Loading Profile...</div>;
    }

    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-start justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight'>Profile</h2>
                    <p className='text-gray-500 tracking-wide truncate'>Manage your account and view your board contributions.</p>
                </div>
            </header>

            <main className="p-6 mb-10">
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    <div className='lg:col-span-1 space-y-6'>
                        <div className='bg-white p-6 rounded-xl border border-gray-300 shadow-sm flex flex-col items-center text-center'>
                            <div className='relative mb-4 group'>
                                <div className='w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-bold border-4 border-white shadow-md'>
                                    {profile.name?.charAt(0) || 'U'}
                                </div>
                            </div>
                            <h3 className='text-xl font-bold text-gray-900'>{profile.name || 'User Name'}</h3>
                            <p className='text-sm text-gray-500 mb-4'>@{profile.username || 'username'}</p>
                            <p className='text-sm text-gray-600 italic'>"{profile.bio || 'Add a bio to your profile...'}"</p>
                        </div>

                        <div className='bg-white p-6 rounded-xl border border-gray-300 shadow-sm space-y-4'>
                            <h4 className='font-bold text-gray-900 border-b pb-2 mb-4'>Personal Info</h4>
                            <div>
                                <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>Full Name</label>
                                <div className='relative'>
                                    <User className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                                    <input
                                        type='text'
                                        value={profile.name}
                                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                                        className='w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all'
                                    />
                                </div>
                            </div>
                            <div>
                                <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>Username</label>
                                <div className='relative'>
                                    <AtSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                                    <input
                                        type='text'
                                        value={profile.username}
                                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                                        className='w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all'
                                    />
                                </div>
                            </div>
                            <div>
                                <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>Bio</label>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                                    className='w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all resize-none'
                                    rows={4}
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className='w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed'
                            >
                                {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircle2 className='h-5 w-5'/> Saved!</> : <><Save className='h-5 w-5'/> Save Profile</>}
                            </button>
                        </div>
                    </div>

                    <div className='lg:col-span-2 space-y-6'>
                        {renderHeatmap()}

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='p-6 rounded-xl shadow-sm bg-white border border-gray-300 flex items-center gap-4'>
                                <div className='p-3 bg-white/20 rounded-xl'>
                                    <Calendar className='h-8 w-8' />
                                </div>
                                <div>
                                    <p className='text-sm font-medium'>Total Contributions</p>
                                    <h4 className='text-3xl font-black'>{totalContributions}</h4>
                                </div>
                            </div>
                            <div className='p-6 rounded-xl shadow-sm bg-white border border-gray-300 flex items-center gap-4'>
                                <div className='p-3 bg-white/20 rounded-xl'>
                                    <CheckCircle2 className='h-8 w-8' />
                                </div>
                                <div>
                                    <p className='text-sm font-medium'>Active Streak</p>
                                    <h4 className='text-3xl font-black'>{activeStreak} Days</h4>
                                </div>
                            </div>
                        </div>

                        <div className='bg-white p-6 rounded-xl border border-gray-300 shadow-sm'>
                            <h3 className='text-lg font-bold mb-6 flex items-center gap-2'>
                                <Clock className='h-5 w-5 text-orange-500' />
                                Recent Contributions
                            </h3>
                            <div className='space-y-4'>
                                {recentActivity.length > 0 ? recentActivity.map(card => (
                                    <Link
                                        key={card.id}
                                        to={`/board/${card.boardId}`}
                                        className='flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors group'
                                    >
                                        <div className='w-2 h-2 rounded-full bg-blue-500' />
                                        <div className="flex-1">
                                            <p className='text-sm text-gray-600'>
                                                Worked on card <strong className="group-hover:text-blue-600 transition-colors">"{card.title}"</strong>
                                                {card.boardName && <> in board <strong>"{card.boardName}"</strong></>}
                                            </p>
                                        </div>
                                        <span className='text-xs text-gray-400 font-medium whitespace-nowrap'>
                                            {new Date(card.updated_at).toLocaleDateString()}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-gray-300" />
                                    </Link>
                                )) : (
                                    <p className='text-gray-500 italic text-center py-4'>No recent activity found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
