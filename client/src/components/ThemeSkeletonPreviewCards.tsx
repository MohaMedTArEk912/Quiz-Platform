import React from 'react';
import { Check, Sun, Moon, LayoutGrid } from 'lucide-react';
import { useTheme, type AppTheme } from '../context/ThemeContext';

interface ThemePreviewOption {
    id: AppTheme;
    title: string;
    subtitle: string;
    tag: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
}

const THEMES: ThemePreviewOption[] = [
    {
        id: 'light',
        title: 'Modern Light',
        subtitle: 'Clean daylight aesthetic with vibrant indigo accents',
        tag: 'Clean & Crisp',
        icon: Sun,
        accentColor: '#6366f1'
    },
    {
        id: 'dark',
        title: 'Cyber Dark',
        subtitle: 'Deep slate night palette with glowing indicators',
        tag: 'Focus & Contrast',
        icon: Moon,
        accentColor: '#818cf8'
    },
    {
        id: 'bento',
        title: 'Neo-Brutalist',
        subtitle: 'Playful pop palette with bold borders & hard shadows',
        tag: 'Pop & Bold',
        icon: LayoutGrid,
        accentColor: '#bef264'
    }
];

interface ThemeSkeletonPreviewCardsProps {
    onThemeSelect?: (theme: AppTheme) => void;
}

export const ThemeSkeletonPreviewCards: React.FC<ThemeSkeletonPreviewCardsProps> = ({
    onThemeSelect
}) => {
    const { theme: currentTheme, setTheme } = useTheme();

    const handleSelect = (selectedTheme: AppTheme) => {
        setTheme(selectedTheme);
        if (onThemeSelect) {
            onThemeSelect(selectedTheme);
        }
    };

    return (
        <div className="w-full">
            {/* Desktop: 3-Column Grid | Mobile: Horizontal Snap Carousel */}
            <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto md:overflow-visible pt-4 pb-4 px-2 md:pt-4 md:pb-4 md:px-1 snap-x snap-mandatory scrollbar-none">
                {THEMES.map((item) => {
                    const isSelected = currentTheme === item.id;
                    const Icon = item.icon;

                    return (
                        <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelect(item.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelect(item.id);
                                }
                            }}
                            className={`flex-none w-[270px] sm:w-[290px] md:w-auto snap-center text-left rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer relative group select-none flex flex-col justify-between ${
                                isSelected
                                    ? currentTheme === 'bento'
                                        ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                                        : 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-indigo-600 dark:border-indigo-500 shadow-xl dark:shadow-indigo-500/10'
                                    : currentTheme === 'bento'
                                        ? 'bg-white/80 hover:bg-white text-black border-2 border-black/60 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5'
                                        : 'bg-slate-50/80 hover:bg-white dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                            }`}
                        >
                            {/* Selected Badge */}
                            {isSelected && (
                                <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 z-20 ${
                                    currentTheme === 'bento'
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                }`}>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    Active
                                </div>
                            )}

                            <div>
                                {/* Header Info */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                                            item.id === 'bento'
                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                : item.id === 'dark'
                                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                    : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                                        }`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black tracking-tight leading-none mb-1">
                                                {item.title}
                                            </h4>
                                            <span className="text-[10px] uppercase font-bold opacity-60 tracking-wider">
                                                {item.tag}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Color Dots Pill */}
                                    <div className="flex items-center gap-1">
                                        {item.id === 'light' && (
                                            <>
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                                            </>
                                        )}
                                        {item.id === 'dark' && (
                                            <>
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#080c16] border border-white/20" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                            </>
                                        )}
                                        {item.id === 'bento' && (
                                            <>
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#bef264] border border-black" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#fde047] border border-black" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#bae6fd] border border-black" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Visual Wireframe Skeleton */}
                                <div className={`w-full rounded-xl sm:rounded-2xl p-2.5 sm:p-3 mb-3.5 transition-all overflow-hidden ${
                                    item.id === 'light'
                                        ? 'bg-[#f8fafc] border border-slate-200 shadow-inner'
                                        : item.id === 'dark'
                                            ? 'bg-[#080c16] border border-white/10 shadow-inner'
                                            : 'bg-[#f5f3ec] border-2 border-black shadow-[2px_2px_0px_#000]'
                                }`}>
                                    {/* Mini Navbar */}
                                    <div className={`h-6 rounded-lg px-2 flex items-center justify-between mb-2 ${
                                        item.id === 'light'
                                            ? 'bg-white border border-slate-200/80 shadow-xs'
                                            : item.id === 'dark'
                                                ? 'bg-[#0f1526] border border-white/10'
                                                : 'bg-white border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                                    }`}>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-md ${
                                                item.id === 'bento' ? 'bg-[#fde047] border border-black' : 'bg-indigo-600'
                                            }`} />
                                            <div className={`w-10 h-1.5 rounded-full ${
                                                item.id === 'dark' ? 'bg-white/40' : item.id === 'bento' ? 'bg-black' : 'bg-slate-300'
                                            }`} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-4 h-1.5 rounded-full ${item.id === 'dark' ? 'bg-white/20' : 'bg-slate-200'}`} />
                                            <div className={`w-4 h-1.5 rounded-full ${item.id === 'dark' ? 'bg-white/20' : 'bg-slate-200'}`} />
                                        </div>
                                    </div>

                                    {/* Mini Hero Card */}
                                    <div className={`p-2.5 rounded-xl mb-2 ${
                                        item.id === 'light'
                                            ? 'bg-white border border-slate-200/80 shadow-xs'
                                            : item.id === 'dark'
                                                ? 'bg-[#0f1526] border border-indigo-500/30 shadow-sm'
                                                : 'bg-[#bef264] border-1.5 border-black shadow-[2px_2px_0px_#000]'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className={`w-8 h-2 rounded-full ${
                                                item.id === 'bento' ? 'bg-black' : 'bg-indigo-500'
                                            }`} />
                                            <div className={`w-3 h-3 rounded-full ${
                                                item.id === 'bento' ? 'bg-[#fde047] border border-black' : 'bg-emerald-500'
                                            }`} />
                                        </div>
                                        <div className={`w-3/4 h-2 rounded-full mb-1 ${
                                            item.id === 'dark' ? 'bg-white/80' : 'bg-slate-800'
                                        }`} />
                                        <div className={`w-1/2 h-1.5 rounded-full mb-2 ${
                                            item.id === 'dark' ? 'bg-white/40' : 'bg-slate-400'
                                        }`} />

                                        {/* Miniature Button */}
                                        <div className={`w-16 h-4 rounded-md flex items-center justify-center text-[8px] font-bold ${
                                            item.id === 'light'
                                                ? 'bg-indigo-600 text-white'
                                                : item.id === 'dark'
                                                    ? 'bg-indigo-500 text-white'
                                                    : 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                                        }`}>
                                            Start Quiz
                                        </div>
                                    </div>

                                    {/* Mini Stats 2-Card Row */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <div className={`p-1.5 rounded-lg ${
                                            item.id === 'light'
                                                ? 'bg-white border border-slate-200/80'
                                                : item.id === 'dark'
                                                    ? 'bg-[#0f1526] border border-white/5'
                                                    : 'bg-[#bae6fd] border-1.5 border-black shadow-[1px_1px_0px_#000]'
                                        }`}>
                                            <div className={`w-6 h-1 rounded-full mb-1 ${item.id === 'dark' ? 'bg-white/30' : 'bg-slate-400'}`} />
                                            <div className={`w-8 h-2 rounded-full ${item.id === 'bento' ? 'bg-black' : 'bg-indigo-500'}`} />
                                        </div>
                                        <div className={`p-1.5 rounded-lg ${
                                            item.id === 'light'
                                                ? 'bg-white border border-slate-200/80'
                                                : item.id === 'dark'
                                                    ? 'bg-[#0f1526] border border-white/5'
                                                    : 'bg-[#fde047] border-1.5 border-black shadow-[1px_1px_0px_#000]'
                                        }`}>
                                            <div className={`w-6 h-1 rounded-full mb-1 ${item.id === 'dark' ? 'bg-white/30' : 'bg-slate-400'}`} />
                                            <div className={`w-8 h-2 rounded-full ${item.id === 'bento' ? 'bg-black' : 'bg-emerald-500'}`} />
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs opacity-75 font-medium leading-relaxed">
                                    {item.subtitle}
                                </p>
                            </div>

                            {/* Select / Active Indicator Button */}
                            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
                                <div className={`w-full py-2 px-3 rounded-xl text-xs font-black text-center transition-all ${
                                    isSelected
                                        ? currentTheme === 'bento'
                                            ? 'bg-black text-white'
                                            : 'bg-indigo-600 text-white'
                                        : currentTheme === 'bento'
                                            ? 'bg-slate-100 hover:bg-slate-200 text-black border border-black/30'
                                            : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/15'
                                }`}>
                                    {isSelected ? 'Current Theme' : 'Select Theme'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile swipe hint */}
            <div className="flex md:hidden items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                <span>Swipe horizontally to preview all 3 themes</span>
            </div>
        </div>
    );
};

export default ThemeSkeletonPreviewCards;
