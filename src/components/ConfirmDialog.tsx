import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    isOpen?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'warning',
    isOpen = true
}) => {
    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: 'text-red-500',
                    button: 'bg-red-500 hover:bg-red-600'
                };
            case 'warning':
                return {
                    icon: 'text-yellow-500',
                    button: 'bg-yellow-500 hover:bg-yellow-600'
                };
            default:
                return {
                    icon: 'text-blue-500',
                    button: 'bg-blue-500 hover:bg-blue-600'
                };
        }
    };

    const styles = getTypeStyles();

    if (isOpen === false) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 ${styles.icon}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                                {title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white ${styles.button} transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
