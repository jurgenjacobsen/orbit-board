import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
    showCancel?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isDanger = false,
    showCancel = true
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-100 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in zoom-in duration-300">
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        {isDanger && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600">{message}</p>
                </div>
                <div className="flex gap-3 p-4 rounded-b-lg">
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium cursor-pointer ${
                            isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {confirmLabel === "Confirm" && !showCancel ? "OK" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
