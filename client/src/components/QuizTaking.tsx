import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, CheckCircle, XCircle, Target, Zap, Shield, Lightbulb, ArrowLeft, ShoppingBag, Coins } from 'lucide-react';
import type { Quiz, UserData, QuizResult, AttemptAnswers, PoolProgressData } from '../types';
import { api } from '../lib/api';
import { AmbientBackground } from './AmbientBackground';

const CompilerQuestion = React.lazy(() => import('./question-types/CompilerQuestion'));

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
    onUserUpdate?: (updates: Partial<UserData>) => void;
    poolProgress?: PoolProgressData;
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
    delayedValidation = false,
    onUserUpdate,
    poolProgress
}) => {
    // --- STATE MANAGEMENT ---
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});
    const [timeLeft, setTimeLeft] = useState(countUpTimer ? 0 : quiz.timeLimit * 60);
    const startTimeRef = useRef(Date.now());

    // PowerUp / Shop States
    const [showShop, setShowShop] = useState(false);
    const [localCoins, setLocalCoins] = useState(user.coins || 0);
    const [localPowerUps, setLocalPowerUps] = useState(powerUps || []);
    const [hiddenOptions, setHiddenOptions] = useState<Record<number, number[]>>({}); // actualIndex -> [originalOptionsToHide]
    const [activePowerUpAnimation, setActivePowerUpAnimation] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const isSmallWidth = window.innerWidth < 768;
            const isSmallHeight = window.innerHeight < 500;
            setIsMobileDevice(isSmallWidth || isSmallHeight);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const [questionOrder, setQuestionOrder] = useState<number[]>(() => {
        const len = quiz.questions ? quiz.questions.length : 0;
        if (quiz.shuffleQuestions === false) {
            return Array.from({ length: len }, (_, i) => i);
        }
        return generateShuffledIndices(len);
    });

    const [optionsOrder, setOptionsOrder] = useState<Record<number, number[]>>({});

    useEffect(() => {
        if (!quiz.questions || quiz.questions.length === 0) return;
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

    // Update local states if props change
    useEffect(() => {
        const mapped = powerUps?.map(p => ({
            ...p,
            type: p.type === 'time_freeze' ? 'time' : p.type
        })) || [];
        setLocalPowerUps(mapped);
    }, [powerUps]);
    useEffect(() => { setLocalCoins(user.coins || 0); }, [user.coins]);

    // --- LOGIC: Restore Saved State ---
    const initialSavedState = useMemo(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
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

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [quizIdentifier]);

    useEffect(() => {
        if (showResumePrompt || isSubmitting || embedded || countUpTimer) return;
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
        resetQuestionState(savedState?.currentQuestion ?? 0);
        setShowResumePrompt(false);
    };

    const handleStartNew = () => {
        const len = quiz.questions.length;
        setQuestionOrder(quiz.shuffleQuestions === false
            ? Array.from({ length: len }, (_, i) => i)
            : generateShuffledIndices(len));
        sessionStorage.removeItem(storageKey);
        setSavedState(null);
        setShowResumePrompt(false);
        resetQuestionState();
    };

    const getActualQuestionIndex = useCallback((targetIndex = currentQuestion) => {
        if (retryMode) {
            const wrongIndex = wrongQuestionIndices[targetIndex]; 
            return questionOrder[wrongIndex];
        }
        return questionOrder[targetIndex];
    }, [currentQuestion, questionOrder, retryMode, wrongQuestionIndices]);


    const resetQuestionState = useCallback((targetIndex = currentQuestion) => {
        setShakeError(false);
        const isReviewMode = quiz.reviewMode !== false;
        if (!isReviewMode) {
            setQuestionSubmitted(false);
            setIsCurrentAnswerCorrect(false);
        } else {
            const actualIdx = getActualQuestionIndex(targetIndex);
            const hasAnswer = answers[actualIdx] !== undefined;
            setQuestionSubmitted(hasAnswer && (submittedQuestions[actualIdx] || false));
            setIsCurrentAnswerCorrect(hasAnswer && (questionCorrectness[actualIdx] || false));
        }
    }, [currentQuestion, quiz.reviewMode, getActualQuestionIndex, answers, submittedQuestions, questionCorrectness]);


    const isLastQuestion = retryMode
        ? currentQuestion === wrongQuestionIndices.length - 1
        : currentQuestion === quiz.questions.length - 1;

    // Helper for checking correctness
    const checkComplexAnswer = useCallback((q: { type?: string; isCompiler?: boolean; compilerConfig?: { referenceCode?: string }; correctAnswer?: string | number }, ans: string | number | undefined): boolean => {
        if (q.type === 'text') return false;
        if (q.isCompiler) {
            if (q.compilerConfig?.referenceCode && ans) {
                const norm = (s: string) => s.replace(/\s+/g, '').trim();
                return norm(String(ans)) === norm(q.compilerConfig.referenceCode);
            }
            return false;
        }
        return ans === q.correctAnswer;
    }, []);

    const handleQuizComplete = useCallback(() => {
        if (isSubmitting) return;

        if (delayedValidation) {
            const wrongs: number[] = [];
            questionOrder.forEach((actualIndex, orderIdx) => {
                const q = quiz.questions[actualIndex];
                const ans = answers[actualIndex];
                let isCorrect = false;
                if (q.type === 'text') {
                    isCorrect = false;
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
                const newCorrectCount = quiz.questions.length - wrongs.length;
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
                return;
            }
        }

        setIsSubmitting(true);
        sessionStorage.removeItem(storageKey);
        const endTime = Date.now();
        const duration = countUpTimer ? timeLeft : Math.floor((endTime - startTimeRef.current) / 1000);

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
            passed: percentage >= (quiz.passingScore ?? 70),
            reviewStatus: 'completed',
            powerUpsUsed: []
        });

    }, [answers, delayedValidation, isSubmitting, onComplete, onProgress, questionOrder, quiz.questions, quiz.passingScore, storageKey, timeLeft, countUpTimer, checkComplexAnswer]);

    const nextQuestion = useCallback(() => {
        if (isSubmitting) return;
        const actualIdx = getActualQuestionIndex();
        const isReviewMode = quiz.reviewMode !== false;
        if (isReviewMode && !delayedValidation && answers[actualIdx] === undefined) {
            setShakeError(true);
            setTimeout(() => setShakeError(false), 400);
            return; 
        }
        if (!isLastQuestion) {
            setCurrentQuestion(c => c + 1);
            resetQuestionState(currentQuestion + 1);
        } else {
            handleQuizComplete();
        }
    }, [isSubmitting, getActualQuestionIndex, quiz.reviewMode, delayedValidation, answers, isLastQuestion, handleQuizComplete, currentQuestion, resetQuestionState]);

    const previousQuestion = useCallback(() => {
        if (isSubmitting || currentQuestion <= 0) return;
        setCurrentQuestion(c => c - 1);
        resetQuestionState(currentQuestion - 1);
    }, [isSubmitting, currentQuestion, resetQuestionState]);

    const handleAnswer = useCallback((answer: string | number, isKeyboard = false) => {
        if (isSubmitting) return;

        const actualIndex = getActualQuestionIndex();
        const q = quiz.questions[actualIndex];

        // Strict Mode Check
        if (mustAnswerCorrectly && !delayedValidation) {
            if (!q.isCompiler && q.type !== 'text') {
                if (answer !== q.correctAnswer) {
                    setShakeError(true);
                    setTimeout(() => setShakeError(false), 400);
                    return;
                }
            }
        }

        const newAnswers = { ...answers, [actualIndex]: answer };
        setAnswers(newAnswers);

        if (!delayedValidation && quiz.reviewMode !== false) {
            if (isKeyboard) {
                // If keyboard selection in review mode, DO NOT submit/grade immediately.
                return;
            }
            const isCorrect = q.type === 'text' ? false : answer === q.correctAnswer;
            setIsCurrentAnswerCorrect(isCorrect);
            setQuestionSubmitted(true);
            setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: true }));
            setQuestionCorrectness(prev => ({ ...prev, [actualIndex]: isCorrect }));
        }

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
            const progressIndex = delayedValidation ? correctCount : answered;
            onProgress(currentScore, progressIndex);
        }

        if (mustAnswerCorrectly && !delayedValidation && !q.isCompiler && q.type !== 'text') {
            setTimeout(() => {
                nextQuestion();
            }, 300);
        }
    }, [isSubmitting, getActualQuestionIndex, quiz.questions, mustAnswerCorrectly, delayedValidation, answers, quiz.reviewMode, onProgress, checkComplexAnswer, nextQuestion]);


    const submitQuestion = useCallback(() => {
        const actualIndex = getActualQuestionIndex();
        const q = quiz.questions[actualIndex];
        const answer = answers[actualIndex];
        if (answer === undefined) return;

        const isCorrect = q.type === 'text' ? false : answer === q.correctAnswer;
        setIsCurrentAnswerCorrect(isCorrect);
        setQuestionSubmitted(true);
        setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: true }));
        setQuestionCorrectness(prev => ({ ...prev, [actualIndex]: isCorrect }));

        if (onProgress) {
            let currentScore = 0;
            let answered = 0;
            let correctCount = 0;
            quiz.questions.forEach((qObj, idx) => {
                const isCurrent = idx === actualIndex;
                const currentAns = isCurrent ? answer : answers[idx];
                const isAnsSubmitted = isCurrent ? true : submittedQuestions[idx];
                if (currentAns !== undefined && qObj.type !== 'text') {
                    if (isAnsSubmitted) {
                        answered++;
                        const isCorrect = checkComplexAnswer(qObj, currentAns);
                        if (isCorrect) {
                            currentScore += qObj.points;
                            correctCount++;
                        }
                    }
                }
            });
            const progressIndex = delayedValidation ? correctCount : answered;
            onProgress(currentScore, progressIndex);
        }
    }, [answers, getActualQuestionIndex, quiz.questions, submittedQuestions, onProgress, checkComplexAnswer, delayedValidation]);


    // --- Keyboard Shortcuts ---
    useEffect(() => {
        if (showResumePrompt || isSubmitting || showShop) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const actualIndex = getActualQuestionIndex();
            const q = quiz.questions[actualIndex];
            
            // Allow Enter to advance or submit
            if (e.key === 'Enter') {
                e.preventDefault();
                const isReviewMode = quiz.reviewMode !== false;
                if (isReviewMode && !delayedValidation) {
                    const currentAns = answers[actualIndex];
                    if (currentAns === undefined) {
                        setShakeError(true);
                        setTimeout(() => setShakeError(false), 400);
                    } else if (!questionSubmitted) {
                        submitQuestion();
                    } else {
                        nextQuestion();
                    }
                } else {
                    if (answers[actualIndex] === undefined) {
                        setShakeError(true);
                        setTimeout(() => setShakeError(false), 400);
                    } else {
                        nextQuestion();
                    }
                }
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousQuestion();
                return;
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const isReviewMode = quiz.reviewMode !== false;
                if (isReviewMode && !delayedValidation && answers[actualIndex] === undefined) {
                    setShakeError(true);
                    setTimeout(() => setShakeError(false), 400);
                } else {
                    nextQuestion();
                }
                return;
            }

            // Keyboard option selection (1-N or A-N) dynamically based on number of options
            if (q && q.options && !q.isCompiler && (!questionSubmitted || delayedValidation)) {
                const currentOptions = optionsOrder[actualIndex] || [];
                let selectedVisualIndex = -1;

                if (e.key.length === 1 && e.key >= '1' && e.key <= '9') {
                    const numIndex = parseInt(e.key) - 1;
                    if (numIndex >= 0 && numIndex < currentOptions.length) {
                        selectedVisualIndex = numIndex;
                    }
                } else if (e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
                    const letterIndex = e.key.toLowerCase().charCodeAt(0) - 97;
                    if (letterIndex >= 0 && letterIndex < currentOptions.length) {
                        selectedVisualIndex = letterIndex;
                    }
                }

                if (selectedVisualIndex >= 0 && selectedVisualIndex < currentOptions.length) {
                    const originalIndex = currentOptions[selectedVisualIndex];
                    const hiddenOpts = hiddenOptions[actualIndex] || [];
                    if (!hiddenOpts.includes(originalIndex)) {
                        handleAnswer(originalIndex, true);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showResumePrompt, isSubmitting, showShop, getActualQuestionIndex, quiz.questions, quiz.reviewMode, delayedValidation, answers, questionSubmitted, nextQuestion, previousQuestion, optionsOrder, hiddenOptions, handleAnswer, submitQuestion]);


    // --- Power-up Application Logic ---
    const applyPowerUp = useCallback((type: string) => {
        setActivePowerUpAnimation(type);
        setTimeout(() => setActivePowerUpAnimation(null), 1500);

        const actualIdx = getActualQuestionIndex();
        const q = quiz.questions[actualIdx];

        if (type === 'hint' && q && q.options && q.correctAnswer !== undefined) {
            // Pick 2 random wrong options to hide
            const wrongIndices = q.options
                .map((_, i) => i)
                .filter(i => i !== q.correctAnswer);
            
            // Shuffle and pick up to 2
            for (let i = wrongIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
            }
            const toHide = wrongIndices.slice(0, Math.min(2, wrongIndices.length));
            setHiddenOptions(prev => ({ ...prev, [actualIdx]: [...(prev[actualIdx] || []), ...toHide] }));
        }
        else if (type === 'time') {
            setTimeLeft(prev => countUpTimer ? prev : prev + 30); // Add 30s to countdown
        }
        else if (type === 'skip') {
            // Auto complete as correct
            if (q.correctAnswer !== undefined) {
                handleAnswer(q.correctAnswer);
            } else if (q.isCompiler && q.compilerConfig?.referenceCode) {
                handleAnswer(q.compilerConfig.referenceCode);
            } else {
                handleAnswer("SKIPPED");
            }
            // Auto-advance
            setTimeout(() => nextQuestion(), 600);
        }
    }, [getActualQuestionIndex, quiz.questions, countUpTimer, handleAnswer, nextQuestion]);


    const handleUseOwnedItem = (type: string) => {
        const itemIdx = localPowerUps.findIndex(p => p.type === type);
        if (itemIdx >= 0 && localPowerUps[itemIdx].quantity > 0) {
            // Update local state temporarily
            const newPowerups = [...localPowerUps];
            newPowerups[itemIdx] = { ...newPowerups[itemIdx], quantity: newPowerups[itemIdx].quantity - 1 };
            setLocalPowerUps(newPowerups);
            
            // Notify parent
            if (onPowerUpUsed) onPowerUpUsed(type);
            
            applyPowerUp(type);
        }
    };

    const handleBuyItem = async (_type: string, cost: number, itemId: string) => {
        if (localCoins < cost) return;
        setLocalCoins(prev => prev - cost);
        try {
            const res = await api.purchaseItem(itemId, user.userId);
            
            const mappedPowerUps = res.powerUps?.map((p: { type: string; quantity: number }) => ({
                ...p,
                type: p.type === 'time_freeze' ? 'time' : p.type
            })) || [];
            setLocalPowerUps(mappedPowerUps);
            
            if (onUserUpdate) {
                onUserUpdate({
                    coins: res.coins,
                    inventory: res.inventory,
                    powerUps: res.powerUps,
                    unlockedItems: res.unlockedItems
                });
            }
        } catch (e) {
            console.error("Purchase failed", e);
            setLocalCoins(prev => prev + cost); // Revert
        }
    };

    // --- Timer Tick ---
    useEffect(() => {
        if (showResumePrompt || isSubmitting || isUnlimitedTime) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (countUpTimer) return prev + 1;
                if (prev <= 1) {
                    handleQuizComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [countUpTimer, isSubmitting, isUnlimitedTime, showResumePrompt, handleQuizComplete]);



    // --- RENDER ---
    const actualIndex = getActualQuestionIndex();
    const q = quiz.questions[actualIndex];
    if (!q) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const currentOptions = optionsOrder[actualIndex] || [];
    const progressPercentage = retryMode
        ? (wrongQuestionIndices.length > 0 ? ((currentQuestion + 1) / wrongQuestionIndices.length) * 100 : 0)
        : (quiz.questions.length > 0 ? ((currentQuestion + 1) / quiz.questions.length) * 100 : 0);

    const hiddenOptsForCurrent = hiddenOptions[actualIndex] || [];

    // Helper functions for UI
    const getPowerUpIcon = (type: string, sizeClass = "w-4 h-4") => {
        switch (type) {
            case 'hint': return <Lightbulb className={sizeClass} />;
            case 'time': return <Clock className={sizeClass} />;
            case 'skip': return <Target className={sizeClass} />;
            case 'shield': return <Shield className={sizeClass} />;
            default: return <Zap className={sizeClass} />;
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
        <div className={`w-full transition-colors flex flex-col font-sans relative ${embedded
            ? 'h-full bg-transparent'
            : 'h-screen bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fee2e2] dark:from-[#080812] dark:via-[#0b0b18] dark:to-[#080812] overflow-hidden'
            } text-gray-900 dark:text-gray-100`}>
            
            {!embedded && <AmbientBackground />}

            {/* Animations defined globally */}
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 15px currentColor; }
                    50% { box-shadow: 0 0 30px currentColor; }
                }
                @keyframes powerup-fly {
                    0% { transform: scale(0.5) translateY(50px); opacity: 0; }
                    20% { transform: scale(1.5) translateY(-20px); opacity: 1; }
                    80% { transform: scale(1.2) translateY(-40px); opacity: 1; }
                    100% { transform: scale(2) translateY(-100px); opacity: 0; }
                }
                .powerup-animation {
                    animation: powerup-fly 1.5s ease-out forwards;
                }
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                
                /* Hide scrollbar for cleaner look */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes screen-glow-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .animate-glow-in {
                    animation: screen-glow-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Screen-wide Correct/Incorrect Glow Overlay */}
            {questionSubmitted && !delayedValidation && (
                <div 
                    className={`fixed inset-0 pointer-events-none z-40 animate-glow-in ${
                        isCurrentAnswerCorrect 
                            ? 'bg-green-500/[0.02] dark:bg-green-500/[0.01] shadow-[inset_0_0_80px_rgba(34,197,94,0.15)] dark:shadow-[inset_0_0_120px_rgba(34,197,94,0.12)] border-[8px] border-green-500/10 dark:border-green-500/5' 
                            : 'bg-red-500/[0.02] dark:bg-red-500/[0.01] shadow-[inset_0_0_80px_rgba(239,68,68,0.15)] dark:shadow-[inset_0_0_120px_rgba(239,68,68,0.12)] border-[8px] border-red-500/10 dark:border-red-500/5'
                    }`}
                />
            )}

            {/* Power-up Screen Overlay Animation */}
            {activePowerUpAnimation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className={`text-6xl powerup-animation drop-shadow-2xl`}>
                        {activePowerUpAnimation === 'hint' && '💡'}
                        {activePowerUpAnimation === 'skip' && '⏭️'}
                        {activePowerUpAnimation === 'time' && '⏳'}
                    </div>
                </div>
            )}

            {/* --- TOP BAR (Full width) --- */}
            {!embedded && (
                <header className="flex-none h-14 sm:h-16 landscape:h-12 lg:landscape:h-16 flex items-center justify-between px-4 sm:px-6 bg-[#e0e7ff]/60 dark:bg-[#0d0d1c]/80 border-b border-gray-200 dark:border-white/[0.08] backdrop-blur-2xl z-20 shadow-sm">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button onClick={onBack} className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-600 dark:text-slate-400 transition-all border border-gray-200 dark:border-white/10">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] sm:text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate max-w-[120px] sm:max-w-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                {retryMode ? '⚠ Retry' : quiz.title}
                            </span>
                            {poolProgress && (
                                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                                    <span>📦</span> Bank: {poolProgress.seenCount}/{poolProgress.totalCount} ({poolProgress.percentage}%)
                                    {poolProgress.cycle > 0 && <span className="opacity-75">• Cycle {poolProgress.cycle + 1}</span>}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Shop Button */}
                        {!hidePowerUps && (
                            <button onClick={() => setShowShop(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-bold rounded-xl border border-yellow-200 dark:border-yellow-500/30 transition-all">
                                <ShoppingBag className="w-4 h-4" />
                                <span className="hidden sm:inline">Store</span>
                            </button>
                        )}
                        
                        {/* Timer */}
                        {(() => {
                            const urgent = !countUpTimer && timeLeft < 30 && !isUnlimitedTime;
                            return (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black border transition-all ${urgent
                                    ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300 animate-pulse'
                                    : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-white'
                                    }`}>
                                    <Clock className={`w-4 h-4 ${urgent ? 'animate-spin' : ''}`} />
                                    <span className="tabular-nums text-base">
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </header>
            )}

            {/* --- HORIZONTAL SPLIT LAYOUT --- */}
            <div className={`flex-1 flex flex-col landscape:flex-row lg:flex-row w-full ${embedded ? '' : 'z-10'} overflow-y-auto landscape:overflow-hidden lg:overflow-hidden`}>
                      {/* --- LEFT SIDE: Question Context --- */}
                <div className="w-full landscape:w-1/2 lg:w-1/2 h-auto landscape:h-full lg:h-full flex flex-col bg-slate-100/80 dark:bg-[#111827]/95 backdrop-blur-3xl border-b landscape:border-b-0 landscape:border-r lg:border-r border-gray-200 dark:border-gray-800/50 dark:landscape:border-white/[0.08] dark:lg:border-white/[0.08] relative z-20 landscape:sticky landscape:top-0 lg:sticky lg:top-0 landscape:overflow-y-auto lg:overflow-y-auto no-scrollbar shadow-xl landscape:shadow-2xl">
                    
                    {/* Progress Header */}
                    <div className="flex items-center justify-between p-4 px-5 sm:p-6 landscape:p-2 landscape:px-5 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Question</span>
                            <span className="text-base sm:text-lg landscape:text-sm lg:landscape:text-lg font-black text-gray-900 dark:text-white">{currentQuestion + 1} / {quiz.questions.length}</span>
                        </div>
                        <div className="font-black text-sm sm:text-base landscape:text-xs lg:landscape:text-base text-indigo-600 dark:text-indigo-400">{Math.round(progressPercentage)}%</div>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="px-5 sm:px-6 pb-3 sm:pb-6 landscape:pb-1 lg:landscape:pb-6 border-b border-gray-100 dark:border-gray-800/50">
                        <div className="h-1 sm:h-2 landscape:h-1 lg:landscape:h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex shadow-inner">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>

                    {/* Question Content */}
                    <div className={`flex-none landscape:flex-1 landscape:overflow-y-auto px-5 sm:px-8 lg:px-12 pb-24 landscape:pb-28 lg:landscape:pb-28 flex flex-col pt-4 sm:pt-8 landscape:pt-3 lg:landscape:pt-8 no-scrollbar ${shakeError ? 'animate-shake' : ''}`}>
                        
                        <h2 className="text-xl sm:text-2xl lg:text-[32px] landscape:text-base lg:landscape:text-[32px] font-[900] tracking-tight text-gray-900 dark:text-white leading-snug lg:leading-tight mb-4 sm:mb-8 landscape:mb-2 lg:landscape:mb-8">
                            {q.question}
                        </h2>

                        {/* Image */}
                        {q.imageUrl && (
                            <img src={q.imageUrl} alt="Reference" className="w-full rounded-2xl mb-8 object-cover max-h-64 shadow-lg border border-gray-100 dark:border-gray-800" />
                        )}

                        {/* Code Snippet Preview */}
                        {q.codeSnippet && (
                            <div className="bg-[#F6F7F8] dark:bg-[#0d0d1a] border border-gray-100 dark:border-[#1f2937] rounded-2xl overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-inner mb-6">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827]">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <pre className="p-6 font-mono text-sm lg:text-base text-indigo-600 dark:text-emerald-400 whitespace-pre-wrap font-medium overflow-x-auto leading-relaxed">
                                    {q.codeSnippet}
                                </pre>
                            </div>
                        )}

                        {/* Explanation Card */}
                        {questionSubmitted && !delayedValidation && (
                            <div className={`mt-6 p-6 rounded-2xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                                isCurrentAnswerCorrect 
                                ? 'bg-green-500/5 border-green-500/20 text-green-950 dark:text-green-100 shadow-lg shadow-green-500/5' 
                                : 'bg-red-500/5 border-red-500/20 text-red-950 dark:text-red-100 shadow-lg shadow-red-500/5'
                            }`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${isCurrentAnswerCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {isCurrentAnswerCorrect ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                    </div>
                                    <h4 className="text-lg font-black tracking-tight">
                                        {isCurrentAnswerCorrect ? 'Excellent! Correct Answer' : 'Incorrect Answer'}
                                    </h4>
                                </div>

                                {q.explanation ? (
                                    <div className="pt-3 border-t border-gray-200/50 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                            <Lightbulb className="w-3.5 h-3.5 text-yellow-500 animate-pulse"/>
                                            <span>Explanation</span>
                                        </div>
                                        <p className="text-sm leading-relaxed opacity-90 font-medium">
                                            {q.explanation}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="pt-3 border-t border-gray-200/50 dark:border-white/5 text-xs text-gray-400 italic">
                                        No explanation provided for this question.
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex-1 min-h-[40px]"></div> {/* Spacer */}

                    </div>
                </div>

                {/* --- RIGHT SIDE: Answer Options --- */}
                <div className="w-full landscape:w-1/2 lg:w-1/2 h-auto landscape:h-full lg:h-full flex flex-col bg-transparent lg:bg-white/40 dark:bg-[#0b0f19] relative z-10">
                    <div className="flex-1 landscape:overflow-y-auto p-5 sm:p-8 lg:p-12 pt-10 sm:pt-12 landscape:pt-6 pb-24 landscape:pb-28 lg:landscape:pb-28 flex flex-col justify-start lg:justify-center gap-3 sm:gap-4 no-scrollbar">
                        {q.isCompiler ? (
                            <Suspense fallback={<div className="animate-spin w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>}>
                                <div className="h-[400px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl bg-white dark:bg-black">
                                    <CompilerQuestion
                                        initialCode={q.compilerConfig?.initialCode}
                                        language={q.compilerConfig?.language || 'javascript'}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting || (questionSubmitted && !delayedValidation)}
                                    />
                                </div>
                            </Suspense>
                        ) : (
                            currentOptions.map((originalIndex, visualIndex) => {
                                // If user used a hint to hide this
                                if (hiddenOptsForCurrent.includes(originalIndex)) return null;

                                const option = q.options![originalIndex];
                                const isSelected = answers[actualIndex] === originalIndex;
                                const isCorrectOption = originalIndex === q.correctAnswer;
                                const showCorrect = questionSubmitted && !delayedValidation && !isCurrentAnswerCorrect && isCorrectOption;
                                const showWrong = questionSubmitted && !delayedValidation && !isCurrentAnswerCorrect && isSelected;
                                const showSuccess = questionSubmitted && !delayedValidation && isCurrentAnswerCorrect && isSelected;

                                const letters = ['A', 'B', 'C', 'D', 'E'];
                                const label = letters[visualIndex] || (visualIndex + 1);

                                // Dynamic classes based on state
                                const baseClass = "group relative flex items-center p-4 sm:p-5 lg:p-6 rounded-[1.25rem] cursor-pointer transition-all duration-300 w-full text-left border-2 shadow-sm font-semibold mb-1";
                                let stateClass = "bg-white dark:bg-[#1f2937] border-gray-100 dark:border-[#374151] hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]";
                                let textClass = "text-gray-800 dark:text-gray-200";
                                let badgeClass = "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400";
                                
                                if (showSuccess) {
                                    stateClass = "bg-green-50/50 border-2 lg:border-none border-green-500 lg:ring-2 lg:ring-green-500 shadow-xl shadow-green-500/10 dark:bg-green-900/30 dark:border-green-500 scale-[1.02] z-10";
                                    badgeClass = "bg-green-500 text-white";
                                    textClass = "text-green-800 dark:text-green-200 font-bold";
                                } else if (showWrong) {
                                    stateClass = "bg-red-50/50 border-2 lg:border-none border-red-500 lg:ring-2 lg:ring-red-500 shadow-xl shadow-red-500/10 dark:bg-red-900/30 dark:border-red-500 scale-[1.02] z-10";
                                    badgeClass = "bg-red-500 text-white";
                                    textClass = "text-red-800 dark:text-red-200";
                                } else if (showCorrect) {
                                    stateClass = "bg-green-50/30 border-2 lg:border-none border-green-500/50 lg:ring-2 lg:ring-green-500/50 dark:bg-green-900/10 dark:border-green-500/50";
                                    badgeClass = "bg-green-400 text-white";
                                    textClass = "text-green-700 dark:text-green-300";
                                } else if (isSelected) {
                                    stateClass = "bg-indigo-50/80 border-2 lg:border-none border-indigo-600 lg:ring-2 lg:ring-indigo-600 shadow-xl shadow-indigo-600/10 dark:bg-indigo-900/40 dark:border-indigo-500 scale-[1.02] z-10";
                                    badgeClass = "bg-indigo-600 text-white dark:bg-indigo-500";
                                    textClass = "text-indigo-900 dark:text-indigo-100 font-bold";
                                }

                                return (
                                    <button
                                        key={originalIndex}
                                        onClick={() => handleAnswer(originalIndex)}
                                        disabled={isSubmitting || (questionSubmitted && !delayedValidation)}
                                        className={`${baseClass} ${stateClass} disabled:opacity-75 disabled:cursor-default`}
                                    >
                                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-base lg:text-lg mr-4 lg:mr-6 transition-colors ${badgeClass}`}>
                                            {showSuccess || showCorrect ? <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" /> : showWrong ? <XCircle className="w-5 h-5 lg:w-6 lg:h-6"/> : label}
                                        </div>
                                        <span className={`flex-1 text-base lg:text-lg text-left leading-relaxed ${textClass}`}>
                                            {option}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Action Footer Overlay */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 lg:p-5 bg-slate-100/85 dark:bg-[#0d0d1c]/90 border-t border-gray-200 dark:border-white/[0.08] backdrop-blur-2xl z-30 w-full shadow-lg flex items-center justify-between pointer-events-auto">
                {!isMobileDevice && (
                    <div className="hidden lg:flex text-gray-500 dark:text-slate-400 font-medium items-center gap-2 bg-gray-50 dark:bg-white/[0.03] px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-white/5">
                        {q && q.options && !q.isCompiler && (
                            <>
                                <span className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-slate-400 shadow-sm">1-{q.options.length}</span>
                                <span className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-slate-400 shadow-sm">A-{String.fromCharCode(65 + q.options.length - 1)}</span> 
                                <span className="text-xs">to select,</span> 
                            </>
                        )}
                        <span className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-slate-400 shadow-sm">←</span> <span className="text-xs">back,</span>
                        <span className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-600 dark:text-slate-400 shadow-sm">Enter ↵</span> <span className="text-xs">to advance</span>
                    </div>
                )}
                
                <div className="flex w-full sm:w-auto gap-4 pointer-events-auto">
                    <button
                        onClick={previousQuestion}
                        disabled={currentQuestion === 0 || isSubmitting}
                        className="flex-1 sm:flex-none px-6 py-4 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 text-gray-800 dark:text-gray-100 font-black text-lg rounded-xl border border-gray-300 dark:border-gray-700 shadow-md transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">←</span>
                        Previous
                    </button>
                    {!isLastQuestion && (
                        <button
                            onClick={nextQuestion}
                            disabled={answers[actualIndex] === undefined || (quiz.reviewMode !== false && !delayedValidation && !questionSubmitted)}
                            className="flex-1 sm:flex-none px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-lg rounded-xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {questionSubmitted && !delayedValidation ? 'Continue' : 'Next Question'}
                            <span className="text-xl">→</span>
                        </button>
                    )}
                    {isLastQuestion && (
                        <button
                            onClick={handleQuizComplete}
                            disabled={answers[actualIndex] === undefined}
                            className="flex-1 sm:flex-none px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-lg rounded-xl shadow-xl shadow-green-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Submitting...' : 'Finish Quiz'}
                            <Target className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>

            {/* --- SHOP OVERLAY (Feature 9) --- */}
            {showShop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm p-0 sm:p-6 transition-all animate-in fade-in">
                    <div className="bg-white dark:bg-[#111827] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 animate-in slide-in-from-right sm:slide-in-from-bottom-8 overflow-hidden">
                        
                        {/* Shop Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#0d0d1c]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                                    <ShoppingBag className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none">Item Shop</h2>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Mid-Quiz Boosters</p>
                                </div>
                            </div>
                            <button onClick={() => setShowShop(false)} className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition shrink-0">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Balance */}
                        <div className="p-6 pb-4 text-center">
                            <div className="inline-flex items-center gap-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-6 py-3 rounded-2xl shadow-inner">
                                <Coins className="w-6 h-6 text-yellow-500" />
                                <span className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{localCoins}</span>
                            </div>
                        </div>

                        {/* Owned Inventory Quick Access inside Store */}
                        {localPowerUps.some(p => p.quantity > 0) && (
                            <div className="px-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 text-left">Your Inventory</div>
                                <div className="flex gap-2 flex-wrap justify-start">
                                    {localPowerUps.map(p => p.quantity > 0 && (
                                        <button
                                            key={p.type}
                                            onClick={() => {
                                                handleUseOwnedItem(p.type);
                                                setShowShop(false);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${getPowerUpColor(p.type)} text-white font-extrabold text-xs shadow-md hover:scale-105 transition-transform`}
                                            title={`Use ${p.type}`}
                                        >
                                            {getPowerUpIcon(p.type, "w-3.5 h-3.5")}
                                            <span className="capitalize">{p.type}</span>
                                            <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{p.quantity}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shop Items List */}
                        <div className="flex-1 overflow-y-auto p-6 pt-2 flex flex-col gap-4 bg-white dark:bg-transparent">
                            {[
                                { type: 'hint', name: '50/50 Hint', desc: 'Disables two wrong answers to boost your chances.', price: 75, icon: 'hint' },
                                { type: 'skip', name: 'Skip Pass', desc: 'Automatically marks current question correct and advances.', price: 150, icon: 'skip' },
                                { type: 'time', name: 'Time Boost', desc: 'Add 30 extra seconds to the clock!', price: 100, icon: 'time' }
                            ].map(item => {
                                const ownedQuantity = localPowerUps.find(p => p.type === item.type)?.quantity || 0;
                                const canAfford = localCoins >= item.price;
                                const actualItemIdMap: Record<string, string> = { 
                                    hint: 'smart-hint', 
                                    skip: 'skip-question', 
                                    time: 'time-freeze' 
                                };
                                const apiId = actualItemIdMap[item.type];

                                return (
                                    <div key={item.type} className="flex flex-row items-center gap-4 bg-gray-50 dark:bg-[#1f2937] p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all">
                                        
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${getPowerUpColor(item.icon)} shadow-lg shrink-0 text-white transform group-hover:scale-105 transition-transform`}>
                                            {getPowerUpIcon(item.icon, "w-7 h-7")}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-0.5">{item.name}</h3>
                                                {ownedQuantity > 0 && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-extrabold text-[10px] uppercase tracking-wider">
                                                        Owned: {ownedQuantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 pr-2 leading-relaxed">{item.desc}</div>
                                            
                                            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                                <span className={`font-black flex items-center gap-1.5 text-sm ${canAfford ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    <Coins className="w-4 h-4"/> {item.price}
                                                </span>
                                                <div className="flex gap-2 ml-auto">
                                                    {ownedQuantity > 0 && (
                                                        <button 
                                                            onClick={() => {
                                                                handleUseOwnedItem(item.type);
                                                                setShowShop(false);
                                                            }}
                                                            className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                        >
                                                            Use
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            handleBuyItem(item.type, item.price, apiId);
                                                        }}
                                                        disabled={!canAfford}
                                                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        Buy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
            )}


            {/* Resume Prompt Modal */}
            {showResumePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#0f0f1e] text-gray-900 dark:text-white border border-gray-200 dark:border-white/[0.10] rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                <Clock className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Resume Quiz?</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-500 mt-0.5">
                                    Unfinished attempt from {savedState ? new Date(savedState.lastUpdated).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                            Continue where you left off, or start a fresh attempt from the beginning.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleStartNew}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-all"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleResume}
                                className="flex-1 px-4 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30"
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
