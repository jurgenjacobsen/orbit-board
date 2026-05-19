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

    const [notificationSettings, setNotificationSettings] = useState({
        enabled: true,
        dueReminder: '30'
    });

    const [updateSettings, setUpdateSettings] = useState({
        autoUpdateEnabled: true
    });

    const [updateStatus, setUpdateStatus] = useState<string | null>(null);
    const [updateProgress, setUpdateProgress] = useState<{ percent: number } | null>(null);
    const [updateAvailable, setUpdateAvailable] = useState<any | null>(null);

    useEffect(() => {
        getApi().setDiscordActivity('Adjusting Settings', 'Idle');
        loadSettings();

        // Listen for updater events
        const cleanup = getApi().onUpdaterEvent((event: string, data?: any) => {
            if (event === 'updater:update-available') {
                setUpdateAvailable(data);
                setUpdateStatus('Update available: ' + data.version);
            } else if (event === 'updater:update-not-available') {
                setUpdateStatus('You are on the latest version.');
                setTimeout(() => setUpdateStatus(null), 3000);
            } else if (event === 'updater:error') {
                setUpdateStatus('Error checking for updates.');
                setTimeout(() => setUpdateStatus(null), 5000);
            } else if (event === 'updater:download-progress') {
                setUpdateProgress({ percent: data.percent });
                setUpdateStatus('Downloading update...');
            } else if (event === 'updater:update-downloaded') {
                setUpdateProgress(null);
                setUpdateStatus('Update downloaded. Ready to install.');
            }
        });

        return cleanup;
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

        // Notification settings
        const notificationsEnabled = await api.getSetting('notificationsEnabled');
        const notificationDueReminder = await api.getSetting('notificationDueReminder');

        setNotificationSettings({
            enabled: notificationsEnabled.success && notificationsEnabled.data !== null ? notificationsEnabled.data === 'true' : true,
            dueReminder: notificationDueReminder.success && notificationDueReminder.data !== null ? notificationDueReminder.data : '30'
        });

        // Update settings
        const autoUpdateEnabled = await api.getSetting('autoUpdateEnabled');
        setUpdateSettings({
            autoUpdateEnabled: autoUpdateEnabled.success && autoUpdateEnabled.data !== null ? autoUpdateEnabled.data === 'true' : true
        });
    };

    const updateAutoUpdateSetting = async (value: boolean) => {
        const api = getApi();
        await api.setSetting('autoUpdateEnabled', String(value));
        setUpdateSettings({ autoUpdateEnabled: value });
    };

    const checkForUpdates = async () => {
        setUpdateStatus('Checking for updates...');
        await getApi().checkForUpdates();
    };

    const downloadUpdate = async () => {
        setUpdateStatus('Starting download...');
        await getApi().downloadUpdate();
    };

    const installUpdate = () => {
        getApi().installUpdate();
    };

    const updateNotificationSetting = async (key: string, value: string | boolean) => {
        const api = getApi();
        await api.setSetting(key, String(value));
        setNotificationSettings(prev => ({
            ...prev,
            [key === 'notificationsEnabled' ? 'enabled' : 'dueReminder']: value
        }));
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
                        <h3 className='text-2xl font-semibold mb-4'>Notifications</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-medium">Desktop Notifications</span>
                                        <p className="text-sm text-gray-500">Get alerted about upcoming due dates</p>
                                    </div>
                                    <button
                                        onClick={() => updateNotificationSetting('notificationsEnabled', !notificationSettings.enabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${notificationSettings.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {notificationSettings.enabled && (
                                    <div className="pt-4 border-t border-gray-300 space-y-4">
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium">Reminder Time</label>
                                            <select
                                                value={notificationSettings.dueReminder}
                                                onChange={(e) => updateNotificationSetting('notificationDueReminder', e.target.value)}
                                                className="p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="5">5 minutes before</option>
                                                <option value="10">10 minutes before</option>
                                                <option value="15">15 minutes before</option>
                                                <option value="30">30 minutes before</option>
                                                <option value="60">1 hour before</option>
                                                <option value="1440">1 day before</option>
                                            </select>
                                            <p className="text-xs text-gray-500">How far in advance to notify you of due dates</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className='text-2xl font-semibold mb-4'>Updates</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-medium">Automatic Updates</span>
                                        <p className="text-sm text-gray-500">Check for updates in the background</p>
                                    </div>
                                    <button
                                        onClick={() => updateAutoUpdateSetting(!updateSettings.autoUpdateEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${updateSettings.autoUpdateEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${updateSettings.autoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="pt-4 border-t border-gray-300">
                                    <button
                                        onClick={checkForUpdates}
                                        className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors cursor-pointer font-medium mb-2"
                                    >
                                        Check for Updates
                                    </button>
                                    
                                    {updateStatus && (
                                        <div className="text-sm text-center text-gray-700 p-2 bg-gray-50 rounded">
                                            {updateStatus}
                                        </div>
                                    )}

                                    {updateProgress && (
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${updateProgress.percent}%` }}></div>
                                        </div>
                                    )}

                                    {updateAvailable && !updateProgress && updateStatus?.includes('Update downloaded') && (
                                        <div className="mt-2 space-y-2">
                                            <button
                                                onClick={installUpdate}
                                                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer font-medium"
                                            >
                                                Install Update Now
                                            </button>
                                        </div>
                                    )}
                                    {updateAvailable && !updateProgress && !updateStatus?.includes('Update downloaded') && (
                                        <div className="mt-2 space-y-2">
                                            <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 max-h-32 overflow-y-auto border border-gray-200">
                                                <strong>Release Notes:</strong><br/>
                                                {updateAvailable.releaseNotes || 'No release notes available.'}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={downloadUpdate}
                                                    className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer font-medium text-sm"
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUpdateAvailable(null);
                                                        setUpdateStatus('Update skipped for now.');
                                                        setTimeout(() => setUpdateStatus(null), 3000);
                                                    }}
                                                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer font-medium text-sm"
                                                >
                                                    Skip
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className='text-2xl font-semibold mb-4'>Data Management</h3>
                        <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                            <button
                                onClick={async () => {
                                    const api = getApi();
                                    const result = await api.exportData();
                                    if (result.success) {
                                        await alert({ title: "Success", message: `Data exported successfully to ${result.data}` });
                                    } else if (result.error !== 'Export cancelled') {
                                        await alert({ title: "Error", message: `Failed to export data: ${result.error}`, isDanger: true });
                                    }
                                }}
                                className='w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer font-medium'
                            >
                                Export Application Data (.json)
                            </button>
                            <button
                                onClick={async () => {
                                    const api = getApi();
                                    const result = await api.importData();
                                    if (result.success) {
                                        await alert({ title: "Success", message: "Data imported successfully. The application will now reload." });
                                        window.location.reload();
                                    } else if (result.error !== 'Import cancelled') {
                                        await alert({ title: "Error", message: `Failed to import data: ${result.error}`, isDanger: true });
                                    }
                                }}
                                className='w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors cursor-pointer font-medium'
                            >
                                Import Application Data (.json)
                            </button>
                            <div className="pt-4 border-t border-gray-300">
                                <button
                                    onClick={async () => {
                                        const api = getApi();
                                        const result = await api.exportCalendar();
                                        if (result.success) {
                                            await alert({ title: "Success", message: `Calendar exported successfully to ${result.data}` });
                                        } else if (result.error !== 'Export cancelled') {
                                            await alert({ title: "Error", message: `Failed to export calendar: ${result.error}`, isDanger: true });
                                        }
                                    }}
                                    className='w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer font-medium'
                                >
                                    Export All Due Dates to Calendar (.ics)
                                </button>
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
