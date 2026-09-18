import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: string;
    footer?: React.ReactNode;
    icon?: React.ReactNode;
    bodyClassName?: string;
    iconContainerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = 'max-w-2xl',
    footer,
    icon,
    bodyClassName,
    iconContainerClassName
}) => {
    const { isBento } = useTheme();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pt-safe pb-safe pl-safe pr-safe" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 transition-opacity animate-in fade-in duration-200 ${
                    isBento ? 'bg-black/60' : 'bg-black/60 backdrop-blur-md'
                }`}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative w-full ${maxWidth} max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 ${
                isBento
                    ? 'bg-white rounded-3xl border-[3px] border-black shadow-[8px_8px_0px_#000] text-black'
                    : 'bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white'
            }`}>
                {/* Header */}
                <div className={`p-5 sm:p-6 flex items-center justify-between ${
                    isBento
                        ? 'border-b-[2.5px] border-black bg-white rounded-t-[1.35rem]'
                        : 'border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 rounded-t-3xl backdrop-blur-sm'
                }`}>
                    <div>
                        <h2 className={`text-xl sm:text-2xl font-black flex items-center gap-3 ${
                            isBento ? 'text-black' : 'text-gray-900 dark:text-white'
                        }`}>
                            {icon && (
                                <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                                    iconContainerClassName ?? (
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-orange-500/10 text-orange-500'
                                    )
                                }`}>
                                    {icon}
                                </div>
                            )}
                            {title}
                        </h2>
                        {description && (
                            <p className={`text-xs sm:text-sm mt-1 pl-1 ${
                                isBento ? 'text-slate-700 font-semibold' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className={`p-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-target outline-none focus:outline-none ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] text-black'
                                : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 border-0'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar ${bodyClassName ?? 'p-6'}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className={`p-6 flex justify-end gap-3 ${
                        isBento
                            ? 'border-t-[2.5px] border-black bg-white rounded-b-[1.35rem]'
                            : 'border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 rounded-b-3xl backdrop-blur-sm'
                    }`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
