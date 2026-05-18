import { useEffect, useState } from "react";
import { getApi } from "../utils/mockApi";
import { useNavigate } from "react-router-dom";
import { useConfirm, useAlert } from "../hooks/useConfirm";
import { useDarkMode } from "../hooks/useDarkMode";

export default function SettingsPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const alert = useAlert();
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    const [discordSettings, setDiscordSettings] = useState({
        enabled: true,
        showBoard: true,
        showCard: true
    });

    const [systemSettings, setSystemSettings] = useState({
        launchAtStartup: false,
        startMinimized: false,
        closeToTray: true
    });

    useEffect(() => {
        getApi().setDiscordActivity('Adjusting Settings', 'Idle');
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const api = getApi();

        // Discord settings
        const enabled = await api.getSetting('discordEnabled');
        const showBoard = await api.getSetting('discordShowBoard');
        const showCard = await api.getSetting('discordShowCard');

        setDiscordSettings({
            enabled: enabled.success && enabled.data !== null ? enabled.data === 'true' : true,
            showBoard: showBoard.success && showBoard.data !== null ? showBoard.data === 'true' : true,
            showCard: showCard.success && showCard.data !== null ? showCard.data === 'true' : true
        });

        // System settings
        const launchAtStartup = await api.getSetting('launchAtStartup');
        const startMinimized = await api.getSetting('startMinimized');
        const closeToTray = await api.getSetting('closeToTray');

        setSystemSettings({
            launchAtStartup: launchAtStartup.success && launchAtStartup.data !== null ? launchAtStartup.data === 'true' : false,
            startMinimized: startMinimized.success && startMinimized.data !== null ? startMinimized.data === 'true' : false,
            closeToTray: closeToTray.success && closeToTray.data !== null ? closeToTray.data === 'true' : true
        });
    };

    const updateDiscordSetting = async (key: string, value: boolean) => {
        const api = getApi();
        await api.setSetting(key, String(value));
        setDiscordSettings(prev => ({
            ...prev,
            [key.replace('discord', '').charAt(0).toLowerCase() + key.replace('discord', '').slice(1)]: value
        }));

        if (key === 'discordEnabled' && !value) {
            await api.clearDiscordActivity();
        }
    };

    const updateSystemSetting = async (key: string, value: boolean) => {
        const api = getApi();
        await api.setSetting(key, String(value));
        setSystemSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const resetApp = async () => {
        const confirmed = await confirm({
            title: "Reset Application",
            message: "Are you sure you want to reset all application data? This action cannot be undone.",
            isDanger: true
        });
        if (confirmed) {
            const api = getApi();
            const result = await api.resetApplication();
            if (result.success) {
                await alert({
                    title: "Success",
                    message: "Application data has been reset."
                });
                navigate("/");
            } else {
                await alert({
                    title: "Error",
                    message: "Failed to reset application data.",
                    isDanger: true
                });
            }
        }
    };

    return (
        <div className="">
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Settings</h2>
            </header>
            <main className='p-6 grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className="space-y-8">
                    <section>
                        <h3 className='text-2xl font-semibold mb-4'>UI</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg">
                                <div>
                                    <span className="text-lg font-medium">Dark Mode</span>
                                    <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                                </div>
                                <button
                                    onClick={toggleDarkMode}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className='text-2xl font-semibold mb-4'>System</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-medium">Launch at Startup</span>
                                        <p className="text-sm text-gray-500 ">Start Orbit Board when you log in</p>
                                    </div>
                                    <button
                                        onClick={() => updateSystemSetting('launchAtStartup', !systemSettings.launchAtStartup)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${systemSettings.launchAtStartup ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${systemSettings.launchAtStartup ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {systemSettings.launchAtStartup && (
                                    <div className="flex items-center justify-between pt-2">
                                        <div>
                                            <span className="text-sm">Start Minimized</span>
                                            <p className="text-xs text-gray-500">Launch hidden in the system tray</p>
                                        </div>
                                        <button
                                            onClick={() => updateSystemSetting('startMinimized', !systemSettings.startMinimized)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${systemSettings.startMinimized ? 'bg-blue-500' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${systemSettings.startMinimized ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                                    <div>
                                        <span className="text-lg font-medium">Close to Tray</span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Minimize to tray instead of quitting</p>
                                    </div>
                                    <button
                                        onClick={() => updateSystemSetting('closeToTray', !systemSettings.closeToTray)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${systemSettings.closeToTray ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${systemSettings.closeToTray ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className='text-2xl font-semibold mb-4'>Integrations</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-medium">Discord Rich Presence</span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Show your board activity on Discord</p>
                                    </div>
                                    <button
                                        onClick={() => updateDiscordSetting('discordEnabled', !discordSettings.enabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${discordSettings.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${discordSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {discordSettings.enabled && (
                                    <div className="pt-4 border-t border-gray-300 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Show Board Name</span>
                                            <button
                                                onClick={() => updateDiscordSetting('discordShowBoard', !discordSettings.showBoard)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${discordSettings.showBoard ? 'bg-blue-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform cursor-pointer ${discordSettings.showBoard ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Show Card Title</span>
                                            <button
                                                onClick={() => updateDiscordSetting('discordShowCard', !discordSettings.showCard)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${discordSettings.showCard ? 'bg-blue-500' : 'bg-gray-300'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${discordSettings.showCard ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className='text-2xl font-semibold mb-4 text-red-600'>Danger Zone</h3>
                        <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                            <p className="text-sm mb-4 ">
                                Once you reset application data, there is no going back. Please be certain.
                            </p>
                            <button
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 cursor-pointer transition-colors font-medium"
                                onClick={resetApp}
                            >
                                Reset Application Data
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
