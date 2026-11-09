import React, { useRef, useState, useEffect } from 'react';
import type { SkillTrack, SkillModule, BadgeNode } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
    ChevronLeft,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    Lock,
    Zap,
    Trophy,
    Compass,
    ArrowRight,
    Flame
} from 'lucide-react';
import { getChapterStoryLore, type ChapterLore } from './storyLoreData';
import { ChapterDossierModal } from './ChapterDossierModal';
import { sounds } from '../../lib/soundEffects';

interface ModuleNode {
    module: SkillModule;
    badges: BadgeNode[];
    isCompleted: boolean;
    isLocked: boolean;
}

interface StorylineOdysseyViewProps {
    track: SkillTrack;
    modules: ModuleNode[];
    onCompleteModule: (moduleId: string, moduleName: string) => void;
    completingId: string | null;
}

export const StorylineOdysseyView: React.FC<StorylineOdysseyViewProps> = ({
    track,
    modules,
    onCompleteModule,
    completingId
}) => {
    const { isBento } = useTheme();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
    const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    const completedCount = modules.filter(m => m.isCompleted).length;
    const progressPercent = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

    // Find the first incomplete and unlocked module (the active quest)
    const currentQuestIndex = modules.findIndex(m => !m.isCompleted && !m.isLocked);
    const activeQuestIndex = currentQuestIndex !== -1 ? currentQuestIndex : modules.length - 1;

    // Update scroll indicators
    const checkScrollBounds = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);

        // Approximate active chapter based on scroll position
        const cardWidth = 380;
        const currentIdx = Math.round(el.scrollLeft / cardWidth);
        setActiveChapterIndex(Math.min(Math.max(currentIdx, 0), modules.length - 1));
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        checkScrollBounds();
        el.addEventListener('scroll', checkScrollBounds, { passive: true });
        return () => el.removeEventListener('scroll', checkScrollBounds);
    }, [modules.length]);

    // Handle horizontal scrolling via mouse wheel (natural horizontal navigation)
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
                // If scrolling vertically inside this container, scroll horizontally instead
                el.scrollBy({
                    left: e.deltaY * 1.5,
                    behavior: 'auto'
                });
                e.preventDefault();
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    const handleScrollStep = (direction: 'left' | 'right') => {
        sounds.playClick();
        const el = scrollContainerRef.current;
        if (!el) return;
        const offset = direction === 'left' ? -380 : 380;
        el.scrollBy({ left: offset, behavior: 'smooth' });
    };

    const scrollToChapter = (index: number) => {
        sounds.playClick();
        const el = scrollContainerRef.current;
        if (!el) return;
        const targetX = index * 380;
        el.scrollTo({ left: targetX, behavior: 'smooth' });
        setActiveChapterIndex(index);
    };

    const handleJumpToActiveQuest = () => {
        sounds.playPowerUp();
        scrollToChapter(activeQuestIndex);
    };

    // Drag-to-scroll mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setIsDragging(true);
        setStartX(e.pageX - el.offsetLeft);
        setScrollLeftState(el.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const el = scrollContainerRef.current;
        if (!el) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.5;
        el.scrollLeft = scrollLeftState - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div className="relative w-full select-none py-2">
            {/* Storyline Odyssey HUD Banner */}
            <div className={`p-5 sm:p-6 rounded-[2rem] mb-6 transition-all relative overflow-hidden ${
                isBento
                    ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                    : 'bg-white/80 dark:bg-[#0c101c]/90 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xl backdrop-blur-xl'
            }`}>
                {/* Decorative background radial glow */}
                {!isBento && (
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
                )}

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Track Lore & Identity */}
                    <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shrink-0 shadow-md ${
                            isBento
                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/25'
                        }`}>
                            {track.icon || '🗺️'}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                    isBento
                                        ? 'bg-black text-white'
                                        : 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                }`}>
                                    Saga #{track.category || 'Curriculum'}
                                </span>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {modules.length} Chronicles
                                </span>
                            </div>

                            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                                isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                            }`}>
                                {track.title}
                            </h2>

                            <p className={`text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ${
                                isBento ? 'text-slate-800' : 'text-slate-600 dark:text-slate-300'
                            }`}>
                                {track.description || "Embark upon the linear odyssey of architectural mastery. Traverse each chapter to unlock ancient secrets and modern syntax."}
                            </p>
                        </div>
                    </div>

                    {/* Quick Odyssey Metrics & Action */}
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap shrink-0">
                        {/* Progress Meter */}
                        <div className="flex flex-col gap-1.5 min-w-[130px]">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500 dark:text-slate-400">Odyssey Progress</span>
                                <span className={`font-black ${isBento ? 'text-black' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                    {progressPercent}%
                                </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden border border-black/5 dark:border-white/5">
                                <div
                                    className={`h-full transition-all duration-700 rounded-full ${
                                        isBento
                                            ? 'bg-[#bef264]'
                                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-[11px] text-slate-400">
                                {completedCount} of {modules.length} chapters conquered
                            </span>
                        </div>

                        {/* Resume Quest Button */}
                        <button
                            type="button"
                            onClick={handleJumpToActiveQuest}
                            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 group ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-600/25'
                            }`}
                        >
                            <Compass className="w-4 h-4 transition-transform group-hover:rotate-45" />
                            <span>Resume Quest ({activeQuestIndex + 1})</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Horizontal Storytelling Viewport Header & Scroll Controls */}
            <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-xs font-black uppercase tracking-wider ${
                        isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                        The Horizontal Story Spine • Scroll or Drag to Journey
                    </span>
                </div>

                {/* Left/Right Floating Paddles */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleScrollStep('left')}
                        disabled={!canScrollLeft}
                        aria-label="Previous Chapter"
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            !canScrollLeft
                                ? 'opacity-30 cursor-not-allowed'
                                : isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-50 text-black'
                                    : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm'
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleScrollStep('right')}
                        disabled={!canScrollRight}
                        aria-label="Next Chapter"
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            !canScrollRight
                                ? 'opacity-30 cursor-not-allowed'
                                : isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-50 text-black'
                                    : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm'
                        }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* The Horizontal Storytelling Canvas */}
            <div className="relative">
                {/* Horizontal Illuminated Spine (Line connecting chapters behind cards) */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-emerald-500/30 -translate-y-1/2 pointer-events-none z-0" />

                <div
                    ref={scrollContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`flex gap-6 sm:gap-8 overflow-x-auto pb-8 pt-4 px-2 sm:px-4 scroll-smooth snap-x snap-mandatory relative z-10 scrollbar-none cursor-grab active:cursor-grabbing ${
                        isDragging ? 'select-none' : ''
                    }`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {modules.map((node, idx) => {
                        const { module, isCompleted } = node;
                        const lore: ChapterLore = getChapterStoryLore(
                            module.title,
                            idx,
                            modules.length,
                            track.category
                        );
                        const isCurrent = idx === activeQuestIndex;

                        return (
                            <div
                                key={module.moduleId || idx}
                                onClick={() => setSelectedModuleIndex(idx)}
                                className={`w-[320px] sm:w-[380px] shrink-0 snap-start transition-all duration-300 group cursor-pointer ${
                                    isCurrent ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                                }`}
                            >
                                {/* Double-Bezel Architecture: Outer Shell */}
                                <div className={`p-2 rounded-[2.25rem] transition-all relative ${
                                    isBento
                                        ? isCurrent
                                            ? 'bg-black border-[3px] border-black shadow-[8px_8px_0px_#000]'
                                            : 'bg-black border-[3px] border-black shadow-[5px_5px_0px_#000]'
                                        : isCurrent
                                            ? 'bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-indigo-500/10 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20'
                                            : isCompleted
                                                ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-md'
                                                : 'bg-slate-200/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-lg'
                                }`}>
                                    {/* Inner Core */}
                                    <div className={`p-6 rounded-[calc(2.25rem-0.5rem)] flex flex-col justify-between min-h-[460px] transition-all relative overflow-hidden ${
                                        isBento
                                            ? isCurrent
                                                ? 'bg-[#fef9c3] text-black'
                                                : isCompleted
                                                    ? 'bg-[#ecfccb] text-black'
                                                    : 'bg-white text-black'
                                            : isCurrent
                                                ? 'bg-white dark:bg-[#0f1424] text-slate-900 dark:text-white'
                                                : isCompleted
                                                    ? 'bg-white dark:bg-[#0c131d] text-slate-900 dark:text-white'
                                                    : 'bg-white dark:bg-[#0c101c] text-slate-900 dark:text-white'
                                    }`}>
                                        {/* Chapter Header & Badges */}
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                                    isBento
                                                        ? 'bg-black text-white'
                                                        : lore.isBossTrial
                                                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                                }`}>
                                                    {lore.actTitle}
                                                </span>

                                                {/* Status Pill */}
                                                {isCompleted ? (
                                                    <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                                        isBento
                                                            ? 'bg-[#bef264] text-black border border-black'
                                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    }`}>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Conquered
                                                    </span>
                                                ) : isCurrent ? (
                                                    <span className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full animate-pulse ${
                                                        isBento
                                                            ? 'bg-[#fde047] text-black border border-black'
                                                            : 'bg-indigo-600 text-white shadow-sm'
                                                    }`}>
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Active Quest
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-0.5">
                                                        <Lock className="w-3.5 h-3.5" />
                                                        Locked
                                                    </span>
                                                )}
                                            </div>

                                            {/* Episode Title & Number */}
                                            <div className="mb-2">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-0.5">
                                                    Chapter {lore.chapterNumber < 10 ? `0${lore.chapterNumber}` : lore.chapterNumber}
                                                </p>
                                                <h3 className={`text-lg font-black tracking-tight leading-snug ${
                                                    isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                                                }`}>
                                                    {lore.isBossTrial && lore.bossName ? `⚔️ ${lore.bossName}` : module.title}
                                                </h3>
                                            </div>

                                            {/* Storyline Lore Hook */}
                                            <p className={`text-xs leading-relaxed line-clamp-3 mb-4 ${
                                                isBento ? 'text-slate-700 font-medium' : 'text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {module.description || lore.narrative}
                                            </p>

                                            {/* Key Competency Pills */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {lore.keySkills.slice(0, 3).map((skill, sIdx) => (
                                                    <span
                                                        key={sIdx}
                                                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                                            isBento
                                                                ? 'bg-white border border-black text-black'
                                                                : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Bottom Stakes & CTA */}
                                        <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-slate-500 font-semibold">
                                                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                                                    {module.quizIds?.length || 1} Trial{(module.quizIds?.length || 1) > 1 ? 's' : ''}
                                                </span>
                                                <span className={`font-black flex items-center gap-1 ${
                                                    isBento ? 'text-black' : 'text-amber-500 dark:text-amber-400'
                                                }`}>
                                                    <Zap className="w-3.5 h-3.5" />
                                                    +{module.xpReward || 120} XP
                                                </span>
                                            </div>

                                            {/* Button-in-Button CTA */}
                                            <div className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-between group-hover:shadow-md ${
                                                isCompleted
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black'
                                                        : 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : isCurrent
                                                        ? isBento
                                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                                        : isBento
                                                            ? 'bg-slate-100 text-slate-600 border border-black'
                                                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                                            }`}>
                                                <span>
                                                    {isCompleted ? 'Review Chapter Dossier' : isCurrent ? 'Embark on Quest' : 'Inspect Milestones'}
                                                </span>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${
                                                    isCompleted
                                                        ? isBento ? 'bg-black text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                        : isCurrent
                                                            ? isBento ? 'bg-black text-white' : 'bg-white/20 text-white'
                                                            : 'bg-black/5 dark:bg-white/10'
                                                }`}>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Horizontal Timeline Scrubber / Chapter Scrubber */}
            <div className={`mt-2 p-3 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto transition-all ${
                isBento
                    ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5'
            }`}>
                <div className="flex items-center gap-1.5 shrink-0 px-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Odyssey Map
                    </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1 px-2">
                    {modules.map((mNode, mIdx) => {
                        const isNodeCompleted = mNode.isCompleted;
                        const isNodeCurrent = mIdx === activeQuestIndex;
                        const isNodeActiveView = mIdx === activeChapterIndex;

                        return (
                            <button
                                key={mIdx}
                                type="button"
                                onClick={() => scrollToChapter(mIdx)}
                                title={`Chapter ${mIdx + 1}: ${mNode.module.title}`}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                                    isNodeActiveView
                                        ? isBento
                                            ? 'bg-black text-white scale-105'
                                            : 'bg-indigo-600 text-white shadow-sm scale-105'
                                        : isNodeCompleted
                                            ? isBento
                                                ? 'bg-[#bef264] text-black border border-black'
                                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                            : isNodeCurrent
                                                ? isBento
                                                    ? 'bg-[#fde047] text-black border border-black'
                                                    : 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'
                                                : isBento
                                                    ? 'bg-slate-100 text-slate-500'
                                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {isNodeCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : null}
                                <span>{mIdx + 1 < 10 ? `0${mIdx + 1}` : mIdx + 1}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="shrink-0 text-xs text-slate-400 font-semibold px-2 hidden sm:block">
                    Chapter {activeChapterIndex + 1} of {modules.length}
                </div>
            </div>

            {/* Chapter Quest Dossier Modal */}
            {selectedModuleIndex !== null && (
                <ChapterDossierModal
                    isOpen={selectedModuleIndex !== null}
                    onClose={() => setSelectedModuleIndex(null)}
                    moduleNode={modules[selectedModuleIndex] || null}
                    chapterIndex={selectedModuleIndex}
                    totalChapters={modules.length}
                    trackTitle={track.title}
                    trackCategory={track.category || 'Curriculum'}
                    onCompleteChapter={onCompleteModule}
                    isCompleting={completingId === modules[selectedModuleIndex]?.module.moduleId}
                />
            )}
        </div>
    );
};
