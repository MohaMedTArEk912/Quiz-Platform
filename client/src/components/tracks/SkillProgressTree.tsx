import React from 'react';
import type { SkillTrack, BadgeTreeNode, BadgeNode } from '../../types';
import BadgeNodeCard from '../badges/BadgeNodeCard';
import { Lock, Check, BookOpen, Award } from 'lucide-react';

interface SkillProgressTreeProps {
    track: SkillTrack;
    badgeTree?: {
        nodes: (BadgeTreeNode & { badge?: BadgeNode })[];
    };
    userProgress?: {
        unlockedModules: string[];
        completedModules: string[];
        earnedBadges: string[];
    };
    onModuleClick?: (moduleId: string) => void;
    onBadgeClick?: (badgeId: string) => void;
}

const SkillProgressTree: React.FC<SkillProgressTreeProps> = ({
    track,
    badgeTree,
    userProgress = { unlockedModules: [], completedModules: [], earnedBadges: [] },
    onModuleClick,
    onBadgeClick
}) => {
    const isModuleUnlocked = (moduleId: string) => {
        return userProgress.unlockedModules.includes(moduleId);
    };

    const isModuleCompleted = (moduleId: string) => {
        return userProgress.completedModules.includes(moduleId);
    };

    const isBadgeEarned = (badgeId: string) => {
        return userProgress.earnedBadges.includes(badgeId);
    };

    const canUnlockBadge = (node: BadgeTreeNode) => {
        if (!node.prerequisites || node.prerequisites.length === 0) return true;
        return node.prerequisites.every(prereqId => userProgress.earnedBadges.includes(prereqId));
    };

    return (
        <div className="relative">
            {/* Tree Container */}
            <div className="flex flex-col items-center gap-8 py-8">

                {/* Root Badge (if exists) */}
                {badgeTree?.nodes.filter(n => n.isRoot).map(node => (
                    <div key={node.badgeId} className="flex flex-col items-center">
                        <BadgeNodeCard
                            badge={node.badge!}
                            isUnlocked={isBadgeEarned(node.badgeId)}
                            canUnlock={canUnlockBadge(node)}
                            onClick={() => onBadgeClick?.(node.badgeId)}
                            size="large"
                        />
                        {/* Connecting line */}
                        <div className="w-1 h-12 bg-gradient-to-b from-purple-500/50 to-transparent" />
                    </div>
                ))}

                {/* Modules and Badges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
                    {track.modules.map((module, index) => {
                        const isUnlocked = isModuleUnlocked(module.moduleId);
                        const isCompleted = isModuleCompleted(module.moduleId);

                        // Find related badges for this module
                        const relatedBadges = badgeTree?.nodes.filter(n =>
                            !n.isRoot &&
                            !n.isSpecial &&
                            n.position.tier === index + 1
                        ) || [];

                        return (
                            <div key={module.moduleId} className="flex flex-col items-center gap-4">
                                {/* Module Card */}
                                <div
                                    onClick={() => isUnlocked && onModuleClick?.(module.moduleId)}
                                    className={`relative w-full max-w-sm rounded-2xl p-6 border-2 transition-all duration-300 ${isCompleted
                                            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-lg shadow-green-500/20'
                                            : isUnlocked
                                                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50 hover:border-blue-400 cursor-pointer hover:scale-105'
                                                : 'bg-gray-800/50 border-gray-700 opacity-60'
                                        }`}
                                >
                                    {/* Module Icon */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-3 rounded-xl ${isCompleted
                                                ? 'bg-green-500/30'
                                                : isUnlocked
                                                    ? 'bg-blue-500/30'
                                                    : 'bg-gray-700/30'
                                            }`}>
                                            {isCompleted ? (
                                                <Check className="w-6 h-6 text-green-400" />
                                            ) : isUnlocked ? (
                                                <BookOpen className="w-6 h-6 text-blue-400" />
                                            ) : (
                                                <Lock className="w-6 h-6 text-gray-500" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-gray-500'
                                                }`}>
                                                {module.title}
                                            </h3>
                                            <p className="text-xs text-gray-400">Module {index + 1}</p>
                                        </div>
                                    </div>

                                    {/* Module Description */}
                                    {module.description && (
                                        <p className={`text-sm mb-4 ${isUnlocked ? 'text-gray-300' : 'text-gray-600'
                                            }`}>
                                            {module.description}
                                        </p>
                                    )}

                                    {/* Status Badge */}
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isCompleted
                                                ? 'bg-green-500/20 text-green-400'
                                                : isUnlocked
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-gray-700/20 text-gray-500'
                                            }`}>
                                            {isCompleted ? '✓ Completed' : isUnlocked ? 'Available' : 'Locked'}
                                        </span>
                                    </div>

                                    {/* Completion checkmark */}
                                    {isCompleted && (
                                        <div className="absolute -top-3 -right-3 bg-green-500 rounded-full p-2 border-4 border-gray-900 shadow-lg">
                                            <Check className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Related Badges */}
                                {relatedBadges.length > 0 && (
                                    <div className="flex gap-4 flex-wrap justify-center">
                                        {relatedBadges.map(badgeNode => (
                                            <div key={badgeNode.badgeId} className="relative">
                                                {/* Connecting line from module to badge */}
                                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-gradient-to-b from-purple-500/30 to-transparent" />

                                                <BadgeNodeCard
                                                    badge={badgeNode.badge!}
                                                    isUnlocked={isBadgeEarned(badgeNode.badgeId)}
                                                    canUnlock={canUnlockBadge(badgeNode) && isCompleted}
                                                    onClick={() => onBadgeClick?.(badgeNode.badgeId)}
                                                    size="medium"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Connecting line to next module */}
                                {index < track.modules.length - 1 && (
                                    <div className="w-1 h-8 bg-gradient-to-b from-gray-600/50 to-transparent" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Final/Special Badges */}
                {badgeTree?.nodes.filter(n => n.isSpecial).map(node => (
                    <div key={node.badgeId} className="flex flex-col items-center mt-8">
                        {/* Connecting line */}
                        <div className="w-1 h-12 bg-gradient-to-b from-transparent to-yellow-500/50" />

                        <div className="relative">
                            {/* Glow effect for special badges */}
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-2xl animate-pulse" />

                            <BadgeNodeCard
                                badge={node.badge!}
                                isUnlocked={isBadgeEarned(node.badgeId)}
                                canUnlock={canUnlockBadge(node)}
                                onClick={() => onBadgeClick?.(node.badgeId)}
                                size="large"
                            />
                        </div>

                        {/* Special badge label */}
                        <div className="mt-4 flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full px-4 py-2">
                            <Award className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-400">Master Achievement</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Progress Summary */}
            <div className="mt-8 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Progress Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                        <p className="text-sm text-blue-400 mb-1">Modules</p>
                        <p className="text-2xl font-bold text-white">
                            {userProgress.completedModules.length}/{track.modules.length}
                        </p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                        <p className="text-sm text-purple-400 mb-1">Badges</p>
                        <p className="text-2xl font-bold text-white">
                            {userProgress.earnedBadges.length}/{badgeTree?.nodes.length || 0}
                        </p>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                        <p className="text-sm text-green-400 mb-1">Completion</p>
                        <p className="text-2xl font-bold text-white">
                            {track.modules.length > 0
                                ? Math.round((userProgress.completedModules.length / track.modules.length) * 100)
                                : 0}%
                        </p>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                        <p className="text-sm text-yellow-400 mb-1">Next Goal</p>
                        <p className="text-sm font-bold text-white">
                            {userProgress.completedModules.length === track.modules.length
                                ? 'Track Complete! 🎉'
                                : `Module ${userProgress.completedModules.length + 1}`
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillProgressTree;
