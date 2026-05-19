export default function CalendarPage() {
    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-start justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight'>Calendar</h2>
                    <p className='text-gray-500 tracking-wide truncate'>
                        View all your cards with due dates in a calendar format.
                    </p>
                </div>
            </header>
        </div>
    )
}
