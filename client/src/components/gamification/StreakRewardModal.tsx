import React, { useState } from 'react';
import { Flame, Check } from 'lucide-react';
import Modal from '../common/Modal';
import { MysteryLootBox, type LootReward } from './MysteryLootBox';
import { sounds } from '../../lib/soundEffects';
import { api } from '../../lib/api';
import type { UserData } from '../../types';
import { useTheme } from '../../context/ThemeContext';

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
    const { isBento } = useTheme();
    const [showLootBox, setShowLootBox] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

    // Reliable check if claimed today: either from DB field or localStorage
    const isClaimedToday = Boolean((() => {
        const todayStr = new Date().toDateString();
        if (user.lastStreakClaimDate && new Date(user.lastStreakClaimDate).toDateString() === todayStr) {
            return true;
        }
        const lastClaimedLocal = localStorage.getItem(`streak_claimed_${user.userId}`);
        if (lastClaimedLocal && new Date(lastClaimedLocal).toDateString() === todayStr) {
            return true;
        }
        return false;
    })());

    if (!isOpen) return null;

    const streak = user.streak || 1;
    const currentStreakDay = ((streak - 1) % 7) + 1; // 1 to 7

    const handleClaimToday = async () => {
        if (isClaimedToday || isClaiming) return;

        const dayConfig = STREAK_DAYS[currentStreakDay - 1];
        if (dayConfig.isLootBox) {
            setShowLootBox(true);
            return;
        }

        setIsClaiming(true);
        sounds.playStreak(streak);

        try {
            const res = await api.claimDailyStreak();
            localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
            onClaimStreak({
                coins: res.rewards?.coins ?? dayConfig.coins,
                xp: res.rewards?.xp ?? dayConfig.xp,
                powerUp: res.rewards?.powerUp ?? dayConfig.powerUp
            });
        } catch (err) {
            console.warn('Backend streak claim fallback to client state:', err);
            localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
            onClaimStreak({
                coins: dayConfig.coins,
                xp: dayConfig.xp,
                powerUp: dayConfig.powerUp
            });
        } finally {
            setIsClaiming(false);
        }
    };

    const handleLootBoxClaim = async (loot: LootReward) => {
        setIsClaiming(true);
        sounds.playStreak(streak);

        try {
            const res = await api.claimDailyStreak();
            localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
            setShowLootBox(false);
            onClaimStreak({
                coins: res.rewards?.coins ?? (loot.type === 'coins' ? loot.amount : 50),
                xp: res.rewards?.xp ?? (loot.type === 'xp' ? loot.amount : 100),
                powerUp: res.rewards?.powerUp ?? (loot.type === 'powerup' ? 'hint' : undefined)
            });
        } catch {
            localStorage.setItem(`streak_claimed_${user.userId}`, new Date().toISOString());
            setShowLootBox(false);
            onClaimStreak({
                coins: loot.type === 'coins' ? loot.amount : 50,
                xp: loot.type === 'xp' ? loot.amount : 100,
                powerUp: loot.type === 'powerup' ? 'hint' : undefined
            });
        } finally {
            setIsClaiming(false);
        }
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
                        <span className={`text-xs font-bold ${isBento ? 'text-black' : 'text-gray-500'}`}>
                            Current Streak: <span className="text-orange-500 font-black">{streak} Day{streak !== 1 ? 's' : ''}</span>
                        </span>

                        <button
                            type="button"
                            onClick={handleClaimToday}
                            disabled={isClaimedToday}
                            className={`px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                isBento
                                    ? isClaimedToday
                                        ? 'bg-gray-100 text-gray-500 border-2 border-black/30 cursor-default shadow-none'
                                        : 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : isClaimedToday
                                        ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-default shadow-none'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25'
                            }`}
                        >
                            {isClaimedToday ? '✓ Claimed Today' : 'Claim Day Reward'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-5">
                    {/* Streak Highlight Banner */}
                    <div className={`p-4 rounded-xl flex items-center justify-between ${
                        isBento
                            ? 'bg-[#fff7ed] border-2 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${
                                isBento
                                    ? 'bg-[#fed7aa] border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-orange-500/20 text-orange-500'
                            }`}>
                                🔥
                            </div>
                            <div>
                                <h3 className={`text-sm sm:text-base font-black uppercase tracking-tight ${
                                    isBento ? 'text-black' : 'text-gray-900 dark:text-white'
                                }`}>
                                    {streak} Day Streak!
                                </h3>
                                <p className={`text-xs font-medium ${
                                    isBento ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    Log in every day to claim all 7 rewards without resetting.
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className={`px-2.5 py-1 rounded-md font-black text-[11px] uppercase tracking-wider ${
                                isBento
                                    ? 'bg-black text-[#bef264] border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-orange-500 text-white'
                            }`}>
                                Day {currentStreakDay} / 7
                            </span>
                        </div>
                    </div>

                    {/* 7-Day Calendar Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {STREAK_DAYS.map((d) => {
                            const isPast = d.day < currentStreakDay;
                            const isToday = d.day === currentStreakDay;

                            return (
                                <div
                                    key={d.day}
                                    className={`p-3 rounded-lg flex flex-col items-center justify-between text-center transition-all min-h-[110px] ${
                                        isToday
                                            ? isBento
                                                ? 'bg-[#fed7aa] border-2 border-black shadow-[3px_3px_0px_#000] z-10 text-black'
                                                : 'bg-gradient-to-b from-orange-500/20 to-amber-500/10 border-2 border-orange-500 ring-2 ring-orange-500/40 shadow-md shadow-orange-500/20 z-10'
                                            : isPast
                                                ? isBento
                                                    ? 'bg-[#dcfce7] border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                                                    : 'bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/20'
                                                : isBento
                                                    ? 'bg-white border-2 border-black/40 text-black/70'
                                                    : 'bg-white/60 dark:bg-black/20 border border-gray-200 dark:border-white/5 opacity-70'
                                    }`}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                        isToday
                                            ? isBento ? 'text-black' : 'text-orange-600 dark:text-orange-400'
                                            : isPast
                                                ? isBento ? 'text-emerald-800' : 'text-emerald-600 dark:text-emerald-400'
                                                : isBento ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        Day {d.day}
                                    </span>

                                    <div className="text-3xl my-1.5">{d.icon}</div>

                                    <div className={`text-[10px] font-black leading-tight ${isBento ? 'text-black' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {d.label}
                                    </div>

                                    {isPast && (
                                        <div className={`mt-1 flex items-center gap-0.5 text-[9px] font-black uppercase ${isBento ? 'text-emerald-800' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            <Check className="w-2.5 h-2.5" /> Claimed
                                        </div>
                                    )}

                                    {isToday && (
                                        <div className={`mt-1 text-[9px] font-black uppercase ${isBento ? 'text-black' : 'text-orange-600 dark:text-orange-400'}`}>
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
