export default function SettingsPage() {
    return (
        <div>
            <header className='pt-4 border-b border-gray-300 mx-6'>
                <h2 className='text-3xl font-semibold'>Settings</h2>
            </header>
            <main className='p-6 grid grid-cols-2 gap-4'>
                <section className="">
                    <h3 className='text-2xl font-semibold mb-4'>UI</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-lg">Dark Mode</span>

                            </div>
                        </div>
                </section>
            </main>
        </div>
    );
}
