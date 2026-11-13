import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { shuffleQuestionsWithOptions } from '../../utils/shuffle';
import {
    Users,
    Trophy,
    X,
    Copy,
    Check,
    UserPlus,
    Link,
    ArrowRight,
    Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathRenderer } from '../common/MathRenderer';
import { sounds } from '../../lib/soundEffects';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import type { Quiz, Question } from '../../types';

export interface LivePlayer {
    id: string;
    name: string;
    score: number;
    streak: number;
    lastAnswerCorrect?: boolean;
    lastAnswerPoints?: number;
    lastSelectedOption?: number;
    isHost?: boolean;
}

interface LiveHostModeProps {
    quiz: Quiz;
    onClose: () => void;
}

export const LiveHostMode: React.FC<LiveHostModeProps> = ({
    quiz,
    onClose
}) => {
    const { currentUser } = useAuth();
    const { allUsers } = useData();
    const { socket } = useSocket();
    const { showNotification } = useNotification();
    const { isBento } = useTheme();

    // 6-digit room PIN
    const [roomPin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
    const [gameState, setGameState] = useState<'lobby' | 'question' | 'reveal' | 'leaderboard' | 'game_over'>('lobby');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(25);

    // Turn-Based Duel Setup
    const hostId = currentUser?.userId || 'host_user';
    const hostName = currentUser?.name || 'Host User';

    const [players, setPlayers] = useState<LivePlayer[]>([
        { id: hostId, name: `${hostName} (You)`, score: 0, streak: 0, isHost: true },
        { id: 'peer_alex', name: 'Alex M. (Peer)', score: 0, streak: 0 }
    ]);
    const [currentTurnUserId, setCurrentTurnUserId] = useState<string>(hostId);
    const [selectedHostOption, setSelectedHostOption] = useState<number | null>(null);

    // Real-time turn feedback record
    const [lastTurnResult, setLastTurnResult] = useState<{
        playerId: string;
        playerName: string;
        isCorrect: boolean;
        points: number;
        selectedOption?: number;
        timedOut?: boolean;
    } | null>(null);

    // Modals & UI States
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const questions = useMemo(() => shuffleQuestionsWithOptions(quiz.questions || []), [quiz]);
    const currentQ: Question | undefined = questions[currentQuestionIndex];

    const activePlayer = players.find(p => p.id === currentTurnUserId) || players[0];
    const isMyTurn = currentTurnUserId === hostId;

    // Join classroom socket room as host
    useEffect(() => {
        if (!socket) return;

        socket.emit('join_classroom', {
            pin: roomPin,
            user: { id: hostId, name: hostName },
            quizData: {
                id: quiz.id || quiz._id,
                title: quiz.title,
                totalQuestions: questions.length,
                questions: questions.map((q, idx) => ({
                    id: q.id || idx,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    points: q.points || 10
                }))
            }
        });

        // Listen for peer join / sync
        const handleStateSync = (data: { players?: LivePlayer[]; currentTurnUserId?: string }) => {
            if (data.players && data.players.length > 0) {
                const merged = [...data.players];
                if (!merged.some(p => p.id === hostId)) {
                    merged.unshift({ id: hostId, name: `${hostName} (You)`, score: 0, streak: 0, isHost: true });
                }
                setPlayers(merged);
            }
            if (data.currentTurnUserId) {
                setCurrentTurnUserId(data.currentTurnUserId);
            }
        };

        const handleTurnResult = (data: {
            userId: string;
            userName: string;
            answerIndex: number;
            isCorrect: boolean;
            points: number;
        }) => {
            setLastTurnResult({
                playerId: data.userId,
                playerName: data.userName,
                isCorrect: data.isCorrect,
                points: data.points,
                selectedOption: data.answerIndex,
                timedOut: false
            });

            // Update scores in roster
            setPlayers(prev => prev.map(p => {
                if (p.id === data.userId) {
                    return {
                        ...p,
                        score: p.score + data.points,
                        streak: data.isCorrect ? p.streak + 1 : 0,
                        lastAnswerCorrect: data.isCorrect,
                        lastAnswerPoints: data.points,
                        lastSelectedOption: data.answerIndex
                    };
                }
                return p;
            }));

            if (data.isCorrect) {
                sounds.playCorrect();
            } else {
                sounds.playIncorrect();
            }
            setGameState('reveal');
        };

        socket.on('classroom_state_sync', handleStateSync);
        socket.on('classroom_turn_result', handleTurnResult);

        return () => {
            socket.off('classroom_state_sync', handleStateSync);
            socket.off('classroom_turn_result', handleTurnResult);
        };
    }, [socket, roomPin, hostId, hostName, quiz, questions]);

    // Copy direct invite link
    const handleCopyInviteLink = useCallback(() => {
        const inviteUrl = `${window.location.origin}/classroom?pin=${roomPin}`;
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        showNotification('success', 'Classroom invite link copied to clipboard!', { title: '🔗 Link Ready' });
        setTimeout(() => setCopiedLink(false), 2500);
    }, [roomPin, showNotification]);

    // Copy PIN
    const handleCopyPin = useCallback(() => {
        navigator.clipboard.writeText(roomPin);
        setCopiedPin(true);
        showNotification('info', `Room PIN ${roomPin} copied!`, { title: 'PIN Copied' });
        setTimeout(() => setCopiedPin(false), 2000);
    }, [roomPin, showNotification]);

    // Send direct invite to a user
    const handleSendInviteToUser = useCallback((targetUser: { userId: string; name: string }) => {
        if (!socket) {
            showNotification('info', `Simulated invite sent to ${targetUser.name}`, { title: 'Peer Invited' });
            setShowInviteModal(false);
            return;
        }

        socket.emit('classroom_invite_user', {
            toUserId: targetUser.userId,
            fromUser: { id: hostId, name: hostName },
            pin: roomPin,
            quizTitle: quiz.title
        });

        showNotification('success', `Live invite sent to ${targetUser.name}!`, { title: 'Invitation Dispatched' });
        setShowInviteModal(false);
    }, [socket, hostId, hostName, roomPin, quiz.title, showNotification]);

    // Start Live Turn-Based Game
    const handleStartGame = () => {
        sounds.playPowerUp();
        setTimeLeft(25);
        setCurrentQuestionIndex(0);
        setCurrentTurnUserId(hostId);
        setSelectedHostOption(null);
        setLastTurnResult(null);
        setGameState('question');

        if (socket) {
            socket.emit('classroom_start_game', {
                pin: roomPin,
                currentTurnUserId: hostId
            });
        }
    };

    // Active player submits answer
    const handleSubmitTurnAnswer = (optionIdx: number) => {
        if (gameState !== 'question' || !currentQ || selectedHostOption !== null) return;

        setSelectedHostOption(optionIdx);
        const isCorrect = optionIdx === Number(currentQ.correctAnswer);
        const speedPoints = isCorrect ? Math.floor(700 + (timeLeft * 10)) : 0;

        const result = {
            playerId: hostId,
            playerName: hostName,
            isCorrect,
            points: speedPoints,
            selectedOption: optionIdx,
            timedOut: false
        };
        setLastTurnResult(result);

        // Update roster
        setPlayers(prev => prev.map(p => {
            if (p.id === hostId) {
                return {
                    ...p,
                    score: p.score + speedPoints,
                    streak: isCorrect ? p.streak + 1 : 0,
                    lastAnswerCorrect: isCorrect,
                    lastAnswerPoints: speedPoints,
                    lastSelectedOption: optionIdx
                };
            }
            return p;
        }));

        if (socket) {
            socket.emit('classroom_submit_turn', {
                pin: roomPin,
                userId: hostId,
                userName: hostName,
                questionIndex: currentQuestionIndex,
                answerIndex: optionIdx,
                isCorrect,
                points: speedPoints
            });
        }

        if (isCorrect) {
            sounds.playCorrect();
        } else {
            sounds.playIncorrect();
        }

        setGameState('reveal');
    };

    // Handle Turn Timer & Simulated peer if not human
    useEffect(() => {
        if (gameState !== 'question') return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    // Timeout event for active player
                    if (gameState === 'question') {
                        setLastTurnResult({
                            playerId: activePlayer.id,
                            playerName: activePlayer.name,
                            isCorrect: false,
                            points: 0,
                            timedOut: true
                        });
                        sounds.playIncorrect();
                        setGameState('reveal');

                        if (socket) {
                            socket.emit('classroom_submit_turn', {
                                pin: roomPin,
                                userId: activePlayer.id,
                                userName: activePlayer.name,
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
    }, [gameState, activePlayer.id, activePlayer.name, currentQuestionIndex, roomPin, socket]);

    // Simulated peer answer when it's peer's turn and peer is a mock student / offline bot
    useEffect(() => {
        if (gameState !== 'question' || isMyTurn || !currentQ) return;

        // If the active player is a bot or peer_alex
        if (activePlayer.id.startsWith('peer_') || activePlayer.id === '1' || activePlayer.id === '2') {
            const botAnswerTimer = setTimeout(() => {
                const botIsCorrect = Math.random() < 0.75;
                const correctIdx = Number(currentQ.correctAnswer);
                const botOption = botIsCorrect ? correctIdx : (correctIdx + 1) % (currentQ.options?.length || 4);
                const points = botIsCorrect ? Math.floor(700 + Math.random() * 250) : 0;

                setLastTurnResult({
                    playerId: activePlayer.id,
                    playerName: activePlayer.name,
                    isCorrect: botIsCorrect,
                    points,
                    selectedOption: botOption,
                    timedOut: false
                });

                setPlayers(prev => prev.map(p => {
                    if (p.id === activePlayer.id) {
                        return {
                            ...p,
                            score: p.score + points,
                            streak: botIsCorrect ? p.streak + 1 : 0,
                            lastAnswerCorrect: botIsCorrect,
                            lastAnswerPoints: points,
                            lastSelectedOption: botOption
                        };
                    }
                    return p;
                }));

                if (botIsCorrect) {
                    sounds.playCorrect();
                } else {
                    sounds.playIncorrect();
                }

                setGameState('reveal');
            }, 3000);

            return () => clearTimeout(botAnswerTimer);
        }
    }, [gameState, isMyTurn, activePlayer.id, activePlayer.name, currentQ]);

    // Advance to next turn / next question
    const handleAdvanceTurn = () => {
        sounds.playLevelUp();
        // Determine next turn user in round-robin fashion
        const currentIdx = players.findIndex(p => p.id === currentTurnUserId);
        const nextPlayer = players[(currentIdx + 1) % players.length] || players[0];

        const isLastQuestion = currentQuestionIndex >= questions.length - 1;
        if (isLastQuestion) {
            setGameState('game_over');
            confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
            if (socket) {
                socket.emit('classroom_advance_turn', {
                    pin: roomPin,
                    nextTurnUserId: nextPlayer.id,
                    nextQuestionIndex: currentQuestionIndex,
                    isGameOver: true
                });
            }
        } else {
            const nextQIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextQIndex);
            setCurrentTurnUserId(nextPlayer.id);
            setTimeLeft(25);
            setSelectedHostOption(null);
            setLastTurnResult(null);
            setGameState('question');

            if (socket) {
                socket.emit('classroom_advance_turn', {
                    pin: roomPin,
                    nextTurnUserId: nextPlayer.id,
                    nextQuestionIndex: nextQIndex,
                    isGameOver: false
                });
            }
        }
    };

    // Filtered users for invite modal
    const filteredUsers = (allUsers || []).filter(u =>
        u.userId !== hostId &&
        (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
         u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    ).slice(0, 8);

    return (
        <div className={`fixed inset-0 z-50 flex flex-col font-sans overflow-y-auto p-safe ${
            isBento
                ? 'bg-[#fafafa] text-black font-sans'
                : 'bg-[#0b0c16] text-white'
        }`}>
            {/* Top Bar */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between pt-safe ${
                isBento
                    ? 'bg-white border-black/15 shadow-sm'
                    : 'bg-white/5 border-white/10'
            }`}>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isBento
                            ? 'bg-[#bef264] text-black border border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                        {quiz.title}
                    </span>
                    <span className="text-xs font-bold text-gray-400 hidden sm:inline">
                        🎮 Turn-Based Classroom Duel
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={handleCopyPin}
                        title="Click to copy PIN"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-black tracking-widest flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
                            isBento
                                ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-white/10 border border-white/15 text-amber-300 hover:bg-white/20'
                        }`}
                    >
                        <span>PIN: {roomPin}</span>
                        {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                    </button>

                    <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
                            isBento
                                ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30'
                        }`}
                    >
                        <Link className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition cursor-pointer active:scale-95 ${
                            isBento
                                ? 'bg-[#fecdd3] hover:bg-rose-300 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                        }`}
                        title="Close Arena"
                    >
                        <X className="w-5 h-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>

            {/* Main Stage Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
                {/* 1. LOBBY PHASE */}
                {gameState === 'lobby' && (
                    <div className="w-full text-center space-y-7 animate-in fade-in zoom-in duration-200">
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                }`}>
                                    Interactive Turn-Based Mode
                                </span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
                                Classroom Duel Lobby
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                                Invite a friend or classmate. Each participant takes synchronized turns answering questions in real-time!
                            </p>
                        </div>

                        {/* Room PIN Display Card */}
                        <div className={`p-6 sm:p-8 rounded-3xl max-w-md mx-auto border transition-all ${
                            isBento
                                ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_#000]'
                                : 'bg-white/5 border-white/10 shadow-2xl'
                        }`}>
                            <div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">
                                Room Join Code
                            </div>
                            <div className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-300 to-emerald-300 py-1">
                                {roomPin}
                            </div>
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleCopyInviteLink}
                                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition active:scale-95 ${
                                        isBento
                                            ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                    }`}
                                >
                                    <Link className="w-4 h-4" />
                                    <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition active:scale-95 ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }`}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Invite User</span>
                                </button>
                            </div>
                        </div>

                        {/* Participants Roster */}
                        <div className={`p-6 rounded-3xl border space-y-4 max-w-xl mx-auto ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white/5 border-white/10'
                        }`}>
                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    Classroom Participants ({players.length})
                                </span>
                                <span className="text-emerald-400 animate-pulse flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                    Ready for Turn 1
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {players.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                                            isBento
                                                ? 'bg-[#f8fafc] border-2 border-black'
                                                : 'bg-white/10 border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-black text-white shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xs font-black truncate max-w-[140px]">
                                                    {p.name}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold">
                                                    {idx === 0 ? 'Turn 1 (Host)' : `Turn ${idx + 1}`}
                                                </div>
                                            </div>
                                        </div>
                                        {p.isHost && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                Host
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Launch Button */}
                        <button
                            type="button"
                            onClick={handleStartGame}
                            className={`px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-xl ${
                                isBento
                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-[3px] border-black shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[3px_3px_0px_#000]'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95'
                            }`}
                        >
                            🚀 Launch Turn-Based Duel (Start Question 1)
                        </button>
                    </div>
                )}

                {/* 2. QUESTION PHASE */}
                {gameState === 'question' && currentQ && (
                    <div className="w-full space-y-6 animate-in fade-in duration-200">
                        {/* PROMINENT VISUAL TURN BANNER */}
                        <div className={`w-full p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-3 shadow-xl transition-all ${
                            isMyTurn
                                ? isBento
                                    ? 'bg-[#bef264] border-2 border-black text-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/30'
                                : isBento
                                    ? 'bg-[#fef08a] border-2 border-black text-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-500/10 border-amber-500/40 text-amber-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                                    isMyTurn
                                        ? 'bg-emerald-500 text-white animate-bounce'
                                        : 'bg-amber-500/30 text-amber-300 animate-pulse'
                                }`}>
                                    {isMyTurn ? '🎯' : '⏳'}
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                                        {isMyTurn ? 'Active Player' : 'Spectating Turn'}
                                    </div>
                                    <div className="text-base sm:text-xl font-black">
                                        {isMyTurn
                                            ? '🎯 Your Turn to Answer!'
                                            : `⏳ Waiting for ${activePlayer.name} to answer...`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className={`px-4 py-1.5 rounded-xl font-mono font-black text-lg border ${
                                    timeLeft <= 5
                                        ? 'bg-rose-500 text-white border-rose-400 animate-ping'
                                        : isBento
                                            ? 'bg-white text-black border-2 border-black'
                                            : 'bg-white/10 border-white/20 text-white'
                                }`}>
                                    {timeLeft}s
                                </div>
                            </div>
                        </div>

                        {/* Question Meta Header */}
                        <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-1">
                            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                            <span>Score: {players.map(p => `${p.name.split(' ')[0]}: ${p.score}pts`).join(' | ')}</span>
                        </div>

                        {/* Question Prompt */}
                        <div className={`p-8 sm:p-12 rounded-3xl border text-center shadow-2xl ${
                            isBento
                                ? 'bg-white border-[3px] border-black shadow-[6px_6px_0px_#000] text-black'
                                : 'bg-white/5 border-white/10 text-white'
                        }`}>
                            <MathRenderer text={currentQ.question} className="text-xl sm:text-3xl font-black leading-tight" />
                        </div>

                        {/* Options Grid (Active vs Read-Only) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentQ.options?.map((opt, optIdx) => {
                                const shapes = ['▲', '◆', '●', '■'];
                                const isSelected = selectedHostOption === optIdx;

                                return (
                                    <button
                                        key={optIdx}
                                        type="button"
                                        disabled={!isMyTurn || selectedHostOption !== null}
                                        onClick={() => isMyTurn && handleSubmitTurnAnswer(optIdx)}
                                        className={`p-5 sm:p-6 rounded-2xl flex items-center justify-between gap-3 text-left transition-all ${
                                            isMyTurn
                                                ? isBento
                                                    ? 'bg-white hover:bg-[#fef9c3] text-black border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer'
                                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-white/40 cursor-pointer active:scale-[0.98]'
                                                : isBento
                                                    ? 'bg-slate-100 text-slate-500 border-2 border-black/30 cursor-not-allowed opacity-75'
                                                    : 'bg-white/5 text-gray-400 border border-white/5 cursor-not-allowed opacity-60'
                                        } ${isSelected ? 'ring-2 ring-emerald-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                                isBento
                                                    ? 'bg-black text-white'
                                                    : 'bg-white/15 text-white'
                                            }`}>
                                                {shapes[optIdx % 4]}
                                            </span>
                                            <MathRenderer text={opt} className="text-base sm:text-lg font-bold truncate leading-snug" />
                                        </div>

                                        {!isMyTurn && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded bg-black/20 text-amber-300 shrink-0">
                                                <Lock className="w-3 h-3" />
                                                <span>Waiting</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. REVEAL / FEEDBACK PHASE */}
                {gameState === 'reveal' && currentQ && (
                    <div className="w-full space-y-6 text-center animate-in zoom-in duration-200">
                        {/* Real-time Feedback Announcement Banner */}
                        <div className={`p-6 sm:p-8 rounded-3xl border space-y-3 ${
                            lastTurnResult?.isCorrect
                                ? isBento
                                    ? 'bg-[#bef264] border-[3px] border-black text-black shadow-[6px_6px_0px_#000]'
                                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                                : isBento
                                    ? 'bg-[#fecdd3] border-[3px] border-black text-black shadow-[6px_6px_0px_#000]'
                                    : 'bg-rose-500/20 border-rose-500 text-rose-300'
                        }`}>
                            <div className="text-5xl animate-bounce">
                                {lastTurnResult?.isCorrect ? '🎉' : lastTurnResult?.timedOut ? '⏰' : '💥'}
                            </div>
                            <div className="text-xs font-black uppercase tracking-wider">
                                {lastTurnResult?.playerName}'s Turn Result
                            </div>
                            <h3 className="text-2xl sm:text-4xl font-black">
                                {lastTurnResult?.isCorrect
                                    ? 'Correct Answer!'
                                    : lastTurnResult?.timedOut
                                        ? "Time Expired!"
                                        : 'Incorrect Answer!'}
                            </h3>
                            <p className="text-sm font-bold opacity-90">
                                {lastTurnResult?.isCorrect
                                    ? `+${lastTurnResult?.points} Speed Points Awarded to ${lastTurnResult?.playerName}`
                                    : 'No points awarded. Turn passing to next participant.'}
                            </p>
                        </div>

                        {/* Options Breakdown with Correct Answer Highlighted */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            {currentQ.options?.map((opt, optIdx) => {
                                const isCorrect = optIdx === Number(currentQ.correctAnswer);
                                const wasSelected = lastTurnResult?.selectedOption === optIdx;

                                return (
                                    <div
                                        key={optIdx}
                                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                            isCorrect
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black'
                                                : wasSelected
                                                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                                                    : 'bg-white/5 border-white/10 text-gray-400 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span>{isCorrect ? '✓' : wasSelected ? '✗' : '•'}</span>
                                            <span className="truncate">{opt}</span>
                                        </div>
                                        {isCorrect && (
                                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 shrink-0">
                                                Correct Answer
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Live Score Tally */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-around ${
                            isBento ? 'bg-white border-2 border-black' : 'bg-white/5 border-white/10'
                        }`}>
                            {players.map(p => (
                                <div key={p.id} className="text-center">
                                    <div className="text-[10px] font-black uppercase text-gray-400">{p.name}</div>
                                    <div className="text-xl font-black font-mono">{p.score} pts</div>
                                    {p.streak > 1 && (
                                        <div className="text-[10px] text-amber-400 font-bold">🔥 {p.streak} streak</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Advance Action Button */}
                        <button
                            type="button"
                            onClick={handleAdvanceTurn}
                            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 mx-auto ${
                                isBento
                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                            }`}
                        >
                            <span>{currentQuestionIndex < questions.length - 1 ? 'Advance to Next Turn' : 'View Victory Podium 🏆'}</span>
                            <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </button>
                    </div>
                )}

                {/* 4. FINAL PODIUM / GAME OVER */}
                {gameState === 'game_over' && (
                    <div className="w-full text-center space-y-6 animate-in zoom-in duration-200">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
                            <Trophy className="w-12 h-12" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-widest text-amber-300">Classroom Duel Completed</div>
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
                                Live Quiz Champion!
                            </h2>
                            <p className="text-xs text-gray-400">
                                Outstanding duel performance across all questions.
                            </p>
                        </div>

                        {/* Standings List */}
                        <div className={`p-6 rounded-3xl border space-y-3 max-w-md mx-auto ${
                            isBento ? 'bg-white border-2 border-black' : 'bg-white/5 border-white/10'
                        }`}>
                            {[...players].sort((a, b) => b.score - a.score).map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                                        idx === 0
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                                            : 'bg-white/5 border-white/10 text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black">
                                            #{idx + 1}
                                        </span>
                                        <span className="font-bold text-sm">{p.name}</span>
                                    </div>
                                    <span className="font-mono font-black">{p.score} pts</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleStartGame}
                                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer transition ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                Rematch Duel
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer transition ${
                                    isBento
                                        ? 'bg-slate-200 text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                            >
                                Close Arena
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite User Modal */}
            {showInviteModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 dark:bg-black/45 backdrop-blur-md animate-in fade-in duration-150"
                    onClick={() => setShowInviteModal(false)}
                >
                    <div
                        className={`w-full max-w-md p-6 rounded-2xl border space-y-4 animate-in zoom-in-95 duration-150 ${
                            isBento
                                ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                                : 'bg-[#111322] text-white border-white/10 shadow-2xl'
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-base font-black uppercase">Invite Peer to Duel</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={userSearchQuery}
                                onChange={e => setUserSearchQuery(e.target.value)}
                                className={`w-full p-3 rounded-xl text-xs font-bold transition ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black focus:bg-[#fef9c3]'
                                        : 'bg-white/5 border border-white/15 text-white placeholder:text-gray-500'
                                }`}
                            />
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-400 font-bold">
                                    No users found matching query.
                                </div>
                            ) : (
                                filteredUsers.map(user => (
                                    <div
                                        key={user.userId}
                                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                            isBento ? 'bg-slate-50 border border-black/20' : 'bg-white/5 border-white/10'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-black truncate">{user.name}</div>
                                            <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleSendInviteToUser(user)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition active:scale-95 ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                            }`}
                                        >
                                            Send Invite
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-2 border-t border-black/10 dark:border-white/10 text-center">
                            <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                className="text-xs font-black text-indigo-400 hover:underline cursor-pointer"
                            >
                                Or copy direct invite link instead →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveHostMode;
