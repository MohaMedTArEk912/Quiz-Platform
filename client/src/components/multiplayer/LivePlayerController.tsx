import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gamepad2, X, Trophy, Flame, ArrowRight, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/soundEffects';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface LivePlayerControllerProps {
    onBack?: () => void;
    onClose?: () => void;
    initialPin?: string;
}

interface PeerRosterItem {
    id: string;
    name: string;
    score: number;
    streak: number;
}

interface ClassroomQuestion {
    id: string | number;
    question: string;
    options: string[];
    correctAnswer: string | number;
    points?: number;
}

interface ClassroomQuizData {
    id: string;
    title: string;
    totalQuestions: number;
    questions?: ClassroomQuestion[];
}

export const LivePlayerController: React.FC<LivePlayerControllerProps> = ({
    onBack,
    onClose,
    initialPin
}) => {
    const handleClose = useCallback(() => {
        if (onClose) onClose();
        else if (onBack) onBack();
    }, [onClose, onBack]);

    const { isBento } = useTheme();
    const { currentUser } = useAuth();
    const { socket } = useSocket();
    const [searchParams] = useSearchParams();
    const urlPin = searchParams?.get('pin') || '';

    const [step, setStep] = useState<'join' | 'waiting_lobby' | 'game' | 'result' | 'game_over'>('join');
    const [pin, setPin] = useState(initialPin || urlPin || '');
    const [nickname, setNickname] = useState(currentUser?.name || '');
    const [myUserId] = useState(() => currentUser?.userId || `player_${Math.floor(1000 + Math.random() * 9000)}`);

    // Turn-Based Game State
    const [quizData, setQuizData] = useState<ClassroomQuizData | null>(null);
    const [currentTurnUserId, setCurrentTurnUserId] = useState<string>('');
    const [opponentName, setOpponentName] = useState<string>('Host');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(25);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [, setPlayers] = useState<PeerRosterItem[]>([]);
    const [lastTurnResult, setLastTurnResult] = useState<{
        userId: string;
        userName: string;
        isCorrect: boolean;
        points: number;
        answerIndex?: number;
        timedOut?: boolean;
    } | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isMyTurn = currentTurnUserId === myUserId;
    const currentQ = quizData?.questions?.[currentQuestionIndex];

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

    // Socket listeners for real-time classroom sync
    useEffect(() => {
        if (!socket) return;

        const handleStateSync = (data: {
            players?: PeerRosterItem[];
            currentTurnUserId?: string;
            currentQuestionIndex?: number;
            gameState?: string;
            quizData?: ClassroomQuizData;
        }) => {
            if (data.quizData) {
                setQuizData(data.quizData);
            }
            if (data.players) {
                setPlayers(data.players);
                const other = data.players.find(p => p.id !== myUserId);
                if (other) setOpponentName(other.name);
            }
            if (data.currentTurnUserId) {
                setCurrentTurnUserId(data.currentTurnUserId);
            }
            if (typeof data.currentQuestionIndex === 'number') {
                setCurrentQuestionIndex(data.currentQuestionIndex);
            }
            if (data.gameState === 'question' && step === 'waiting_lobby') {
                setStep('game');
                setTimeLeft(25);
            }
        };

        const handleGameStarted = (data: { currentTurnUserId?: string; currentQuestionIndex?: number; quizData?: ClassroomQuizData }) => {
            if (data.quizData) setQuizData(data.quizData);
            if (data.currentTurnUserId) setCurrentTurnUserId(data.currentTurnUserId);
            if (typeof data.currentQuestionIndex === 'number') setCurrentQuestionIndex(data.currentQuestionIndex);
            sounds.playPowerUp();
            setStep('game');
            setTimeLeft(25);
        };

        const handleTurnResult = (data: {
            userId: string;
            userName: string;
            isCorrect: boolean;
            points: number;
            answerIndex?: number;
            timedOut?: boolean;
            players?: PeerRosterItem[];
        }) => {
            setLastTurnResult({
                userId: data.userId,
                userName: data.userName,
                isCorrect: data.isCorrect,
                points: data.points,
                answerIndex: data.answerIndex,
                timedOut: data.timedOut
            });

            if (data.players) {
                setPlayers(data.players);
                const me = data.players.find(p => p.id === myUserId);
                if (me) {
                    setScore(me.score);
                    setStreak(me.streak);
                }
            }

            if (data.userId === myUserId) {
                if (data.isCorrect) sounds.playCorrect();
                else sounds.playIncorrect();
            }

            setStep('result');
        };

        const handleTurnAdvanced = (data: {
            nextTurnUserId: string;
            nextQuestionIndex: number;
            isGameOver?: boolean;
            players?: PeerRosterItem[];
            quizData?: ClassroomQuizData;
        }) => {
            if (data.quizData) setQuizData(data.quizData);
            if (data.isGameOver) {
                setStep('game_over');
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
            } else {
                setCurrentTurnUserId(data.nextTurnUserId);
                setCurrentQuestionIndex(data.nextQuestionIndex);
                setSelectedOption(null);
                setLastTurnResult(null);
                setTimeLeft(25);
                setStep('game');
            }
            if (data.players) setPlayers(data.players);
        };

        socket.on('classroom_state_sync', handleStateSync);
        socket.on('classroom_game_started', handleGameStarted);
        socket.on('classroom_turn_result', handleTurnResult);
        socket.on('classroom_turn_advanced', handleTurnAdvanced);

        return () => {
            socket.off('classroom_state_sync', handleStateSync);
            socket.off('classroom_game_started', handleGameStarted);
            socket.off('classroom_turn_result', handleTurnResult);
            socket.off('classroom_turn_advanced', handleTurnAdvanced);
        };
    }, [socket, myUserId, step]);

    // Turn countdown timer during question phase
    useEffect(() => {
        if (step !== 'game') return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    // If it is active player's turn and no option selected, trigger timeout submission
                    if (isMyTurn && selectedOption === null) {
                        setSelectedOption(-1);
                        sounds.playIncorrect();
                        if (socket) {
                            socket.emit('classroom_submit_turn', {
                                pin,
                                userId: myUserId,
                                userName: nickname,
                                questionIndex: currentQuestionIndex,
                                answerIndex: -1,
                                isCorrect: false,
                                points: 0,
                                timedOut: true
                            });
                        }
                    }
                    return 0;
                }
                if (prev <= 5) {
                    sounds.playTick();
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, currentQuestionIndex, isMyTurn, selectedOption, socket, pin, myUserId, nickname]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.trim().length >= 4 && nickname.trim()) {
            sounds.playPowerUp();
            if (socket) {
                socket.emit('join_classroom', {
                    pin: pin.trim(),
                    user: { id: myUserId, name: nickname.trim() }
                });
            }
            setStep('waiting_lobby');
        }
    };

    const handleSelectOption = (idx: number) => {
        if (!isMyTurn || selectedOption !== null) return;
        setSelectedOption(idx);

        const isCorrect = currentQ && currentQ.correctAnswer !== undefined
            ? idx === Number(currentQ.correctAnswer)
            : (idx === 0 || idx === 1);
        const speedPoints = isCorrect ? Math.floor(700 + (timeLeft * 10)) : 0;

        if (socket) {
            socket.emit('classroom_submit_turn', {
                pin,
                userId: myUserId,
                userName: nickname,
                questionIndex: currentQuestionIndex,
                answerIndex: idx,
                isCorrect,
                points: speedPoints,
                timedOut: false
            });
        } else {
            // Local fallback simulation
            if (isCorrect) {
                sounds.playCorrect();
                setScore(prev => prev + speedPoints);
                setStreak(prev => prev + 1);
            } else {
                sounds.playIncorrect();
                setStreak(0);
            }
            setLastTurnResult({
                userId: myUserId,
                userName: nickname,
                isCorrect,
                points: speedPoints
            });
            setTimeout(() => {
                setStep('result');
            }, 600);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/30 dark:bg-black/45 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* 1. JOIN SCREEN */}
            {step === 'join' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleClose}
                        className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95 z-20 ${
                            isBento
                                ? 'bg-[#fecdd3] hover:bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300'
                        }`}
                        title="Close Arena (Esc)"
                    >
                        <X className="w-5 h-5 stroke-[2.5]" />
                    </button>

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
                                    ⚡ Interactive Classroom
                                </span>
                                <span className={`text-[10px] font-bold ${isBento ? 'text-black/60 font-mono' : 'text-slate-400'}`}>
                                    Turn-Based Duel
                                </span>
                            </div>
                            <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${isBento ? 'font-mono text-black' : ''}`}>
                                Join Live Duel
                            </h2>
                            <p className={`text-xs mt-1 max-w-xs mx-auto ${isBento ? 'text-slate-700 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                Enter the 6-digit PIN from the host or link to enter.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'}`}>
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
                                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] focus:bg-[#fef9c3] focus:outline-none placeholder:text-slate-400'
                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400'
                                }`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-1.5 ${isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'}`}>
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
                                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] focus:outline-none'
                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none'
                                }`}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={pin.trim().length < 4 || !nickname.trim()}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px]'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'
                            }`}
                        >
                            <span>Enter Classroom Duel</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </button>
                    </form>
                </div>
            )}

            {/* 2. WAITING IN LOBBY */}
            {step === 'waiting_lobby' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl text-center space-y-6 transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-3xl animate-pulse">
                        ⏳
                    </div>
                    <div>
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-amber-400/20 text-amber-500 border border-amber-400/30">
                            PIN: {pin}
                        </span>
                        <h3 className="text-2xl font-black mt-3">You're in the Lobby!</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Waiting for the host to launch Question 1...
                        </p>
                    </div>

                    <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2">
                        <div className="text-xs font-black uppercase text-gray-400">Classroom Duel Rules</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Participants take turns answering questions. On your turn, tap your answer before the timer expires!
                        </p>
                    </div>

                    {/* Simulation button if testing without host */}
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentTurnUserId(myUserId);
                            setStep('game');
                        }}
                        className="text-xs text-indigo-400 hover:underline font-bold"
                    >
                        [Solo Practice] Start Game Immediately →
                    </button>
                </div>
            )}

            {/* 3. GAME CONTROLLER WITH PROMINENT TURN BANNER */}
            {step === 'game' && (
                <div
                    className={`relative w-full max-w-2xl p-6 sm:p-8 rounded-2xl transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Bar with score & streak */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                Q{currentQuestionIndex + 1}
                            </span>
                            <span className="text-xs font-bold truncate max-w-[120px]">
                                👤 {nickname}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>{score} pts</span>
                            </div>

                            {streak > 0 && (
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-100 dark:bg-orange-500/20 text-orange-600">
                                    <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                                    <span>{streak}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleClose}
                                className="ml-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 cursor-pointer"
                                title="Leave Arena"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* PROMINENT VISUAL TURN BANNER */}
                    <div className={`p-4 rounded-xl border mb-5 flex items-center justify-between gap-3 shadow-md transition-all ${
                        isMyTurn
                            ? isBento
                                ? 'bg-[#bef264] border-2 border-black text-black'
                                : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 ring-2 ring-emerald-500/20'
                            : isBento
                                ? 'bg-[#fef08a] border-2 border-black text-black'
                                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${
                                isMyTurn ? 'bg-emerald-500 text-white animate-bounce' : 'bg-amber-500/30 text-amber-300'
                            }`}>
                                {isMyTurn ? '🎯' : '⏳'}
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                                    {isMyTurn ? 'Active Turn' : 'Spectating Turn'}
                                </div>
                                <div className="text-sm sm:text-base font-black">
                                    {isMyTurn
                                        ? '🎯 Your Turn to Answer!'
                                        : `⏳ Waiting for ${opponentName} to answer...`}
                                </div>
                            </div>
                        </div>

                        <div className="px-3 py-1 rounded-lg font-mono font-black text-base border bg-black/10 dark:bg-white/10 shrink-0">
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Question Prompt */}
                    <div className={`p-5 sm:p-7 rounded-2xl border text-center shadow-lg mb-5 transition-all ${
                        isBento
                            ? 'bg-[#f8fafc] border-2 border-black text-black'
                            : 'bg-white/5 border-white/10 text-white'
                    }`}>
                        <div className="text-[11px] font-black uppercase tracking-wider text-indigo-400 mb-1.5">
                            Question {currentQuestionIndex + 1} {quizData?.questions?.length ? `of ${quizData.questions.length}` : ''}
                        </div>
                        <h3 className="text-base sm:text-xl font-black leading-snug">
                            {currentQ ? currentQ.question : `Waiting for Question ${currentQuestionIndex + 1}...`}
                        </h3>
                    </div>

                    {/* Options Grid (Active vs Read-Only Spectator) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-h-[220px]">
                        {(currentQ?.options && currentQ.options.length > 0
                            ? currentQ.options.map((optText, idx) => ({
                                color: isBento
                                    ? ['bg-[#f87171] hover:bg-[#ef4444]', 'bg-[#60a5fa] hover:bg-[#3b82f6]', 'bg-[#fde047] hover:bg-[#facc15]', 'bg-[#4ade80] hover:bg-[#22c55e]'][idx % 4]
                                    : ['bg-red-500 hover:bg-red-600', 'bg-blue-500 hover:bg-blue-600', 'bg-amber-500 hover:bg-amber-600', 'bg-emerald-500 hover:bg-emerald-600'][idx % 4],
                                shape: ['▲', '◆', '●', '■'][idx % 4],
                                label: optText
                            }))
                            : [
                                { color: isBento ? 'bg-[#f87171]' : 'bg-red-500', shape: '▲', label: 'Option A' },
                                { color: isBento ? 'bg-[#60a5fa]' : 'bg-blue-500', shape: '◆', label: 'Option B' },
                                { color: isBento ? 'bg-[#fde047]' : 'bg-amber-400', shape: '●', label: 'Option C' },
                                { color: isBento ? 'bg-[#4ade80]' : 'bg-emerald-500', shape: '■', label: 'Option D' }
                            ]
                        ).map((btn, idx) => {
                            const isSelected = selectedOption === idx;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={!isMyTurn || selectedOption !== null}
                                    onClick={() => handleSelectOption(idx)}
                                    className={`w-full min-h-[56px] sm:min-h-[64px] p-4 rounded-xl ${btn.color} ${
                                        isBento
                                            ? 'text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px]'
                                            : 'text-white shadow-lg active:scale-95'
                                    } flex items-center justify-between gap-3 text-left transition-all ${
                                        isSelected ? 'ring-4 ring-white shadow-2xl scale-[1.02]' : ''
                                    } ${
                                        isMyTurn
                                            ? 'cursor-pointer hover:scale-[1.01]'
                                            : 'cursor-not-allowed opacity-60 grayscale-[25%]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-black text-sm shrink-0">
                                            {btn.shape}
                                        </span>
                                        <span className="text-xs sm:text-sm font-black leading-snug break-words">
                                            {btn.label}
                                        </span>
                                    </div>
                                    {!isMyTurn && (
                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/40 text-amber-200 shrink-0">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Spectating</span>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. REAL-TIME FEEDBACK SCREEN */}
            {step === 'result' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl text-center space-y-5 transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-6xl animate-bounce pt-2">
                        {lastTurnResult?.isCorrect ? '🎉' : '💥'}
                    </div>

                    <div>
                        <div className="text-xs font-black uppercase text-gray-400 mb-1">
                            {lastTurnResult?.userName || nickname}'s Turn Result
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black">
                            {lastTurnResult?.timedOut ? 'Time Expired!' : lastTurnResult?.isCorrect ? 'Correct Answer!' : 'Incorrect Choice'}
                        </h3>
                        <p className={`text-sm mt-1.5 font-bold ${lastTurnResult?.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {lastTurnResult?.isCorrect ? `+${lastTurnResult.points || 850} Speed Points Awarded` : lastTurnResult?.timedOut ? 'Turn timed out (0 pts)' : 'Streak Reset — Keep fighting!'}
                        </p>
                        {currentQ && !lastTurnResult?.isCorrect && (
                            <div className="mt-3 p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-xs text-left">
                                <span className="text-gray-400 block text-[10px] uppercase font-black">Correct Answer</span>
                                <span className="font-black text-emerald-500 text-sm">
                                    {currentQ.options?.[Number(currentQ.correctAnswer)] || currentQ.correctAnswer}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Score Tally Card */}
                    <div className="p-4 rounded-xl flex items-center justify-around border bg-black/5 dark:bg-white/5">
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
                            onClick={() => {
                                setSelectedOption(null);
                                setStep('game');
                            }}
                            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                            }`}
                        >
                            Ready for Next Turn
                        </button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                            Leave Arena
                        </button>
                    </div>
                </div>
            )}

            {/* 5. GAME OVER / PODIUM */}
            {step === 'game_over' && (
                <div
                    className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl text-center space-y-6 transition-all animate-in zoom-in-95 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#111322] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-3xl">
                        🏆
                    </div>
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-black">Duel Finished!</h3>
                        <p className="text-xs text-gray-400 mt-1">Final Score: {score} pts</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        Return to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
};

export default LivePlayerController;
