import { useContext } from 'react';
import { ConfirmContext } from '../components/ConfirmContext';

export function useDialog() {
    const context = useContext(ConfirmContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a ConfirmProvider');
    }
    return context;
}

export function useConfirm() {
    return useDialog().confirm;
}

export function useAlert() {
    return useDialog().alert;
}
