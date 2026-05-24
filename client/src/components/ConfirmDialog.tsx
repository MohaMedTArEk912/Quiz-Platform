import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Modal from './common/Modal';

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
    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle className="w-6 h-6 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            case 'info':
            default:
                return <Info className="w-6 h-6 text-blue-500" />;
        }
    };

    const getPrimaryButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white';
            case 'info':
            default:
                return 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            icon={getIcon()}
            maxWidth="max-w-md"
            footer={
                <>
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-transform hover:-translate-y-0.5 ${getPrimaryButtonClass()}`}
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {message}
            </p>
        </Modal>
    );
};

export default ConfirmDialog;
