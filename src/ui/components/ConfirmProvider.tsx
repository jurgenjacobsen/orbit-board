import React, { useState, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';
import { ConfirmContext } from './ConfirmContext';
import type { ConfirmOptions } from './ConfirmContext';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [modalConfig, setModalConfig] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalConfig({ options: { ...options, showCancel: options.showCancel ?? true }, resolve });
        });
    }, []);

    const alert = useCallback((options: Omit<ConfirmOptions, 'showCancel'>) => {
        return new Promise<void>((resolve) => {
            setModalConfig({
                options: { ...options, showCancel: false },
                resolve: () => resolve()
            });
        });
    }, []);

    const handleConfirm = () => {
        if (modalConfig) {
            modalConfig.resolve(true);
            setModalConfig(null);
        }
    };

    const handleCancel = () => {
        if (modalConfig) {
            modalConfig.resolve(false);
            setModalConfig(null);
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {modalConfig && (
                <ConfirmModal
                    isOpen={true}
                    title={modalConfig.options.title}
                    message={modalConfig.options.message}
                    confirmLabel={modalConfig.options.confirmLabel}
                    cancelLabel={modalConfig.options.cancelLabel}
                    isDanger={modalConfig.options.isDanger}
                    showCancel={modalConfig.options.showCancel}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
}
