import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
    bodyClassName
}) => {
    // ... existing hook logic ... 
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative bg-white dark:bg-[#0f1117] rounded-3xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 transform transition-all animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5 rounded-t-3xl backdrop-blur-sm">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            {icon && (
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                    {icon}
                                </div>
                            )}
                            {title}
                        </h2>
                        {description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
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
                    <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-black/20 rounded-b-3xl backdrop-blur-sm">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
