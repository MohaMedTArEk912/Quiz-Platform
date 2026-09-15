import React, { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/soundEffects';
import { useTheme } from '../../context/ThemeContext';

export interface LootReward {
    type: 'coins' | 'xp' | 'powerup' | 'badge';
    label: string;
    amount?: number;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface MysteryLootBoxProps {
    onClaimReward: (reward: LootReward) => void;
    onClose: () => void;
}

const POSSIBLE_REWARDS: LootReward[] = [
    { type: 'coins', label: '150 Gold Coins', amount: 150, icon: '🪙', rarity: 'rare' },
    { type: 'xp', label: '300 Bonus XP', amount: 300, icon: '⚡', rarity: 'rare' },
    { type: 'powerup', label: '2x Time Freeze Power-Ups', amount: 2, icon: '⏳', rarity: 'epic' },
    { type: 'coins', label: '500 Mega Gold Coins', amount: 500, icon: '💰', rarity: 'legendary' },
    { type: 'powerup', label: '3x Hint & 50/50 Power-Ups', amount: 3, icon: '💡', rarity: 'legendary' }
];

export const MysteryLootBox: React.FC<MysteryLootBoxProps> = ({
    onClaimReward,
    onClose
}) => {
    const { isBento } = useTheme();
    const [boxState, setBoxState] = useState<'closed' | 'opening' | 'opened'>('closed');
    const [reward, setReward] = useState<LootReward | null>(null);

    const handleOpen = () => {
        if (boxState !== 'closed') return;
        setBoxState('opening');

        sounds.playPowerUp();

        setTimeout(() => {
            const picked = POSSIBLE_REWARDS[Math.floor(Math.random() * POSSIBLE_REWARDS.length)];
            setReward(picked);
            setBoxState('opened');
            sounds.playLootboxOpen();

            confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.6 }
            });
        }, 1200);
    };

    const handleClaim = () => {
        if (reward) {
            onClaimReward(reward);
        }
        onClose();
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 ${
            isBento ? 'bg-black/60' : 'bg-black/80 backdrop-blur-xl'
        }`}>
            <div className={`relative w-full max-w-md p-8 text-center overflow-hidden transition-all ${
                isBento
                    ? 'bg-white text-black rounded-2xl border-[3px] border-black shadow-[8px_8px_0px_#000]'
                    : 'bg-gradient-to-b from-[#18192b] via-[#111222] to-[#0a0a14] rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 text-white'
            }`}>
                {/* Background Aura */}
                {!isBento && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-full blur-[90px] pointer-events-none" />
                )}

                {boxState === 'closed' && (
                    <div className="space-y-6 relative z-10">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isBento
                                ? 'bg-[#fde047] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                : 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                        }`}>
                            <Sparkles className="w-3 h-3" />
                            Mythic Streak Reward
                        </div>

                        <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${isBento ? 'text-black' : 'text-white'}`}>
                            Mystery Loot Box
                        </h2>
                        <p className={`text-xs ${isBento ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'}`}>
                            Tap the chest below to crack open your streak rewards!
                        </p>

                        {/* Interactive Chest */}
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="group relative block mx-auto py-6 cursor-pointer focus:outline-none"
                        >
                            {isBento ? (
                                <div className="w-32 h-32 mx-auto rounded-2xl bg-[#bef264] border-[3px] border-black shadow-[6px_6px_0px_#000] flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform animate-bounce">
                                    <Gift className="w-16 h-16 text-black" />
                                </div>
                            ) : (
                                <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-1 shadow-2xl shadow-purple-500/40 group-hover:scale-110 group-active:scale-95 transition-transform animate-bounce">
                                    <div className="w-full h-full bg-[#131424] rounded-[22px] flex items-center justify-center border border-white/15">
                                        <Gift className="w-16 h-16 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                                    </div>
                                </div>
                            )}
                            <span className={`inline-block mt-4 text-xs font-black uppercase tracking-widest ${
                                isBento ? 'text-black' : 'text-amber-300 group-hover:text-amber-200'
                            }`}>
                                🎁 Tap to Unlock!
                            </span>
                        </button>
                    </div>
                )}

                {boxState === 'opening' && (
                    <div className="py-12 space-y-6 relative z-10">
                        {isBento ? (
                            <div className="w-32 h-32 mx-auto rounded-2xl bg-[#fde047] border-[3px] border-black shadow-[6px_6px_0px_#000] p-1 animate-spin flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-black" />
                            </div>
                        ) : (
                            <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-purple-600 to-indigo-600 p-1 animate-spin shadow-2xl shadow-amber-500/50">
                                <div className="w-full h-full bg-[#131424] rounded-[22px] flex items-center justify-center">
                                    <Sparkles className="w-16 h-16 text-amber-300 animate-pulse" />
                                </div>
                            </div>
                        )}
                        <h3 className={`text-lg font-black uppercase tracking-wider animate-pulse ${isBento ? 'text-black' : 'text-white'}`}>
                            Cracking Mystery Vault...
                        </h3>
                    </div>
                )}

                {boxState === 'opened' && reward && (
                    <div className="space-y-6 relative z-10 animate-in zoom-in duration-300">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isBento
                                ? 'bg-[#bef264] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                        }`}>
                            <Sparkles className="w-3 h-3" />
                            {reward.rarity.toUpperCase()} REWARD UNLOCKED
                        </div>

                        {/* Reward Card */}
                        <div className={`p-6 space-y-3 ${
                            isBento
                                ? 'bg-[#f5f3ec] border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000]'
                                : 'rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 shadow-2xl'
                        }`}>
                            <div className="text-5xl">{reward.icon}</div>
                            <h3 className={`text-2xl font-black ${isBento ? 'text-black' : 'text-white'}`}>
                                {reward.label}
                            </h3>
                            <p className={`text-xs ${isBento ? 'text-gray-700 font-bold' : 'text-gray-400'}`}>
                                Added to your student inventory &amp; wallet balance!
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleClaim}
                            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30'
                            }`}
                        >
                            Claim Reward &amp; Continue
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MysteryLootBox;
