import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, LayoutGrid, ChevronDown, Check } from 'lucide-react';
import { useTheme, type AppTheme } from '../context/ThemeContext.tsx';

interface ThemeOption {
    id: AppTheme;
    label: string;
    description: string;
    icon: React.ReactNode;
    colorDots?: React.ReactNode;
}

const THEME_OPTIONS: ThemeOption[] = [
    {
        id: 'light',
        label: 'Light Mode',
        description: 'Clean & high-contrast day palette',
        icon: <Sun className="w-4 h-4 text-amber-500" />,
        colorDots: (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
        )
    },
    {
        id: 'dark',
        label: 'Dark Mode',
        description: 'Classic dark slate night palette',
        icon: <Moon className="w-4 h-4 text-indigo-400" />,
        colorDots: (
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
        )
    },
    {
        id: 'bento',
        label: 'Neo-Brutalist',
        description: 'Green, Yellow, Blue & White solid pop palette',
        icon: <LayoutGrid className="w-4 h-4 text-emerald-500" />,
        colorDots: (
            <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#bef264] border border-black shadow-[1px_1px_0px_#000]" title="Green" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#fde047] border border-black shadow-[1px_1px_0px_#000]" title="Yellow" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#bae6fd] border border-black shadow-[1px_1px_0px_#000]" title="Blue" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffffff] border border-black shadow-[1px_1px_0px_#000]" title="White" />
            </div>
        )
    }
];

const ThemeToggle: React.FC = () => {
    const { theme, setTheme, isBento } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const activeOption = THEME_OPTIONS.find(opt => opt.id === theme) || THEME_OPTIONS[0];

    const handleSelect = (nextTheme: AppTheme) => {
        setTheme(nextTheme);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left shrink-0" ref={containerRef}>
            {/* Dropdown Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                className={`theme-toggle-btn group relative flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isBento
                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 shadow-sm'
                }`}
                title={`Theme: ${activeOption.label} (Click to open theme menu)`}
            >
                {activeOption.icon}
                <span className={`hidden sm:inline-block text-[11px] font-black ${
                    isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-slate-200'
                }`}>
                    {activeOption.id === 'bento' ? 'Bento' : activeOption.label.replace(' Mode', '')}
                </span>

                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                    isBento ? 'text-black stroke-[2.5]' : 'text-slate-400 dark:text-slate-200'
                } ${isOpen ? 'rotate-180 text-slate-600 dark:text-slate-200' : ''}`} />
            </button>

            {/* Dropdown Menu Panel */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-64 sm:w-72 rounded-2xl p-1.5 z-[60] animate-in fade-in zoom-in-95 duration-150 ${
                    isBento
                        ? 'bg-white text-black border-2 border-black shadow-[5px_5px_0px_#000]'
                        : 'bg-white dark:bg-[#0e121d] border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-xl'
                }`}>
                    <div className={`px-3 py-2 border-b mb-1 ${
                        isBento ? 'border-black/10' : 'border-slate-100 dark:border-white/5'
                    }`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${
                            isBento ? 'text-black/60 font-mono' : 'text-slate-400 dark:text-slate-400'
                        }`}>
                            Select Interface Theme
                        </p>
                    </div>

                    <div className="space-y-1">
                        {THEME_OPTIONS.map(option => {
                            const isSelected = option.id === theme;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option.id)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                                        isSelected
                                            ? isBento
                                                ? 'bg-[#bef264] text-black border-2 border-black font-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-white/15 font-bold'
                                            : isBento
                                            ? 'hover:bg-slate-100 text-black font-medium border-2 border-transparent'
                                            : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0">
                                            {option.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black tracking-tight">
                                                    {option.label}
                                                </span>
                                                {option.colorDots}
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeToggle;


