import React, { useState } from 'react';
import type { SkillModule, BadgeNode } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle2, Lock, Circle, Award, Star, Zap, Trophy, Sparkles, BookOpen } from 'lucide-react';

interface ModuleNode {
    module: SkillModule;
    badges: BadgeNode[];
    isCompleted: boolean;
    isLocked: boolean;
}

interface SkillTreeVisualizationProps {
    trackTitle: string;
    trackIcon: string;
    modules: ModuleNode[];
    onModuleComplete: (moduleId: string, moduleName: string) => void;
    completingId: string | null;
    earnedBadges: string[];
}

const SkillTreeVisualization: React.FC<SkillTreeVisualizationProps> = ({
    trackTitle,
    trackIcon,
    modules,
    onModuleComplete,
    completingId,
    earnedBadges
}) => {
    const { isBento } = useTheme();
    const [hoveredModule, setHoveredModule] = useState<string | null>(null);
    const [moduleFilter, setModuleFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

    const isBadgeEarned = (badgeId: string) => earnedBadges.includes(badgeId);

    const getBadgeIcon = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return Trophy;
            case 'epic': return Star;
            case 'rare': return Zap;
            default: return Award;
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return 'from-yellow-400 via-orange-400 to-orange-500';
            case 'epic': return 'from-orange-500 via-red-400 to-red-500';
            case 'rare': return 'from-purple-500 via-pink-400 to-pink-500';
            default: return 'from-blue-500 via-cyan-400 to-cyan-500';
        }
    };

    // Filter modules based on completion status
    const filteredModules = modules.filter(moduleNode => {
        if (moduleFilter === 'all') return true;
        if (moduleFilter === 'completed') return moduleNode.isCompleted;
        if (moduleFilter === 'incomplete') return !moduleNode.isCompleted;
        return true;
    });

    const completedCount = modules.filter(m => m.isCompleted).length;
    const progressPercent = (completedCount / modules.length) * 100;

    return (
        <div className="relative py-8">
            {/* ROOT NODE - Track Name */}
            <div className="flex justify-center mb-12">
                <div className="relative group">
                    {/* Glow Effect */}
                    {!isBento && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />
                    )}

                    {/* Main Track Card */}
                    <div className={`relative rounded-3xl p-6 md:p-8 transition-all ${
                        isBento
                            ? 'bg-[#fde047] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 shadow-2xl border-2 border-white/20'
                    }`}>
                        <div className="flex items-center gap-4 md:gap-6">
                            {/* Icon */}
                            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl md:text-5xl flex-shrink-0 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-white/20 backdrop-blur-sm shadow-lg'
                            }`}>
                                {trackIcon}
                            </div>

                            {/* Track Info */}
                            <div className="flex-1 min-w-0">
                                <h2 className={`text-2xl md:text-4xl font-black mb-2 tracking-tight truncate ${
                                    isBento ? 'text-black uppercase' : 'text-white'
                                }`}>{trackTitle}</h2>
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center gap-2 ${isBento ? 'text-black font-black' : 'text-white/90 font-semibold'}`}>
                                        <BookOpen className="w-5 h-5" />
                                        <span>{completedCount}/{modules.length} Modules</span>
                                    </div>
                                    <div className={`flex-1 max-w-xs h-3.5 rounded-full overflow-hidden ${
                                        isBento
                                            ? 'bg-white border-2 border-black'
                                            : 'bg-white/20 backdrop-blur-sm'
                                    }`}>
                                        <div
                                            className={`h-full transition-all duration-700 ${
                                                isBento
                                                    ? 'bg-[#bef264]'
                                                    : 'bg-gradient-to-r from-green-400 to-emerald-400 shadow-lg'
                                            }`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <span className={`font-black text-lg ${isBento ? 'text-black' : 'text-white/90'}`}>{Math.round(progressPercent)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connector Line Down */}
                    <div className={`absolute left-1/2 -bottom-12 transform -translate-x-1/2 w-1.5 h-12 ${
                        isBento ? 'bg-black' : 'bg-gradient-to-b from-purple-500 to-transparent'
                    }`} />
                </div>
            </div>

            {/* Module Filter */}
            <div className="flex justify-center gap-2 mb-8">
                <button
                    onClick={() => setModuleFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        moduleFilter === 'all'
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                : 'bg-purple-600 text-white shadow-lg font-semibold text-sm'
                            : isBento
                                ? 'bg-white text-black/70 border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black/5 font-black'
                                : 'bg-gray-200 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-800 font-semibold text-sm'
                    }`}
                >
                    All Modules
                </button>
                <button
                    onClick={() => setModuleFilter('incomplete')}
                    className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        moduleFilter === 'incomplete'
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                : 'bg-blue-600 text-white shadow-lg font-semibold text-sm'
                            : isBento
                                ? 'bg-white text-black/70 border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black/5 font-black'
                                : 'bg-gray-200 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-800 font-semibold text-sm'
                    }`}
                >
                    Incomplete
                </button>
                <button
                    onClick={() => setModuleFilter('completed')}
                    className={`px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        moduleFilter === 'completed'
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                : 'bg-green-600 text-white shadow-lg font-semibold text-sm'
                            : isBento
                                ? 'bg-white text-black/70 border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-black/5 font-black'
                                : 'bg-gray-200 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-800 font-semibold text-sm'
                    }`}
                >
                    Completed
                </button>
            </div>

            {/* MODULES - Branching from Root */}
            <div className="relative max-w-6xl mx-auto">
                {/* Vertical Spine */}
                <div className={`absolute left-1/2 top-0 bottom-0 rounded-full transform -translate-x-1/2 ${
                    isBento ? 'w-1.5 bg-black' : 'w-1 bg-gradient-to-b from-purple-500/60 via-blue-500/60 to-purple-500/60'
                }`} />

                {/* Module Nodes */}
                <div className="space-y-8 md:space-y-16">
                    {filteredModules.map((moduleNode, index) => {
                        const isHovered = hoveredModule === moduleNode.module.moduleId;
                        const hasBadges = moduleNode.badges.length > 0;
                        const isLeft = index % 2 === 0;

                        return (
                            <div key={moduleNode.module.moduleId} className="relative">
                                {/* Horizontal Branch Line */}
                                <div className={`hidden md:block absolute top-1/2 ${isLeft ? 'right-1/2 left-0' : 'left-1/2 right-0'} ${
                                    isBento ? 'h-1 bg-black' : 'h-0.5 bg-gradient-to-r from-purple-500/60 to-transparent'
                                }`} style={{ width: '120px' }} />

                                {/* Module Card */}
                                <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'} relative`}>
                                    <div
                                        className="relative group"
                                        onMouseEnter={() => setHoveredModule(moduleNode.module.moduleId)}
                                        onMouseLeave={() => setHoveredModule(null)}
                                    >
                                        {/* Status Indicator - Solid Block */}
                                        <div className={`absolute top-1/2 ${isLeft ? '-right-16' : '-left-16'} transform -translate-y-1/2 z-10`}>
                                            {moduleNode.isCompleted ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/60 border-2 border-green-300 text-white'
                                                }`}>
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                            ) : moduleNode.isLocked ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    isBento
                                                        ? 'bg-slate-200 text-black/50 border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                                                }`}>
                                                    <Lock className="w-6 h-6" />
                                                </div>
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center animate-pulse ${
                                                    isBento
                                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40 border-2 border-blue-300 text-white'
                                                }`}>
                                                    <Circle className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Module Card */}
                                        <div
                                            className={`relative w-80 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
                                                isBento
                                                    ? moduleNode.isCompleted
                                                        ? 'bg-[#dcfce7] text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                                        : moduleNode.isLocked
                                                            ? 'bg-slate-100 text-black/60 border-3 border-black shadow-[3px_3px_0px_#000]'
                                                            : 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                                    : moduleNode.isCompleted
                                                        ? 'bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 dark:from-green-500/30 dark:via-emerald-500/30 dark:to-teal-500/30 border-2 border-green-500/70 shadow-2xl shadow-green-500/20 dark:shadow-green-500/40 bg-white dark:bg-transparent'
                                                        : moduleNode.isLocked
                                                            ? 'bg-gray-50 dark:bg-transparent bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/90 dark:to-gray-900/90 border-2 border-gray-200 dark:border-gray-700/70'
                                                            : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/30 dark:via-purple-500/30 dark:to-pink-500/30 border-2 border-blue-500/70 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/50 bg-white dark:bg-transparent'
                                            } ${isHovered ? 'scale-105 -translate-y-2' : ''}`}
                                        >
                                            {/* Shimmer */}
                                            {!moduleNode.isLocked && !isBento && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            )}

                                            <div className="relative p-6">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                                                                isBento
                                                                    ? 'bg-black text-white'
                                                                    : 'bg-gray-200 dark:bg-white/20 backdrop-blur-sm text-gray-700 dark:text-white'
                                                            }`}>
                                                                {index + 1}
                                                            </div>
                                                            <h3 className={`text-xl font-black ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{moduleNode.module.title}</h3>
                                                        </div>
                                                        <p className={`text-sm leading-relaxed ${isBento ? 'text-black/70 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {moduleNode.module.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className={`flex items-center justify-between pt-4 ${
                                                    isBento ? 'border-t-2 border-black' : 'border-t border-gray-200 dark:border-white/20'
                                                }`}>
                                                    {hasBadges ? (
                                                        <div className={`flex items-center gap-2 text-sm ${isBento ? 'text-black font-black' : 'text-purple-300'}`}>
                                                            <Sparkles className="w-4 h-4" />
                                                            <span className="font-bold">{moduleNode.badges.length} badges</span>
                                                        </div>
                                                    ) : (
                                                        <div />
                                                    )}

                                                    {moduleNode.isCompleted && (
                                                        <div className={`flex items-center gap-2 font-black text-sm ${isBento ? 'text-black' : 'text-green-400'}`}>
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Completed
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Complete Button */}
                                                {!moduleNode.isCompleted && !moduleNode.isLocked && (
                                                    <button
                                                        onClick={() => onModuleComplete(moduleNode.module.moduleId, moduleNode.module.title)}
                                                        disabled={completingId === moduleNode.module.moduleId}
                                                        className={`mt-4 w-full px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer ${
                                                            isBento
                                                                ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none'
                                                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-green-500/50 font-bold'
                                                        }`}
                                                    >
                                                        {completingId === moduleNode.module.moduleId ? (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                Completing...
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <CheckCircle2 className="w-5 h-5" />
                                                                Mark as Complete
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Badges Below Module */}
                                        {hasBadges && (
                                            <div className="mt-6 flex flex-wrap gap-3">
                                                {moduleNode.badges.map((badge) => {
                                                    const isEarned = isBadgeEarned(badge.badgeId);
                                                    const BadgeIcon = getBadgeIcon(badge.rarity);
                                                    const rarityColor = getRarityColor(badge.rarity);

                                                    return (
                                                        <div
                                                            key={badge.badgeId}
                                                            className={`relative group w-36 h-20 rounded-xl transition-all duration-200 overflow-hidden ${
                                                                isBento
                                                                    ? isEarned
                                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                                        : 'bg-white text-black/50 border-2 border-black shadow-[2px_2px_0px_#000] grayscale'
                                                                    : isEarned
                                                                        ? `bg-gradient-to-br ${rarityColor} border-2 border-white/40 shadow-lg hover:shadow-xl hover:scale-105`
                                                                        : 'bg-gray-100 dark:bg-gray-800/70 border-2 border-gray-200 dark:border-gray-700/70 grayscale hover:grayscale-0 hover:border-gray-400 dark:hover:border-gray-600'
                                                            }`}
                                                            title={badge.description}
                                                        >
                                                            {isEarned && !isBento && (
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                            )}

                                                            <div className="relative p-2.5 h-full flex items-center gap-2">
                                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                                    isBento
                                                                        ? 'bg-white border border-black'
                                                                        : isEarned ? 'bg-white/25 backdrop-blur-sm' : 'bg-gray-200 dark:bg-gray-700/70'
                                                                }`}>
                                                                    <span className="text-2xl">{badge.icon}</span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-xs font-black truncate mb-1 ${
                                                                        isBento ? 'text-black' : isEarned ? 'text-white' : 'text-gray-900 dark:text-white'
                                                                    }`}>
                                                                        {badge.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-1">
                                                                        <BadgeIcon className={`w-3 h-3 ${
                                                                            isBento ? 'text-black' : isEarned ? 'text-white/80' : 'text-gray-500 dark:text-white/80'
                                                                        }`} />
                                                                        <span className={`capitalize text-[10px] font-black ${
                                                                            isBento ? 'text-black/80' : isEarned ? 'text-white/80' : 'text-gray-500 dark:text-white/80'
                                                                        }`}>
                                                                            {badge.rarity}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {isEarned && (
                                                                    <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                                                                        isBento ? 'bg-black text-white' : 'bg-white text-green-600 shadow-lg'
                                                                    }`}>
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
};

export default SkillTreeVisualization;
