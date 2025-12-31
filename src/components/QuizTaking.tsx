import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Quiz, UserData, QuizResult, DetailedAnswer, AttemptAnswers } from '../types/index.ts';
import { Clock, Zap, Target } from 'lucide-react';
import Navbar from './Navbar.tsx';

interface QuizTakingProps {
    quiz: Quiz;
    user: UserData;
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
    onProgress?: (score: number, currentQuestionIndex: number) => void;
    powerUps?: { type: string; quantity: number }[];
    onPowerUpUsed?: (type: string) => void;
    hidePowerUps?: boolean;
}

type SavedQuizState = {
    quizId: string;
    currentQuestion: number;
    answers: Record<number, string | number>;
    timeLeft: number;
    lastUpdated: number;
};

const QuizTaking: React.FC<QuizTakingProps> = ({ quiz, user, onComplete, onBack, onProgress, powerUps, onPowerUpUsed, hidePowerUps }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const startTimeRef = useRef(0);
    const [fiftyUsed, setFiftyUsed] = useState(false);
    const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
    const [timeFreezeUsed, setTimeFreezeUsed] = useState(false);
    const [usedPowerUps, setUsedPowerUps] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const quizIdentifier = quiz.id || quiz._id || quiz.title;
    const storageKey = `quiz_progress_${user.userId}_${quizIdentifier}`;

    const initialSavedState = useMemo(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.quizId === quizIdentifier && parsed.timeLeft > 0) {
                return parsed as SavedQuizState;
            }
        } catch (e) {
            console.error("Failed to parse saved state", e);
        }
        return null;
    }, [quizIdentifier, storageKey]);

    // Resume State
    const [showResumePrompt, setShowResumePrompt] = useState(Boolean(initialSavedState));
    const [savedState, setSavedState] = useState<SavedQuizState | null>(initialSavedState);

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [quizIdentifier]);

    // Save state on change
    useEffect(() => {
        if (showResumePrompt || isSubmitting) return; // Don't save while prompting or submitting

        const state = {
            quizId: quizIdentifier,
            currentQuestion,
            answers,
            timeLeft,
            lastUpdated: Date.now()
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quizIdentifier, storageKey, showResumePrompt, isSubmitting]);

    const handleResume = () => {
        if (savedState) {
            setCurrentQuestion(savedState.currentQuestion);
            setAnswers(savedState.answers);
            setTimeLeft(savedState.timeLeft);
        }
        resetQuestionState();
        setShowResumePrompt(false);
    };

    const handleStartNew = () => {
        sessionStorage.removeItem(storageKey);
        setSavedState(null);
        setShowResumePrompt(false);
        resetQuestionState();
    };

    const availablePowerUps = powerUps || user.powerUps || [];
    const countPowerUp = (type: string) => availablePowerUps.find(p => p.type === type)?.quantity || 0;

    const resetQuestionState = () => {
        setFiftyUsed(false);
        setEliminatedOptions(new Set());
    };

    const handleAnswer = (answer: string | number) => {
        if (isSubmitting) return;
        const newAnswers = {
            ...answers,
            [currentQuestion]: answer
        };
        setAnswers(newAnswers);

        // Calculate provisional score for progress tracking
        if (onProgress) {
            let currentScore = 0;
            quiz.questions.forEach((q, idx) => {
                if (newAnswers[idx] !== undefined && q.type !== 'text') {
                    if (newAnswers[idx] === q.correctAnswer) {
                        currentScore += q.points;
                    }
                }
            });
            onProgress(currentScore, Object.keys(newAnswers).length);
        }
    };

    const useFiftyFifty = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (fiftyUsed || (q.type === 'text') || countPowerUp('5050') <= 0) return;
        const incorrect = q.options?.map((_, idx) => idx).filter(idx => idx !== q.correctAnswer) || [];
        if (incorrect.length <= 1) return;
        const shuffled = [...incorrect].sort(() => Math.random() - 0.5);
        setEliminatedOptions(new Set(shuffled.slice(0, 2)));
        setFiftyUsed(true);
        setUsedPowerUps(prev => [...prev, '5050']);
        onPowerUpUsed?.('5050');
    };

    const useTimeFreeze = () => {
        if (isSubmitting) return;
        if (timeFreezeUsed || countPowerUp('time_freeze') <= 0) return;
        setTimeLeft(prev => prev + 20);
        setTimeFreezeUsed(true);
        setUsedPowerUps(prev => [...prev, 'time_freeze']);
        onPowerUpUsed?.('time_freeze');
    };

    const handleQuizComplete = useCallback(() => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Clear saved progress
        sessionStorage.removeItem(storageKey);

        const startTime = startTimeRef.current || Date.now();
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);

        // Calculate score and correct answers
        let score = 0;
        let correctAnswers = 0;
        const detailedAnswers: AttemptAnswers = {};

        quiz.questions.forEach((question, index) => {
            const selectedAnswer = answers[index];
            const isText = question.type === 'text';
            let isCorrect = false;

            if (isText) {
                // For text questions, we don't auto-grade. Mark as correct only if exact match? 
                // No, usually requires manual review. For now count as 0 points until reviewed.
                isCorrect = false;
            } else {
                isCorrect = selectedAnswer === question.correctAnswer;
                if (isCorrect) {
                    score += question.points;
                    correctAnswers++; // Count correct answers separately
                }
            }

            const answerDetail: DetailedAnswer = {
                selected: selectedAnswer,
                isCorrect,
                type: question.type || 'multiple-choice'
            };
            detailedAnswers[index] = answerDetail;
        });

        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        // Calculate percentage based on auto-graded questions initially? 
        // Or just show current score. User asked for manual review.
        const percentage = Math.round((score / totalPoints) * 100);

        onComplete({
            score: correctAnswers, // Use correct answers count for display
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken,
            answers: detailedAnswers,
            passed: percentage >= quiz.passingScore,
            reviewStatus: quiz.questions.some(q => q.type === 'text') ? 'pending' : 'completed',
            powerUpsUsed: usedPowerUps
        });
    }, [answers, onComplete, quiz, storageKey, usedPowerUps, isSubmitting]);

    useEffect(() => {
        if (showResumePrompt || isSubmitting) return; // Pause timer while prompting or submitting

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleQuizComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [handleQuizComplete, showResumePrompt, isSubmitting]);

    const nextQuestion = () => {
        if (isSubmitting) return;
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            resetQuestionState();
        } else {
            handleQuizComplete();
        }
    };

    const previousQuestion = () => {
        if (isSubmitting) return;
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
            resetQuestionState();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
                <Navbar
                    user={user}
                    onBack={onBack}
                    showBack={true}
                    title={quiz.title}
                    onViewProfile={() => { }}
                    onViewLeaderboard={() => { }}
                    onLogout={() => { }}
                    showActions={false}
                />
                <div className="max-w-3xl mx-auto p-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 text-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quiz Unavailable</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            This quiz has no questions yet. Please try another quiz.
                        </p>
                        <button
                            onClick={onBack}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Back to Quizzes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const q = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
    const selectedAnswer = answers[currentQuestion];
    const answeredCount = Object.keys(answers).length;
    const isTextQuestion = q.type === 'text';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Navbar
                user={user}
                onBack={onBack}
                showBack={true}
                title={quiz.title}
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{q.part}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className={`text-center transition-colors duration-300 ${timeLeft < 60 ? 'animate-pulse' : ''}`}>
                                <div className={`flex items-center gap-2 text-lg font-bold ${timeLeft < 60
                                    ? 'text-red-600 dark:text-red-400 scale-110'
                                    : 'text-purple-600 dark:text-purple-400'
                                    } transition-all duration-300`}>
                                    <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'animate-bounce' : ''}`} />
                                    {formatTime(timeLeft)}
                                </div>
                                <div className={`text-xs ${timeLeft < 60 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {timeLeft < 60 ? 'Hurry up!' : 'Time Left'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{answeredCount}/{quiz.questions.length}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Answered</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${timeLeft < 60 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                    </div>
                </div>

                {/* Main Content Grid with Sidebar */}
                <div className={`grid grid-cols-1 ${!hidePowerUps ? 'lg:grid-cols-[200px_1fr]' : ''} gap-4`}>
                    {/* Power-Ups Sidebar */}
                    {!hidePowerUps && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                Power-Ups
                            </h3>

                            {/* 50/50 Power-Up */}
                            <button
                                onClick={useFiftyFifty}
                                disabled={fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion}
                                className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                    : 'border-blue-400 dark:border-blue-500/50 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/40 dark:to-cyan-900/40 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 cursor-pointer'
                                    }`}
                            >
                                {/* Animated background */}
                                {!fiftyUsed && countPowerUp('5050') > 0 && !isTextQuestion && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                        ? 'bg-gray-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-105 shadow-md'
                                        }`}>
                                        <Target className="w-5 h-5 text-white" />
                                    </div>

                                    {/* Title */}
                                    <div className="text-center mb-1.5">
                                        <div className={`text-base font-black ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'text-gray-500 dark:text-slate-500'
                                            : 'text-blue-700 dark:text-white'
                                            }`}>
                                            50/50
                                        </div>
                                        <div className={`text-[10px] leading-tight ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'text-gray-400 dark:text-slate-600'
                                            : 'text-blue-600 dark:text-blue-300'
                                            }`}>
                                            Remove 2 options
                                        </div>
                                    </div>

                                    {/* Quantity Badge */}
                                    <div className="flex justify-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                            }`}>
                                            <Zap className="w-2.5 h-2.5" />
                                            x{countPowerUp('5050')}
                                        </div>
                                    </div>

                                    {fiftyUsed && (
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                    )}
                                </div>
                            </button>

                            {/* Time Freeze Power-Up */}
                            <button
                                onClick={useTimeFreeze}
                                disabled={timeFreezeUsed || countPowerUp('time_freeze') <= 0}
                                className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                    : 'border-orange-400 dark:border-orange-500/50 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/40 dark:to-red-900/40 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 cursor-pointer'
                                    }`}
                            >
                                {/* Animated background */}
                                {!timeFreezeUsed && countPowerUp('time_freeze') > 0 && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                        ? 'bg-gray-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-105 shadow-md'
                                        }`}>
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>

                                    {/* Title */}
                                    <div className="text-center mb-1.5">
                                        <div className={`text-base font-black ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'text-gray-500 dark:text-slate-500'
                                            : 'text-orange-700 dark:text-white'
                                            }`}>
                                            Time Freeze
                                        </div>
                                        <div className={`text-[10px] leading-tight ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'text-gray-400 dark:text-slate-600'
                                            : 'text-orange-600 dark:text-orange-300'
                                            }`}>
                                            +20 seconds
                                        </div>
                                    </div>

                                    {/* Quantity Badge */}
                                    <div className="flex justify-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                            : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                                            }`}>
                                            <Zap className="w-2.5 h-2.5" />
                                            x{countPowerUp('time_freeze')}
                                        </div>
                                    </div>

                                    {timeFreezeUsed && (
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                    )}
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Question Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                        <div className="mb-6">
                            <div className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full font-semibold mb-4">
                                Question {q.id}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white whitespace-pre-line">{q.question}</h2>
                            {q.imageUrl && (
                                <div className="mt-4">
                                    <img src={q.imageUrl} alt="Question visual" className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 object-contain" />
                                </div>
                            )}
                            {q.codeSnippet && (
                                <pre className="mt-4 p-4 bg-gray-900 text-green-100 rounded-xl text-sm overflow-x-auto">
                                    {q.codeSnippet}
                                </pre>
                            )}
                            {q.audioUrl && (
                                <div className="mt-4">
                                    <audio controls src={q.audioUrl} className="w-full" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 mb-6">
                            {isTextQuestion ? (
                                <textarea
                                    value={selectedAnswer as string || ''}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none min-h-[150px]"
                                />
                            ) : (
                                q.options?.map((option, index) => {
                                    const isSelected = selectedAnswer === index;
                                    if (eliminatedOptions.has(index)) return null;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswer(index)}
                                            className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 font-medium text-lg ${isSelected
                                                ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 text-purple-900 dark:text-purple-100'
                                                : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <span className="flex-1">{option}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            {currentQuestion > 0 && (
                                <button
                                    onClick={previousQuestion}
                                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-xl font-bold text-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                >
                                    Previous
                                </button>
                            )}
                            <button
                                onClick={nextQuestion}
                                disabled={selectedAnswer === undefined || isSubmitting}
                                className={`flex-1 py-4 rounded-xl font-bold text-xl transition-all ${selectedAnswer !== undefined && !isSubmitting
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    currentQuestion < quiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'
                                )}
                            </button>
                        </div>

                        {selectedAnswer === undefined && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Please select an answer to continue
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Resume Prompt Modal */}
            {showResumePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Resume Quiz?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We found an unfinished attempt from {savedState ? new Date(savedState.lastUpdated).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-8">
                            Would you like to continue where you left off or start over from the beginning?
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={handleStartNew}
                                className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleResume}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-purple-500/25"
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizTaking;
