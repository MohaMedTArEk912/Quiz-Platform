import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, CheckCircle, XCircle, Target, Zap, Shield, Lightbulb, ArrowLeft, ShoppingBag, Coins, Keyboard, WifiOff, Globe, List, Flag, Sparkles, RotateCcw, RefreshCw } from 'lucide-react';
import type { Quiz, Question, UserData, QuizResult, AttemptAnswers, PoolProgressData, IntegrityTelemetry, IntegrityTelemetryEvent } from '../types';
import { api } from '../lib/api';
import { AmbientBackground } from './AmbientBackground';
import { MathRenderer } from './common/MathRenderer';
import { KeyboardShortcutsModal } from './common/KeyboardShortcutsModal';
import { AICoachModal } from './common/AICoachModal';
import { QuestionTranslatorBar } from './common/QuestionTranslatorBar';
import { translateQuestion, translateText, getLanguageByCode, isRTL, type TranslatedQuestionData } from '../lib/translationService';
import { sounds } from '../lib/soundEffects';
import MediaPromptPlayer from './common/MediaPromptPlayer';
import OrderingQuestion from './question-types/OrderingQuestion';
import MatchingQuestion from './question-types/MatchingQuestion';
import CodeOutputQuestion from './question-types/CodeOutputQuestion';
import TextQuestion from './question-types/TextQuestion';
import { useTheme } from '../context/ThemeContext';
import { evaluateTextAnswer } from '../lib/stringSimilarity';

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
    answers: Record<number, string | number | string[] | Record<string, string>>;
    timeLeft: number;
    lastUpdated: number;
    questionOrder?: number[];
    submittedQuestions?: Record<number, boolean>;
    questionCorrectness?: Record<number, boolean>;
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
    const { isBento } = useTheme();
    // --- STATE MANAGEMENT ---
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number | string[] | Record<string, string>>>({});
    const [timeLeft, setTimeLeft] = useState(countUpTimer ? 0 : quiz.timeLimit * 60);
    const startTimeRef = useRef(Date.now());

    // PowerUp / Shop States
    const [showShop, setShowShop] = useState(false);
    const [localCoins, setLocalCoins] = useState(user.coins || 0);
    const [localPowerUps, setLocalPowerUps] = useState(powerUps || []);
    const [hiddenOptions, setHiddenOptions] = useState<Record<number, number[]>>({}); // actualIndex -> [originalOptionsToHide]
    const [activePowerUpAnimation, setActivePowerUpAnimation] = useState<string | null>(null);

    // --- TRANSLATION STATES ---
    const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
        try {
            return localStorage.getItem('quiz_pref_lang') || 'original';
        } catch {
            return 'original';
        }
    });
    const [isTranslated, setIsTranslated] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('quiz_pref_lang');
            return Boolean(saved && saved !== 'original');
        } catch {
            return false;
        }
    });
    const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('quiz_pref_auto_trans');
            return saved !== 'false';
        } catch {
            return true;
        }
    });
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedCache, setTranslatedCache] = useState<Record<number, Record<string, TranslatedQuestionData>>>({});


    // --- INTEGRITY & TELEMETRY TRACKING ---
    const tabSwitchesRef = useRef(0);
    const focusLossRef = useRef(0);
    const copyPasteRef = useRef(0);
    const fullscreenExitsRef = useRef(0);
    const rapidGuessesRef = useRef(0);
    const timePerQuestionRef = useRef<Record<number, number>>({});
    const telemetryEventsRef = useRef<IntegrityTelemetryEvent[]>([]);
    const questionStartTimeRef = useRef(Date.now());
    const lastSubmitTimeRef = useRef(0);
    const [isFullscreenActive, setIsFullscreenActive] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);

    // Event listeners for window/tab focus & clipboard integrity
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchesRef.current += 1;
                telemetryEventsRef.current.push({
                    type: 'tab_hidden',
                    timestamp: new Date().toISOString(),
                    questionIndex: currentQuestion
                });
            }
        };

        const handleBlur = () => {
            focusLossRef.current += 1;
            telemetryEventsRef.current.push({
                type: 'window_blur',
                timestamp: new Date().toISOString(),
                questionIndex: currentQuestion
            });
        };

        const handleCopy = () => {
            copyPasteRef.current += 1;
            telemetryEventsRef.current.push({
                type: 'copy_attempt',
                timestamp: new Date().toISOString(),
                questionIndex: currentQuestion
            });
        };

        const handlePaste = () => {
            copyPasteRef.current += 1;
            telemetryEventsRef.current.push({
                type: 'paste_attempt',
                timestamp: new Date().toISOString(),
                questionIndex: currentQuestion
            });
        };

        const handleFullscreenChange = () => {
            const inFs = Boolean(document.fullscreenElement);
            setIsFullscreenActive(inFs);
            if (!inFs && (quiz.requireFullscreen || quiz.isProctored)) {
                fullscreenExitsRef.current += 1;
                telemetryEventsRef.current.push({
                    type: 'fullscreen_exit',
                    timestamp: new Date().toISOString(),
                    questionIndex: currentQuestion,
                    details: 'Exited Fullscreen Proctoring Mode'
                });
                setShowFullscreenWarning(true);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (quiz.disableCopyPaste !== false) {
                e.preventDefault();
                telemetryEventsRef.current.push({
                    type: 'context_menu',
                    timestamp: new Date().toISOString(),
                    questionIndex: currentQuestion,
                    details: 'Context menu / right click blocked'
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [currentQuestion, quiz.requireFullscreen, quiz.isProctored, quiz.disableCopyPaste]);

    const enterFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreenActive(true);
                setShowFullscreenWarning(false);
            }
        } catch (err) {
            console.warn('Fullscreen request denied:', err);
        }
    };

    // Question timing tracker
    useEffect(() => {
        const now = Date.now();
        const elapsed = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000));
        const prevQ = currentQuestion > 0 ? currentQuestion - 1 : 0;
        timePerQuestionRef.current[prevQ] = (timePerQuestionRef.current[prevQ] || 0) + elapsed;
        questionStartTimeRef.current = now;
    }, [currentQuestion]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
    const [isAICoachOpen, setIsAICoachOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    // --- 3D FLIPPING PAPER CLUE STATE ---
    const [isClueFlipped, setIsClueFlipped] = useState(false);
    const [inlineClue, setInlineClue] = useState<string>('');
    const inlineClueRef = useRef(inlineClue);
    useEffect(() => {
        inlineClueRef.current = inlineClue;
    }, [inlineClue]);
    const [inlineClueLevel, setInlineClueLevel] = useState<number>(1);
    const [inlineClueHistory, setInlineClueHistory] = useState<string[]>([]);
    const [isInlineClueLoading, setIsInlineClueLoading] = useState(false);
    const clueTranslationsRef = useRef<Record<string, Record<string, string>>>({});

    // Online/Offline status listener
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
    const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
    const [showQuestionMenu, setShowQuestionMenu] = useState(false);

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
        const state: SavedQuizState = {
            quizId: quizIdentifier,
            currentQuestion,
            answers,
            timeLeft,
            lastUpdated: Date.now(),
            questionOrder,
            submittedQuestions,
            questionCorrectness
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quizIdentifier, storageKey, showResumePrompt, isSubmitting, questionOrder, embedded, countUpTimer, submittedQuestions, questionCorrectness]);

    const handleResume = () => {
        if (savedState) {
            setCurrentQuestion(savedState.currentQuestion);
            setAnswers(savedState.answers);
            setTimeLeft(savedState.timeLeft);
            if (savedState.questionOrder) {
                setQuestionOrder(savedState.questionOrder);
            }
            if (savedState.submittedQuestions) {
                setSubmittedQuestions(savedState.submittedQuestions);
            }
            if (savedState.questionCorrectness) {
                setQuestionCorrectness(savedState.questionCorrectness);
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


    // Helper for checking correctness across all question types
    const checkComplexAnswer = useCallback((q: Question | { type?: string; isCompiler?: boolean; compilerConfig?: { referenceCode?: string }; correctAnswer?: unknown; orderingItems?: string[]; matchingPairs?: { left: string; right: string }[]; options?: string[] }, ans: unknown): boolean => {
        if (ans === undefined || ans === null) return false;

        // 1. Compiler Questions
        if (q.isCompiler || q.type === 'compiler') {
            if (q.compilerConfig?.referenceCode && ans) {
                const norm = (s: string) => s.replace(/\s+/g, '').trim();
                return norm(String(ans)) === norm(q.compilerConfig.referenceCode);
            }
            return false;
        }

        // 2. Ordering Questions
        if (q.type === 'ordering') {
            const expectedOrder = q.orderingItems || (Array.isArray(q.correctAnswer) ? q.correctAnswer : q.options);
            if (Array.isArray(expectedOrder) && Array.isArray(ans)) {
                if (ans.length !== expectedOrder.length) return false;
                return ans.every((item, i) => String(item).trim() === String(expectedOrder[i]).trim());
            }
            return false;
        }

        // 3. Matching Pairs Questions
        if (q.type === 'matching') {
            if (q.matchingPairs && Array.isArray(q.matchingPairs) && typeof ans === 'object' && ans !== null) {
                const userMatches = ans as Record<string, string>;
                const answeredKeys = Object.keys(userMatches);
                if (answeredKeys.length !== q.matchingPairs.length) return false;
                return q.matchingPairs.every(pair => userMatches[pair.left]?.trim() === pair.right?.trim());
            }
            if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null && typeof ans === 'object' && ans !== null) {
                const correctObj = q.correctAnswer as Record<string, string>;
                const userObj = ans as Record<string, string>;
                const correctKeys = Object.keys(correctObj);
                if (Object.keys(userObj).length !== correctKeys.length) return false;
                return correctKeys.every(k => userObj[k]?.trim() === correctObj[k]?.trim());
            }
            return false;
        }

        // 4. Code Output Questions
        if (q.type === 'code-output') {
            if (q.options && q.options.length > 0) {
                if (typeof ans === 'number') {
                    return ans === Number(q.correctAnswer) || String(q.options[ans]).trim() === String(q.correctAnswer).trim();
                }
                const cleanAns = String(ans).trim();
                const cleanCorrect = String(q.correctAnswer).trim();
                if (cleanAns === cleanCorrect) return true;
                if (typeof q.correctAnswer === 'number' && q.options[q.correctAnswer] && cleanAns === q.options[q.correctAnswer].trim()) {
                    return true;
                }
                return false;
            }
            return String(ans).trim() === String(q.correctAnswer).trim();
        }

        // 5. Short Answer / Text Questions (70%+ fuzzy matching)
        if (q.type === 'text') {
            if (q.correctAnswer === undefined || q.correctAnswer === null) return false;
            const evalResult = evaluateTextAnswer(ans, q.correctAnswer, 0.70);
            return evalResult.isPassed;
        }

        // 6. Multiple Choice / Default Fallback
        if (Array.isArray(q.correctAnswer) && Array.isArray(ans)) {
            return JSON.stringify(q.correctAnswer) === JSON.stringify(ans);
        }
        if (typeof q.correctAnswer === 'number' && (typeof ans === 'number' || !isNaN(Number(ans)))) {
            return Number(ans) === q.correctAnswer;
        }
        if (Array.isArray(q.options) && typeof q.correctAnswer === 'string' && typeof ans === 'number') {
            return q.options[ans]?.trim() === q.correctAnswer.trim();
        }
        return ans === q.correctAnswer;
    }, []);

    const resetQuestionState = useCallback((targetIndex = currentQuestion) => {
        setShakeError(false);
        setIsClueFlipped(false);
        setInlineClue('');
        setInlineClueLevel(1);
        setInlineClueHistory([]);
        setIsInlineClueLoading(false);
        const isReviewMode = quiz.reviewMode !== false;
        if (!isReviewMode) {
            setQuestionSubmitted(false);
            setIsCurrentAnswerCorrect(false);
        } else {
            const actualIdx = getActualQuestionIndex(targetIndex);
            const hasAnswer = answers[actualIdx] !== undefined;
            const isSubmitted = Boolean(hasAnswer && submittedQuestions[actualIdx]);
            setQuestionSubmitted(isSubmitted);
            if (isSubmitted) {
                const q = quiz.questions[actualIdx];
                const isCorrect = questionCorrectness[actualIdx] !== undefined
                    ? questionCorrectness[actualIdx]
                    : (q ? checkComplexAnswer(q, answers[actualIdx]) : false);
                setIsCurrentAnswerCorrect(isCorrect);
            } else {
                setIsCurrentAnswerCorrect(false);
            }
        }
    }, [currentQuestion, quiz.reviewMode, getActualQuestionIndex, answers, submittedQuestions, questionCorrectness, quiz.questions, checkComplexAnswer]);

    // Automatically keep questionSubmitted and isCurrentAnswerCorrect in sync whenever currentQuestion changes
    useEffect(() => {
        setShakeError(false);
        setIsClueFlipped(false);
        setInlineClue('');
        setInlineClueLevel(1);
        setInlineClueHistory([]);
        setIsInlineClueLoading(false);
        const isReviewMode = quiz.reviewMode !== false;
        if (!isReviewMode) {
            setQuestionSubmitted(false);
            setIsCurrentAnswerCorrect(false);
            return;
        }

        const actualIdx = getActualQuestionIndex(currentQuestion);
        const hasAnswer = answers[actualIdx] !== undefined;
        const isSubmitted = Boolean(hasAnswer && submittedQuestions[actualIdx]);
        setQuestionSubmitted(isSubmitted);
        if (isSubmitted) {
            const q = quiz.questions[actualIdx];
            const isCorrect = questionCorrectness[actualIdx] !== undefined 
                ? questionCorrectness[actualIdx] 
                : (q ? checkComplexAnswer(q, answers[actualIdx]) : false);
            setIsCurrentAnswerCorrect(isCorrect);
        } else {
            setIsCurrentAnswerCorrect(false);
        }
    }, [currentQuestion, answers, submittedQuestions, questionCorrectness, quiz.reviewMode, quiz.questions, getActualQuestionIndex, checkComplexAnswer]);

    const isLastQuestion = retryMode
        ? currentQuestion === wrongQuestionIndices.length - 1
        : currentQuestion === quiz.questions.length - 1;

    const handleQuizComplete = useCallback(() => {
        if (isSubmitting) return;

        if (delayedValidation) {
            const wrongs: number[] = [];
            questionOrder.forEach((actualIndex, orderIdx) => {
                const q = quiz.questions[actualIndex];
                const ans = answers[actualIndex];
                const isCorrect = checkComplexAnswer(q, ans);
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

        // Finalize timing for the last question
        const now = Date.now();
        const elapsedFinal = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000));
        timePerQuestionRef.current[currentQuestion] = (timePerQuestionRef.current[currentQuestion] || 0) + elapsedFinal;

        // Calculate Exam Integrity Score
        const tabDeduction = Math.min(40, tabSwitchesRef.current * 10);
        const blurDeduction = Math.min(20, focusLossRef.current * 5);
        const copyPasteDeduction = Math.min(30, copyPasteRef.current * 15);
        const fullscreenDeduction = Math.min(30, fullscreenExitsRef.current * 15);
        const rapidGuessDeduction = Math.min(20, rapidGuessesRef.current * 5);
        const totalDeduction = tabDeduction + blurDeduction + copyPasteDeduction + fullscreenDeduction + rapidGuessDeduction;
        const integrityScore = Math.max(0, Math.min(100, 100 - totalDeduction));

        const telemetry: IntegrityTelemetry = {
            tabSwitches: tabSwitchesRef.current,
            focusLossCount: focusLossRef.current,
            copyPasteAttempts: copyPasteRef.current,
            fullscreenExits: fullscreenExitsRef.current,
            rapidGuesses: rapidGuessesRef.current,
            timePerQuestion: timePerQuestionRef.current,
            events: telemetryEventsRef.current,
            integrityScore
        };

        if (percentage >= (quiz.passingScore ?? 70)) {
            sounds.playLevelUp();
        }

        onComplete({
            score,
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken: duration,
            answers: detailedAnswers,
            passed: percentage >= (quiz.passingScore ?? 70),
            reviewStatus: 'completed',
            powerUpsUsed: [],
            telemetry
        });

    }, [answers, delayedValidation, isSubmitting, onComplete, onProgress, questionOrder, quiz.questions, quiz.passingScore, storageKey, timeLeft, countUpTimer, checkComplexAnswer, currentQuestion]);

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

    const goToQuestion = useCallback((questionPosition: number) => {
        if (isSubmitting) return;
        setCurrentQuestion(questionPosition);
        resetQuestionState(questionPosition);
        setShowQuestionMenu(false);
    }, [isSubmitting, resetQuestionState]);

    const toggleCurrentQuestionFlag = useCallback(() => {
        const actualIndex = getActualQuestionIndex();
        setFlaggedQuestions(prev => ({ ...prev, [actualIndex]: !prev[actualIndex] }));
    }, [getActualQuestionIndex]);

    // Handlers for Question Translation
    const handleSelectLanguage = useCallback((langCode: string) => {
        setSelectedLanguage(langCode);
        try {
            localStorage.setItem('quiz_pref_lang', langCode);
        } catch {
            // Ignore storage access errors
        }

        if (langCode === 'original') {
            setIsTranslated(false);
        } else {
            setIsTranslated(true);
        }
    }, []);

    const handleToggleOriginal = useCallback(() => {
        setIsTranslated((prev) => !prev);
    }, []);

    const handleToggleAutoTranslate = useCallback(() => {
        setAutoTranslate((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('quiz_pref_auto_trans', String(next));
            } catch {
                // Ignore storage access errors
            }
            return next;
        });
    }, []);

    // Translate question when question index or language changes
    useEffect(() => {
        const actualIdx = getActualQuestionIndex();
        const currentQ = quiz.questions[actualIdx];
        if (!currentQ || selectedLanguage === 'original' || !isTranslated) return;

        if (translatedCache[actualIdx]?.[selectedLanguage]) return;

        let isCancelled = false;
        setIsTranslating(true);

        translateQuestion(currentQ, selectedLanguage)
            .then((data) => {
                if (!isCancelled) {
                    setTranslatedCache((prev) => ({
                        ...prev,
                        [actualIdx]: {
                            ...(prev[actualIdx] || {}),
                            [selectedLanguage]: data
                        }
                    }));
                }
            })
            .catch((err) => {
                console.warn('[Translate] Error translating question:', err);
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsTranslating(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [currentQuestion, selectedLanguage, isTranslated, getActualQuestionIndex, quiz.questions, translatedCache]);

    // --- 3D Paper Inline Clue Logic ---
    const fetchInlineClue = useCallback(async (targetLevel = 1) => {
        const actualIdx = getActualQuestionIndex();
        const currentQ = quiz.questions[actualIdx];
        if (!currentQ) return;

        setIsInlineClueLoading(true);
        try {
            const isNonEn = isTranslated && selectedLanguage !== 'original';
            const langInfo = isNonEn ? getLanguageByCode(selectedLanguage) : null;

            const res = await api.getAICoachHint({
                question: currentQ.question,
                options: currentQ.options,
                category: quiz.category || currentQ.part || '',
                studentAnswer: answers[actualIdx] ? String(answers[actualIdx]) : undefined,
                targetLang: isNonEn ? selectedLanguage : undefined,
                targetLangName: langInfo ? langInfo.name : undefined,
                correctAnswer: currentQ.correctAnswer,
                clueLevel: targetLevel,
                previousHints: inlineClueHistory
            });

            if (res.hint) {
                const hint = res.hint;
                setInlineClue(hint);
                setInlineClueLevel(targetLevel);
                setInlineClueHistory(prev => (prev.includes(hint) ? prev : [...prev, hint]));

                const cacheKey = `${actualIdx}_${targetLevel}`;
                const currentLangKey = isNonEn ? selectedLanguage : 'original';
                clueTranslationsRef.current[cacheKey] = {
                    ...(clueTranslationsRef.current[cacheKey] || {}),
                    [currentLangKey]: hint
                };
            }
        } catch (err) {
            console.error('Failed to get clue:', err);
            setInlineClue('💡 Focus on the fundamental rules of this topic and eliminate options that contradict core principles.');
        } finally {
            setIsInlineClueLoading(false);
        }
    }, [getActualQuestionIndex, quiz.questions, quiz.category, answers, isTranslated, selectedLanguage, inlineClueHistory]);

    const flipToClue = useCallback(() => {
        setIsClueFlipped(prev => {
            const next = !prev;
            if (next && !inlineClue) {
                fetchInlineClue(1);
            }
            return next;
        });
    }, [inlineClue, fetchInlineClue]);

    const handleNextInlineClue = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const nextLevel = inlineClueLevel + 1;
        fetchInlineClue(nextLevel);
    }, [inlineClueLevel, fetchInlineClue]);

    const getClueLevelTitle = useCallback((level: number) => {
        const titles = [
            'Level 1: Core Concept',
            'Level 2: Mechanism & Behavior',
            'Level 3: Elimination Clue',
            'Level 4: Deep Insight',
            'Level 5: Socratic Riddle'
        ];
        return titles[level - 1] || `Clue Level ${level}`;
    }, []);

    // Translate clue synchronously when language or translation mode is toggled via QuestionTranslatorBar
    useEffect(() => {
        const currentClue = inlineClueRef.current;
        if (!currentClue || isInlineClueLoading) return;
        const actualIdx = getActualQuestionIndex();
        const cacheKey = `${actualIdx}_${inlineClueLevel}`;
        const target = (isTranslated && selectedLanguage !== 'original') ? selectedLanguage : 'original';

        if (clueTranslationsRef.current[cacheKey]?.[target]) {
            setInlineClue(clueTranslationsRef.current[cacheKey][target]);
            return;
        }

        if (target === 'original') {
            if (clueTranslationsRef.current[cacheKey]?.['original']) {
                setInlineClue(clueTranslationsRef.current[cacheKey]['original']);
            }
            return;
        }

        let isCancelled = false;
        translateText(currentClue, target)
            .then(translated => {
                if (!isCancelled && translated) {
                    setInlineClue(translated);
                    clueTranslationsRef.current[cacheKey] = {
                        ...(clueTranslationsRef.current[cacheKey] || {}),
                        [target]: translated
                    };
                }
            })
            .catch(err => {
                console.warn('[Translate Clue] Error translating clue:', err);
            });

        return () => {
            isCancelled = true;
        };
    }, [selectedLanguage, isTranslated, getActualQuestionIndex, inlineClueLevel, isInlineClueLoading]);

    const handleAnswer = useCallback((answer: string | number | string[] | Record<string, string>) => {
        if (isSubmitting) return;

        const actualIndex = getActualQuestionIndex();
        // Lock answer if already submitted in review mode
        if (quiz.reviewMode !== false && submittedQuestions[actualIndex]) return;
        const q = quiz.questions[actualIndex];

        // Rapid Guessing Detection (< 1.8 seconds on questions with text)
        const elapsedOnQ = (Date.now() - questionStartTimeRef.current) / 1000;
        if (elapsedOnQ < 1.8 && (q.question?.length || 0) > 25) {
            rapidGuessesRef.current += 1;
            telemetryEventsRef.current.push({
                type: 'rapid_guess',
                timestamp: new Date().toISOString(),
                questionIndex: currentQuestion,
                details: `Fast answer in ${elapsedOnQ.toFixed(1)}s`
            });
        }

        // Strict Mode Check
        if (mustAnswerCorrectly && !delayedValidation) {
            if (!checkComplexAnswer(q, answer)) {
                setShakeError(true);
                setTimeout(() => setShakeError(false), 400);
                return;
            }
        }

        const newAnswers = { ...answers, [actualIndex]: answer };
        setAnswers(newAnswers);

        if (onProgress) {
            let currentScore = 0;
            let answered = 0;
            let correctCount = 0;
            quiz.questions.forEach((qObj, idx) => {
                const currentAns = newAnswers[idx];
                if (currentAns !== undefined) {
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
    }, [isSubmitting, getActualQuestionIndex, quiz.questions, mustAnswerCorrectly, delayedValidation, answers, onProgress, checkComplexAnswer, currentQuestion, quiz.reviewMode, submittedQuestions]);


    const submitQuestion = useCallback(() => {
        const actualIndex = getActualQuestionIndex();
        if (submittedQuestions[actualIndex]) return;
        lastSubmitTimeRef.current = Date.now();
        const q = quiz.questions[actualIndex];
        const answer = answers[actualIndex];
        if (answer === undefined) return;
        if (q.type === 'matching') {
            const pairCount = q.matchingPairs?.length || (typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.keys(q.correctAnswer).length : 0);
            if (typeof answer !== 'object' || Object.keys(answer).length < pairCount) return;
        }

        const isCorrect = checkComplexAnswer(q, answer);
        setIsCurrentAnswerCorrect(isCorrect);
        setQuestionSubmitted(true);
        setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: true }));
        setQuestionCorrectness(prev => ({ ...prev, [actualIndex]: isCorrect }));

        if (isCorrect) {
            sounds.playCorrect();
        } else {
            sounds.playIncorrect();
        }

        if (onProgress) {
            let currentScore = 0;
            let answered = 0;
            let correctCount = 0;
            quiz.questions.forEach((qObj, idx) => {
                const isCurrent = idx === actualIndex;
                const currentAns = isCurrent ? answer : answers[idx];
                const isAnsSubmitted = isCurrent ? true : submittedQuestions[idx];
                if (currentAns !== undefined) {
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
            const isTextarea = document.activeElement?.tagName === 'TEXTAREA';
            if (isTextarea) return;

            const isInputFocused = document.activeElement?.tagName === 'INPUT';

            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                if (isInputFocused) return;
                e.preventDefault();
                setShowKeyboardShortcuts(prev => !prev);
                return;
            }

            const actualIndex = getActualQuestionIndex();
            const q = quiz.questions[actualIndex];
            
            // Allow Enter to advance or submit
            if (e.key === 'Enter') {
                // If a question was just submitted (e.g. via Enter in an input or clicking Submit),
                // ignore any Enter keystroke for 600ms to guarantee student sees right/wrong feedback
                if (Date.now() - lastSubmitTimeRef.current < 600) {
                    e.preventDefault();
                    return;
                }

                const isAlreadySubmitted = Boolean(submittedQuestions[actualIndex] || questionSubmitted);
                if (isInputFocused && !isAlreadySubmitted) return; // Let input's onKeyDown handle submit

                e.preventDefault();
                const isReviewMode = quiz.reviewMode !== false;
                if (isReviewMode && !delayedValidation) {
                    const currentAns = answers[actualIndex];
                    if (currentAns === undefined) {
                        setShakeError(true);
                        setTimeout(() => setShakeError(false), 400);
                    } else if (!isAlreadySubmitted) {
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
                if (isInputFocused) return;
                e.preventDefault();
                previousQuestion();
                return;
            }

            if (e.key === 'ArrowRight') {
                if (isInputFocused) return;
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

            if (isInputFocused) return;

            // Keyboard option selection (1-N or A-N) dynamically based on number of options
            const isCurrentLocked = Boolean(quiz.reviewMode !== false && !delayedValidation && (submittedQuestions[actualIndex] || questionSubmitted));
            if (q && q.options && !q.isCompiler && !isCurrentLocked) {
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
                        handleAnswer(originalIndex);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showResumePrompt, isSubmitting, showShop, getActualQuestionIndex, quiz.questions, quiz.reviewMode, delayedValidation, answers, questionSubmitted, submittedQuestions, nextQuestion, previousQuestion, optionsOrder, hiddenOptions, handleAnswer, submitQuestion]);


    // --- Power-up Application Logic ---
    const applyPowerUp = useCallback((type: string) => {
        sounds.playPowerUp();
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
            // Auto complete as correct across all question types
            if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
                handleAnswer(q.correctAnswer as string | number | string[] | Record<string, string>);
            } else if (q.isCompiler && q.compilerConfig?.referenceCode) {
                handleAnswer(q.compilerConfig.referenceCode);
            } else if (q.type === 'ordering' && (q.orderingItems || q.options)) {
                handleAnswer(q.orderingItems || q.options || []);
            } else if (q.type === 'matching' && q.matchingPairs) {
                const autoMatches: Record<string, string> = {};
                q.matchingPairs.forEach(p => { autoMatches[p.left] = p.right; });
                handleAnswer(autoMatches);
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

    const activeTranslation = (isTranslated && selectedLanguage !== 'original' && translatedCache[actualIndex]?.[selectedLanguage]) || null;
    const isCurrentRtl = Boolean(isTranslated && selectedLanguage !== 'original' && isRTL(selectedLanguage));
    const displayQuestionText = activeTranslation?.question || q.question;
    const displayExplanationText = activeTranslation?.explanation || q.explanation;


    const currentOptions = optionsOrder[actualIndex] || [];
    const progressPercentage = retryMode
        ? (wrongQuestionIndices.length > 0 ? ((currentQuestion + 1) / wrongQuestionIndices.length) * 100 : 0)
        : (quiz.questions.length > 0 ? ((currentQuestion + 1) / quiz.questions.length) * 100 : 0);

    const hiddenOptsForCurrent = hiddenOptions[actualIndex] || [];
    const currentAnswer = answers[actualIndex];
    const matchingPairCount = q.type === 'matching'
        ? q.matchingPairs?.length || (typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.keys(q.correctAnswer).length : 0)
        : 0;
    const hasCompleteAnswer = currentAnswer !== undefined && (
        q.type !== 'matching' || (typeof currentAnswer === 'object' && Object.keys(currentAnswer).length >= matchingPairCount)
    );
    const isEffectiveSubmitted = Boolean(
        !delayedValidation &&
        quiz.reviewMode !== false &&
        currentAnswer !== undefined &&
        (submittedQuestions[actualIndex] || questionSubmitted)
    );
    const isEffectiveCorrect = isEffectiveSubmitted
        ? (questionCorrectness[actualIndex] !== undefined
            ? questionCorrectness[actualIndex]
            : (isCurrentAnswerCorrect || checkComplexAnswer(q, currentAnswer)))
        : false;
    const showSubmitButton = !delayedValidation && quiz.reviewMode !== false && !isEffectiveSubmitted;
    const isMatchingQuestion = q.type === 'matching';

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
            : 'h-screen bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fee2e2] dark:from-[#080812] dark:via-[#0b0b18] dark:to-[#080812] p-2 sm:p-4 md:p-5 lg:p-6 overflow-hidden'
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



            {/* Proctored Exam Fullscreen Warning / Entry Banner */}
            {(quiz.requireFullscreen || quiz.isProctored) && !isFullscreenActive && !(user?.role === 'admin' || user?.isAdmin) && (
                <div className="bg-gradient-to-r from-red-600 via-indigo-600 to-purple-600 text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between gap-3 z-40 shadow-lg animate-pulse">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-300" />
                        <span>🔒 Proctored Exam Mode — Fullscreen is required for this assessment.</span>
                    </div>
                    <button
                        type="button"
                        onClick={enterFullscreen}
                        className="px-3 py-1 bg-white text-indigo-900 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-white/90 transition shadow cursor-pointer"
                    >
                        Enter Fullscreen
                    </button>
                </div>
            )}

            {/* Fullscreen Exit Warning Modal */}
            {showFullscreenWarning && !(user?.role === 'admin' || user?.isAdmin) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#11121d] text-gray-900 dark:text-white border-2 border-red-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-red-600 dark:text-red-400">
                            Security Alert: Fullscreen Exit
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                            You exited fullscreen mode. This event has been recorded in the exam security audit log. Please return to fullscreen immediately to avoid penalties.
                        </p>
                        <button
                            type="button"
                            onClick={enterFullscreen}
                            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-red-500/25 cursor-pointer"
                        >
                            Return to Fullscreen
                        </button>
                    </div>
                </div>
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

            {/* --- ELEVATED QUIZ BOARD CONTAINER (Generous margin, rounded-3xl corners, drop shadow) --- */}
            <div className={`w-full max-w-7xl 2xl:max-w-[1536px] mx-auto flex-1 flex flex-col rounded-3xl overflow-hidden relative z-10 transition-all ${
                isBento
                    ? 'border-[3px] border-black bg-white dark:bg-[#0b0f19] shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.08)]'
                    : 'border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-xl shadow-2xl'
            }`}>
                {/* --- TOP BAR (Inside Card Header) --- */}
                {!embedded && (
                    <header className={`flex-none h-14 sm:h-16 landscape:h-12 lg:landscape:h-16 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm ${
                        isBento
                            ? 'bg-white dark:bg-[#0f172a] border-b-2 border-black dark:border-white/20'
                            : 'glass-panel border-b border-slate-200/80 dark:border-white/10'
                    }`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={onBack}
                            className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white dark:bg-slate-800 text-black dark:text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-y-0.5'
                                    : 'glass-card hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] sm:text-xs font-extrabold uppercase tracking-wider truncate max-w-[140px] sm:max-w-xs px-2.5 py-1 rounded-lg ${
                                isBento
                                    ? 'bg-purple-100 text-purple-900 border-2 border-black font-black shadow-[2px_2px_0px_#000]'
                                    : 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                            }`}>
                                {retryMode ? '⚠ Retry' : quiz.title}
                            </span>
                            {(user?.role === 'admin' || user?.isAdmin) && (
                                <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-purple-200 text-black border-2 border-black font-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                                }`}>
                                    <span>🛡️</span> Admin
                                </span>
                            )}
                            {poolProgress && (
                                <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg font-tabular ${
                                    isBento
                                        ? 'bg-blue-100 text-blue-900 border-2 border-black font-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}>
                                    Bank: {poolProgress.seenCount}/{poolProgress.totalCount} ({poolProgress.percentage}%)
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Shop Button */}
                        {!hidePowerUps && (
                            <button
                                onClick={() => setShowShop(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white hover:bg-amber-50 text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-y-0.5'
                                        : 'glass-card hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm active:scale-[0.985]'
                                }`}
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span className="hidden sm:inline">Store</span>
                            </button>
                        )}
                        
                        {/* Timer */}
                        {(() => {
                            const urgent = !countUpTimer && timeLeft < 30 && !isUnlimitedTime;
                            return (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-tabular font-extrabold border transition-all ${
                                    urgent
                                        ? isBento
                                            ? 'bg-rose-200 border-2 border-black text-rose-950 shadow-[2px_2px_0px_#000] animate-pulse'
                                            : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
                                        : isBento
                                            ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                            : 'glass-card border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200'
                                    }`}>
                                    <Clock className={`w-3.5 h-3.5 ${urgent ? 'animate-spin' : isBento ? 'text-black' : 'text-slate-400'}`} />
                                    <span className="tabular-nums text-xs sm:text-sm">
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
                <div className={`w-full ${
                    isMatchingQuestion
                        ? 'landscape:w-[38%] lg:w-[38%] xl:w-[35%]'
                        : 'landscape:w-1/2 lg:w-1/2'
                } h-auto landscape:h-full lg:h-full flex flex-col ${
                    isBento
                        ? 'bg-white dark:bg-[#0b0f19] border-b-2 landscape:border-b-0 landscape:border-r-2 lg:border-r-2 border-black dark:border-white/20'
                        : 'bg-white/70 dark:bg-white/[0.02] backdrop-blur-xl border-b landscape:border-b-0 landscape:border-r lg:border-r border-slate-200/80 dark:border-white/[0.06]'
                } relative z-20 landscape:sticky landscape:top-0 lg:sticky lg:top-0 landscape:overflow-y-auto lg:overflow-y-auto no-scrollbar`}>
                    
                    <div className={`w-full ${isMatchingQuestion ? 'max-w-none' : 'max-w-2xl lg:ml-auto'} flex flex-col flex-1`}>
                        {/* Progress Header */}
                        <div className="relative flex items-center justify-between p-4 px-5 sm:px-8 lg:px-10 pb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isBento ? 'text-slate-600 dark:text-slate-300 font-black' : 'text-slate-400'}`}>Question</span>
                                <span className="font-tabular text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">{currentQuestion + 1} / {quiz.questions.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                {/* AI Coach Button */}
                                <button
                                    type="button"
                                    onClick={flipToClue}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        isClueFlipped
                                            ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : isBento
                                                ? 'bg-white hover:bg-purple-50 text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-y-0.5'
                                                : 'glass-card hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-sm active:scale-[0.985]'
                                    }`}
                                    title={isClueFlipped ? "Flip back to question" : "Get AI clue"}
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${isClueFlipped ? 'text-black rotate-12' : 'text-purple-600 animate-pulse'}`} />
                                    <span className="text-[11px] sm:text-xs font-black">{isClueFlipped ? 'Question' : 'AI Coach'}</span>
                                </button>

                                {/* Flag Button (White to Yellow transition with filled black icon) */}
                                <button
                                    type="button"
                                    onClick={toggleCurrentQuestionFlag}
                                    aria-label={flaggedQuestions[actualIndex] ? 'Remove question flag' : 'Flag question for review'}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-black transition-all cursor-pointer ${
                                        flaggedQuestions[actualIndex]
                                            ? 'bg-[#facc15] text-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047] scale-[1.02] active:translate-y-0.5'
                                            : isBento
                                                ? 'bg-white text-black shadow-[2px_2px_0px_#000] hover:bg-amber-50 active:translate-y-0.5'
                                                : 'bg-white/90 text-slate-700 shadow-sm hover:bg-amber-50 border-slate-300'
                                    }`}
                                    title={flaggedQuestions[actualIndex] ? 'Question is flagged' : 'Flag question'}
                                >
                                    <Flag className={`w-4 h-4 transition-transform ${flaggedQuestions[actualIndex] ? 'fill-black text-black scale-110' : 'text-slate-700'}`} />
                                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${flaggedQuestions[actualIndex] ? 'text-black' : 'text-slate-700'}`}>
                                        {flaggedQuestions[actualIndex] ? 'Flagged' : 'Flag'}
                                    </span>
                                </button>

                                {/* Questions Menu Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowQuestionMenu(prev => !prev)}
                                    aria-expanded={showQuestionMenu}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                        isBento ? 'bg-white text-black border-2 border-black hover:bg-purple-100 shadow-[2px_2px_0px_#000]' : 'bg-white/70 text-slate-600 border-slate-200 hover:border-indigo-400'
                                    }`}
                                >
                                    <List className="w-4 h-4" />
                                    <span className="hidden sm:inline">Questions</span>
                                </button>
                                <div className={`font-tabular font-extrabold text-xs sm:text-sm ${isBento ? 'text-purple-700 dark:text-purple-300 font-black' : 'text-indigo-600 dark:text-indigo-400'}`}>{Math.round(progressPercentage)}%</div>
                            </div>
                            {showQuestionMenu && (
                                <div className={`absolute right-5 sm:right-8 lg:right-10 top-14 z-50 w-64 rounded-2xl border-2 p-3 shadow-xl ${isBento ? 'bg-white border-black' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-wider">Jump to question</span>
                                        <span className="text-[10px] font-bold text-slate-400">{Object.values(flaggedQuestions).filter(Boolean).length} flagged</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                                        {(retryMode ? wrongQuestionIndices : quiz.questions.map((_, index) => index)).map((_, position) => {
                                            const menuActualIndex = getActualQuestionIndex(position);
                                            const isAnswered = answers[menuActualIndex] !== undefined;
                                            const isFlagged = flaggedQuestions[menuActualIndex];
                                            const isMenuSubmitted = Boolean(isAnswered && submittedQuestions[menuActualIndex] && quiz.reviewMode !== false && !delayedValidation);
                                            const isMenuCorrect = isMenuSubmitted ? questionCorrectness[menuActualIndex] : undefined;
                                            return (
                                                <button
                                                    type="button"
                                                    key={menuActualIndex}
                                                    onClick={() => goToQuestion(position)}
                                                    className={`relative h-9 rounded-lg text-xs font-black border-2 cursor-pointer transition-all ${
                                                        position === currentQuestion
                                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-[2px_2px_0px_#000]'
                                                            : isMenuSubmitted
                                                                ? isMenuCorrect
                                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500'
                                                                    : 'bg-rose-100 text-rose-900 border-rose-600 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-500'
                                                                : isBento
                                                                    ? 'bg-slate-50 text-black border-black hover:bg-purple-100'
                                                                    : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    {position + 1}
                                                    {isMenuSubmitted ? (
                                                        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isMenuCorrect ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                                    ) : isAnswered ? (
                                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                                                    ) : null}
                                                    {isFlagged && <Flag className="absolute -right-1.5 -top-1.5 w-3.5 h-3.5 text-amber-500 fill-amber-300" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar Line */}
                        <div className="px-5 sm:px-8 lg:px-10 pb-3 sm:pb-4 border-b border-slate-200/60 dark:border-white/[0.06]">
                            <div className={`w-full rounded-full overflow-hidden flex ${
                                isBento
                                    ? 'h-2.5 bg-slate-100 dark:bg-white/10 border-1.5 border-black'
                                    : 'h-1.5 bg-slate-200/60 dark:bg-white/10'
                            }`}>
                                <div className={`h-full rounded-full transition-all duration-300 ${isBento ? 'bg-[#8b5cf6]' : 'bg-indigo-600'}`} style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                        </div>

                        {/* Real-time Language & Translation Toolbar */}
                        <div className="px-5 sm:px-8 lg:px-10 pt-3 sm:pt-4">
                            <QuestionTranslatorBar
                                currentLanguage={selectedLanguage}
                                isTranslating={isTranslating}
                                isTranslated={isTranslated && selectedLanguage !== 'original'}
                                autoTranslate={autoTranslate}
                                onSelectLanguage={handleSelectLanguage}
                                onToggleOriginal={handleToggleOriginal}
                                onToggleAutoTranslate={handleToggleAutoTranslate}
                            />
                        </div>

                        {/* Question Content */}
                        <div
                            dir={isCurrentRtl ? 'rtl' : 'ltr'}
                            className={`flex-1 landscape:overflow-y-auto px-5 sm:px-8 lg:px-10 pb-8 sm:pb-10 flex flex-col pt-5 sm:pt-8 landscape:pt-4 lg:landscape:pt-8 no-scrollbar ${shakeError ? 'animate-shake' : ''}`}>
                            
                            {/* Translated Indicator Badge */}
                            {isTranslated && selectedLanguage !== 'original' && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                    <span>Translated to {getLanguageByCode(selectedLanguage).name} ({getLanguageByCode(selectedLanguage).nativeName})</span>
                                </div>
                            )}

                            {/* 3D Flipping Question / Clue Card */}
                            <div className="perspective-1000 mb-6 sm:mb-8 w-full">
                                <div
                                    className={`preserve-3d paper-flip-spring relative w-full ${
                                        isClueFlipped ? 'paper-flipped' : ''
                                    }`}
                                >
                                    {/* FRONT FACE: Question Prompt Box */}
                                    <div className={`backface-hidden w-full min-h-[220px] sm:min-h-[250px] md:min-h-[270px] rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-center border-[3px] border-black bg-white dark:bg-[#0f172a] shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.1)] transition-all ${
                                        isClueFlipped ? 'pointer-events-none' : ''
                                    }`}>
                                        <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-[32px] landscape:text-lg lg:landscape:text-[28px] font-[900] tracking-tight text-gray-900 dark:text-white leading-snug lg:leading-normal ${isCurrentRtl ? 'text-right' : 'text-left'}`}>
                                            <MathRenderer text={displayQuestionText} dir={isCurrentRtl ? 'rtl' : 'ltr'} />
                                        </h2>
                                    </div>

                                    {/* BACK FACE: Revealed Socratic Clue Card (Spacious & Comfortable) */}
                                    <div className={`backface-hidden rotate-y-180 absolute inset-0 w-full h-full rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-[3px] border-black transition-all ${
                                        isBento
                                            ? 'bg-[#faf5ff] text-black shadow-[6px_6px_0px_#000]'
                                            : 'bg-purple-50 dark:bg-[#1a132e] text-slate-900 dark:text-white border-purple-300 dark:border-purple-800 shadow-xl'
                                    } ${!isClueFlipped ? 'pointer-events-none' : ''}`}>
                                        {/* Top row: Badges, Progress Dots & Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
                                                    {getClueLevelTitle(inlineClueLevel)}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {[1, 2, 3, 4].map(lvl => (
                                                        <div
                                                            key={lvl}
                                                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-black transition-all ${
                                                                lvl <= inlineClueLevel ? 'bg-[#8b5cf6]' : 'bg-white'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleNextInlineClue}
                                                    disabled={isInlineClueLoading}
                                                    className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-white hover:bg-purple-100 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                                                    title="Get a different clue from a new angle"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${isInlineClueLoading ? 'animate-spin' : ''}`} />
                                                    <span>Another Clue</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={flipToClue}
                                                    className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-[#fed7aa] hover:bg-[#fdba74] text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                                                    title="Return to Question"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    <span>Flip Back</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Clue Content: Spacious, comfortable, readable typography */}
                                        <div className="my-4 sm:my-6 min-h-[80px] flex items-center">
                                            {isInlineClueLoading ? (
                                                <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-purple-700 animate-pulse">
                                                    <Sparkles className="w-5 h-5 animate-spin text-purple-600" />
                                                    <span>Consulting AI Coach for a spoiler-free pointer...</span>
                                                </div>
                                            ) : (
                                                <p className="text-base sm:text-lg lg:text-xl font-bold sm:font-extrabold leading-relaxed sm:leading-loose text-slate-900 dark:text-slate-100">
                                                    {inlineClue || '💡 Think about the distinguishing behavior and rules that set this concept apart.'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom row */}
                                        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t-2 border-black/15 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                🔒 Zero-Spoiler Guaranteed
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={flipToClue}
                                                    className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-black cursor-pointer hover:underline"
                                                >
                                                    Return to Question ↩
                                                </button>
                                                <span>•</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsAICoachOpen(true);
                                                    }}
                                                    className="text-purple-700 dark:text-purple-400 underline font-black cursor-pointer hover:text-purple-900"
                                                >
                                                    Chat with Coach &rarr;
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Image */}
                            {q.imageUrl && (
                                <img
                                    src={q.imageUrl}
                                    alt="Reference"
                                    loading="lazy"
                                    decoding="async"
                                    className={`w-full rounded-2xl mb-8 object-cover max-h-64 ${isBento ? 'border-2 border-black shadow-[3px_3px_0px_#000]' : 'shadow-lg border border-gray-100 dark:border-gray-800'}`}
                                />
                            )}

                            {/* Audio / Video Question Prompt */}
                            {(q.audioUrl || q.videoUrl) && (
                                <MediaPromptPlayer
                                    audioUrl={q.audioUrl}
                                    videoUrl={q.videoUrl}
                                    videoTimestamp={q.videoTimestamp}
                                />
                            )}

                            {/* Code Snippet Preview */}
                            {q.codeSnippet && q.type !== 'code-output' && (
                                <div className={`rounded-2xl overflow-hidden mb-6 ${
                                    isBento
                                        ? 'bg-[#f8fafc] dark:bg-[#0d0d1a] border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-[#F6F7F8] dark:bg-[#0d0d1a] border border-gray-100 dark:border-[#1f2937] shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-inner'
                                }`}>
                                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${isBento ? 'border-black bg-white dark:bg-[#111827]' : 'border-gray-200 dark:border-[#1f2937] bg-white dark:bg-[#111827]'}`}>
                                        <div className="w-3 h-3 rounded-full bg-red-400 border border-black/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400 border border-black/20"></div>
                                    </div>
                                    <pre className="p-6 font-mono text-sm lg:text-base text-indigo-600 dark:text-emerald-400 whitespace-pre-wrap font-medium overflow-x-auto leading-relaxed">
                                        {q.codeSnippet}
                                    </pre>
                                </div>
                            )}

                            {/* Explanation Card */}
                            {isEffectiveSubmitted && (
                                <div className={`mt-6 p-6 rounded-2xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                                    isBento
                                        ? isEffectiveCorrect
                                            ? 'bg-[#dcfce7] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                            : 'bg-[#fee2e2] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                        : isEffectiveCorrect 
                                            ? 'bg-green-500/5 border-green-500/20 text-green-950 dark:text-green-100 shadow-lg shadow-green-500/5 backdrop-blur-md' 
                                            : 'bg-red-500/5 border-red-500/20 text-red-950 dark:text-red-100 shadow-lg shadow-red-500/5 backdrop-blur-md'
                                }`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-xl ${
                                            isBento
                                                ? isEffectiveCorrect
                                                    ? 'bg-emerald-500 text-white border-2 border-black font-black'
                                                    : 'bg-rose-500 text-white border-2 border-black font-black'
                                                : isEffectiveCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {isEffectiveCorrect ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                        </div>
                                        <h4 className="text-lg font-black tracking-tight">
                                            {isEffectiveCorrect ? 'Excellent! Correct Answer' : 'Incorrect Answer'}
                                        </h4>
                                    </div>

                                    {displayExplanationText ? (
                                        <div className={`pt-3 border-t ${isBento ? 'border-black/20' : 'border-gray-200/50 dark:border-white/5'}`}>
                                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                                                <Lightbulb className="w-3.5 h-3.5 text-yellow-500 animate-pulse"/>
                                                <span>Explanation</span>
                                            </div>
                                            <MathRenderer text={displayExplanationText} className={`text-sm leading-relaxed opacity-90 font-medium ${isCurrentRtl ? 'text-right' : 'text-left'}`} />
                                        </div>
                                    ) : (
                                        <div className="pt-3 border-t border-gray-200/50 dark:border-white/5 text-xs text-gray-400 italic">
                                            No explanation provided for this question.
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Helpful instructions for matching questions */}
                            {isMatchingQuestion && !isEffectiveSubmitted && (
                                <div className={`mt-4 p-4 rounded-2xl border transition-all ${
                                    isBento
                                        ? 'bg-[#fef9c3] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                }`}>
                                    <div className="flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                                        <span className="text-base select-none">💡</span>
                                        <div>
                                            <span className="font-black uppercase tracking-wider block mb-0.5">How to match:</span>
                                            <span>Click a term in <strong className="font-black">Column A</strong>, then click its corresponding definition in <strong className="font-black">Column B</strong>. Click "Linked" to disconnect a pair.</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* --- RIGHT SIDE: Answer Options --- */}
                <div className={`w-full ${
                    isMatchingQuestion
                        ? 'landscape:w-[62%] lg:w-[62%] xl:w-[65%]'
                        : 'landscape:w-1/2 lg:w-1/2'
                } h-auto landscape:h-full lg:h-full flex flex-col ${
                    isBento 
                        ? 'bg-[#f8fafc] dark:bg-[#030712]' 
                        : 'bg-transparent lg:bg-white/40 dark:bg-[#0b0f19]'
                } relative z-10 landscape:overflow-y-auto lg:overflow-y-auto no-scrollbar`}>
                    <div
                        role="radiogroup"
                        aria-label={`Options for Question ${currentQuestion + 1}`}
                        className={`flex-1 w-full ${isMatchingQuestion ? 'max-w-none' : 'max-w-2xl'} lg:mr-auto p-4 sm:p-6 lg:p-8 pt-5 sm:pt-6 landscape:pt-4 lg:landscape:pt-6 pb-6 landscape:pb-8 lg:landscape:pb-8 flex flex-col justify-start gap-3 sm:gap-3.5 no-scrollbar`}
                    >
                        {q.isCompiler ? (
                            <Suspense fallback={<div className="animate-spin w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>}>
                                <div className="h-[400px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl bg-white dark:bg-black">
                                    <CompilerQuestion
                                        initialCode={q.compilerConfig?.initialCode}
                                        language={q.compilerConfig?.language || 'javascript'}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting || isEffectiveSubmitted}
                                    />
                                </div>
                            </Suspense>
                        ) : q.type === 'ordering' ? (
                            <OrderingQuestion
                                items={activeTranslation?.orderingItems || q.orderingItems || q.options || []}
                                correctOrder={q.orderingItems || q.options}
                                submitted={isEffectiveSubmitted}
                                onChange={(ordered) => handleAnswer(ordered)}
                                readOnly={isSubmitting || isEffectiveSubmitted}
                            />
                        ) : q.type === 'matching' ? (
                            <MatchingQuestion
                                pairs={activeTranslation?.matchingPairs || q.matchingPairs || []}
                                submitted={isEffectiveSubmitted}
                                onChange={(matches) => handleAnswer(matches)}
                                readOnly={isSubmitting || isEffectiveSubmitted}
                            />
                        ) : q.type === 'code-output' ? (
                            <CodeOutputQuestion
                                codeSnippet={q.codeSnippet}
                                options={activeTranslation?.options || q.options}
                                correctAnswer={q.correctAnswer as string | number}
                                submitted={isEffectiveSubmitted}
                                userAnswer={answers[actualIndex] as string | number | undefined}
                                onChange={(val) => handleAnswer(val)}
                                readOnly={isSubmitting || isEffectiveSubmitted}
                            />
                        ) : q.type === 'text' ? (
                            <TextQuestion
                                value={typeof answers[actualIndex] === 'string' ? answers[actualIndex] as string : (answers[actualIndex] !== undefined ? String(answers[actualIndex]) : '')}
                                correctAnswer={q.correctAnswer}
                                submitted={isEffectiveSubmitted}
                                isCorrect={isEffectiveCorrect}
                                onChange={(val) => handleAnswer(val)}
                                onSubmit={submitQuestion}
                                readOnly={isSubmitting || isEffectiveSubmitted}
                            />
                        ) : (
                            currentOptions.map((originalIndex, visualIndex) => {
                                // If user used a hint to hide this
                                if (hiddenOptsForCurrent.includes(originalIndex)) return null;

                                const rawOption = q.options![originalIndex];
                                const option = (activeTranslation?.options && activeTranslation.options[originalIndex] !== undefined)
                                    ? activeTranslation.options[originalIndex]
                                    : rawOption;
                                const isSelected = answers[actualIndex] === originalIndex;
                                const isCorrectOption = originalIndex === q.correctAnswer;
                                const showCorrect = isEffectiveSubmitted && !isEffectiveCorrect && isCorrectOption;
                                const showWrong = isEffectiveSubmitted && !isEffectiveCorrect && isSelected;
                                const showSuccess = isEffectiveSubmitted && isEffectiveCorrect && isSelected;

                                const letters = ['A', 'B', 'C', 'D', 'E'];
                                const label = letters[visualIndex] || (visualIndex + 1);

                                // Dynamic classes based on state
                                const baseClass = isBento
                                    ? "group relative flex items-center p-4 sm:p-4.5 rounded-2xl cursor-pointer transition-all duration-150 w-full text-left font-bold border-2.5 border-black dark:border-white/30 focus-visible:outline-none select-none mb-1"
                                    : "group relative flex items-center p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 w-full text-left border shadow-sm font-semibold mb-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none";
                                
                                let stateClass = isBento
                                    ? "bg-white dark:bg-[#1e293b] text-black dark:text-white shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]"
                                    : "bg-white/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 hover:border-indigo-500/40 hover:bg-slate-100/60 dark:hover:bg-white/[0.06] text-slate-800 dark:text-slate-200 active:scale-[0.99]";
                                
                                let textClass = isBento ? "text-black dark:text-white font-bold" : "text-slate-800 dark:text-slate-200";
                                let badgeClass = isBento
                                    ? "bg-slate-100 text-black border-2 border-black font-black"
                                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400 group-hover:bg-indigo-500/15 group-hover:text-indigo-600 dark:group-hover:text-indigo-400";
                                
                                if (showSuccess) {
                                    stateClass = isBento
                                        ? "bg-[#bbf7d0] text-black border-2.5 border-black shadow-[4px_4px_0px_#000] ring-2 ring-emerald-600 scale-[1.01] z-10"
                                        : "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10 text-emerald-900 dark:text-emerald-200 scale-[1.01] z-10";
                                    badgeClass = isBento ? "bg-emerald-500 text-white border-2 border-black font-black" : "bg-emerald-500 text-white";
                                    textClass = isBento ? "text-black font-extrabold" : "text-emerald-900 dark:text-emerald-200 font-bold";
                                } else if (showWrong) {
                                    stateClass = isBento
                                        ? "bg-[#fecdd3] text-black border-2.5 border-black shadow-[4px_4px_0px_#000] ring-2 ring-rose-600 scale-[1.01] z-10"
                                        : "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/10 text-rose-900 dark:text-rose-200 scale-[1.01] z-10";
                                    badgeClass = isBento ? "bg-rose-500 text-white border-2 border-black font-black" : "bg-rose-500 text-white";
                                    textClass = isBento ? "text-black font-extrabold" : "text-rose-900 dark:text-rose-200";
                                } else if (showCorrect) {
                                    stateClass = isBento
                                        ? "bg-[#dcfce7] text-black border-2.5 border-black shadow-[3px_3px_0px_#000]"
                                        : "bg-emerald-500/5 border-emerald-500/60 text-emerald-800 dark:text-emerald-300";
                                    badgeClass = isBento ? "bg-emerald-500 text-white border-2 border-black font-black" : "bg-emerald-500 text-white";
                                    textClass = isBento ? "text-black font-bold" : "text-emerald-800 dark:text-emerald-300";
                                } else if (isSelected) {
                                    stateClass = isBento
                                        ? "bg-[#ddd6fe] text-black border-2.5 border-black shadow-[4px_4px_0px_#000] ring-2 ring-purple-600 scale-[1.01] z-10"
                                        : "bg-indigo-500/10 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10 text-indigo-900 dark:text-white scale-[1.01] z-10";
                                    badgeClass = isBento ? "bg-[#8b5cf6] text-white border-2 border-black font-black" : "bg-indigo-600 text-white";
                                    textClass = isBento ? "text-black font-extrabold" : "text-indigo-900 dark:text-indigo-100 font-bold";
                                }

                                return (
                                    <button
                                        key={originalIndex}
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={`Option ${label}: ${option}`}
                                        tabIndex={0}
                                        onClick={() => handleAnswer(originalIndex)}
                                        disabled={isSubmitting || isEffectiveSubmitted}
                                        className={`${baseClass} ${stateClass} disabled:opacity-75 disabled:cursor-default`}>
                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm mr-3 sm:mr-4 transition-colors shrink-0 ${badgeClass} font-tabular`}>
                                            {showSuccess || showCorrect ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : showWrong ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5"/> : label}
                                        </div>
                                        <MathRenderer text={option} className={`flex-1 text-sm sm:text-base text-left leading-relaxed ${textClass}`} dir={isCurrentRtl ? 'auto' : undefined} />
                                        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isBento ? 'bg-black/10 text-black border border-black/20' : 'bg-black/5 dark:bg-white/10 text-slate-400'}`}>
                                                {visualIndex + 1}
                                            </kbd>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Screen Reader Live Announcements */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
                Question {currentQuestion + 1} of {quiz.questions.length}: {q.question}
            </div>

            {/* Bottom Action Footer (Docked neatly inside the elevated card) */}
            <div className={`flex-none p-3 sm:p-4 z-20 w-full flex items-center justify-between pointer-events-auto ${
                isBento
                    ? 'bg-white dark:bg-[#0f172a] border-t-2 border-black dark:border-white/20 shadow-[0px_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'glass-panel border-t border-slate-200/80 dark:border-white/10 shadow-lg'
            }`}>
                {!isMobileDevice && (
                    <div className={`hidden lg:flex font-medium items-center gap-2 px-3.5 py-2 rounded-xl text-xs ${
                        isBento
                            ? 'bg-slate-100 text-black border-2 border-black font-bold'
                            : 'text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5'
                    }`}>
                        {q && q.options && !q.isCompiler && (!q.type || q.type === 'multiple-choice') && (
                            <>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-tabular ${isBento ? 'border border-black bg-white text-black' : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>1-{q.options.length}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBento ? 'border border-black bg-white text-black' : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>A-{String.fromCharCode(65 + q.options.length - 1)}</span> 
                                <span>select,</span> 
                            </>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBento ? 'border border-black bg-white text-black' : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>←</span> <span>back,</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBento ? 'border border-black bg-white text-black' : 'border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>Enter ↵</span> <span>advance</span>
                        <button
                            type="button"
                            onClick={() => setShowKeyboardShortcuts(true)}
                            className={`ml-2 text-xs font-bold flex items-center gap-1 cursor-pointer hover:underline ${
                                isBento ? 'text-purple-700 font-black' : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                        >
                            <Keyboard className="w-3.5 h-3.5" />
                            <span>Shortcuts</span>
                        </button>
                    </div>
                )}

                {/* Offline Warning Pill */}
                {!isOnline && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>Offline</span>
                    </div>
                )}
                
                {/* Answer Feedback Pill (Docked in footer, never overlapping header) */}
                {isEffectiveSubmitted && (
                    <div className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                        isEffectiveCorrect
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-emerald-500 text-white border-2 border-emerald-700'
                            : isBento
                                ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-rose-500 text-white border-2 border-rose-700'
                    }`} role="status" aria-live="assertive">
                        {isEffectiveCorrect ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-black" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-black" />}
                        <span className="font-black text-xs sm:text-sm">
                            {isEffectiveCorrect ? 'Correct answer!' : 'Not quite. Check the highlighted answer.'}
                        </span>
                    </div>
                )}

                <div className="flex w-full sm:w-auto gap-2.5 sm:gap-3 pointer-events-auto">
                    <button
                        onClick={previousQuestion}
                        disabled={currentQuestion === 0 || isSubmitting}
                        className={`flex-1 sm:flex-none px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#000]'
                                : 'glass-card hover:bg-slate-100/80 dark:hover:bg-white/[0.08] disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.985]'
                        }`}
                    >
                        <span>←</span>
                        Previous
                    </button>
                    {showSubmitButton ? (
                        <button
                            onClick={submitQuestion}
                            disabled={!hasCompleteAnswer}
                            className={`flex-1 sm:flex-none px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isBento
                                    ? 'bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40'
                                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.985]'
                            }`}
                        >
                            <span>Submit Answer</span>
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    ) : !isLastQuestion ? (
                        <button
                            onClick={nextQuestion}
                            disabled={answers[actualIndex] === undefined || (quiz.reviewMode !== false && !delayedValidation && !isEffectiveSubmitted)}
                            className={`flex-1 sm:flex-none px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isBento
                                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#000]'
                                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.985]'
                            }`}
                        >
                            <span>{isEffectiveSubmitted ? 'Continue' : 'Next Question'}</span>
                            <span>→</span>
                        </button>
                    ) : (
                        <button
                            onClick={isEffectiveSubmitted || delayedValidation || quiz.reviewMode === false ? handleQuizComplete : submitQuestion}
                            disabled={answers[actualIndex] === undefined}
                            className={`flex-1 sm:flex-none px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isBento
                                    ? 'bg-[#22c55e] hover:bg-[#16a34a] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-40'
                                    : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.985]'
                            }`}
                        >
                            <span>{isSubmitting ? 'Submitting...' : isEffectiveSubmitted || delayedValidation || quiz.reviewMode === false ? 'Finish Quiz' : 'Submit Answer'}</span>
                            {isEffectiveSubmitted || delayedValidation || quiz.reviewMode === false ? <Target className="w-4 h-4"/> : <CheckCircle className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div> {/* End ELEVATED QUIZ BOARD CONTAINER */}

            {/* --- SHOP OVERLAY (Feature 9) --- */}
            {showShop && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-end p-0 sm:p-6 transition-all animate-in fade-in ${
                    isBento ? 'bg-black/60' : 'bg-black/40 backdrop-blur-sm'
                }`}>
                    <div className={`w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] flex flex-col animate-in slide-in-from-right sm:slide-in-from-bottom-8 overflow-hidden ${
                        isBento
                            ? 'bg-white border-[3px] border-black sm:rounded-2xl shadow-[8px_8px_0px_#000]'
                            : 'bg-white dark:bg-[#111827] sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800'
                    }`}>
                        
                        {/* Shop Header */}
                        <div className={`p-6 flex justify-between items-center ${
                            isBento
                                ? 'bg-[#fde047] border-b-[2.5px] border-black'
                                : 'p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0d0d1c]'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                    isBento
                                        ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                                        : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black leading-none ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>Item Shop</h2>
                                    <p className={`text-xs font-bold mt-1 ${isBento ? 'text-black/70' : 'text-gray-500 dark:text-gray-400'}`}>Mid-Quiz Boosters</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowShop(false)}
                                className={`p-2 rounded-xl transition shrink-0 ${
                                    isBento
                                        ? 'border-2 border-black bg-white text-black hover:bg-[#fed7aa] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Balance */}
                        <div className="p-6 pb-4 text-center">
                            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${
                                isBento
                                    ? 'bg-[#fef08a] border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 shadow-inner'
                            }`}>
                                <Coins className={`w-6 h-6 ${isBento ? 'text-black' : 'text-yellow-500'}`} />
                                <span className={`text-3xl font-black ${isBento ? 'text-black' : 'text-yellow-600 dark:text-yellow-400'}`}>{localCoins}</span>
                            </div>
                        </div>

                        {/* Owned Inventory Quick Access inside Store */}
                        {localPowerUps.some(p => p.quantity > 0) && (
                            <div className={`px-6 pb-4 border-b ${isBento ? 'border-black' : 'border-gray-100 dark:border-gray-800'}`}>
                                <div className={`text-xs font-black uppercase tracking-wider mb-2 text-left ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`}>Your Inventory</div>
                                <div className="flex gap-2 flex-wrap justify-start">
                                    {localPowerUps.map(p => p.quantity > 0 && (
                                        <button
                                            key={p.type}
                                            onClick={() => {
                                                handleUseOwnedItem(p.type);
                                                setShowShop(false);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                                    : `bg-gradient-to-r ${getPowerUpColor(p.type)} text-white font-extrabold shadow-md hover:scale-105`
                                            }`}
                                            title={`Use ${p.type}`}
                                        >
                                            {getPowerUpIcon(p.type, "w-3.5 h-3.5")}
                                            <span className="capitalize">{p.type}</span>
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isBento ? 'bg-black text-white font-black' : 'bg-white/20'}`}>{p.quantity}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shop Items List */}
                        <div className={`flex-1 overflow-y-auto p-6 pt-2 flex flex-col gap-4 ${isBento ? 'bg-white' : 'bg-white dark:bg-transparent'}`}>
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
                                    <div key={item.type} className={`flex flex-row items-center gap-4 p-4 rounded-2xl relative overflow-hidden transition-all ${
                                        isBento
                                            ? 'bg-[#f5f3ec] border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md'
                                    }`}>
                                        
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                            isBento
                                                ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : `bg-gradient-to-br ${getPowerUpColor(item.icon)} shadow-lg text-white group-hover:scale-105`
                                        }`}>
                                            {getPowerUpIcon(item.icon, "w-7 h-7")}
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className={`font-black text-base leading-tight mb-0.5 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white font-bold'}`}>{item.name}</h3>
                                                {ownedQuantity > 0 && (
                                                    <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] uppercase tracking-wider ${
                                                        isBento
                                                            ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                            : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-extrabold'
                                                    }`}>
                                                        Owned: {ownedQuantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-xs pr-2 leading-relaxed ${isBento ? 'text-gray-700 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{item.desc}</div>
                                            
                                            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                                <span className={`font-black flex items-center gap-1.5 text-sm ${
                                                    isBento
                                                        ? 'text-black'
                                                        : canAfford ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'
                                                }`}>
                                                    <Coins className={`w-4 h-4 ${isBento ? 'text-yellow-500 fill-yellow-400' : ''}`}/> {item.price}
                                                </span>
                                                <div className="flex gap-2 ml-auto">
                                                    {ownedQuantity > 0 && (
                                                        <button 
                                                            onClick={() => {
                                                                handleUseOwnedItem(item.type);
                                                                setShowShop(false);
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1 ${
                                                                isBento
                                                                    ? 'bg-[#67e8f9] hover:bg-[#22d3ee] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'bg-green-600 hover:bg-green-700 text-white font-bold shadow-md'
                                                            }`}
                                                        >
                                                            Use
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            handleBuyItem(item.type, item.price, apiId);
                                                        }}
                                                        disabled={!canAfford}
                                                        className={`px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1 ${
                                                            isBento
                                                                ? canAfford
                                                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'bg-gray-200 text-gray-400 border-2 border-gray-300 font-black cursor-not-allowed'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white font-bold shadow-md'
                                                        }`}
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
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
                    isBento ? 'bg-black/60' : 'bg-black/70 backdrop-blur-md'
                }`}>
                    <div className={`p-8 max-w-md w-full animate-in fade-in zoom-in duration-200 ${
                        isBento
                            ? 'bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_#000] text-black'
                            : 'bg-white dark:bg-[#0f0f1e] text-gray-900 dark:text-white border border-gray-200 dark:border-white/[0.10] rounded-3xl shadow-2xl'
                    }`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-2xl ${
                                isBento
                                    ? 'bg-[#fde047] border-2 border-black shadow-[3px_3px_0px_#000] text-black'
                                    : 'bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                            }`}>
                                <Clock className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Resume Quiz?</h3>
                                <p className={`text-sm mt-0.5 ${isBento ? 'text-gray-600 font-medium' : 'text-gray-500 dark:text-slate-500'}`}>
                                    Unfinished attempt from {savedState ? new Date(savedState.lastUpdated).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>

                        <p className={`mb-8 text-sm leading-relaxed ${isBento ? 'text-gray-700 font-medium' : 'text-gray-600 dark:text-slate-400'}`}>
                            Continue where you left off, or start a fresh attempt from the beginning.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleStartNew}
                                className={`flex-1 px-4 py-3 rounded-xl font-black transition-all ${
                                    isBento
                                        ? 'bg-white hover:bg-[#fee2e2] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.10] font-bold'
                                }`}
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleResume}
                                className={`flex-1 px-4 py-3 rounded-xl font-black transition-all ${
                                    isBento
                                        ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30'
                                }`}
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help Modal */}
            <KeyboardShortcutsModal
                isOpen={showKeyboardShortcuts}
                onClose={() => setShowKeyboardShortcuts(false)}
            />

            {/* AI Study Coach Modal */}
            <AICoachModal
                isOpen={isAICoachOpen}
                question={q.question}
                options={q.options}
                category={quiz.category}
                onClose={() => setIsAICoachOpen(false)}
            />
        </div>
    );
};

export default QuizTaking;
