import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { PublicUserProfileView } from './PublicUserProfileView';
import { useTheme } from '../../context/ThemeContext';

interface PublicUserProfileModalProps {
    userId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export const PublicUserProfileModal: React.FC<PublicUserProfileModalProps> = ({
    userId,
    isOpen,
    onClose
}) => {
    const { isBento } = useTheme();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !userId) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${
                    isBento
                        ? 'bg-white text-black border-3 border-black shadow-[8px_8px_0px_#000]'
                        : 'bg-[#f8fafc] dark:bg-[#0c101d] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10'
                }`}
            >
                {/* Modal Header Bar with Close Button */}
                <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                    isBento
                        ? 'bg-[#fde047] border-b-2.5 border-black text-black'
                        : 'bg-white dark:bg-[#111625] border-slate-200/80 dark:border-white/10'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isBento ? 'bg-black text-white' : 'bg-indigo-600 text-white'
                        }`}>
                            Player Profile
                        </span>
                        <span className="text-xs font-bold opacity-60">
                            View achievements, activity & challenge
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white hover:bg-rose-400 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Close profile modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    <PublicUserProfileView
                        userId={userId}
                        onClose={onClose}
                        isModal={true}
                    />
                </div>
            </div>
        </div>
    );
};
