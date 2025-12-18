import { useEffect, useState } from "react";
import { getApi } from "../utils/mockApi";

// Define the shape of your data for better TypeScript support
interface UserData {
    level: number;
    xp: number;
    progress: number;
}

export default function ProfilePage() {
    // Initialize as null so we can show a loading state if needed
    const [userData, setUserData] = useState<UserData | null>(null);

    const getCurrent = async () => {
        const api = getApi();
        try {
            const response = await api.getCurrent();
            // Assuming response structure matches: { data: { level: 4, xp: 177, progress: 0.58... } }
            if (response && response.data) {
                setUserData(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        }
    };

    const completeTask = async () => {
        const api = getApi();
        await api.completeTask();
        // Refresh the data immediately after task completion
        getCurrent();
    };

    useEffect(() => {
        getCurrent();
    }, []);

    // Simple helper to format percentage for CSS
    const progressPercent = userData ? Math.min(Math.max(userData.progress * 100, 0), 100) : 0;

    return (
        <div>
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Profile</h2>
            </header>

            <main className='p-6 space-y-8'>
                {/* Stats Card */}
                {userData ? (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md">
                        <div className="flex items-end justify-between mb-2">
                            <div>
                                <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">Current Level</h3>
                                <span className="text-4xl font-bold text-gray-800">{userData.level}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm text-gray-500">Current XP</span>
                                <div className="font-semibold text-gray-700">{userData.xp} XP</div>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block text-blue-600">
                                        {Math.round(progressPercent)}% to next level
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                                <div
                                    style={{ width: `${progressPercent}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-out"
                                ></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400">Loading profile...</div>
                )}

                {/* Actions */}
                <div>
                    <button
                        onClick={completeTask}
                        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        Complete Task (+XP)
                    </button>
                </div>
            </main>
        </div>
    );
}
