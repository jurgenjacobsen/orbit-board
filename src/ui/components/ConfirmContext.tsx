import { createContext } from 'react';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    showCancel?: boolean;
}

export interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: Omit<ConfirmOptions, 'showCancel'>) => Promise<void>;
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);
