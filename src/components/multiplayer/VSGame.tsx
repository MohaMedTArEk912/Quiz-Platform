import React, { useState, useEffect, useRef } from 'react';
import type { Quiz, UserData, QuizResult } from '../../types';
import { useSocket } from '../../context/SocketContext';
import QuizTaking from '../QuizTaking';
import { Trophy, Activity, Sword, Timer, Swords, Zap } from 'lucide-react';
import Avatar from '../Avatar';
import type { AvatarConfig } from '../../types';

type OpponentProgress = {
    userId: string;
    score: number;
    currentQuestion: number;
    percentage: number;
    correctAnswers?: number;
    timeElapsed?: number;
    accuracy?: number;
};

interface VSGameProps {
    quiz: Quiz;
    currentUser: UserData;
    opponent: {
        id: string;
        name: string;
        avatar?: AvatarConfig;
    };
    roomId: string;
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
    powerUps?: { type: string; quantity: number }[];
    onPowerUpUsed?: (type: string) => void;
}

const VSGame: React.FC<VSGameProps> = ({ quiz, currentUser, opponent, roomId, onComplete, onBack, powerUps, onPowerUpUsed }) => {
    const { socket } = useSocket();
    // Game States: 'waiting' | 'countdown' | 'playing' | 'finished'
    const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
    const [countdown, setCountdown] = useState(5);

    const [gameResult, setGameResult] = useState<{ winnerId: string | null, isDraw: boolean, results: any } | null>(null);
    const localResultRef = useRef<QuizResult | null>(null);

    const [opponentState, setOpponentState] = useState({
        score: 0,
        currentQuestion: 0,
        percentage: 0,
        correctAnswers: 0,
        timeElapsed: 0,
        accuracy: 0
    });
    const [myState, setMyState] = useState({
        score: 0,
        currentQuestion: 0,
        correctAnswers: 0,
        timeElapsed: 0,
        accuracy: 0
    });
    const [myProgress, setMyProgress] = useState(0);
    const [gameLogs, setGameLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [isAhead, setIsAhead] = useState<boolean | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
    const [gameStartTime, setGameStartTime] = useState<number | null>(null);
    const [myTimeElapsed, setMyTimeElapsed] = useState(0);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [gameLogs]);

    const addLog = (message: string) => {
        setGameLogs(prev => [...prev.slice(-4), message]); // Keep last 5
    };

    // Monitor connection status
    useEffect(() => {
        if (!socket) return;

        const handleConnect = () => setConnectionStatus('connected');
        const handleDisconnect = () => setConnectionStatus('disconnected');
        const handleReconnecting = () => setConnectionStatus('reconnecting');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('reconnecting', handleReconnecting);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('reconnecting', handleReconnecting);
        };
    }, [socket]);

    // Update ahead status whenever state changes
    useEffect(() => {
        // Priority: 1) Correct answers, 2) Score, 3) Progress, 4) Time
        if (myState.correctAnswers > opponentState.correctAnswers) {
            setIsAhead(true);
        } else if (myState.correctAnswers < opponentState.correctAnswers) {
            setIsAhead(false);
        } else if (myState.score > opponentState.score) {
            setIsAhead(true);
        } else if (myState.score < opponentState.score) {
            setIsAhead(false);
        } else if (myState.currentQuestion > opponentState.currentQuestion) {
            setIsAhead(true);
        } else if (myState.currentQuestion < opponentState.currentQuestion) {
            setIsAhead(false);
        } else {
            // Same progress - check time (faster is better)
            setIsAhead(myTimeElapsed <= opponentState.timeElapsed);
        }
    }, [myState, opponentState, myTimeElapsed]);

    // Listen for updates and match ready
    useEffect(() => {
        if (!socket) return;
        socket.emit('join_game_room', roomId);

        const handleProgress = (data: OpponentProgress) => {
            if (data.userId === opponent.id) {
                setOpponentState(prev => {
                    const prevQ = prev.currentQuestion;
                    const prevScore = prev.score;
                    const prevCorrect = prev.correctAnswers;

                    // Add log for question progress
                    if (data.currentQuestion > prevQ) {
                        const isCorrect = (data.correctAnswers || 0) > prevCorrect;
                        addLog(`${isCorrect ? '✅' : '❌'} ${opponent.name} answered Q${data.currentQuestion} ${isCorrect ? 'correctly' : 'incorrectly'}`);

                        // Visual feedback on score change
                        if (data.score > prevScore) {
                            addLog(`✨ ${opponent.name} scored ${data.score - prevScore} points!`);
                        }
                    }

                    return {
                        score: data.score,
                        currentQuestion: data.currentQuestion,
                        percentage: data.percentage,
                        correctAnswers: data.correctAnswers || 0,
                        timeElapsed: data.timeElapsed || 0,
                        accuracy: data.accuracy || 0
                    };
                });
            }
        };

        const handleMatchReady = () => {
            if (gameState === 'waiting') {
                setGameState('countdown');
                addLog('Match starting...');
            }
        };

        const handleGameOver = (data: { winnerId: string | null, isDraw: boolean, results: any }) => {
            setGameResult(data);
            if (data.isDraw) {
                addLog('🤝 Match ended in a draw!');
            } else if (data.winnerId === currentUser.userId) {
                addLog('🏆 You won!');
            } else {
                addLog(`💪 ${opponent.name} won!`);
            }
        };

        socket.on('opponent_progress', handleProgress);
        socket.on('match_ready', handleMatchReady);
        socket.on('game_over', handleGameOver);

        return () => {
            socket.off('opponent_progress', handleProgress);
            socket.off('match_ready', handleMatchReady);
            socket.off('game_over', handleGameOver);
        };
    }, [socket, opponent.id, roomId, opponent.name, gameState, currentUser.userId]);

    // Countdown Logic
    useEffect(() => {
        if (gameState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameState('playing');
                addLog("GO! 🚀");
            }
        }
    }, [gameState, countdown]);

    // Set game start time when playing starts
    useEffect(() => {
        if (gameState === 'playing' && !gameStartTime) {
            setGameStartTime(Date.now());
        }
    }, [gameState, gameStartTime]);

    // Track time elapsed
    useEffect(() => {
        if (gameState === 'playing' && gameStartTime) {
            const interval = setInterval(() => {
                setMyTimeElapsed(Math.floor((Date.now() - gameStartTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState, gameStartTime]);

    const handleAnswerUpdate = (score: number, currentQuestionIndex: number) => {
        if (!gameStartTime) return; // Don't update if game hasn't started
        const timeElapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        
        // In delayedValidation mode, currentQuestionIndex is actually correctCount
        // In normal mode, we estimate based on score
        // Calculate average points per question to estimate correct answers
        const avgPointsPerQuestion = quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0) / quiz.questions.length;
        const estimatedCorrect = Math.round(score / avgPointsPerQuestion);
        const correctAnswers = Math.min(estimatedCorrect, currentQuestionIndex); // Can't have more correct than answered
        const accuracy = currentQuestionIndex > 0 ? Math.round((correctAnswers / currentQuestionIndex) * 100) : 0;

        setMyProgress(currentQuestionIndex);
        setMyState(prev => ({ 
            ...prev,
            score, 
            currentQuestion: currentQuestionIndex,
            correctAnswers,
            timeElapsed,
            accuracy
        }));
        setMyTimeElapsed(timeElapsed);

        if (socket) {
            socket.emit('update_progress', {
                roomId,
                userId: currentUser.userId,
                score,
                currentQuestion: currentQuestionIndex,
                percentage: Math.round((currentQuestionIndex / quiz.questions.length) * 100),
                correctAnswers,
                timeElapsed,
                accuracy
            });
        }
    };

    const totalQuestions = quiz.questions.length;

    const getProgressPercent = (current: number) => {
        return Math.min(100, Math.max(0, (current / totalQuestions) * 100));
    };

    // --- RENDER STATES ---

    if (gameState === 'waiting') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-900 to-black pointer-events-none"></div>

                <div className="z-10 bg-slate-800/50 p-12 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl text-center max-w-md w-full animate-in zoom-in duration-500">
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        {/* Pulse Rings */}
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-pulse opacity-50"></div>
                        <div className="relative w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-indigo-500">
                            <Timer className="w-10 h-10 text-white animate-spin-slow" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black mb-2 tracking-tight">Waiting for Opponent...</h2>
                    <p className="text-indigo-200 mb-8 font-medium">Get ready to race against <span className="text-white font-bold">{opponent.name}</span>!</p>

                    <div className="flex items-center justify-center gap-3 text-sm text-slate-400 bg-black/20 py-3 px-6 rounded-full mx-auto w-fit border border-white/5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {roomId}
                    </div>

                    <button onClick={onBack} className="mt-8 text-sm text-slate-500 hover:text-white transition-colors">
                        Cancel & Return
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'countdown') {
        return (
            <div className="min-h-screen bg-indigo-600 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent animate-pulse"></div>
                <div key={countdown} className="text-[15rem] md:text-[20rem] font-black text-white drop-shadow-2xl animate-in zoom-in duration-300">
                    {countdown > 0 ? countdown : "GO!"}
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        const iWon = gameResult?.winnerId === currentUser.userId;
        const isDraw = gameResult?.isDraw;

        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className={`absolute inset-0 opacity-40 ${iWon ? 'bg-green-900' : isDraw ? 'bg-yellow-900' : 'bg-red-900'}`}></div>

                <div className="z-10 text-center max-w-lg w-full p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500">
                    {!gameResult ? (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-t-indigo-500 border-white/10 rounded-full animate-spin"></div>
                                <Timer className="absolute inset-0 m-auto text-indigo-400 w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                            <p className="text-slate-300">Waiting for {opponent.name} to finish...</p>
                        </>
                    ) : (
                        <>
                            <div className="mb-6">
                                {iWon ? (
                                    <Trophy className="w-32 h-32 mx-auto text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-bounce" />
                                ) : isDraw ? (
                                    <Swords className="w-32 h-32 mx-auto text-yellow-200" />
                                ) : (
                                    <div className="text-6xl mx-auto mb-4">😔</div>
                                )}
                            </div>

                            <h2 className="text-5xl font-black mb-4 tracking-tight uppercase">
                                {iWon ? 'VICTORY!' : isDraw ? 'DRAW!' : 'DEFEAT'}
                            </h2>

                            <p className="text-xl text-slate-200 mb-8 font-medium">
                                {iWon ? `You defeated ${opponent.name}!` : isDraw ? 'It was a tie!' : `${opponent.name} was faster.`}
                            </p>

                            <button
                                onClick={() => onComplete(localResultRef.current!)}
                                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-black text-lg hover:scale-105 transition-transform shadow-xl"
                            >
                                View Detailed Results
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-gray-900 border-x border-gray-800 flex flex-col md:flex-row overflow-hidden">
            {/* LEFT SIDE: MY GAME */}
            <div className="flex-1 h-1/2 md:h-full overflow-y-auto border-r border-gray-800 bg-gray-50 dark:bg-slate-900/50 relative">
                {/* Badge for Mobile */}
                <div className="md:hidden absolute top-2 left-2 z-20 bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                    YOU
                </div>

                <QuizTaking
                    quiz={quiz}
                    user={currentUser}
                    powerUps={powerUps || currentUser.powerUps}
                    onPowerUpUsed={onPowerUpUsed}
                    embedded={true}
                    mustAnswerCorrectly={false}
                    countUpTimer={true}
                    delayedValidation={true}
                    onProgress={handleAnswerUpdate}
                    onComplete={(res) => {
                        localResultRef.current = res;
                        setGameState('finished');
                        if (socket) {
                            const finalTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
                            const finalCorrect = res.score / 10; // Assuming 10 points per correct answer
                            const finalAccuracy = Math.round((finalCorrect / quiz.questions.length) * 100);

                            socket.emit('update_progress', {
                                roomId,
                                userId: currentUser.userId,
                                score: res.score,
                                currentQuestion: quiz.questions.length,
                                percentage: res.percentage,
                                correctAnswers: finalCorrect,
                                timeElapsed: finalTime,
                                accuracy: finalAccuracy
                            });
                            socket.emit('quiz_completed', {
                                roomId,
                                userId: currentUser.userId,
                                score: res.score,
                                timeTaken: res.timeTaken
                            });
                        }
                    }}
                    onBack={onBack}
                />
            </div>

            {/* RIGHT SIDE: COMPACT OPPONENT & LIVE STATUS */}
            <div className="w-full md:w-80 lg:w-96 h-1/2 md:h-full bg-slate-900 text-white p-4 flex flex-col relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 pointer-events-none"></div>

                {/* Compact Header */}
                <div className="z-10 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                            <Sword className="w-4 h-4 text-red-500" />
                        </div>
                        <h2 className="text-sm font-bold tracking-tight">Live Challenge</h2>
                    </div>
                    <div className={`px-2 py-1 text-[10px] font-bold rounded-full flex items-center gap-1.5 ${connectionStatus === 'connected'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse'
                        : connectionStatus === 'reconnecting'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></span>
                        {connectionStatus === 'connected' ? 'LIVE' : connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'OFFLINE'}
                    </div>
                </div>

                {/* Compact Opponent Profile */}
                <div className="z-10 flex items-center gap-3 mb-4 bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-orange-500 to-pink-500">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-slate-900">
                                {opponent.avatar ? (
                                    <Avatar config={opponent.avatar} size="md" className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                                        {opponent.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{opponent.name}</div>
                        <div className="text-xs text-slate-400">Question {opponentState.currentQuestion}/{totalQuestions}</div>
                    </div>
                </div>

                {/* Enhanced Live Score Comparison */}
                <div className="z-10 mb-4 space-y-3">
                    {/* Score Comparison */}
                    <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Score</span>
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAhead === true ? 'bg-green-500/20 text-green-400' : isAhead === false ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                {isAhead === true ? '🔥 LEADING' : isAhead === false ? '⚡ BEHIND' : '⚖️ TIED'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center">
                                    <Trophy className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-indigo-400">{myState.score}</div>
                                    <div className="text-[9px] text-slate-500">You</div>
                                </div>
                            </div>
                            <div className="text-slate-600 font-bold">VS</div>
                            <div className="flex items-center gap-2">
                                <div>
                                    <div className="text-2xl font-black text-red-400 text-right">{opponentState.score}</div>
                                    <div className="text-[9px] text-slate-500 text-right">Opponent</div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                                    <Trophy className="w-4 h-4 text-red-400" />
                                </div>
                            </div>
                        </div>
                        {/* Score Difference */}
                        {isAhead !== null && (
                            <div className={`mt-2 pt-2 border-t border-slate-700/50 text-center text-xs font-bold ${isAhead ? 'text-green-400' : 'text-orange-400'}`}>
                                {isAhead 
                                    ? `+${myState.score - opponentState.score} points ahead`
                                    : `${opponentState.score - myState.score} points behind`
                                }
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Your Accuracy</div>
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-indigo-400" />
                                <span className="text-lg font-black text-indigo-400">
                                    {myState.currentQuestion > 0 ? Math.round((myState.correctAnswers / myState.currentQuestion) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Their Accuracy</div>
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-red-400" />
                                <span className="text-lg font-black text-red-400">
                                    {opponentState.accuracy || (opponentState.currentQuestion > 0 ? Math.round((opponentState.correctAnswers / opponentState.currentQuestion) * 100) : 0)}%
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Your Time</div>
                            <div className="flex items-center gap-1.5">
                                <Timer className="w-3 h-3 text-indigo-400" />
                                <span className="text-sm font-black text-indigo-400">
                                    {Math.floor(myTimeElapsed / 60)}:{(myTimeElapsed % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">Their Time</div>
                            <div className="flex items-center gap-1.5">
                                <Timer className="w-3 h-3 text-red-400" />
                                <span className="text-sm font-black text-red-400">
                                    {opponentState.timeElapsed > 0 
                                        ? `${Math.floor(opponentState.timeElapsed / 60)}:${(opponentState.timeElapsed % 60).toString().padStart(2, '0')}`
                                        : '--:--'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Dual Progress Bar */}
                <div className="z-10 mb-4">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold px-1">
                        <span>Start</span>
                        <span>🏁 Finish Line</span>
                    </div>
                    <div className="relative space-y-3">
                        {/* My Progress Bar */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] text-indigo-400 font-bold">You</span>
                                <span className="text-[9px] text-indigo-400 font-bold">{myProgress}/{totalQuestions}</span>
                            </div>
                            <div className="h-4 bg-slate-800/50 rounded-full w-full relative border border-slate-700/50 overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 transition-all duration-500 ease-out shadow-lg shadow-indigo-500/50"
                                    style={{ width: `${getProgressPercent(myProgress)}%` }}
                                />
                                {myProgress > 0 && (
                                    <div className="absolute right-0 top-0 h-full w-1 bg-indigo-300 animate-pulse" style={{ left: `${getProgressPercent(myProgress)}%` }} />
                                )}
                            </div>
                        </div>

                        {/* Opponent Progress Bar */}
                        <div className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] text-red-400 font-bold">{opponent.name}</span>
                                <span className="text-[9px] text-red-400 font-bold">{opponentState.currentQuestion}/{totalQuestions}</span>
                            </div>
                            <div className="h-4 bg-slate-800/50 rounded-full w-full relative border border-slate-700/50 overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-red-400 to-red-500 transition-all duration-700 ease-out shadow-lg shadow-red-500/50"
                                    style={{ width: `${getProgressPercent(opponentState.currentQuestion)}%` }}
                                />
                                {opponentState.currentQuestion > 0 && (
                                    <div className="absolute right-0 top-0 h-full w-1 bg-red-300 animate-pulse" style={{ left: `${getProgressPercent(opponentState.currentQuestion)}%` }} />
                                )}
                            </div>
                        </div>

                        {/* Comparison Indicator */}
                        {isAhead !== null && (
                            <div className={`text-center text-[10px] font-bold py-1.5 rounded-lg ${isAhead ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                {isAhead 
                                    ? `🔥 You're ${myProgress - opponentState.currentQuestion} question${myProgress - opponentState.currentQuestion !== 1 ? 's' : ''} ahead!`
                                    : `⚡ ${opponent.name} is ${opponentState.currentQuestion - myProgress} question${opponentState.currentQuestion - myProgress !== 1 ? 's' : ''} ahead!`
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Correct Answers Comparison */}
                <div className="z-10 mb-4">
                    <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-3 font-bold">Correct Answers</div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center">
                                    <span className="text-lg font-black text-indigo-400">{myState.correctAnswers}</span>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">You</div>
                                    <div className="text-[10px] text-slate-500">{myState.currentQuestion} answered</div>
                                </div>
                            </div>
                            <div className="text-slate-600 font-bold text-lg">VS</div>
                            <div className="flex items-center gap-2">
                                <div>
                                    <div className="text-xs text-slate-400 text-right">Opponent</div>
                                    <div className="text-[10px] text-slate-500 text-right">{opponentState.currentQuestion} answered</div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                                    <span className="text-lg font-black text-red-400">{opponentState.correctAnswers}</span>
                                </div>
                            </div>
                        </div>
                        {/* Progress visualization - Question by Question */}
                        <div className="mt-3">
                            <div className="text-[9px] text-slate-500 mb-1.5 text-center">Question Progress</div>
                            <div className="flex gap-0.5 flex-wrap">
                                {Array.from({ length: totalQuestions }).map((_, i) => {
                                    const myAnswered = i < myState.currentQuestion;
                                    const oppAnswered = i < opponentState.currentQuestion;
                                    const myCorrect = i < myState.correctAnswers;
                                    const oppCorrect = i < opponentState.correctAnswers;
                                    const isCurrent = i === myState.currentQuestion;
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`w-3 h-3 rounded relative overflow-hidden border transition-all ${
                                                isCurrent ? 'ring-2 ring-yellow-400 scale-110' : ''
                                            }`}
                                            title={`Q${i + 1}: You ${myAnswered ? (myCorrect ? '✓' : '✗') : '?'} | Opponent ${oppAnswered ? (oppCorrect ? '✓' : '✗') : '?'}`}
                                        >
                                            {/* My status (bottom layer) */}
                                            <div className={`absolute inset-0 ${
                                                myAnswered 
                                                    ? (myCorrect ? 'bg-indigo-500' : 'bg-indigo-500/40 border border-indigo-400/50') 
                                                    : 'bg-slate-700/30'
                                            }`} />
                                            {/* Opponent status (top layer, semi-transparent) */}
                                            <div className={`absolute inset-0 ${
                                                oppAnswered 
                                                    ? (oppCorrect ? 'bg-red-500/60' : 'bg-red-500/30') 
                                                    : ''
                                            }`} />
                                            {/* Current question indicator */}
                                            {isCurrent && (
                                                <div className="absolute inset-0 bg-yellow-400/30 animate-pulse" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-2 text-[8px] text-slate-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded bg-indigo-500"></div>
                                    <span>You Correct</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded bg-red-500/60"></div>
                                    <span>Opponent Correct</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded bg-slate-700/30"></div>
                                    <span>Not Answered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Game Activity Feed */}
                <div className="z-10 flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 p-2.5 overflow-hidden flex flex-col">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" />
                        Live Activity
                    </div>
                    <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                        {gameLogs.length === 0 ? (
                            <div className="text-slate-500 text-[10px] text-center py-2 italic">Waiting for activity...</div>
                        ) : (
                            gameLogs.map((log, i) => (
                                <div key={i} className="text-[10px] text-slate-300 flex items-start gap-1.5 animate-in slide-in-from-left duration-300 bg-slate-800/40 rounded px-2 py-1">
                                    <div className="w-1 h-1 bg-indigo-500 rounded-full min-w-[4px] mt-1"></div>
                                    <span className="flex-1">{log}</span>
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VSGame;
