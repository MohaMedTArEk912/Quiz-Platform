import { useState, useCallback, useRef } from 'react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
    isOpen: boolean;
    onConfirm: () => void;
}

export const useConfirm = () => {
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'warning',
        onConfirm: () => { }
    });

    // Store resolve function to call on cancel
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setConfirmState({
                isOpen: true,
                ...options,
                onConfirm: () => {
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    resolveRef.current = null;
                    resolve(true);
                }
            });
        });
    }, []);

    const handleCancel = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        // Resolve with false when cancelled
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    }, []);

    return {
        confirm,
        confirmState,
        handleCancel
    };
};
