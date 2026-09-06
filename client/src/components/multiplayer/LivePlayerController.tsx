import React, { useState, useEffect } from 'react';
import { Gamepad2, X, Trophy, Flame, ArrowRight } from 'lucide-react';
import { sounds } from '../../lib/soundEffects';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface LivePlayerControllerProps {
    onBack?: () => void;
    onClose?: () => void;
}

export const LivePlayerController: React.FC<LivePlayerControllerProps> = ({ onBack, onClose }) => {
    const handleClose = onClose || onBack || (() => {});
    const { isBento } = useTheme();
    const { currentUser } = useAuth();

    const [step, setStep] = useState<'join' | 'game' | 'result'>('join');
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState(currentUser?.name || '');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);

    // Close on Escape key press & prevent background scrolling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClose]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.trim().length >= 4 && nickname.trim()) {
            sounds.playPowerUp();
            setStep('game');
        }
    };

    const handleSelectOption = (idx: number) => {
        if (selectedOption !== null) return;
        setSelectedOption(idx);

        const isCorrect = idx === 0 || idx === 1; // simulation
        if (isCorrect) {
            sounds.playCorrect();
            setScore(prev => prev + 920);
            setStreak(prev => prev + 1);
        } else {
            sounds.playIncorrect();
            setStreak(0);
        }

        setTimeout(() => {
            setStep('result');
        }, 800);
    };

    const handleNextQuestion = () => {
        setSelectedOption(null);
        setStep('game');
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
            onClick={(e) => {
                // Clicking outer backdrop closes modal
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            {/* 1. JOIN SCREEN */}
            {step === 'join' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[8px_8px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close Live Arena"
                        className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 z-20 ${
                            isBento
                                ? 'bg-[#fecdd3] hover:bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Close Arena (Esc)"
                    >
                        <X className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    {/* Header Badge & Title */}
                    <div className="text-center space-y-3 mb-6">
                        <div
                            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                                isBento
                                    ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                        >
                            <Gamepad2 className="w-8 h-8 stroke-[2.5]" />
                        </div>

                        <div>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border border-black'
                                            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                    }`}
                                >
                                    ⚡ Multiplayer Arena
                                </span>
                                <span
                                    className={`text-[10px] font-bold ${
                                        isBento ? 'text-black/60 font-mono' : 'text-slate-400'
                                    }`}
                                >
                                    Real-Time
                                </span>
                            </div>
                            <h2
                                className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                                    isBento ? 'font-mono text-black' : ''
                                }`}
                            >
                                Live Game Pad
                            </h2>
                            <p
                                className={`text-xs mt-1.5 max-w-xs mx-auto ${
                                    isBento ? 'text-slate-700 font-bold' : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                Enter the 6-digit room PIN from the host projector screen to duel.
                            </p>
                        </div>
                    </div>

                    {/* Form Inputs */}
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label
                                className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                                    isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                Room PIN
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                autoFocus
                                placeholder="Game PIN (e.g. 482910)"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className={`w-full p-3.5 rounded-2xl text-center text-2xl font-mono font-black tracking-widest transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] focus:bg-[#fef9c3] focus:outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:text-sm placeholder:font-bold'
                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400'
                                }`}
                            />
                        </div>

                        <div>
                            <label
                                className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${
                                    isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                Player Nickname
                            </label>
                            <input
                                type="text"
                                maxLength={20}
                                placeholder="Your Nickname"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className={`w-full p-3.5 rounded-2xl text-center text-sm font-bold transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] focus:shadow-[4.5px_4.5px_0px_#000] focus:outline-none placeholder:text-slate-400'
                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400'
                                }`}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={pin.trim().length < 4 || !nickname.trim()}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isBento
                                    ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'
                            }`}
                        >
                            <span>Enter Arena</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </button>

                        {/* Cancel Button */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer text-center ${
                                isBento
                                    ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            Cancel &amp; Return to Dashboard
                        </button>
                    </form>
                </div>
            )}

            {/* 2. GAME CONTROLLER (4 Shapes Pad) */}
            {step === 'game' && (
                <div
                    className={`relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[8px_8px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Controller Top Bar */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-1.5 border-black font-mono'
                                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                }`}
                            >
                                PIN: {pin}
                            </span>
                            <span
                                className={`text-xs font-bold truncate max-w-[120px] ${
                                    isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                👤 {nickname}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-1.5 border-black font-mono font-black text-xs shadow-[1.5px_1.5px_0px_#000]'
                                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold'
                                }`}
                            >
                                <Trophy className="w-3.5 h-3.5" />
                                <span>{score} pts</span>
                            </div>

                            {streak > 0 && (
                                <div
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                                        isBento
                                            ? 'bg-[#fed7aa] text-black border-1.5 border-black font-mono'
                                            : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600'
                                    }`}
                                >
                                    <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                    <span>{streak}</span>
                                </div>
                            )}

                            {/* Exit Button */}
                            <button
                                type="button"
                                onClick={handleClose}
                                className={`ml-2 p-1.5 rounded-lg flex items-center justify-center cursor-pointer transition active:scale-95 ${
                                    isBento
                                        ? 'bg-[#fecdd3] hover:bg-rose-300 text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300'
                                }`}
                                title="Leave Arena"
                            >
                                <X className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>
                    </div>

                    <div className="text-center mb-4">
                        <p
                            className={`text-xs font-black uppercase tracking-wider ${
                                isBento ? 'text-black/70 font-mono' : 'text-slate-400 dark:text-slate-400'
                            }`}
                        >
                            Look at the Host Screen &amp; Tap Your Answer:
                        </p>
                    </div>

                    {/* 4 Shapes Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 h-[320px] sm:h-[380px]">
                        {[
                            { color: isBento ? 'bg-[#f87171] hover:bg-[#ef4444]' : 'bg-red-500 hover:bg-red-600', shape: '▲', label: 'Option A' },
                            { color: isBento ? 'bg-[#60a5fa] hover:bg-[#3b82f6]' : 'bg-blue-500 hover:bg-blue-600', shape: '◆', label: 'Option B' },
                            { color: isBento ? 'bg-[#fde047] hover:bg-[#facc15]' : 'bg-amber-400 hover:bg-amber-500', shape: '●', label: 'Option C' },
                            { color: isBento ? 'bg-[#4ade80] hover:bg-[#22c55e]' : 'bg-emerald-500 hover:bg-emerald-600', shape: '■', label: 'Option D' }
                        ].map((btn, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectOption(idx)}
                                disabled={selectedOption !== null}
                                className={`w-full h-full rounded-2xl ${btn.color} ${
                                    isBento
                                        ? 'text-black border-2.5 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1.5px_1.5px_0px_#000]'
                                        : 'text-white shadow-lg active:scale-95'
                                } flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                <span className="text-4xl sm:text-5xl font-black">{btn.shape}</span>
                                <span className="text-[11px] uppercase tracking-widest font-black opacity-90">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. RESULT FEEDBACK SCREEN */}
            {step === 'result' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl text-center space-y-5 transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[8px_8px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                            isBento
                                ? 'bg-[#fecdd3] hover:bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Close Arena"
                    >
                        <X className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="text-6xl animate-bounce pt-2">
                        {selectedOption === 0 || selectedOption === 1 ? '🎉' : '💥'}
                    </div>

                    <div>
                        <h3
                            className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                isBento ? 'font-mono text-black' : ''
                            }`}
                        >
                            {selectedOption === 0 || selectedOption === 1 ? 'Correct Answer!' : 'Incorrect Choice'}
                        </h3>
                        <p
                            className={`text-sm mt-1.5 font-bold ${
                                selectedOption === 0 || selectedOption === 1
                                    ? isBento ? 'text-emerald-700 font-mono' : 'text-emerald-600 dark:text-emerald-400'
                                    : isBento ? 'text-rose-700 font-mono' : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            {selectedOption === 0 || selectedOption === 1
                                ? '+920 Speed Points Awarded'
                                : 'Streak Reset — Keep fighting!'}
                        </p>
                    </div>

                    {/* Score Tally Card */}
                    <div
                        className={`p-4 rounded-2xl flex items-center justify-around ${
                            isBento
                                ? 'bg-[#fef9c3] border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                        }`}
                    >
                        <div>
                            <div className="text-[10px] font-black uppercase text-slate-500">Total Score</div>
                            <div className="text-xl font-black font-mono">{score} pts</div>
                        </div>
                        <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
                        <div>
                            <div className="text-[10px] font-black uppercase text-slate-500">Current Streak</div>
                            <div className="text-xl font-black font-mono">🔥 {streak}</div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <button
                            type="button"
                            onClick={handleNextQuestion}
                            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                            }`}
                        >
                            Ready for Next Question
                        </button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                                isBento
                                    ? 'text-slate-600 hover:text-black hover:bg-slate-100'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            Leave Arena
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LivePlayerController;
