import React from 'react';
import { AlertTriangle, Info, AlertOctagon, Loader2 } from 'lucide-react';
import Modal from './common/Modal';
import { useTheme } from '../context/ThemeContext';

export interface ConfirmDialogProps {
    title: string;
    message: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    isOpen?: boolean;
    isLoading?: boolean;
    showWarningBanner?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'warning',
    isOpen = true,
    isLoading = false,
    showWarningBanner
}) => {
    const { isBento } = useTheme();

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertOctagon className={`w-5 h-5 ${isBento ? 'text-black' : 'text-red-500'}`} />;
            case 'warning':
                return <AlertTriangle className={`w-5 h-5 ${isBento ? 'text-black' : 'text-amber-500'}`} />;
            case 'info':
            default:
                return <Info className={`w-5 h-5 ${isBento ? 'text-black' : 'text-blue-500'}`} />;
        }
    };

    const getIconContainerClass = () => {
        if (isBento) {
            switch (type) {
                case 'danger':
                    return 'bg-[#ff8787] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
                case 'warning':
                    return 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
                case 'info':
                default:
                    return 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
            }
        }

        switch (type) {
            case 'danger':
                return 'bg-red-500/10 text-red-500 border border-red-500/20';
            case 'warning':
                return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
            case 'info':
            default:
                return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        }
    };

    const getPrimaryButtonClass = () => {
        if (isBento) {
            switch (type) {
                case 'danger':
                    return 'bg-[#ff6b6b] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#ff5252] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
                case 'warning':
                    return 'bg-[#fef08a] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-300 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
                case 'info':
                default:
                    return 'bg-[#bae6fd] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-sky-300 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
            }
        }

        switch (type) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25 hover:-translate-y-0.5 active:translate-y-0';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0';
            case 'info':
            default:
                return 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0';
        }
    };

    const getCancelButtonClass = () => {
        if (isBento) {
            return 'bg-white dark:bg-[#18181b] text-black dark:text-white border-2 border-black dark:border-white shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#fff] hover:bg-gray-100 dark:hover:bg-zinc-800 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
        }
        return 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95';
    };

    const shouldShowBanner = showWarningBanner ?? (type === 'danger');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            description={description}
            icon={getIcon()}
            iconContainerClassName={getIconContainerClass()}
            maxWidth="max-w-md"
            footer={
                <div className="flex items-center gap-3 w-full">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getCancelButtonClass()}`}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${getPrimaryButtonClass()}`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className={`leading-relaxed text-sm ${
                    isBento 
                        ? 'text-black font-semibold' 
                        : 'text-gray-600 dark:text-gray-300 font-medium'
                }`}>
                    {message}
                </p>

                {shouldShowBanner && (
                    <div className={`p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold ${
                        isBento
                            ? 'bg-[#fee2e2] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                        <span className="text-base leading-none">⚠️</span>
                        <span>This action is permanent and cannot be undone.</span>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
