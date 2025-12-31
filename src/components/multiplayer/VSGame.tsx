import React, { useState, useEffect } from 'react';
import type { Quiz, UserData, QuizResult } from '../../types';
import { useSocket } from '../../context/SocketContext';
import QuizTaking from '../QuizTaking'; // Reusing existing component
import { Trophy, Zap } from 'lucide-react';
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
    roomId: string; // The socket room ID
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
    powerUps?: { type: string; quantity: number }[];
    onPowerUpUsed?: (type: string) => void;
}

const VSGame: React.FC<VSGameProps> = ({ quiz, currentUser, opponent, roomId, onComplete, onBack, powerUps, onPowerUpUsed }) => {
    const { socket } = useSocket();
    const [opponentState, setOpponentState] = useState({
        score: 0,
        currentQuestion: 0, // index
        percentage: 0
    });

    // Listen for opponent updates
    useEffect(() => {
        if (!socket) return;

        // Join room logic should probably be here or in App?
        // Let's ensure we join here to be safe
        socket.emit('join_game_room', roomId);

        const handleProgress = (data: OpponentProgress) => {
            // console.log('Opponent progress:', data);
            if (data.userId === opponent.id) {
                setOpponentState({
                    score: data.score,
                    currentQuestion: data.currentQuestion,
                    percentage: data.percentage
                });
            }
        };

        socket.on('opponent_progress', handleProgress);

        return () => {
            socket.off('opponent_progress', handleProgress);
        };
    }, [socket, opponent.id, roomId]);

    // Intercept answer to send updates
    const handleAnswerUpdate = (score: number, currentQuestionIndex: number) => {
        if (socket) {
            socket.emit('update_progress', {
                roomId,
                userId: currentUser.userId,
                score,
                currentQuestion: currentQuestionIndex,
                percentage: Math.round((currentQuestionIndex / quiz.questions.length) * 100) // Approx percentage based on progress
                // Or better: Math.round((score / totalMaxScore) * 100) if we knew max score easily.
                // For now, let's just use progress bar for question count on UI?
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col md:flex-row overflow-hidden">
            {/* Left Side: Your Game */}
            <div className="flex-1 h-[50vh] md:h-screen overflow-y-auto border-r border-gray-200 dark:border-gray-800 relative">
                <div className="absolute top-4 left-4 z-10 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    YOU
                </div>
                <QuizTaking
                    quiz={quiz}
                    user={currentUser}
                    powerUps={powerUps || currentUser.powerUps}
                    onPowerUpUsed={onPowerUpUsed}
                    onComplete={(res) => {
                        // Notify final score
                        if (socket) {
                            socket.emit('update_progress', {
                                roomId,
                                userId: currentUser.userId,
                                score: res.score,
                                currentQuestion: quiz.questions.length,
                                percentage: res.percentage
                            });
                        }
                        onComplete(res);
                    }}
                    onBack={onBack}
                    onProgress={(score, index) => handleAnswerUpdate(score, index)}
                />
            </div>

            {/* Right Side: Opponent View */}
            <div className="flex-1 h-[50vh] md:h-screen bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-white flex flex-col items-center justify-center p-8 relative">
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    OPPONENT
                </div>

                <div className="text-center space-y-8 animate-in fade-in duration-500">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-5xl font-bold shadow-2xl border-4 border-white dark:border-white/20 overflow-hidden">
                            {opponent.avatar ? (
                                <Avatar config={opponent.avatar} size="xl" className="w-full h-full" />
                            ) : (
                                opponent.name.charAt(0)
                            )}
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-4 py-1 rounded-xl border border-gray-200 dark:border-slate-700 font-bold whitespace-nowrap shadow-sm">
                            {opponent.name}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                        <div className="bg-white dark:bg-slate-700/50 p-6 rounded-2xl backdrop-blur-sm border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none">
                            <div className="flex flex-col items-center gap-2">
                                <Trophy className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{opponentState.score}</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Current Score</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-700/50 p-6 rounded-2xl backdrop-blur-sm border border-gray-200 dark:border-slate-600 shadow-sm dark:shadow-none">
                            <div className="flex flex-col items-center gap-2">
                                <Zap className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{opponentState.currentQuestion}/{quiz.questions.length}</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Answered</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Progress Bar */}
                    <div className="w-full max-w-md space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                            <span>Progress</span>
                            <span>{Math.round((opponentState.currentQuestion / quiz.questions.length) * 100)}%</span>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${(opponentState.currentQuestion / quiz.questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VSGame;
