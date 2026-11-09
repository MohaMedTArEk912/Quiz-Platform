import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SkillModule, BadgeNode } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
    Sparkles,
    CheckCircle2,
    Lock,
    Play,
    Award,
    Clock,
    Zap,
    Trophy,
    Shield,
    BookOpen,
    ArrowRight
} from 'lucide-react';
import Modal from '../common/Modal';
import { getChapterStoryLore, type ChapterLore } from './storyLoreData';
import { sounds } from '../../lib/soundEffects';

interface ChapterDossierModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleNode: {
        module: SkillModule;
        badges: BadgeNode[];
        isCompleted: boolean;
        isLocked: boolean;
    } | null;
    chapterIndex: number;
    totalChapters: number;
    trackTitle: string;
    trackCategory: string;
    onCompleteChapter: (moduleId: string, moduleName: string) => void;
    isCompleting: boolean;
}

export const ChapterDossierModal: React.FC<ChapterDossierModalProps> = ({
    isOpen,
    onClose,
    moduleNode,
    chapterIndex,
    totalChapters,
    trackTitle,
    trackCategory,
    onCompleteChapter,
    isCompleting
}) => {
    const { isBento } = useTheme();
    const navigate = useNavigate();

    if (!moduleNode) return null;

    const { module, badges, isCompleted, isLocked } = moduleNode;
    const lore: ChapterLore = getChapterStoryLore(
        module.title,
        chapterIndex,
        totalChapters,
        trackCategory
    );

    const quizzes = module.quizIds || [];
    const submodules = module.subModules || [];

    const handleLaunchQuiz = (quizId: string) => {
        sounds.playClick();
        onClose();
        navigate(`/quiz/${encodeURIComponent(quizId)}`);
    };

    const handleClaimReward = () => {
        sounds.playPowerUp();
        onCompleteChapter(module.moduleId, module.title);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={lore.storyTitle}
            description={`${trackTitle} • ${lore.actTitle}`}
            maxWidth="max-w-2xl"
            icon={
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                    isCompleted
                        ? isBento ? 'bg-[#bef264] text-black border-2 border-black' : 'bg-emerald-500/20 text-emerald-500'
                        : isLocked
                            ? isBento ? 'bg-slate-200 text-black border-2 border-black' : 'bg-slate-500/20 text-slate-400'
                            : isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-indigo-500/20 text-indigo-500'
                }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isLocked ? <Lock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
            }
        >
            <div className="space-y-6 text-sm">
                {/* Epigraph & Chapter Banner */}
                <div className={`p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all ${
                    isBento
                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                        : lore.isBossTrial
                            ? 'bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30'
                            : 'bg-indigo-500/5 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/10'
                }`}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            isBento
                                ? 'bg-black text-white'
                                : 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                        }`}>
                            Chapter {lore.chapterNumber} of {totalChapters}
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5" />
                                {lore.recommendedTime}
                            </span>
                            <span className={`flex items-center gap-1 font-black ${
                                isBento ? 'text-black' : 'text-amber-500 dark:text-amber-400'
                            }`}>
                                <Zap className="w-3.5 h-3.5" />
                                +{module.xpReward || 120} XP
                            </span>
                        </div>
                    </div>

                    <h3 className={`text-base sm:text-lg font-black tracking-tight mb-2 ${
                        isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                    }`}>
                        {lore.isBossTrial && lore.bossName ? `⚔️ ${lore.bossName}` : module.title}
                    </h3>

                    <p className={`text-xs sm:text-sm leading-relaxed mb-3 ${
                        isBento ? 'text-slate-800' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                        {module.description || lore.narrative}
                    </p>

                    {/* Narrative Lore Quote */}
                    <div className={`p-3 rounded-xl border text-xs italic ${
                        isBento
                            ? 'bg-yellow-50/80 border-black/20 text-black'
                            : 'bg-black/5 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400'
                    }`}>
                        {lore.flavorQuote}
                    </div>
                </div>

                {/* Key Knowledge Scrolls / Concepts */}
                <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-2 ${
                        isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                    }`}>
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        Key Competencies & Wisdom
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {lore.keySkills.map((skill, sIdx) => (
                            <span
                                key={sIdx}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
                                }`}
                            >
                                ✦ {skill}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Associated Quizzes & Practice Gauntlets */}
                {quizzes.length > 0 && (
                    <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-2 ${
                            isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                        }`}>
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Chapter Quizzes & Challenges ({quizzes.length})
                        </h4>
                        <div className="space-y-2">
                            {quizzes.map((quizId, qIdx) => {
                                const cleanQuizTitle = quizId
                                    .replace(/-[a-f0-9]{8}$/i, '')
                                    .replace(/-/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase());

                                return (
                                    <div
                                        key={qIdx}
                                        className={`p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all ${
                                            isBento
                                                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black border border-black'
                                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                <Play className="w-4 h-4" />
                                            </div>
                                            <div className="truncate">
                                                <p className={`font-bold text-xs sm:text-sm truncate ${
                                                    isBento ? 'text-black' : 'text-slate-900 dark:text-white'
                                                }`}>
                                                    {cleanQuizTitle}
                                                </p>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Challenge #{qIdx + 1}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleLaunchQuiz(quizId)}
                                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30'
                                            }`}
                                        >
                                            <span>Play</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Submodules / Lessons */}
                {submodules.length > 0 && (
                    <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-2 ${
                            isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                        }`}>
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Lesson Milestones ({submodules.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {submodules.map((sub, sIdx) => (
                                <div
                                    key={sIdx}
                                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                                        isBento
                                            ? 'bg-white border-black/20 text-black'
                                            : 'bg-slate-50/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate">{sub.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Badges / Unlocks */}
                {badges.length > 0 && (
                    <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-2 ${
                            isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                        }`}>
                            <Award className="w-4 h-4 text-purple-500" />
                            Associated Credentials & Relics
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                            {badges.map((badge, bIdx) => (
                                <div
                                    key={bIdx}
                                    className={`p-2 rounded-xl flex items-center gap-2 border text-xs font-bold ${
                                        isBento
                                            ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                                            : 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-300'
                                    }`}
                                >
                                    <Award className="w-4 h-4 text-purple-500" />
                                    <span>{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Controls */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            isBento
                                ? 'bg-white border-2 border-black text-black hover:bg-slate-100'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Close Dossier
                    </button>

                    {isLocked ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                            <Lock className="w-4 h-4" />
                            <span>Complete previous chapters to unlock</span>
                        </div>
                    ) : isCompleted ? (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Chapter Mastered
                            </span>
                            <button
                                type="button"
                                onClick={handleClaimReward}
                                disabled={isCompleting}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                }`}
                            >
                                Re-verify Mastery
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleClaimReward}
                            disabled={isCompleting}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>{isCompleting ? 'Claiming Wisdom...' : `Complete Quest (+${module.xpReward || 120} XP)`}</span>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
