import React, { useState } from 'react';
import { Zap, ArrowLeft } from 'lucide-react';
import { sounds } from '../../lib/soundEffects';

interface LivePlayerControllerProps {
    onBack: () => void;
}

export const LivePlayerController: React.FC<LivePlayerControllerProps> = ({ onBack }) => {
    const [step, setStep] = useState<'join' | 'game' | 'result'>('join');
    const [pin, setPin] = useState('');
    const [nickname, setNickname] = useState('');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);

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
        <div className="min-h-screen bg-[#0d0e1a] text-white flex flex-col items-center justify-center p-4">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                <button
                    type="button"
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {step !== 'join' && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase text-amber-300">
                            {score} pts
                        </span>
                        {streak > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-black">
                                🔥 {streak}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 1. JOIN SCREEN */}
            {step === 'join' && (
                <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <Zap className="w-8 h-8" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">
                            Live Game Pad
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Enter the 6-digit room PIN from the host projector screen
                        </p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="Game PIN (e.g. 482910)"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-white/10 border border-white/15 text-center text-2xl font-mono font-black tracking-widest text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />

                        <input
                            type="text"
                            maxLength={20}
                            placeholder="Your Nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full p-3.5 rounded-2xl bg-white/10 border border-white/15 text-center text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />

                        <button
                            type="submit"
                            disabled={pin.trim().length < 4 || !nickname.trim()}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition cursor-pointer"
                        >
                            Enter Arena
                        </button>
                    </form>
                </div>
            )}

            {/* 2. GAME CONTROLLER (4 Shapes) */}
            {step === 'game' && (
                <div className="w-full max-w-lg space-y-4 text-center animate-in fade-in duration-200">
                    <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                        Look at the Host screen &amp; tap your answer!
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 h-[60vh]">
                        {[
                            { color: 'bg-red-600 active:bg-red-700', shape: '▲', label: 'Option A' },
                            { color: 'bg-blue-600 active:bg-blue-700', shape: '◆', label: 'Option B' },
                            { color: 'bg-amber-500 active:bg-amber-600', shape: '●', label: 'Option C' },
                            { color: 'bg-emerald-600 active:bg-emerald-700', shape: '■', label: 'Option D' }
                        ].map((btn, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectOption(idx)}
                                disabled={selectedOption !== null}
                                className={`w-full h-full rounded-3xl ${btn.color} text-white flex flex-col items-center justify-center gap-2 text-4xl sm:text-5xl font-black shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-75`}
                            >
                                <span>{btn.shape}</span>
                                <span className="text-xs uppercase tracking-widest font-black opacity-80">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. RESULT FEEDBACK */}
            {step === 'result' && (
                <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 text-center animate-in zoom-in duration-200">
                    <div className="text-5xl animate-bounce">
                        {selectedOption === 0 || selectedOption === 1 ? '🎉' : '💥'}
                    </div>

                    <div>
                        <h3 className="text-2xl font-black">
                            {selectedOption === 0 || selectedOption === 1 ? 'Correct Answer!' : 'Incorrect'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            {selectedOption === 0 || selectedOption === 1 ? '+920 Speed Points Awarded' : 'Streak reset'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                        Ready for Next Question
                    </button>
                </div>
            )}
        </div>
    );
};

export default LivePlayerController;
