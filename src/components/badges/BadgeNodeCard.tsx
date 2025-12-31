import React from 'react';
import type { BadgeNode } from '../../types';
import { Lock, Check, Sparkles, Zap, Crown, Star } from 'lucide-react';

interface BadgeNodeCardProps {
    badge: BadgeNode;
    isUnlocked?: boolean;
    canUnlock?: boolean;
    onClick?: () => void;
    size?: 'small' | 'medium' | 'large';
}

const BadgeNodeCard: React.FC<BadgeNodeCardProps> = ({
    badge,
    isUnlocked = false,
    canUnlock = false,
    onClick,
    size = 'medium'
}) => {
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'from-blue-500 to-blue-600';
            case 'rare': return 'from-purple-500 to-purple-600';
            case 'epic': return 'from-orange-500 to-orange-600';
            case 'legendary': return 'from-yellow-400 to-yellow-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getRarityIcon = (rarity: string) => {
        switch (rarity) {
            case 'common': return <Star className="w-3 h-3" />;
            case 'rare': return <Sparkles className="w-3 h-3" />;
            case 'epic': return <Zap className="w-3 h-3" />;
            case 'legendary': return <Crown className="w-3 h-3" />;
            default: return null;
        }
    };

    const sizeClasses = {
        small: 'w-20 h-20',
        medium: 'w-32 h-32',
        large: 'w-40 h-40'
    };

    const iconSizes = {
        small: 'text-3xl',
        medium: 'text-5xl',
        large: 'text-6xl'
    };

    return (
        <div
            onClick={onClick}
            className={`relative ${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''} group`}
        >
            {/* Glow effect for unlocked badges */}
            {isUnlocked && (
                <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRarityColor(badge.rarity)} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`}
                />
            )}

            {/* Pulse effect for unlockable badges */}
            {canUnlock && !isUnlocked && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 opacity-20 animate-pulse" />
            )}

            {/* Main badge circle */}
            <div
                className={`relative ${sizeClasses[size]} rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isUnlocked
                        ? `bg-gradient-to-br ${getRarityColor(badge.rarity)} border-white/30 shadow-lg group-hover:scale-105`
                        : canUnlock
                            ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-green-500/50 group-hover:border-green-500'
                            : 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 opacity-60'
                    }`}
                style={{ backgroundColor: badge.color }}
            >
                {/* Badge icon */}
                <div className={`${iconSizes[size]} ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                    {badge.icon}
                </div>

                {/* Lock overlay for locked badges */}
                {!isUnlocked && !canUnlock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Lock className="w-8 h-8 text-white/80" />
                    </div>
                )}

                {/* Check mark for unlocked badges */}
                {isUnlocked && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                )}

                {/* Rarity indicator */}
                <div className={`absolute -bottom-1 -right-1 bg-gradient-to-br ${getRarityColor(badge.rarity)} rounded-full p-1.5 border-2 border-white shadow-lg`}>
                    {getRarityIcon(badge.rarity)}
                </div>
            </div>

            {/* Badge name */}
            {size !== 'small' && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <p className={`text-sm font-bold text-center ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                        {badge.name}
                    </p>
                </div>
            )}

            {/* Rewards indicator */}
            {size === 'large' && (isUnlocked || canUnlock) && (
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 text-xs">
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
            )}
        </div>
    );
};

export default BadgeNodeCard;
