import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Play,
    Trophy,
    CheckCircle2,
    XCircle,
    Clock,
    Sparkles,
    ArrowRight,
    QrCode,
    RefreshCw,
    X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathRenderer } from '../common/MathRenderer';
import { sounds } from '../../lib/soundEffects';
import type { Quiz, Question } from '../../types';

interface LivePlayer {
    id: string;
    name: string;
    score: number;
    streak: number;
    lastAnswerCorrect?: boolean;
    lastAnswerPoints?: number;
}

interface LiveHostModeProps {
    quiz: Quiz;
    onClose: () => void;
}

export const LiveHostMode: React.FC<LiveHostModeProps> = ({
    quiz,
    onClose
}) => {
    // Generate 6-digit room PIN
    const [roomPin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
    const [gameState, setGameState] = useState<'lobby' | 'question' | 'reveal' | 'leaderboard' | 'game_over'>('lobby');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(25);
    const [players, setPlayers] = useState<LivePlayer[]>([
        { id: '1', name: 'Alex M.', score: 0, streak: 0 },
        { id: '2', name: 'Sara K.', score: 0, streak: 0 },
        { id: '3', name: 'David L.', score: 0, streak: 0 },
        { id: '4', name: 'Emma W.', score: 0, streak: 0 },
        { id: '5', name: 'Liam P.', score: 0, streak: 0 }
    ]);
    const [answerCounts, setAnswerCounts] = useState<number[]>([0, 0, 0, 0]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const questions = quiz.questions || [];
    const currentQ: Question | undefined = questions[currentQuestionIndex];

    // Simulated student answers during question phase
    useEffect(() => {
        if (gameState !== 'question') return;

        setTimeLeft(25);
        setAnswerCounts([0, 0, 0, 0]);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleRevealAnswers();
                    return 0;
                }
                if (prev <= 5) {
                    sounds.playTick();
                }
                return prev - 1;
            });
        }, 1000);

        // Simulate incoming student answers
        const timeout = setTimeout(() => {
            const counts = [
                Math.floor(Math.random() * 3) + 1,
                Math.floor(Math.random() * 4) + 2,
                Math.floor(Math.random() * 2),
                Math.floor(Math.random() * 2)
            ];
            setAnswerCounts(counts);
        }, 3000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            clearTimeout(timeout);
        };
    }, [gameState, currentQuestionIndex]);

    const handleStartGame = () => {
        sounds.playPowerUp();
        setGameState('question');
    };

    const handleRevealAnswers = () => {
        sounds.playStreak(3);
        setGameState('reveal');

        // Update mock player scores
        setPlayers(prev => prev.map((p, i) => {
            const isCorrect = i % 2 === 0;
            const points = isCorrect ? Math.floor(700 + Math.random() * 280) : 0;
            return {
                ...p,
                score: p.score + points,
                streak: isCorrect ? p.streak + 1 : 0,
                lastAnswerCorrect: isCorrect,
                lastAnswerPoints: points
            };
        }).sort((a, b) => b.score - a.score));
    };

    const handleShowLeaderboard = () => {
        sounds.playLevelUp();
        setGameState('leaderboard');
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setGameState('question');
        } else {
            setGameState('game_over');
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0c16] text-white font-sans overflow-y-auto">
            {/* Top Bar */}
            <div className="p-4 sm:p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-black uppercase tracking-wider">
                        {quiz.title}
                    </span>
                    <span className="text-xs text-gray-400 font-bold hidden sm:inline">
                        Live Classroom Host Arena
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-black tracking-widest text-amber-300">
                        PIN: {roomPin}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Stage Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 max-w-5xl mx-auto w-full">
                {/* 1. LOBBY PHASE */}
                {gameState === 'lobby' && (
                    <div className="w-full text-center space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="space-y-2">
                            <div className="text-xs font-black uppercase tracking-widest text-indigo-400">Join at this domain or scan QR</div>
                            <div className="text-4xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 font-mono">
                                {roomPin}
                            </div>
                        </div>

                        {/* Joined Players Roster */}
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 max-w-2xl mx-auto">
                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    Joined Students ({players.length})
                                </span>
                                <span className="text-emerald-400 animate-pulse">● Waiting for Host to start</span>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center">
                                {players.map(p => (
                                    <div
                                        key={p.id}
                                        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-sm font-black flex items-center gap-2 animate-in zoom-in"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs">
                                            {p.name.charAt(0)}
                                        </div>
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartGame}
                            className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            🚀 Launch Live Game (Start Question 1)
                        </button>
                    </div>
                )}

                {/* 2. QUESTION PHASE */}
                {gameState === 'question' && currentQ && (
                    <div className="w-full space-y-8 animate-in fade-in duration-200">
                        {/* Question Header & Timer */}
                        <div className="flex items-center justify-between gap-4">
                            <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs uppercase tracking-wider">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>

                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                                timeLeft <= 5
                                    ? 'bg-red-500 text-white border-red-400 animate-ping'
                                    : 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
                            }`}>
                                {timeLeft}
                            </div>
                        </div>

                        {/* Question Prompt */}
                        <div className="p-8 sm:p-12 rounded-3xl bg-white/5 border border-white/10 text-center shadow-2xl">
                            <MathRenderer text={currentQ.question} className="text-2xl sm:text-4xl font-black leading-tight text-white" />
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentQ.options?.map((opt, optIdx) => {
                                const colors = [
                                    'from-red-600 to-rose-600',
                                    'from-blue-600 to-cyan-600',
                                    'from-amber-500 to-yellow-500',
                                    'from-emerald-600 to-teal-600'
                                ];
                                const shapes = ['▲', '◆', '●', '■'];

                                return (
                                    <div
                                        key={optIdx}
                                        className={`p-6 rounded-3xl bg-gradient-to-r ${colors[optIdx % 4]} text-white flex items-center gap-4 shadow-xl`}
                                    >
                                        <span className="w-10 h-10 rounded-2xl bg-black/25 flex items-center justify-center font-black text-lg shrink-0">
                                            {shapes[optIdx % 4]}
                                        </span>
                                        <MathRenderer text={opt} className="text-lg sm:text-xl font-bold flex-1 text-left leading-snug" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. REVEAL PHASE */}
                {gameState === 'reveal' && currentQ && (
                    <div className="w-full space-y-8 animate-in zoom-in duration-300">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Answer Breakdown</span>
                            <h3 className="text-2xl sm:text-3xl font-black text-white">
                                Student Answer Distribution
                            </h3>
                        </div>

                        {/* Answer Distribution Bar Chart */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {currentQ.options?.map((opt, optIdx) => {
                                const isCorrect = optIdx === Number(currentQ.correctAnswer);
                                const count = answerCounts[optIdx] || 0;

                                return (
                                    <div
                                        key={optIdx}
                                        className={`p-5 rounded-3xl border flex flex-col justify-between items-center text-center gap-3 transition-all ${
                                            isCorrect
                                                ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20'
                                                : 'bg-white/5 border-white/10 opacity-70'
                                        }`}
                                    >
                                        <div className="text-2xl font-black">{count} Students</div>
                                        <div className="w-full bg-white/10 h-24 rounded-2xl flex items-end p-2 overflow-hidden">
                                            <div
                                                className={`w-full rounded-xl transition-all duration-700 ${isCorrect ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                                style={{ height: `${Math.max(15, count * 25)}%` }}
                                            />
                                        </div>
                                        <div className="text-xs font-bold truncate max-w-full">
                                            {isCorrect ? '✓ Correct Answer' : `Option ${String.fromCharCode(65 + optIdx)}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Next Action */}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleShowLeaderboard}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                View Live Leaderboard Podium →
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. LEADERBOARD PODIUM */}
                {gameState === 'leaderboard' && (
                    <div className="w-full max-w-xl space-y-6 text-center animate-in zoom-in duration-300">
                        <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-widest text-amber-300">Top Performers</div>
                            <h3 className="text-3xl font-black text-white">Live Room Standings</h3>
                        </div>

                        <div className="space-y-3">
                            {players.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                        idx === 0
                                            ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500 text-amber-300'
                                            : 'bg-white/5 border-white/10 text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm">
                                            #{idx + 1}
                                        </span>
                                        <span className="font-black text-base">{p.name}</span>
                                        {p.streak > 1 && (
                                            <span className="text-xs font-bold text-orange-400">
                                                🔥 {p.streak}
                                            </span>
                                        )}
                                    </div>

                                    <div className="font-black text-lg">
                                        {p.score} pts
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleNextQuestion}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Final Victory Podium 🏆'}
                        </button>
                    </div>
                )}

                {/* 5. FINAL PODIUM / GAME OVER */}
                {gameState === 'game_over' && (
                    <div className="w-full text-center space-y-8 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
                            <Trophy className="w-12 h-12" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                                Live Quiz Champion!
                            </h2>
                            <p className="text-sm text-gray-400">
                                Congratulations to <span className="text-amber-300 font-bold">{players[0]?.name}</span> for taking 1st place!
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                        >
                            Close Live Arena
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveHostMode;
