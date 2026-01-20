import React, { useState, useEffect, useRef } from 'react';
import type { Quiz, UserData, QuizResult } from '../../types';
import { useSocket } from '../../context/SocketContext';
import QuizTaking from '../QuizTaking';
import { Trophy, Activity, Sword, Flag, Timer, Swords } from 'lucide-react';
import Avatar from '../Avatar';
import type { AvatarConfig } from '../../types';

type OpponentProgress = {
    userId: string;
    score: number;
    currentQuestion: number;
    percentage: number;
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
        percentage: 0
    });
    const [myProgress, setMyProgress] = useState(0);
    const [gameLogs, setGameLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [gameLogs]);

    const addLog = (message: string) => {
        setGameLogs(prev => [...prev.slice(-4), message]); // Keep last 5
    };

    // Listen for updates and match ready
    useEffect(() => {
        if (!socket) return;
        socket.emit('join_game_room', roomId);

        const handleProgress = (data: OpponentProgress) => {
            if (data.userId === opponent.id) {
                const prevQ = opponentState.currentQuestion;
                setOpponentState({
                    score: data.score,
                    currentQuestion: data.currentQuestion,
                    percentage: data.percentage
                });

                if (data.currentQuestion > prevQ) {
                    addLog(`${opponent.name} answered Question ${data.currentQuestion}!`);
                }
            }
        };

        const handleMatchReady = () => {
            if (gameState === 'waiting') {
                setGameState('countdown');
            }
        };

        const handleGameOver = (data: { winnerId: string | null, isDraw: boolean, results: any }) => {
            setGameResult(data);
        };

        socket.on('opponent_progress', handleProgress);
        socket.on('match_ready', handleMatchReady);
        socket.on('game_over', handleGameOver);

        return () => {
            socket.off('opponent_progress', handleProgress);
            socket.off('match_ready', handleMatchReady);
            socket.off('game_over', handleGameOver);
        };
    }, [socket, opponent.id, roomId, opponent.name, gameState, opponentState.currentQuestion]);

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

    const handleAnswerUpdate = (score: number, currentQuestionIndex: number) => {
        setMyProgress(currentQuestionIndex);
        if (socket) {
            socket.emit('update_progress', {
                roomId,
                userId: currentUser.userId,
                score,
                currentQuestion: currentQuestionIndex,
                percentage: Math.round((currentQuestionIndex / quiz.questions.length) * 100)
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
                    mustAnswerCorrectly={true}
                    onComplete={(res) => {
                        localResultRef.current = res;
                        setGameState('finished');
                        if (socket) {
                            socket.emit('update_progress', {
                                roomId,
                                userId: currentUser.userId,
                                score: res.score,
                                currentQuestion: quiz.questions.length,
                                percentage: res.percentage
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
                    onProgress={(score, index) => handleAnswerUpdate(score, index)}
                />
            </div>

            {/* RIGHT SIDE: OPPONENT & LIVE STATUS */}
            <div className="flex-1 h-1/2 md:h-full bg-slate-900 text-white p-6 flex flex-col relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 pointer-events-none"></div>

                {/* Header */}
                <div className="z-10 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <Sword className="w-5 h-5 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Live Challenge</h2>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20 animate-pulse flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        LIVE
                    </div>
                </div>

                {/* Opponent Profile */}
                <div className="z-10 flex flex-col items-center justify-center mb-10">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-orange-500 to-pink-500">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-4 border-slate-900">
                                {opponent.avatar ? (
                                    <Avatar config={opponent.avatar} size="lg" className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                                        {opponent.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-xs font-bold whitespace-nowrap shadow-lg">
                            {opponent.name}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                            <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">Score</span>
                            <div className="flex items-center gap-2 text-2xl font-black text-yellow-400">
                                <Trophy className="w-5 h-5" />
                                {opponentState.score}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                            <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">Progress</span>
                            <div className="flex items-center gap-2 text-2xl font-black text-blue-400">
                                <Activity className="w-5 h-5" />
                                {Math.round((opponentState.currentQuestion / totalQuestions) * 100)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* RACE TRACK VISUALIZATION */}
                <div className="z-10 flex-1 flex flex-col justify-center max-w-lg mx-auto w-full mb-8">
                    <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase tracking-wider font-bold">
                        <span>Start</span>
                        <span>Checkered Flag</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full w-full relative">
                        {/* Finish Line */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <Flag className="w-5 h-5 text-slate-600" />
                        </div>

                        {/* Opponent Marker */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-10"
                            style={{ left: `${getProgressPercent(opponentState.currentQuestion)}%` }}
                        >
                            <div className="relative -top-6 -translate-x-1/2 flex flex-col items-center">
                                <span className="text-[10px] text-red-400 font-bold mb-1 opacity-80">THEM</span>
                                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-slate-900 shadow-xl shadow-red-500/50"></div>
                            </div>
                        </div>

                        {/* My Marker */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out z-20"
                            style={{ left: `${getProgressPercent(myProgress)}%` }}
                        >
                            <div className="relative 6 -translate-x-1/2 flex flex-col items-center mt-8">
                                <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-xl shadow-indigo-500/50 mb-1"></div>
                                <span className="text-[10px] text-indigo-400 font-bold opacity-80">YOU</span>
                            </div>
                        </div>

                        {/* Track Fill for Opponent */}
                        <div
                            className="absolute top-0 left-0 h-full bg-red-500/20 rounded-full transition-all duration-700"
                            style={{ width: `${getProgressPercent(opponentState.currentQuestion)}%` }}
                        />
                    </div>
                </div>

                {/* Game Logs (Feed) */}
                <div className="z-10 h-32 bg-slate-800/30 rounded-xl border border-slate-700 p-3 overflow-hidden flex flex-col justify-end">
                    <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {gameLogs.length === 0 ? (
                            <div className="text-slate-500 text-xs text-center py-2 italic">Match started... Good luck!</div>
                        ) : (
                            gameLogs.map((log, i) => (
                                <div key={i} className="text-xs text-slate-300 flex items-center gap-2 animate-in slide-in-from-left duration-300">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full min-w-[6px]"></div>
                                    {log}
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
