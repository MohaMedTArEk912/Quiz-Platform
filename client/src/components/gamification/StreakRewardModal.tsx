import React, { useState } from 'react';
import { Flame, Sparkles, Check, Gift, Coins, Zap, Clock, Shield } from 'lucide-react';
import Modal from '../common/Modal';
import { MysteryLootBox, type LootReward } from './MysteryLootBox';
import { sounds } from '../../lib/soundEffects';
import type { UserData } from '../../types';

interface StreakRewardModalProps {
    isOpen: boolean;
    user: UserData;
    onClose: () => void;
    onClaimStreak: (rewards: { coins?: number; xp?: number; powerUp?: string }) => void;
}

const STREAK_DAYS = [
    { day: 1, label: '+25 Coins', icon: '🪙', coins: 25, xp: 0 },
    { day: 2, label: '+50 Coins & 50 XP', icon: '⚡', coins: 50, xp: 50 },
    { day: 3, label: '1x Hint Power-Up', icon: '💡', coins: 30, powerUp: 'hint' },
    { day: 4, label: '+100 Coins & 100 XP', icon: '🪙', coins: 100, xp: 100 },
    { day: 5, label: '1x Time Freeze', icon: '⏳', coins: 50, powerUp: 'time_freeze' },
    { day: 6, label: '+150 Coins & 250 XP', icon: '🔥', coins: 150, xp: 250 },
    { day: 7, label: 'Mystery Loot Box', icon: '🎁', isLootBox: true }
];

export const StreakRewardModal: React.FC<StreakRewardModalProps> = ({
    isOpen,
    user,
    onClose,
    onClaimStreak
}) => {
    const [showLootBox, setShowLootBox] = useState(false);
    const [isClaimedToday, setIsClaimedToday] = useState(() => {
        const lastClaimed = localStorage.getItem(`streak_claimed_${user.userId}`);
        if (!lastClaimed) return false;
        const lastDate = new Date(lastClaimed).toDateString();
        return lastDate === new Date().toDateString();
    });

    if (!isOpen) return null;

    const streak = user.streak || 1;
    const currentStreakDay = ((streak - 1) % 7) + 1; // 1 to 7

    const handleClaimToday = () => {
        if (isClaimedToday) return;

        const dayConfig = STREAK_DAYS[currentStreakDay - 1];
        if (dayConfig.isLootBox) {
            setShowLootBox(true);
            return;
        }

        sounds.playStreak(streak);
        localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
        setIsClaimedToday(true);

        onClaimStreak({
            coins: dayConfig.coins,
            xp: dayConfig.xp,
            powerUp: dayConfig.powerUp
        });
    };

    const handleLootBoxClaim = (loot: LootReward) => {
        localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
        setIsClaimedToday(true);
        setShowLootBox(false);

        onClaimStreak({
            coins: loot.type === 'coins' ? loot.amount : 50,
            xp: loot.type === 'xp' ? loot.amount : 100,
            powerUp: loot.type === 'powerup' ? 'hint' : undefined
        });
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Daily Login Streak Calendar"
                description="Keep your streak alive to unlock escalating rewards and Day 7 Mystery Boxes!"
                maxWidth="max-w-2xl"
                icon={<Flame className="w-6 h-6 text-orange-500" />}
                footer={
                    <div className="flex items-center justify-between gap-3 w-full">
                        <span className="text-xs font-bold text-gray-500">
                            Current Streak: <span className="text-orange-500 font-black">{streak} Day{streak !== 1 ? 's' : ''}</span>
                        </span>

                        <button
                            type="button"
                            onClick={handleClaimToday}
                            disabled={isClaimedToday}
                            className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                                isClaimedToday
                                    ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-default shadow-none'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                            }`}
                        >
                            {isClaimedToday ? '✓ Claimed Today' : 'Claim Day Reward'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Streak Highlight Banner */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-black text-xl">
                                🔥
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {streak} Day Streak!
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Log in every day to claim all 7 rewards without resetting.
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="px-3 py-1 rounded-xl bg-orange-500 text-white font-black text-xs uppercase tracking-wider">
                                Day {currentStreakDay} / 7
                            </span>
                        </div>
                    </div>

                    {/* 7-Day Calendar Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                        {STREAK_DAYS.map((d) => {
                            const isPast = d.day < currentStreakDay;
                            const isToday = d.day === currentStreakDay;
                            const isFuture = d.day > currentStreakDay;

                            return (
                                <div
                                    key={d.day}
                                    className={`p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition-all min-h-[120px] ${
                                        isToday
                                            ? 'bg-gradient-to-b from-orange-500/20 to-amber-500/10 border-orange-500 ring-2 ring-orange-500/50 scale-105 shadow-lg shadow-orange-500/20 z-10'
                                            : isPast
                                                ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/20'
                                                : 'bg-white/60 dark:bg-black/20 border-gray-200 dark:border-white/5 opacity-70'
                                    }`}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                        isToday ? 'text-orange-600 dark:text-orange-400' : isPast ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                                    }`}>
                                        Day {d.day}
                                    </span>

                                    <div className="text-3xl my-1.5">{d.icon}</div>

                                    <div className="text-[10px] font-black text-gray-800 dark:text-gray-200 leading-tight">
                                        {d.label}
                                    </div>

                                    {isPast && (
                                        <div className="mt-1 flex items-center gap-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                                            <Check className="w-2.5 h-2.5" /> Claimed
                                        </div>
                                    )}

                                    {isToday && (
                                        <div className="mt-1 text-[9px] font-black uppercase text-orange-600 dark:text-orange-400">
                                            {isClaimedToday ? '✓ Done' : '🎁 Today'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Mystery Loot Box Modal */}
            {showLootBox && (
                <MysteryLootBox
                    onClaimReward={handleLootBoxClaim}
                    onClose={() => setShowLootBox(false)}
                />
            )}
        </>
    );
};

export default StreakRewardModal;
