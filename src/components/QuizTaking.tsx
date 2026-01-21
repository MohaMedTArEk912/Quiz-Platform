import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, CheckCircle, XCircle, Target } from 'lucide-react';
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
    const [usedPowerUps] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shakeError, setShakeError] = useState(false);

    // Delayed Validation / Retry Mode State
    const [retryMode, setRetryMode] = useState(false);
    const [wrongQuestionIndices, setWrongQuestionIndices] = useState<number[]>([]);

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
            if (!q.isBlock && !q.isCompiler && q.type !== 'text') {
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
        // We show feedback if it's explicitly enabled (reviewMode) OR if it's a standard quiz (not delayed/challenge)
        // Adjusting default: if not delayed, we assume we want feedback unless specifically disabled?
        // User asked to "return the review".
        if (!delayedValidation) {
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
            quiz.questions.forEach((qObj, idx) => {
                const currentAns = newAnswers[idx];
                if (currentAns !== undefined && qObj.type !== 'text') {
                    answered++;
                    if (currentAns === qObj.correctAnswer) {
                        currentScore += qObj.points;
                    }
                }
            });
            // For VS Game, specifically returning count of answered questions is useful
            onProgress(currentScore, answered);
        }

        // Auto Advance (for non-delayed, strict or simple flow)
        // If delayedValidation is ON, we generally DON'T auto-advance on click, user must navigate or submit.
        // BUT if it's the simplifed VS mode where speed matters:
        // "make the qusiton sumbet without right or wrong till the user submet"
        // This implies manual navigation or "Next" button.
        // I will let the UI buttons handle navigation.

        // HOWEVER, if it's strict mode (Start -> Finish race), users usually want auto-advance on correct.
        if (mustAnswerCorrectly && !delayedValidation && !q.isBlock && !q.isCompiler && q.type !== 'text') {
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

        // 1. Delayed Validation Check
        if (delayedValidation) {
            const wrongs: number[] = [];

            // Iterate over all questions to check correctness
            // Note: we iterate over `questionOrder` to check them in order users saw them, 
            // but we need to store indices compatible with our view logic.
            // Actually, let's store indices into `questionOrder` so `retryMode` logic works.

            questionOrder.forEach((actualIndex, orderIdx) => {
                const q = quiz.questions[actualIndex];
                const ans = answers[actualIndex];

                let isCorrect = false;
                if (q.type === 'text') {
                    isCorrect = false; // Manual review
                } else if (q.isBlock || q.isCompiler) {
                    // Simplistic check for now, real check is complex
                    // Assume if they provided code/answer it's proper? No, strict check needed.
                    // For VS mode, usually MCQs.
                    // If we have complex questions in VS mode, we need the full checker.
                    // I'll implement a basic checker here.
                    isCorrect = checkComplexAnswer(q, ans);
                } else {
                    isCorrect = ans === q.correctAnswer;
                }

                if (!isCorrect) {
                    wrongs.push(orderIdx);
                }
            });

            if (wrongs.length > 0) {
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
            powerUpsUsed: usedPowerUps
        });

    }, [answers, delayedValidation, isSubmitting, onComplete, questionOrder, quiz.questions, timeLeft, countUpTimer, usedPowerUps]);


    // Helper for checking correctness (used in grading and retry logic)
    const checkComplexAnswer = (q: any, ans: any): boolean => {
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
    }, [countUpTimer, isSubmitting, isUnlimitedTime, showResumePrompt]); // removed handleQuizComplete from deps to verify loop safety


    // --- RENDER HELPERS ---
    const actualIndex = getActualQuestionIndex();
    const q = quiz.questions[actualIndex];
    if (!q) return <div>Loading...</div>;

    const currentOptions = optionsOrder[actualIndex] || [];




    return (
        <div className={`w-full transition-colors ${embedded ? 'h-full flex flex-col bg-transparent' : 'min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-6'}`}>
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

            <div className={`flex flex-col h-full ${embedded ? '' : 'max-w-4xl mx-auto mt-4'}`}>
                {/* Header Stats */}
                <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                            {/* Display visual number (1-based) */}
                            {retryMode ? currentQuestion + 1 : currentQuestion + 1}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {retryMode ? 'Retrying' : 'Question'}
                            </div>
                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                <span className="text-xl">{retryMode ? currentQuestion + 1 : currentQuestion + 1}</span>
                                <span className="text-slate-400 text-sm"> / {retryMode ? wrongQuestionIndices.length : quiz.questions.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-xl font-mono text-xl font-bold border-2 ${!countUpTimer && timeLeft < 30 ? 'bg-red-50 border-red-100 text-red-500 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-white'
                        }`}>
                        <Clock className="w-5 h-5" />
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Question Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative flex flex-col">
                    {retryMode && (
                        <div className="bg-red-500 text-white text-center py-2 text-sm font-bold uppercase tracking-wider animate-in slide-in-from-top">
                            Retry Incorrect Answers
                        </div>
                    )}

                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-8 leading-tight">
                            {q.question}
                        </h2>

                        {/* Options */}
                        {/* Question Content Area */}
                        <Suspense fallback={
                            <div className="flex justify-center items-center h-48">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }>
                            {q.isCompiler ? (
                                <div className="h-[500px]">
                                    <CompilerQuestion
                                        // specific props depend on component, assuming standard interface
                                        initialCode={q.compilerConfig?.initialCode}
                                        language={q.compilerConfig?.language || 'javascript'}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting || (questionSubmitted && !delayedValidation)}
                                    />
                                </div>
                            ) : (
                                /* Options (Text/MCQ) */
                                <div className="grid grid-cols-1 gap-4">
                                    {currentOptions.map((originalIndex, visualIndex) => {
                                        const option = q.options![originalIndex];
                                        const isSelected = answers[actualIndex] === originalIndex;

                                        return (
                                            <button
                                                key={originalIndex}
                                                onClick={() => handleAnswer(originalIndex)}
                                                disabled={isSubmitting || (questionSubmitted && !delayedValidation)}
                                                className={`group relative p-6 rounded-2xl text-left transition-all duration-200 border-2 flex items-center gap-4
                                                    ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                                        : 'bg-slate-50 dark:bg-slate-700/30 border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-700'
                                                    }
                                                `}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border
                                                    ${isSelected
                                                        ? 'bg-white text-indigo-600 border-white'
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600'
                                                    }
                                                `}>
                                                    {String.fromCharCode(65 + visualIndex)}
                                                </div>
                                                <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {option}
                                                </span>
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

                    {/* Footer */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4">
                        <button
                            onClick={previousQuestion}
                            disabled={currentQuestion === 0 || isSubmitting}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-white disabled:opacity-30 transition-all"
                        >
                            Previous
                        </button>

                        {isLastQuestion ? (
                            <button
                                onClick={handleQuizComplete}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {retryMode ? 'Submit Retries' : delayedValidation ? 'Submit All' : 'Finish'}
                                <Target className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {questionSubmitted && !delayedValidation ? 'Continue' : 'Next'}
                                <span className="opacity-60 text-sm">→</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {shakeError && (
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-8px); }
                        75% { transform: translateX(8px); }
                    }
                    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                `}</style>
            )}
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
