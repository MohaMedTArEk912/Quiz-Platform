import React, { useState } from 'react';
import {
    Sliders,
    X,
    ArrowUp,
    ArrowDown,
    Pin,
    PinOff,
    EyeOff,
    Sparkles,
    RotateCcw,
    Check,
    Layers,
    Smartphone,
    Laptop
} from 'lucide-react';
import { useNavArrangement, NAV_PRESETS, type PresetKey } from '../../context/NavArrangementContext';
import { useTheme } from '../../context/ThemeContext';

export const NavbarCustomizerModal: React.FC = () => {
    const {
        isCustomizerOpen,
        closeCustomizer,
        primaryItems,
        secondaryItems,
        hiddenItems,
        config,
        movePrimaryItem,
        moveSecondaryItem,
        pinToPrimary,
        unpinToSecondary,
        toggleHideItem,
        setSyncWithBottomNav,
        applyPreset,
        resetToDefault
    } = useNavArrangement();

    const { isBento } = useTheme();
    const [activeTab, setActiveTab] = useState<'arrange' | 'presets'>('arrange');

    if (!isCustomizerOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${
                    isBento
                        ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                        : 'bg-white dark:bg-[#11131f] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
                }`}
            >
                {/* Header */}
                <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
                    isBento
                        ? 'bg-[#fde047] border-b-2.5 border-black text-black'
                        : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${isBento ? 'bg-black text-[#bef264]' : 'bg-white/20 text-white'}`}>
                            <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">
                                Customize Navigation
                            </h2>
                            <p className="text-xs opacity-80 font-bold">
                                Arrange, reorder, and pin tabs to match your personal workflow
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={closeCustomizer}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                        aria-label="Close customizer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader Switcher: Arrange Tabs vs Presets */}
                <div className={`p-3 border-b flex items-center justify-between gap-3 shrink-0 ${
                    isBento ? 'bg-neutral-50 border-b-2 border-black' : 'bg-slate-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10'
                }`}>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('arrange')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'arrange'
                                    ? (isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-600 text-white shadow')
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Arrange Tabs</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('presets')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === 'presets'
                                    ? (isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-600 text-white shadow')
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Presets</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={resetToDefault}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer ${
                            isBento ? 'text-black' : 'text-gray-600 dark:text-gray-400 hover:text-rose-500'
                        }`}
                        title="Restore default navigation order"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    {/* Live Preview of Desktop Navbar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                                Live Navbar Preview
                            </span>
                            <span className="text-[11px] font-semibold opacity-70">
                                {primaryItems.length} Pinned Tabs
                            </span>
                        </div>

                        {/* Rendered Live Preview Pill */}
                        <div className={`p-2.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto custom-scrollbar select-none ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10'
                        }`}>
                            {primaryItems.map((item, idx) => {
                                const Icon = item.icon;
                                const isFirst = idx === 0;

                                return (
                                    <div
                                        key={item.path}
                                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shrink-0 transition-transform ${
                                            isFirst
                                                ? (isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] font-black' : 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs')
                                                : (isBento ? 'bg-neutral-100 text-black border border-black' : 'bg-white/60 dark:bg-white/5 text-slate-700 dark:text-slate-300')
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{item.shortLabel || item.label}</span>
                                    </div>
                                );
                            })}

                            {/* "More" preview indicator */}
                            <div className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-xs font-bold shrink-0 opacity-80 ${
                                isBento ? 'bg-neutral-200 text-black border border-black' : 'bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                            }`}>
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>More ({secondaryItems.length})</span>
                            </div>
                        </div>
                    </div>

                    {activeTab === 'presets' ? (
                        /* Presets Selection View */
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Select a curated preset layout designed for different play and learning styles:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(Object.entries(NAV_PRESETS) as [PresetKey, typeof NAV_PRESETS[PresetKey]][]).map(([key, preset]) => (
                                    <div
                                        key={key}
                                        onClick={() => applyPreset(key)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer select-none group flex flex-col justify-between ${
                                            isBento
                                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                                : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-tight text-gray-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors">
                                                {preset.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                                {preset.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
                                            <span className="font-bold opacity-75">
                                                {preset.primary.length} Pinned Tabs
                                            </span>
                                            <span className={`px-2.5 py-1 rounded-xl font-black uppercase text-[10px] ${
                                                isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-indigo-600 text-white'
                                            }`}>
                                                Apply Preset
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Arrange Tabs Interactive List View */
                        <div className="space-y-6">
                            {/* Section 1: Pinned Primary Tabs */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Pin className="w-4 h-4 text-indigo-500" />
                                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                                            Pinned to Main Navbar ({primaryItems.length} / 7)
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-gray-400">
                                        Use arrows to reorder
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {primaryItems.map((item, index) => {
                                        const Icon = item.icon;
                                        const isFirst = index === 0;
                                        const isLast = index === primaryItems.length - 1;

                                        return (
                                            <div
                                                key={item.path}
                                                className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                                                    isBento
                                                        ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                                                }`}
                                            >
                                                {/* Left: Position & Title */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                        isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-indigo-600 text-white'
                                                    }`}>
                                                        {index + 1}
                                                    </span>

                                                    <div className={`p-2 rounded-xl shrink-0 ${
                                                        isBento ? 'bg-neutral-100 text-black border border-black' : 'bg-white dark:bg-white/10 text-indigo-500'
                                                    }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">
                                                            {item.label}
                                                        </h4>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Move Up/Left */}
                                                    <button
                                                        type="button"
                                                        disabled={isFirst}
                                                        onClick={() => movePrimaryItem(index, 'left')}
                                                        className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30 ${
                                                            isBento ? 'hover:bg-neutral-100 text-black' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                                                        }`}
                                                        title="Move Left"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>

                                                    {/* Move Down/Right */}
                                                    <button
                                                        type="button"
                                                        disabled={isLast}
                                                        onClick={() => movePrimaryItem(index, 'right')}
                                                        className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30 ${
                                                            isBento ? 'hover:bg-neutral-100 text-black' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                                                        }`}
                                                        title="Move Right"
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>

                                                    {/* Unpin to More */}
                                                    <button
                                                        type="button"
                                                        onClick={() => unpinToSecondary(item.path)}
                                                        disabled={primaryItems.length <= 1}
                                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 ${
                                                            isBento
                                                                ? 'bg-neutral-100 hover:bg-neutral-200 text-black border border-black'
                                                                : 'bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                        title="Move to 'More' Dropdown"
                                                    >
                                                        <PinOff className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Unpin</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Secondary Tabs (More Menu) */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <h3 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                                            More Menu Tabs ({secondaryItems.length})
                                        </h3>
                                    </div>
                                    <span className="text-[11px] text-gray-400">
                                        Shown inside 'More' dropdown
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {secondaryItems.map((item, index) => {
                                        const Icon = item.icon;
                                        const isFirst = index === 0;
                                        const isLast = index === secondaryItems.length - 1;

                                        return (
                                            <div
                                                key={item.path}
                                                className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                                                    isBento
                                                        ? 'bg-neutral-50 border-2 border-black/40'
                                                        : 'bg-white/60 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5'
                                                }`}
                                            >
                                                {/* Left: Icon & Label */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-xl shrink-0 ${
                                                        isBento ? 'bg-white text-black border border-black' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
                                                    }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">
                                                            {item.label}
                                                        </h4>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Move Up */}
                                                    <button
                                                        type="button"
                                                        disabled={isFirst}
                                                        onClick={() => moveSecondaryItem(index, 'up')}
                                                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Move Down */}
                                                    <button
                                                        type="button"
                                                        disabled={isLast}
                                                        onClick={() => moveSecondaryItem(index, 'down')}
                                                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                                        title="Move Down"
                                                    >
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Hide Tab */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleHideItem(item.path)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                        title="Hide tab from navigation"
                                                    >
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Pin to Primary */}
                                                    <button
                                                        type="button"
                                                        onClick={() => pinToPrimary(item.path)}
                                                        disabled={primaryItems.length >= 7}
                                                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 ${
                                                            isBento
                                                                ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-[#a3e635]'
                                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                                                        }`}
                                                        title="Pin to Main Navbar"
                                                    >
                                                        <Pin className="w-3.5 h-3.5" />
                                                        <span>Pin</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 3: Hidden Tabs (if any) */}
                            {hiddenItems.length > 0 && (
                                <div className="space-y-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <EyeOff className="w-4 h-4" />
                                        <span>Hidden Tabs ({hiddenItems.length})</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {hiddenItems.map(item => {
                                            const Icon = item.icon;
                                            return (
                                                <div
                                                    key={item.path}
                                                    className="p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-between gap-2 opacity-60 hover:opacity-100 transition-opacity"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Icon className="w-4 h-4" />
                                                        <span className="text-xs font-bold truncate">{item.label}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleHideItem(item.path)}
                                                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 cursor-pointer"
                                                    >
                                                        Restore
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Mobile Bottom Nav Sync Toggle */}
                            <div className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 ${
                                isBento ? 'bg-[#fef9c3] border border-black' : 'bg-slate-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <div>
                                        <p className="font-black text-xs uppercase tracking-tight text-gray-900 dark:text-white">
                                            Sync with Mobile Bottom Bar
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                            Mirror your top 4 primary tabs on the mobile bottom bar
                                        </p>
                                    </div>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={config.syncWithBottomNav}
                                    onChange={e => setSyncWithBottomNav(e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
                    isBento ? 'bg-neutral-50 border-t-2 border-black' : 'bg-slate-50 dark:bg-[#161827] border-gray-200 dark:border-white/10'
                }`}>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        Changes are saved instantly to your profile.
                    </span>

                    <button
                        type="button"
                        onClick={closeCustomizer}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                        }`}
                    >
                        <Check className="w-4 h-4" />
                        <span>Done</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NavbarCustomizerModal;
