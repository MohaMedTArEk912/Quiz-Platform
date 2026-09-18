import { useState, useCallback, useRef, useEffect } from 'react';

export interface ConfirmOptions {
    title: string;
    message: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    showWarningBanner?: boolean;
}

export interface ConfirmState extends ConfirmOptions {
    isOpen: boolean;
    isLoading?: boolean;
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
        isLoading: false,
        onConfirm: () => { }
    });

    // Store resolve function to call on cancel
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    // Cancel pending promise on unmount
    useEffect(() => {
        return () => {
            if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
            }
        };
    }, []);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            // If another confirmation was open, resolve it as cancelled
            if (resolveRef.current) {
                resolveRef.current(false);
            }
            resolveRef.current = resolve;

            setConfirmState({
                isOpen: true,
                title: options.title,
                message: options.message,
                description: options.description,
                confirmText: options.confirmText ?? 'Confirm',
                cancelText: options.cancelText ?? 'Cancel',
                type: options.type ?? 'warning',
                showWarningBanner: options.showWarningBanner,
                isLoading: false,
                onConfirm: () => {
                    setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
                    if (resolveRef.current) {
                        resolveRef.current(true);
                        resolveRef.current = null;
                    }
                }
            });
        });
    }, []);

    const handleCancel = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
        // Resolve with false when cancelled
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    }, []);

    const setConfirmLoading = useCallback((isLoading: boolean) => {
        setConfirmState(prev => ({ ...prev, isLoading }));
    }, []);

    return {
        confirm,
        confirmState,
        handleCancel,
        setConfirmLoading
    };
};
