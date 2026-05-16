import { useEffect } from "react";
import { getApi } from "../utils/mockApi";
import { useNavigate } from "react-router-dom";
import { useConfirm, useAlert } from "../hooks/useConfirm";

export default function SettingsPage() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const alert = useAlert();

    useEffect(() => {
        getApi().setDiscordActivity('Adjusting Settings', 'Idle');
    }, []);

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
        <div>
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Settings</h2>
            </header>
            <main className='p-6 grid grid-cols-1 gap-4'>
                <section className="">
                    <h3 className='text-2xl font-semibold mb-4'>UI</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-lg">Dark Mode</span>

                            </div>
                        </div>
                </section>
                <section className="">
                    <h3 className='text-2xl font-semibold mb-4'>General</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                               <button
                                   className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-500/75"
                                   onClick={resetApp}
                                 >
                                    Reset Application Data
                               </button>
                            </div>
                        </div>
                </section>
            </main>
        </div>
    );
}
