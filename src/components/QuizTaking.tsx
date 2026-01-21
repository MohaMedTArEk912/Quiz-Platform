import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, CheckCircle, XCircle, Target, Zap, Shield, Lightbulb, ArrowLeft, TrendingUp, Award, Flame } from 'lucide-react';
import type { Quiz, UserData, QuizResult, AttemptAnswers } from '../types';
import Navbar from './Navbar';

const CompilerQuestion = React.lazy(() => import('./question-types/CompilerQuestion'));
// const Loader = React.lazy(() => import('./PageLoader')); // Unused locally? Using inline loader for now.

// Define Props
interface QuizTakingProps {
    quiz: Quiz;
    user: UserData;
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
    onProgress?: (score: number, currentQuestionIndex: number) => void;
    powerUps?: { type: string; quantity: number }[];
    onPowerUpUsed?: (type: string) => void;
    hidePowerUps?: boolean;
    embedded?: boolean;
    mustAnswerCorrectly?: boolean;
    countUpTimer?: boolean;
    delayedValidation?: boolean;
}

type SavedQuizState = {
    quizId: string;
    currentQuestion: number;
    answers: Record<number, string | number>;
    timeLeft: number;
    lastUpdated: number;
    questionOrder?: number[];
};

const QuizTaking: React.FC<QuizTakingProps> = ({
    quiz,
    user,
    onComplete,
    onBack,
    onProgress,
    powerUps,
    onPowerUpUsed,
    hidePowerUps,
    embedded,
    mustAnswerCorrectly,
    countUpTimer = false,
    delayedValidation = false
}) => {
    // --- STATE MANAGEMENT ---
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});

    // Timer: if countUp, this is elapsed time. If countdown, this is remaining time.
    const [timeLeft, setTimeLeft] = useState(countUpTimer ? 0 : quiz.timeLimit * 60);
    const startTimeRef = useRef(Date.now());

    // PowerUp States


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shakeError, setShakeError] = useState(false);

    // Delayed Validation / Retry Mode State
    const [retryMode, setRetryMode] = useState(false);
    const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]); const [correctAnswersCount, setCorrectAnswersCount] = useState(0); // Track actual correct count for progress
    // Review Mode / Immediate Feedback States
    const [questionSubmitted, setQuestionSubmitted] = useState(false);
    const [isCurrentAnswerCorrect, setIsCurrentAnswerCorrect] = useState(false);
    const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
    const [questionCorrectness, setQuestionCorrectness] = useState<Record<number, boolean>>({});

    const quizIdentifier = quiz.id || quiz._id || quiz.title;
    const storageKey = `quiz_progress_${user.userId}_${quizIdentifier}`;

    const isUnlimitedTime = (quiz.timeLimit === 0 && !countUpTimer);

    // --- LOGIC: Shuffling ---
    const generateShuffledIndices = useCallback((length: number) => {
        const indices = Array.from({ length }, (_, i) => i);
        for (let i = length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    }, []);

    const [questionOrder, setQuestionOrder] = useState<number[]>(() =>
        generateShuffledIndices(quiz.questions ? quiz.questions.length : 0)
    );

    const [optionsOrder, setOptionsOrder] = useState<Record<number, number[]>>({});

    useEffect(() => {
        const newOptionsOrder: Record<number, number[]> = {};
        quiz.questions.forEach((q, index) => {
            if (q.options && q.options.length > 0) {
                if (q.shuffleOptions === false) {
                    newOptionsOrder[index] = Array.from({ length: q.options.length }, (_, i) => i);
                } else {
                    newOptionsOrder[index] = generateShuffledIndices(q.options.length);
                }
            }
        });
        setOptionsOrder(newOptionsOrder);
    }, [quiz.questions, generateShuffledIndices]);

    // --- LOGIC: Restore Saved State ---
    const initialSavedState = useMemo(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            // Invalidate if quiz settings changed drastically
            if (parsed.quizId === quizIdentifier) {
                return parsed as SavedQuizState;
            }
        } catch (e) {
            console.error("Failed to parse saved state", e);
        }
        return null;
    }, [quizIdentifier, storageKey]);

    const [showResumePrompt, setShowResumePrompt] = useState(Boolean(initialSavedState) && !embedded);
    const [savedState, setSavedState] = useState<SavedQuizState | null>(initialSavedState);

    // Initial Timer reference
    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [quizIdentifier]);

    // Save state effect
    useEffect(() => {
        if (showResumePrompt || isSubmitting || embedded || countUpTimer) return; // Don't save for embedded usually or countUp race

        const state = {
            quizId: quizIdentifier,
            currentQuestion,
            answers,
            timeLeft,
            lastUpdated: Date.now(),
            questionOrder
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quizIdentifier, storageKey, showResumePrompt, isSubmitting, questionOrder, embedded, countUpTimer]);

    const handleResume = () => {
        if (savedState) {
            setCurrentQuestion(savedState.currentQuestion);
            setAnswers(savedState.answers);
            setTimeLeft(savedState.timeLeft);
            if (savedState.questionOrder) {
                setQuestionOrder(savedState.questionOrder);
            }
        }
        resetQuestionState();
        setShowResumePrompt(false);
    };

    const handleStartNew = () => {
        setQuestionOrder(generateShuffledIndices(quiz.questions.length));
        // Reshuffle options logic again? Already done by default initial state.
        sessionStorage.removeItem(storageKey);
        setSavedState(null);
        setShowResumePrompt(false);
        resetQuestionState();
    };

    const resetQuestionState = () => {
        setShakeError(false);

        if (!quiz.reviewMode) {
            setQuestionSubmitted(false);
            setIsCurrentAnswerCorrect(false);
        } else {
            // In review mode, we might want to check if we already answered/submitted this one
            const qIndex = retryMode ? wrongQuestionIndices[currentQuestion] : currentQuestion;
            // Note: reviewMode usually implies iterating 0..N.
            setQuestionSubmitted(submittedQuestions[qIndex] || false);
            setIsCurrentAnswerCorrect(questionCorrectness[qIndex] || false);
        }
    };

    // --- LOGIC: Answering & Validation ---

    // Helper to determine the ACTUAL index in the original quiz.questions array
    const getActualQuestionIndex = () => {
        if (retryMode) {
            const wrongIndex = wrongQuestionIndices[currentQuestion]; // index into questionOrder
            return questionOrder[wrongIndex];
        }
        return questionOrder[currentQuestion];
    };

    const handleAnswer = (answer: string | number) => {
        if (isSubmitting) return;

        const actualIndex = getActualQuestionIndex();
        const q = quiz.questions[actualIndex];

        // Strict Mode Check (Immediate Failure)
        if (mustAnswerCorrectly && !delayedValidation) {
            if (!q.isCompiler && q.type !== 'text') {
                if (answer !== q.correctAnswer) {
                    setShakeError(true);
                    setTimeout(() => setShakeError(false), 400);
                    return;
                }
            }
        }

        // Save Answer
        const newAnswers = { ...answers, [actualIndex]: answer };
        setAnswers(newAnswers);

        // Immediate Feedback Logic (Normal Mode)
        // Only show immediate feedback if reviewMode is NOT explicitly disabled
        if (!delayedValidation && quiz.reviewMode !== false) {
            const isCorrect = q.type === 'text' ? false : answer === q.correctAnswer;
            setIsCurrentAnswerCorrect(isCorrect);
            setQuestionSubmitted(true);

            // Persist valid state for navigation
            setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: true }));
            setQuestionCorrectness(prev => ({ ...prev, [actualIndex]: isCorrect }));
        }

        // Progress Callback
        if (onProgress) {
            let currentScore = 0;
            let answered = 0;
            let correctCount = 0;
            quiz.questions.forEach((qObj, idx) => {
                const currentAns = newAnswers[idx];
                if (currentAns !== undefined && qObj.type !== 'text') {
                    answered++;
                    const isCorrect = checkComplexAnswer(qObj, currentAns);
                    if (isCorrect) {
                        currentScore += qObj.points;
                        correctCount++;
                    }
                }
            });
            // For VS Game in delayed mode, we track correct answers for actual progress
            // In regular mode, we track answered questions
            const progressIndex = delayedValidation ? correctCount : answered;
            onProgress(currentScore, progressIndex);
            if (delayedValidation) {
                setCorrectAnswersCount(correctCount);
            }
        }

        // Auto Advance (for non-delayed, strict or simple flow)
        // If delayedValidation is ON, we generally DON'T auto-advance on click, user must navigate or submit.
        // BUT if it's the simplifed VS mode where speed matters:
        // "make the qusiton sumbet without right or wrong till the user submet"
        // This implies manual navigation or "Next" button.
        // I will let the UI buttons handle navigation.

        // HOWEVER, if it's strict mode (Start -> Finish race), users usually want auto-advance on correct.
        if (mustAnswerCorrectly && !delayedValidation && !q.isCompiler && q.type !== 'text') {
            setTimeout(() => {
                nextQuestion();
            }, 300);
        }
    };

    // Navigation
    // `currentQuestion` is the index in the CURRENT VIEW (Normal or Retry).
    const isLastQuestion = retryMode
        ? currentQuestion === wrongQuestionIndices.length - 1
        : currentQuestion === quiz.questions.length - 1;

    const nextQuestion = () => {
        if (isSubmitting) return;
        if (!isLastQuestion) {
            setCurrentQuestion(c => c + 1);
            resetQuestionState();
        } else {
            // End of list
            handleQuizComplete();
        }
    };

    const previousQuestion = () => {
        if (isSubmitting) return;
        if (currentQuestion > 0) {
            setCurrentQuestion(c => c - 1);
            resetQuestionState();
        }
    };

    // --- LOGIC: Completion & Grading ---
    const handleQuizComplete = useCallback(() => {
        if (isSubmitting) return;

        // 1. Delayed Validation Check (VS Mode with Retry)
        if (delayedValidation) {
            const wrongs: number[] = [];

            // Iterate over all questions to check correctness
            questionOrder.forEach((actualIndex, orderIdx) => {
                const q = quiz.questions[actualIndex];
                const ans = answers[actualIndex];

                let isCorrect = false;
                if (q.type === 'text') {
                    isCorrect = false; // Manual review
                } else if (q.isCompiler) {
                    isCorrect = checkComplexAnswer(q, ans);
                } else {
                    isCorrect = ans === q.correctAnswer;
                }

                if (!isCorrect) {
                    wrongs.push(orderIdx);
                }
            });

            if (wrongs.length > 0) {
                // Calculate new progress: total questions - wrong answers
                const newCorrectCount = quiz.questions.length - wrongs.length;
                setCorrectAnswersCount(newCorrectCount);

                // Notify progress rollback
                if (onProgress) {
                    let currentScore = 0;
                    quiz.questions.forEach((qObj, idx) => {
                        const currentAns = answers[idx];
                        if (currentAns !== undefined && checkComplexAnswer(qObj, currentAns)) {
                            currentScore += qObj.points;
                        }
                    });
                    onProgress(currentScore, newCorrectCount);
                }

                setRetryMode(true);
                setWrongQuestionIndices(wrongs);
                setCurrentQuestion(0);
                setShakeError(true);
                setTimeout(() => setShakeError(false), 500);
                return; // STOP here, let user fix wrongs.
            }
        }

        // 2. Final Submission (All correct or Strict Mode passed or Time Up)
        setIsSubmitting(true);
        sessionStorage.removeItem(storageKey);

        const endTime = Date.now();
        const duration = countUpTimer ? timeLeft : Math.floor((endTime - startTimeRef.current) / 1000);

        // Final Score Calc
        let score = 0;
        const detailedAnswers: AttemptAnswers = {};

        quiz.questions.forEach((q, idx) => {
            const ans = answers[idx];
            const isCorrect = checkComplexAnswer(q, ans);

            if (isCorrect) score += q.points;

            detailedAnswers[idx] = {
                selected: ans,
                isCorrect,
                type: q.type || 'multiple-choice'
            };
        });

        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

        onComplete({
            score,
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken: duration,
            answers: detailedAnswers,
            passed: percentage >= quiz.passingScore,
            reviewStatus: 'completed',
            powerUpsUsed: []
        });

    }, [answers, delayedValidation, isSubmitting, onComplete, onProgress, questionOrder, quiz.questions, quiz.passingScore, storageKey, timeLeft, countUpTimer, setCorrectAnswersCount]);


    // Helper for checking correctness (used in grading and retry logic)
    const checkComplexAnswer = (q: { type?: string; isCompiler?: boolean; compilerConfig?: { referenceCode?: string }; correctAnswer?: string | number }, ans: string | number | undefined): boolean => {
        if (q.type === 'text') return false;

        if (q.isCompiler) {
            if (q.compilerConfig?.referenceCode && ans) {
                // Normalize
                const norm = (s: string) => s.replace(/\s+/g, '').trim();
                return norm(String(ans)) === norm(q.compilerConfig.referenceCode);
            }
            return false;
        }

        return ans === q.correctAnswer;
    };


    // --- LOGIC: Timer ---
    useEffect(() => {
        if (showResumePrompt || isSubmitting || isUnlimitedTime) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (countUpTimer) {
                    return prev + 1;
                }
                if (prev <= 1) {
                    handleQuizComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countUpTimer, isSubmitting, isUnlimitedTime, showResumePrompt, handleQuizComplete]);


    // --- RENDER HELPERS ---
    const actualIndex = getActualQuestionIndex();
    const q = quiz.questions[actualIndex];
    if (!q) return <div>Loading...</div>;

    const currentOptions = optionsOrder[actualIndex] || [];




    // Calculate progress percentage
    const progressPercentage = retryMode
        ? ((currentQuestion + 1) / wrongQuestionIndices.length) * 100
        : ((currentQuestion + 1) / quiz.questions.length) * 100;

    // Power-up helpers
    const getPowerUpIcon = (type: string) => {
        switch (type) {
            case 'hint': return <Lightbulb className="w-4 h-4" />;
            case 'time': return <Clock className="w-4 h-4" />;
            case 'skip': return <Target className="w-4 h-4" />;
            case 'shield': return <Shield className="w-4 h-4" />;
            default: return <Zap className="w-4 h-4" />;
        }
    };

    const getPowerUpColor = (type: string) => {
        switch (type) {
            case 'hint': return 'from-yellow-500 to-orange-500';
            case 'time': return 'from-blue-500 to-cyan-500';
            case 'skip': return 'from-purple-500 to-pink-500';
            case 'shield': return 'from-green-500 to-emerald-500';
            default: return 'from-indigo-500 to-purple-500';
        }
    };

    return (
        <div className={`w-full transition-colors ${embedded ? 'h-full flex flex-col bg-transparent' : 'min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 p-4 md:p-6'}`}>
            {/* Animated Background Elements */}
            {!embedded && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
                </div>
            )}

            {!embedded && (
                <Navbar
                    user={user}
                    onBack={onBack}
                    title={quiz.title}
                    onViewProfile={() => { }}
                    onViewLeaderboard={() => { }}
                    onLogout={() => { }}
                />
            )}

            <div className={`flex flex-col h-full ${embedded ? '' : 'max-w-5xl mx-auto mt-4 relative z-10'}`}>
                {/* Enhanced Header with Progress Bar */}
                <div className="mb-6 space-y-4">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between">
                        {/* Back Button */}
                        {!embedded && (
                            <button
                                onClick={onBack}
                                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Back</span>
                            </button>
                        )}

                        {/* Timer & Stats */}
                        <div className="flex items-center gap-3 ml-auto">
                            {/* Score Display */}
                            {delayedValidation && correctAnswersCount > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
                                    <Award className="w-4 h-4" />
                                    <span className="font-black text-sm">{correctAnswersCount} Correct</span>
                                </div>
                            )}

                            {/* Timer */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-black shadow-lg ${!countUpTimer && timeLeft < 30
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-red-500/50'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700'
                                }`}>
                                <Clock className={`w-5 h-5 ${!countUpTimer && timeLeft < 30 ? 'animate-spin' : ''}`} />
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-lg shadow-lg shadow-indigo-500/25">
                                    {retryMode ? currentQuestion + 1 : currentQuestion + 1}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {retryMode ? 'Retry Mode' : 'Progress'}
                                    </div>
                                    <div className="font-black text-slate-700 dark:text-slate-200">
                                        Question {retryMode ? currentQuestion + 1 : currentQuestion + 1} of {retryMode ? wrongQuestionIndices.length : quiz.questions.length}
                                    </div>
                                </div>
                            </div>

                            {/* Power-ups Display */}
                            {!hidePowerUps && powerUps && powerUps.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Power-ups:</span>
                                    {powerUps.map((powerUp, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onPowerUpUsed && onPowerUpUsed(powerUp.type)}
                                            disabled={powerUp.quantity === 0}
                                            className={`group relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r ${getPowerUpColor(powerUp.type)} text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                                        >
                                            {getPowerUpIcon(powerUp.type)}
                                            <span className="font-black">{powerUp.quantity}</span>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                {powerUp.type.charAt(0).toUpperCase() + powerUp.type.slice(1)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Progress Bar Track */}
                        <div className="relative h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${retryMode
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                                    }`}
                                style={{ width: `${progressPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                            {/* Milestone markers */}
                            {[25, 50, 75].map((milestone) => (
                                <div
                                    key={milestone}
                                    className="absolute top-0 h-full w-0.5 bg-slate-300 dark:bg-slate-600"
                                    style={{ left: `${milestone}%` }}
                                />
                            ))}
                        </div>

                        {/* Progress Stats */}
                        <div className="flex items-center justify-between mt-2 text-xs">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                                {Math.round(progressPercentage)}% Complete
                            </span>
                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <TrendingUp className="w-3 h-3" />
                                <span className="font-semibold">
                                    {retryMode
                                        ? `${wrongQuestionIndices.length - currentQuestion} to go`
                                        : `${quiz.questions.length - currentQuestion - 1} remaining`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Question Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 relative flex flex-col group hover:shadow-indigo-500/10 transition-shadow">
                    {/* Retry Mode Banner */}
                    {retryMode && (
                        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white text-center py-3 px-4 text-sm font-black uppercase tracking-wider animate-in slide-in-from-top shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            <div className="relative flex items-center justify-center gap-2">
                                <Flame className="w-4 h-4 animate-bounce" />
                                <span>⚠️ {wrongQuestionIndices.length} Wrong Answer{wrongQuestionIndices.length !== 1 ? 's' : ''} - Fix to Continue!</span>
                                <Flame className="w-4 h-4 animate-bounce" />
                            </div>
                        </div>
                    )}

                    {/* Question Content */}
                    <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Question Number Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-4">
                            <Target className="w-3 h-3" />
                            Question {currentQuestion + 1}
                        </div>

                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-8 leading-tight tracking-tight">
                            {q.question}
                        </h2>

                        {/* Question Content Area */}
                        <Suspense fallback={
                            <div className="flex justify-center items-center h-48">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }>
                            {q.isCompiler ? (
                                <div className="h-[500px]">
                                    <CompilerQuestion
                                        initialCode={q.compilerConfig?.initialCode}
                                        language={q.compilerConfig?.language || 'javascript'}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting || (questionSubmitted && !delayedValidation)}
                                    />
                                </div>
                            ) : (
                                /* Enhanced Options (Text/MCQ) */
                                <div className="grid grid-cols-1 gap-3">
                                    {currentOptions.map((originalIndex, visualIndex) => {
                                        const option = q.options![originalIndex];
                                        const isSelected = answers[actualIndex] === originalIndex;

                                        return (
                                            <button
                                                key={originalIndex}
                                                onClick={() => handleAnswer(originalIndex)}
                                                disabled={isSubmitting || (questionSubmitted && !delayedValidation)}
                                                className={`group relative p-5 rounded-2xl text-left transition-all duration-300 border-2 flex items-center gap-4 overflow-hidden
                                                    ${isSelected
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/30 scale-[1.02] translate-x-1'
                                                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:scale-[1.01] hover:translate-x-1'
                                                    }
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                            >
                                                {/* Animated Background */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                                                )}

                                                {/* Option Letter Badge */}
                                                <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-lg transition-all
                                                    ${isSelected
                                                        ? 'bg-white text-indigo-600 shadow-white/50'
                                                        : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white group-hover:scale-110'
                                                    }
                                                `}>
                                                    {String.fromCharCode(65 + visualIndex)}
                                                </div>

                                                {/* Option Text */}
                                                <span className={`relative z-10 font-bold text-base flex-1 ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                                    }`}>
                                                    {option}
                                                </span>

                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm">
                                                        <CheckCircle className="w-5 h-5 text-white" />
                                                    </div>
                                                )}

                                                {/* Hover Arrow */}
                                                {!isSelected && (
                                                    <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                            <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">→</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Suspense>

                        {/* Feedback Banner (Normal Mode) */}
                        {questionSubmitted && !delayedValidation && (
                            <div className={`mt-6 p-4 rounded-xl border-l-4 animate-in fade-in slide-in-from-top-2 ${isCurrentAnswerCorrect
                                ? 'bg-green-50 border-green-500 text-green-900 dark:bg-green-900/20 dark:border-green-500 dark:text-green-100'
                                : 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/20 dark:border-red-500 dark:text-red-100'
                                }`}>
                                <h3 className="font-bold flex items-center gap-2 text-lg">
                                    {isCurrentAnswerCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                    {isCurrentAnswerCorrect ? "Correct!" : "Incorrect"}
                                </h3>
                                {!isCurrentAnswerCorrect && (
                                    <p className="mt-2 font-medium">
                                        Correct Answer: <span className="font-bold">
                                            {q.options && q.correctAnswer !== undefined ? q.options[q.correctAnswer] : 'Unknown'}
                                        </span>
                                    </p>
                                )}
                                {q.explanation && (
                                    <div className="mt-3 text-sm opacity-90 border-t border-current pt-2 opacity-80">
                                        <span className="font-bold uppercase text-xs tracking-wider opacity-70 block mb-1">Explanation</span>
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Enhanced Footer with Navigation */}
                    <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
                        <button
                            onClick={previousQuestion}
                            disabled={currentQuestion === 0 || isSubmitting}
                            className="group flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Previous</span>
                        </button>

                        {/* Navigation Dots */}
                        <div className="hidden md:flex items-center gap-2">
                            {(retryMode ? wrongQuestionIndices : Array.from({ length: Math.min(quiz.questions.length, 10) }, (_, i) => i)).slice(0, 10).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentQuestion
                                            ? 'bg-indigo-600 dark:bg-indigo-400 w-8'
                                            : idx < currentQuestion
                                                ? 'bg-green-500 dark:bg-green-400'
                                                : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                />
                            ))}
                        </div>

                        {isLastQuestion ? (
                            <button
                                onClick={handleQuizComplete}
                                disabled={isSubmitting}
                                className="group relative px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-black shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 active:scale-95 transition-all flex items-center gap-2 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{retryMode ? 'Submit Retries' : delayedValidation ? 'Submit All' : 'Finish Quiz'}</span>
                                        <Target className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                    </>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                disabled={isSubmitting}
                                className="group px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-black shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{questionSubmitted && !delayedValidation ? 'Continue' : 'Next Question'}</span>
                                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                .animate-shimmer { animation: shimmer 2s infinite; }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgb(241 245 249);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgb(30 41 59);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, rgb(99 102 241), rgb(139 92 246));
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, rgb(79 70 229), rgb(124 58 237));
                }
            `}</style>
            <div className={shakeError ? "fixed inset-0 pointer-events-none animate-shake" : ""} />
            <div className={shakeError ? "fixed inset-0 pointer-events-none animate-shake" : ""} />

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
