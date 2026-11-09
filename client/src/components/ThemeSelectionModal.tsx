import React from 'react';
import { ArrowRight, Palette } from 'lucide-react';
import { useTheme, type AppTheme } from '../context/ThemeContext';
import ThemeSkeletonPreviewCards from './ThemeSkeletonPreviewCards';

interface ThemeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
    isOpen,
    onClose
}) => {
    const { theme, isBento, setTheme } = useTheme();

    if (!isOpen) return null;

    const handleThemePick = (chosenTheme: AppTheme) => {
        setTheme(chosenTheme);
        // Persist to localStorage
        try {
            localStorage.setItem('theme', chosenTheme);
            sessionStorage.setItem('theme', chosenTheme);
        } catch {
            // Storage access safeguard
        }
        // Immediately and smoothly dismiss modal upon selection per requirement
        onClose();
    };

    const handleConfirm = () => {
        try {
            localStorage.setItem('theme', theme);
            sessionStorage.setItem('theme', theme);
        } catch {
            // Storage access safeguard
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/30 dark:bg-black/45 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            <div
                className={`relative w-full max-w-4xl p-5 sm:p-8 rounded-2xl transition-all animate-in zoom-in-95 duration-200 my-auto ${
                    isBento
                        ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                        : 'bg-white dark:bg-[#0c101c] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 select-none">
                        <span className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                        }`}>
                            <Palette className="w-3.5 h-3.5" />
                            Personalize Your Workspace
                        </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2">
                        Choose Your Preferred Theme
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        Select an interface theme that matches your learning style. You can adjust this anytime in your Profile or top navigation bar.
                    </p>
                </div>

                {/* 3 Interactive Visual Skeleton Preview Cards */}
                <div className="mb-6 sm:mb-8">
                    <ThemeSkeletonPreviewCards onThemeSelect={handleThemePick} />
                </div>

                {/* Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 text-center sm:text-left">
                        Active Selection: <span className="font-black text-slate-700 dark:text-slate-200 uppercase">{theme}</span>
                    </p>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                        }`}
                    >
                        <span>Confirm & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeSelectionModal;
