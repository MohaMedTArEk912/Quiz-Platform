import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { BadgeTree, BadgeNode } from '../types';
import PageLayout from '../layouts/PageLayout';
import BadgeNodeCard from '../components/badges/BadgeNodeCard';
import { ArrowLeft, Award, Check, Sparkles } from 'lucide-react';

const BadgeTreeDetailPage: React.FC = () => {
    const { treeId } = useParams<{ treeId: string }>();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [tree, setTree] = useState<BadgeTree | null>(null);
    const [badges, setBadges] = useState<Record<string, BadgeNode>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTree = async () => {
            if (!treeId || !currentUser) return;

            try {
                setLoading(true);
                const treeData = await api.getBadgeTree(treeId);
                setTree(treeData);

                // Load all badge details
                const badgeMap: Record<string, BadgeNode> = {};
                for (const node of treeData.nodes) {
                    const badge = await api.getBadgeNode(node.badgeId);
                    badgeMap[node.badgeId] = badge;
                }
                setBadges(badgeMap);
            } catch (err) {
                console.error('Failed to load tree:', err);
                setError('Failed to load badge tree');
            } finally {
                setLoading(false);
            }
        };

        loadTree();
    }, [treeId, currentUser]);

    const isBadgeEarned = (badgeId: string) => {
        return currentUser?.badges?.some(b => b.id === badgeId) || false;
    };

    const canUnlockBadge = (node: any) => {
        if (!node.prerequisites || node.prerequisites.length === 0) return true;
        return node.prerequisites.every((prereqId: string) => isBadgeEarned(prereqId));
    };

    if (loading) {
        return (
            <PageLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-white text-xl">Loading badge tree...</div>
                </div>
            </PageLayout>
        );
    }

    if (error || !tree) {
        return (
            <PageLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
                        {error || 'Badge tree not found'}
                    </div>
                </div>
            </PageLayout>
        );
    }

    // Group badges by tier
    const badgesByTier: Record<number, any[]> = {};
    tree.nodes.forEach(node => {
        const tier = node.position?.tier || 0;
        if (!badgesByTier[tier]) badgesByTier[tier] = [];
        badgesByTier[tier].push(node);
    });

    const maxTier = Math.max(...Object.keys(badgesByTier).map(Number));

    return (
        <PageLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/tracks')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Tracks
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-5xl">{tree.icon || '🏆'}</div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">{tree.name}</h1>
                            <p className="text-gray-400 text-lg">{tree.description}</p>
                        </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-purple-400 mb-2">
                                <Award className="w-5 h-5" />
                                <span className="text-sm font-semibold">Total Badges</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{tree.nodes.length}</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                <Check className="w-5 h-5" />
                                <span className="text-sm font-semibold">Earned</span>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                {tree.nodes.filter(n => isBadgeEarned(n.badgeId)).length}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-blue-400 mb-2">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-sm font-semibold">Available</span>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                {tree.nodes.filter(n => !isBadgeEarned(n.badgeId) && canUnlockBadge(n)).length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Badge Tree Visualization */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Award className="w-6 h-6 text-purple-400" />
                        Badge Progression Tree
                    </h2>

                    <div className="space-y-12">
                        {Array.from({ length: maxTier + 1 }, (_, tier) => tier).reverse().map(tier => {
                            const tierBadges = badgesByTier[tier] || [];
                            if (tierBadges.length === 0) return null;

                            return (
                                <div key={tier} className="relative">
                                    {/* Tier Label */}
                                    <div className="text-center mb-6">
                                        <span className="inline-block bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-2 text-purple-300 font-bold">
                                            {tier === 0 ? 'Foundation' : tier === maxTier ? 'Mastery' : `Level ${tier}`}
                                        </span>
                                    </div>

                                    {/* Badges in this tier */}
                                    <div className="flex flex-wrap justify-center gap-8 items-center">
                                        {tierBadges.map(node => {
                                            const badge = badges[node.badgeId];
                                            if (!badge) return null;

                                            const isEarned = isBadgeEarned(node.badgeId);
                                            const canUnlock = canUnlockBadge(node);

                                            return (
                                                <div key={node.badgeId} className="relative group">
                                                    {/* Connection lines to prerequisites */}
                                                    {node.prerequisites && node.prerequisites.length > 0 && tier > 0 && (
                                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4">
                                                            <div className="w-0.5 h-8 bg-gradient-to-b from-purple-500/50 to-transparent" />
                                                        </div>
                                                    )}

                                                    <BadgeNodeCard
                                                        badge={badge}
                                                        isUnlocked={isEarned}
                                                        canUnlock={canUnlock && !isEarned}
                                                        size="large"
                                                    />

                                                    {/* Badge Info on Hover */}
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl min-w-[250px]">
                                                            <h3 className="font-bold text-white mb-2">{badge.name}</h3>
                                                            <p className="text-gray-400 text-sm mb-3">{badge.description}</p>

                                                            {badge.rewards.xp > 0 || badge.rewards.coins > 0 ? (
                                                                <div className="flex gap-2 text-xs">
                                                                    {badge.rewards.xp > 0 && (
                                                                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                                                            +{badge.rewards.xp} XP
                                                                        </span>
                                                                    )}
                                                                    {badge.rewards.coins > 0 && (
                                                                        <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                                                                            +{badge.rewards.coins} 🪙
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : null}

                                                            {!isEarned && node.prerequisites && node.prerequisites.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-gray-700">
                                                                    <p className="text-xs text-gray-500 mb-1">Requires:</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {node.prerequisites.map((prereqId: string) => {
                                                                            const prereqBadge = badges[prereqId];
                                                                            const hasPrereq = isBadgeEarned(prereqId);
                                                                            return prereqBadge ? (
                                                                                <span
                                                                                    key={prereqId}
                                                                                    className={`text-xs px-2 py-1 rounded ${hasPrereq
                                                                                        ? 'bg-green-500/20 text-green-300'
                                                                                        : 'bg-red-500/20 text-red-300'
                                                                                        }`}
                                                                                >
                                                                                    {hasPrereq ? '✓' : '✗'} {prereqBadge.name}
                                                                                </span>
                                                                            ) : null;
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Connection line to next tier */}
                                    {tier < maxTier && (
                                        <div className="flex justify-center mt-8">
                                            <div className="w-0.5 h-8 bg-gradient-to-b from-purple-500/50 to-transparent" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default BadgeTreeDetailPage;
