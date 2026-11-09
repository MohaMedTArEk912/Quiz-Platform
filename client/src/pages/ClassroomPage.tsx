import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Gamepad2, ArrowRight, ArrowLeft, Users, Play } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import LivePlayerController from '../components/multiplayer/LivePlayerController';
import LiveHostMode from '../components/multiplayer/LiveHostMode';
import type { Quiz } from '../types';

export const ClassroomPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const pinParam = searchParams.get('pin') || '';
    const navigate = useNavigate();
    const { isBento } = useTheme();
    const { availableQuizzes } = useData();

    const [isPlayerOpen, setIsPlayerOpen] = useState(!!pinParam);
    const [selectedPin, setSelectedPin] = useState(pinParam);
    const [hostQuiz, setHostQuiz] = useState<Quiz | null>(null);
    const [enteredPin, setEnteredPin] = useState('');

    React.useEffect(() => {
        if (pinParam) {
            setSelectedPin(pinParam);
            setIsPlayerOpen(true);
        }
    }, [pinParam]);

    const handleJoinWithPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (enteredPin.trim().length >= 4) {
            setSelectedPin(enteredPin.trim());
            setIsPlayerOpen(true);
        }
    };

    return (
        <div className={`min-h-screen py-10 px-4 sm:px-6 max-w-6xl mx-auto transition-colors ${
            isBento
                ? 'bg-[#fafafa] text-black font-sans'
                : 'text-slate-900 dark:text-white'
        }`}>
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition active:scale-95 ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'
                    }`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isBento
                            ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                        ● Real-Time Ready
                    </span>
                </div>
            </div>

            {/* Hero Banner */}
            <div className={`p-8 sm:p-12 rounded-3xl border mb-10 transition-all ${
                isBento
                    ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_#000]'
                    : 'bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900/60 border-indigo-500/30 shadow-2xl backdrop-blur-xl'
            }`}>
                <div className="max-w-2xl space-y-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            isBento
                                ? 'bg-[#93c5fd] text-black border border-black'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                            Interactive Multiplayer Mode
                        </span>
                    </div>

                    <h1 className={`text-3xl sm:text-5xl font-black uppercase tracking-tight ${
                        isBento ? 'font-mono text-black' : 'text-slate-900 dark:text-white'
                    }`}>
                        Live Classroom Arena
                    </h1>

                    <p className={`text-sm sm:text-base leading-relaxed ${
                        isBento ? 'text-slate-700 font-bold' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                        Duel in real-time turn-based multiplayer. Host a quiz session on your projector or screen, share your 6-digit room PIN or direct invite link, and take synchronized turns answering questions!
                    </p>
                </div>
            </div>

            {/* Two Action Panels: Join with PIN vs Host New Session */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
                {/* Panel 1: Enter Game PIN */}
                <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                    isBento
                        ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_#000]'
                        : 'glass-card border-slate-200 dark:border-white/10 shadow-xl'
                }`}>
                    <div className="space-y-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isBento
                                ? 'bg-[#fde047] text-black border-2 border-black'
                                : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            <Gamepad2 className="w-6 h-6 stroke-[2.5]" />
                        </div>

                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                Join as Student / Duelist
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Have a PIN from your teacher or opponent? Enter below to jump directly into their live room.
                            </p>
                        </div>

                        <form onSubmit={handleJoinWithPin} className="space-y-3 pt-2">
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="Enter 6-Digit PIN..."
                                value={enteredPin}
                                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                                className={`w-full p-3.5 rounded-2xl text-center text-xl font-mono font-black tracking-widest transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black focus:bg-[#fef9c3]'
                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                }`}
                            />

                            <button
                                type="submit"
                                disabled={enteredPin.trim().length < 4}
                                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isBento
                                        ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                                }`}
                            >
                                <span>Join Room</span>
                                <ArrowRight className="w-4 h-4 stroke-[3]" />
                            </button>
                        </form>
                    </div>

                    <div className="pt-6 border-t border-black/10 dark:border-white/10 mt-6 flex items-center justify-between text-xs text-slate-500">
                        <span>⚡ Supports mobile phone controller</span>
                        <span>Turn-based sync</span>
                    </div>
                </div>

                {/* Panel 2: Host a Classroom Duel */}
                <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                    isBento
                        ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_#000]'
                        : 'glass-card border-slate-200 dark:border-white/10 shadow-xl'
                }`}>
                    <div className="space-y-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isBento
                                ? 'bg-[#93c5fd] text-black border-2 border-black'
                                : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                            <Users className="w-6 h-6 stroke-[2.5]" />
                        </div>

                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                Host a Live Classroom
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Launch any quiz as a live session. Pick one of your available quizzes below to start hosting.
                            </p>
                        </div>

                        {/* Quick Quizzes List to Host */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {availableQuizzes.slice(0, 4).map(quiz => (
                                <div
                                    key={quiz.id || quiz._id}
                                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                        isBento
                                            ? 'bg-slate-50 border border-black/20 hover:bg-[#fef9c3]'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    } transition cursor-pointer`}
                                    onClick={() => setHostQuiz(quiz)}
                                >
                                    <div className="min-w-0">
                                        <div className="text-xs font-black truncate">{quiz.title}</div>
                                        <div className="text-[10px] text-slate-500">{quiz.questions?.length || 0} Questions</div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHostQuiz(quiz);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                                            isBento
                                                ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        }`}
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Host</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-black/10 dark:border-white/10 mt-6 flex items-center justify-between text-xs text-slate-500">
                        <span>🎯 Generates 6-Digit PIN</span>
                        <span>Invite link ready</span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isPlayerOpen && (
                <LivePlayerController
                    initialPin={selectedPin}
                    onClose={() => setIsPlayerOpen(false)}
                    onBack={() => setIsPlayerOpen(false)}
                />
            )}

            {hostQuiz && (
                <LiveHostMode
                    quiz={hostQuiz}
                    onClose={() => setHostQuiz(null)}
                />
            )}
        </div>
    );
};

export default ClassroomPage;
