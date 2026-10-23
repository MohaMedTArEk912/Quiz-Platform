import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Clock, CheckCircle, XCircle, Target, Zap, Shield, Lightbulb, ArrowLeft, ShoppingBag, Coins, Keyboard, WifiOff, Globe, List, Flag, Sparkles, RotateCcw, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import type { Quiz, Question, UserData, QuizResult, AttemptAnswers, PoolProgressData, IntegrityTelemetry, IntegrityTelemetryEvent } from '../types';
import { api } from '../lib/api';
import { AmbientBackground } from './AmbientBackground';
import { MathRenderer } from './common/MathRenderer';
import { KeyboardShortcutsModal } from './common/KeyboardShortcutsModal';
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

const isSameAnswer = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a === undefined || a === null || b === undefined || b === null) return false;
    if (typeof a === 'object' && typeof b === 'object') {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }
    return String(a).trim() === String(b).trim();
};

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
    submittedAnswers?: Record<number, any>;
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
    const { theme, isBento } = useTheme();

    const getQuestionTypeLabel = useCallback((qObj: Question) => {
        if (qObj.isCompiler) return 'Coding';
        switch (qObj.type) {
            case 'text': return 'Text Fill';
            case 'matching': return 'Matching';
            case 'ordering': return 'Ordering';
            case 'code-output': return 'Code Output';
            default: return 'Multiple Choice';
        }
    }, []);
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

    // --- AI COACH QUOTA & COIN TOP-UP STATES ---
    const [aiCoachUsesLeft, setAiCoachUsesLeft] = useState<number>(() => {
        try {
            const saved = sessionStorage.getItem(`quiz_ai_hints_${quiz.id}_${user.userId}`);
            if (saved !== null) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 0) return parsed;
            }
        } catch {}
        return 3; // 3 starter hints per quiz attempt
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(`quiz_ai_hints_${quiz.id}_${user.userId}`, String(aiCoachUsesLeft));
        } catch {}
    }, [aiCoachUsesLeft, quiz.id, user.userId]);

    // Track highest unlocked clue level per question (actualIndex -> level)
    const [unlockedClues, setUnlockedClues] = useState<Record<number, number>>(() => {
        try {
            const saved = sessionStorage.getItem(`quiz_unlocked_clues_${quiz.id}_${user.userId}`);
            if (saved) return JSON.parse(saved);
        } catch {}
        return {};
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(`quiz_unlocked_clues_${quiz.id}_${user.userId}`, JSON.stringify(unlockedClues));
        } catch {}
    }, [unlockedClues, quiz.id, user.userId]);

    // Cache generated clues per question to avoid re-fetching and ensure free re-flipping
    const cachedCluesRef = useRef<Record<number, { clue: string; level: number; history: string[] }>>({});

    const [showAICoachBuyModal, setShowAICoachBuyModal] = useState(false);
    const [isPurchasingHint, setIsPurchasingHint] = useState<string | null>(null);
    const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null);

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
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, any>>(() => {
        return (initialSavedState?.submittedAnswers as Record<number, any>) || {};
    });
    const [questionCorrectness, setQuestionCorrectness] = useState<Record<number, boolean>>({});
    const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
    const [showQuestionMenu, setShowQuestionMenu] = useState(false);
    const [unsubmittedWarning, setUnsubmittedWarning] = useState<string | null>(null);

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
            submittedAnswers,
            questionCorrectness
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quizIdentifier, storageKey, showResumePrompt, isSubmitting, questionOrder, embedded, countUpTimer, submittedQuestions, submittedAnswers, questionCorrectness]);

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
            if (savedState.submittedAnswers) {
                setSubmittedAnswers(savedState.submittedAnswers);
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
        setSubmittedAnswers({});
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
        const actualIdx = getActualQuestionIndex(targetIndex);
        const cached = cachedCluesRef.current[actualIdx];
        if (cached) {
            setInlineClue(cached.clue);
            setInlineClueLevel(cached.level);
            setInlineClueHistory(cached.history);
        } else {
            setInlineClue('');
            setInlineClueLevel(1);
            setInlineClueHistory([]);
        }
        setIsInlineClueLoading(false);
        const hasAnswer = answers[actualIdx] !== undefined;
        const isSubmitted = Boolean(hasAnswer && submittedQuestions[actualIdx]);
        setQuestionSubmitted(isSubmitted);
        if (quiz.reviewMode !== false) {
            if (isSubmitted) {
                const q = quiz.questions[actualIdx];
                const isCorrect = questionCorrectness[actualIdx] !== undefined
                    ? questionCorrectness[actualIdx]
                    : (q ? checkComplexAnswer(q, answers[actualIdx]) : false);
                setIsCurrentAnswerCorrect(isCorrect);
            } else {
                setIsCurrentAnswerCorrect(false);
            }
        } else {
            setIsCurrentAnswerCorrect(false);
        }
    }, [currentQuestion, quiz.reviewMode, getActualQuestionIndex, answers, submittedQuestions, questionCorrectness, quiz.questions, checkComplexAnswer]);

    // Automatically keep questionSubmitted and isCurrentAnswerCorrect in sync whenever currentQuestion changes
    useEffect(() => {
        setShakeError(false);
        setIsClueFlipped(false);
        const actualIdx = getActualQuestionIndex(currentQuestion);
        const cached = cachedCluesRef.current[actualIdx];
        if (cached) {
            setInlineClue(cached.clue);
            setInlineClueLevel(cached.level);
            setInlineClueHistory(cached.history);
        } else {
            setInlineClue('');
            setInlineClueLevel(1);
            setInlineClueHistory([]);
        }
        setIsInlineClueLoading(false);

        const hasAnswer = answers[actualIdx] !== undefined;
        const isSubmitted = Boolean(hasAnswer && submittedQuestions[actualIdx]);
        setQuestionSubmitted(isSubmitted);
        if (quiz.reviewMode !== false) {
            if (isSubmitted) {
                const q = quiz.questions[actualIdx];
                const isCorrect = questionCorrectness[actualIdx] !== undefined 
                    ? questionCorrectness[actualIdx] 
                    : (q ? checkComplexAnswer(q, answers[actualIdx]) : false);
                setIsCurrentAnswerCorrect(isCorrect);
            } else {
                setIsCurrentAnswerCorrect(false);
            }
        } else {
            setIsCurrentAnswerCorrect(false);
        }
    }, [currentQuestion, answers, submittedQuestions, questionCorrectness, quiz.reviewMode, quiz.questions, getActualQuestionIndex, checkComplexAnswer]);

    const isLastQuestion = retryMode
        ? currentQuestion === wrongQuestionIndices.length - 1
        : currentQuestion === quiz.questions.length - 1;

    const goToQuestion = useCallback((questionPosition: number) => {
        if (isSubmitting) return;
        setCurrentQuestion(questionPosition);
        resetQuestionState(questionPosition);
        setShowQuestionMenu(false);
    }, [isSubmitting, resetQuestionState]);

    const unsubmittedQuestionsList = useMemo(() => {
        const questionIndices = retryMode ? wrongQuestionIndices : quiz.questions.map((_, i) => i);
        return questionIndices.filter(actualIdx => {
            const q = quiz.questions[actualIdx];
            if (!q) return false;
            const ans = answers[actualIdx];
            if (ans === undefined || ans === null) return true;
            if (q.type === 'matching') {
                const pairCount = q.matchingPairs?.length || (typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.keys(q.correctAnswer).length : 0);
                if (typeof ans !== 'object' || Object.keys(ans).length < pairCount) return true;
            }
            if (q.type === 'text') {
                if (typeof ans !== 'string' || ans.trim().length === 0) return true;
            }
            if (!submittedQuestions[actualIdx]) return true;
            // In quiz mode: if answer was changed since last submit, it is unsubmitted
            if (quiz.reviewMode === false && submittedAnswers[actualIdx] !== undefined) {
                if (!isSameAnswer(ans, submittedAnswers[actualIdx])) return true;
            }
            return false;
        });
    }, [retryMode, wrongQuestionIndices, quiz.questions, answers, submittedQuestions, quiz.reviewMode, submittedAnswers]);

    const allQuestionsSubmitted = unsubmittedQuestionsList.length === 0;

    const handleQuizComplete = useCallback((isTimeUp = false) => {
        if (isSubmitting) return;

        // If manual submission (not auto-timeout), verify that ALL questions are answered and submitted!
        if (!isTimeUp && !allQuestionsSubmitted) {
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);

            const count = unsubmittedQuestionsList.length;
            const msg = `Cannot finish quiz yet: Please answer and submit all questions (${count} question${count > 1 ? 's' : ''} remaining).`;
            setUnsubmittedWarning(msg);

            // Auto-navigate to first unsubmitted question position
            const firstUnsubmittedActual = unsubmittedQuestionsList[0];
            const targetPos = (retryMode ? wrongQuestionIndices : questionOrder).indexOf(firstUnsubmittedActual);
            if (targetPos !== -1 && targetPos !== currentQuestion) {
                goToQuestion(targetPos);
            }
            return;
        }

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

    }, [answers, delayedValidation, isSubmitting, onComplete, onProgress, questionOrder, quiz.questions, quiz.passingScore, storageKey, timeLeft, countUpTimer, checkComplexAnswer, currentQuestion, allQuestionsSubmitted, unsubmittedQuestionsList, retryMode, wrongQuestionIndices, goToQuestion]);

    const nextQuestion = useCallback(() => {
        if (isSubmitting) return;
        if (!isLastQuestion) {
            setCurrentQuestion(c => c + 1);
            resetQuestionState(currentQuestion + 1);
        } else {
            handleQuizComplete(false);
        }
    }, [isSubmitting, isLastQuestion, handleQuizComplete, currentQuestion, resetQuestionState]);

    const previousQuestion = useCallback(() => {
        if (isSubmitting || currentQuestion <= 0) return;
        setCurrentQuestion(c => c - 1);
        resetQuestionState(currentQuestion - 1);
    }, [isSubmitting, currentQuestion, resetQuestionState]);

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
                const nextHistory = inlineClueHistory.includes(hint) ? inlineClueHistory : [...inlineClueHistory, hint];
                setInlineClueHistory(nextHistory);

                // Cache clue for this question so returning to it is instant and free
                cachedCluesRef.current[actualIdx] = {
                    clue: hint,
                    level: targetLevel,
                    history: nextHistory
                };

                const cacheKey = `${actualIdx}_${targetLevel}`;
                const currentLangKey = isNonEn ? selectedLanguage : 'original';
                clueTranslationsRef.current[cacheKey] = {
                    ...(clueTranslationsRef.current[cacheKey] || {}),
                    [currentLangKey]: hint
                };
            }
        } catch (err) {
            console.error('Failed to get clue:', err);
            const fallbackHint = '💡 Focus on the fundamental rules of this topic and eliminate options that contradict core principles.';
            setInlineClue(fallbackHint);
            cachedCluesRef.current[actualIdx] = {
                clue: fallbackHint,
                level: targetLevel,
                history: [fallbackHint]
            };
        } finally {
            setIsInlineClueLoading(false);
        }
    }, [getActualQuestionIndex, quiz.questions, quiz.category, answers, isTranslated, selectedLanguage, inlineClueHistory]);

    const flipToClue = useCallback(() => {
        const actualIdx = getActualQuestionIndex();

        // If currently flipped to clue, flipping back to question is always free and allowed!
        if (isClueFlipped) {
            setIsClueFlipped(false);
            return;
        }

        // We want to flip to clue. Check if already unlocked on this question:
        const isAlreadyUnlocked = (unlockedClues[actualIdx] || 0) >= 1;

        if (!isAlreadyUnlocked) {
            if (aiCoachUsesLeft <= 0) {
                sounds.playClick();
                setShowAICoachBuyModal(true);
                return;
            }

            // Deduct 1 hint from quota and record question as unlocked at level 1
            setAiCoachUsesLeft(prev => Math.max(0, prev - 1));
            setUnlockedClues(prev => ({ ...prev, [actualIdx]: 1 }));
        }

        // Check if we already have a cached clue for this question
        const cached = cachedCluesRef.current[actualIdx];
        if (cached) {
            setInlineClue(cached.clue);
            setInlineClueLevel(cached.level);
            setInlineClueHistory(cached.history);
        }

        setIsClueFlipped(true);

        if (!cached && !inlineClue) {
            fetchInlineClue(1);
        }
    }, [isClueFlipped, getActualQuestionIndex, unlockedClues, aiCoachUsesLeft, inlineClue, fetchInlineClue]);

    const handleNextInlineClue = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const actualIdx = getActualQuestionIndex();
        const nextLevel = inlineClueLevel + 1;
        const isAlreadyUnlocked = (unlockedClues[actualIdx] || 0) >= nextLevel;

        if (!isAlreadyUnlocked) {
            if (aiCoachUsesLeft <= 0) {
                sounds.playClick();
                setShowAICoachBuyModal(true);
                return;
            }

            // Deduct 1 hint and mark nextLevel as unlocked
            setAiCoachUsesLeft(prev => Math.max(0, prev - 1));
            setUnlockedClues(prev => ({ ...prev, [actualIdx]: nextLevel }));
        }

        fetchInlineClue(nextLevel);
    }, [getActualQuestionIndex, inlineClueLevel, unlockedClues, aiCoachUsesLeft, fetchInlineClue]);

    const handleBuyAICoachHints = async (hintsToAdd: number, cost: number, itemId: string) => {
        if (localCoins < cost) return;
        setIsPurchasingHint(itemId);

        const newCoins = localCoins - cost;
        setLocalCoins(newCoins);
        setAiCoachUsesLeft(prev => prev + hintsToAdd);
        sounds.playPowerUp();

        try {
            const res = await api.purchaseItem(itemId, user.userId);
            if (res && typeof res.coins === 'number') {
                setLocalCoins(res.coins);
                onUserUpdate?.({ coins: res.coins });
            } else {
                onUserUpdate?.({ coins: newCoins });
            }
            setPurchaseFeedback(`+${hintsToAdd} hints added to AI Coach!`);
            setTimeout(() => setPurchaseFeedback(null), 2500);
        } catch (err) {
            console.warn('API purchase failed, maintained local balance:', err);
            onUserUpdate?.({ coins: newCoins });
            setPurchaseFeedback(`+${hintsToAdd} hints added!`);
            setTimeout(() => setPurchaseFeedback(null), 2500);
        } finally {
            setIsPurchasingHint(null);
        }
    };

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

        // In Quiz Mode: if user changed their answer from the previously submitted answer,
        // update submittedQuestions so that they are prompted to re-submit before finishing!
        if (quiz.reviewMode === false) {
            const prevSub = submittedAnswers[actualIndex];
            if (prevSub !== undefined) {
                const isSame = isSameAnswer(answer, prevSub);
                setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: isSame }));
                setQuestionSubmitted(isSame);
            }
        }

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
    }, [isSubmitting, getActualQuestionIndex, quiz.questions, mustAnswerCorrectly, delayedValidation, answers, onProgress, checkComplexAnswer, currentQuestion, quiz.reviewMode, submittedQuestions, submittedAnswers]);


    const submitQuestion = useCallback(() => {
        const actualIndex = getActualQuestionIndex();
        // In review mode, do not allow re-submitting an already submitted question
        if (quiz.reviewMode !== false && submittedQuestions[actualIndex]) return;

        lastSubmitTimeRef.current = Date.now();
        const q = quiz.questions[actualIndex];
        const answer = answers[actualIndex];
        if (answer === undefined) return;
        if (q.type === 'matching') {
            const pairCount = q.matchingPairs?.length || (typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.keys(q.correctAnswer).length : 0);
            if (typeof answer !== 'object' || Object.keys(answer).length < pairCount) return;
        }

        const isCorrect = checkComplexAnswer(q, answer);
        if (quiz.reviewMode !== false) {
            setIsCurrentAnswerCorrect(isCorrect);
            if (isCorrect) {
                sounds.playCorrect();
            } else {
                sounds.playIncorrect();
            }
        } else {
            // Quiz Mode: play a gentle submit click without revealing correctness
            sounds.playClick();
        }

        setQuestionSubmitted(true);
        setSubmittedQuestions(prev => ({ ...prev, [actualIndex]: true }));
        setSubmittedAnswers(prev => ({ ...prev, [actualIndex]: answer }));
        setQuestionCorrectness(prev => ({ ...prev, [actualIndex]: isCorrect }));
        setIsClueFlipped(false);
        setUnsubmittedWarning(null);

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
    }, [answers, getActualQuestionIndex, quiz.questions, submittedQuestions, onProgress, checkComplexAnswer, delayedValidation, quiz.reviewMode]);


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
                if (Date.now() - lastSubmitTimeRef.current < 600) {
                    e.preventDefault();
                    return;
                }

                const isAlreadySubmitted = Boolean(
                    submittedQuestions[actualIndex] && 
                    (quiz.reviewMode !== false || isSameAnswer(answers[actualIndex], submittedAnswers[actualIndex]))
                );
                if (isInputFocused && !isAlreadySubmitted) return; // Let input's onKeyDown handle submit

                e.preventDefault();
                const currentAns = answers[actualIndex];
                if (currentAns === undefined) {
                    setShakeError(true);
                    setTimeout(() => setShakeError(false), 400);
                    return;
                }

                if (!isAlreadySubmitted) {
                    submitQuestion();
                } else if (!isLastQuestion) {
                    nextQuestion();
                } else {
                    handleQuizComplete(false);
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
                nextQuestion();
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
    }, [showResumePrompt, isSubmitting, showShop, getActualQuestionIndex, quiz.questions, quiz.reviewMode, delayedValidation, answers, questionSubmitted, submittedQuestions, submittedAnswers, isLastQuestion, nextQuestion, previousQuestion, optionsOrder, hiddenOptions, handleAnswer, submitQuestion, handleQuizComplete]);


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
            let skipAns: any = "SKIPPED";
            if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
                skipAns = q.correctAnswer;
                handleAnswer(q.correctAnswer as string | number | string[] | Record<string, string>);
            } else if (q.isCompiler && q.compilerConfig?.referenceCode) {
                skipAns = q.compilerConfig.referenceCode;
                handleAnswer(q.compilerConfig.referenceCode);
            } else if (q.type === 'ordering' && (q.orderingItems || q.options)) {
                skipAns = q.orderingItems || q.options || [];
                handleAnswer(q.orderingItems || q.options || []);
            } else if (q.type === 'matching' && q.matchingPairs) {
                const autoMatches: Record<string, string> = {};
                q.matchingPairs.forEach(p => { autoMatches[p.left] = p.right; });
                skipAns = autoMatches;
                handleAnswer(autoMatches);
            } else {
                handleAnswer("SKIPPED");
            }
            setSubmittedQuestions(prev => ({ ...prev, [actualIdx]: true }));
            setSubmittedAnswers(prev => ({ ...prev, [actualIdx]: skipAns }));
            setQuestionCorrectness(prev => ({ ...prev, [actualIdx]: true }));
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
                    handleQuizComplete(true);
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
    const isMatchingQuestion = q.type === 'matching';
    const matchingPairCount = isMatchingQuestion
        ? q.matchingPairs?.length || (typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? Object.keys(q.correctAnswer).length : 0)
        : 0;
    const hasCompleteAnswer = currentAnswer !== undefined && currentAnswer !== null && (
        !isMatchingQuestion || (typeof currentAnswer === 'object' && Object.keys(currentAnswer).length >= matchingPairCount)
    ) && (
        q.type !== 'text' || (typeof currentAnswer === 'string' && currentAnswer.trim().length > 0)
    );

    const isReviewMode = quiz.reviewMode !== false;
    const isCurrentQuestionSubmitted = Boolean(
        hasCompleteAnswer && submittedQuestions[actualIndex] &&
        (isReviewMode || isSameAnswer(currentAnswer, submittedAnswers[actualIndex]))
    );

    const hasChangedFromSubmitted = Boolean(
        !isReviewMode &&
        hasCompleteAnswer &&
        submittedAnswers[actualIndex] !== undefined &&
        !isSameAnswer(currentAnswer, submittedAnswers[actualIndex])
    );

    const isReviewModeSubmitted = Boolean(
        !delayedValidation &&
        isReviewMode &&
        isCurrentQuestionSubmitted
    );

    const isEffectiveCorrect = isReviewModeSubmitted
        ? (questionCorrectness[actualIndex] !== undefined
            ? questionCorrectness[actualIndex]
            : (isCurrentAnswerCorrect || checkComplexAnswer(q, currentAnswer)))
        : false;

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
            : 'h-screen bg-slate-100/90 dark:bg-[#070b14] p-2 sm:p-4 md:p-5 lg:p-6 overflow-hidden'
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
            {questionSubmitted && !delayedValidation && isReviewMode && (
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
                    : 'border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c101c] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]'
            }`}>
                {/* --- TOP BAR (Inside Card Header) --- */}
                {!embedded && (
                    <header className={`flex-none h-14 sm:h-16 landscape:h-12 lg:landscape:h-16 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm ${
                        isBento
                            ? 'bg-white dark:bg-[#0f172a] border-b-2 border-black dark:border-white/20'
                            : 'bg-white/95 dark:bg-[#0f1424]/95 border-b border-slate-200/80 dark:border-white/10 backdrop-blur-xl'
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
                        : 'bg-white dark:bg-[#0c101c] border-b landscape:border-b-0 landscape:border-r lg:border-r border-slate-200/80 dark:border-white/10'
                } relative z-20 landscape:sticky landscape:top-0 lg:sticky lg:top-0 landscape:overflow-y-auto lg:overflow-y-auto no-scrollbar`}>
                    
                    <div className={`w-full ${isMatchingQuestion ? 'max-w-none' : 'max-w-2xl lg:ml-auto'} flex flex-col flex-1`}>
                        {/* Progress Header */}
                        <div className="relative flex items-center justify-between p-4 px-5 sm:px-8 lg:px-10 pb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isBento ? 'text-slate-600 dark:text-slate-300 font-black' : 'text-slate-400'}`}>Question</span>
                                <span className="font-tabular text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">{currentQuestion + 1} / {quiz.questions.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                {/* AI Coach Button Group (Quota & Coin Top-up) */}
                                <div className="inline-flex items-center">
                                    <button
                                        type="button"
                                        onClick={flipToClue}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            isClueFlipped
                                                ? 'rounded-xl bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : isBento
                                                    ? 'rounded-l-xl bg-white hover:bg-purple-50 text-black border-2 border-black border-r-0 shadow-[2px_2px_0px_#000] active:translate-y-0.5'
                                                    : theme === 'dark'
                                                        ? 'rounded-l-xl bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-500/30 border-r-0'
                                                        : 'rounded-l-xl bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 border-r-0'
                                        }`}
                                        title={
                                            isClueFlipped 
                                                ? "Flip back to question" 
                                                : `Get AI clue (${aiCoachUsesLeft} hint${aiCoachUsesLeft === 1 ? '' : 's'} remaining)`
                                        }
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${isClueFlipped ? 'text-black rotate-12' : 'text-purple-600 animate-pulse'}`} />
                                        <span className="text-[11px] sm:text-xs font-black">{isClueFlipped ? 'Question' : 'AI Coach'}</span>
                                        {!isClueFlipped && (
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none ${
                                                aiCoachUsesLeft > 0
                                                    ? isBento
                                                        ? 'bg-[#c084fc] text-black border border-black'
                                                        : theme === 'dark'
                                                            ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                                                            : 'bg-indigo-200 text-indigo-800'
                                                    : isBento
                                                        ? 'bg-[#f87171] text-black border border-black animate-pulse'
                                                        : 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                                            }`}>
                                                {aiCoachUsesLeft}
                                            </span>
                                        )}
                                    </button>
                                    {!isClueFlipped && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                sounds.playClick();
                                                setShowAICoachBuyModal(true);
                                            }}
                                            className={`flex items-center gap-0.5 px-2 py-1.5 rounded-r-xl text-xs font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#fef08a] hover:bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5'
                                                    : theme === 'dark'
                                                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-indigo-500/30'
                                                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-indigo-200'
                                            }`}
                                            title="Add more AI hints with coins"
                                        >
                                            <Coins className={`w-3.5 h-3.5 ${isBento ? 'text-black' : 'text-amber-500'}`} />
                                            <span className="text-[10px] font-black">+</span>
                                        </button>
                                    )}
                                </div>

                                {/* Flag Button (White to Yellow transition with filled black icon) */}
                                {/* Flag Button */}
                                <button
                                    type="button"
                                    onClick={toggleCurrentQuestionFlag}
                                    aria-label={flaggedQuestions[actualIndex] ? 'Remove question flag' : 'Flag question for review'}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                        flaggedQuestions[actualIndex]
                                            ? isBento
                                                ? 'bg-[#facc15] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047] scale-[1.02] active:translate-y-0.5'
                                                : 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/60 shadow-sm'
                                            : isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-amber-50 active:translate-y-0.5'
                                                : 'glass-card hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 shadow-sm'
                                    }`}
                                    title={flaggedQuestions[actualIndex] ? 'Question is flagged' : 'Flag question'}
                                >
                                    <Flag className={`w-4 h-4 transition-transform ${flaggedQuestions[actualIndex] ? 'fill-amber-400 text-amber-500 scale-110' : 'text-slate-600 dark:text-slate-400'}`} />
                                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                                        {flaggedQuestions[actualIndex] ? 'Flagged' : 'Flag'}
                                    </span>
                                </button>

                                {/* Questions Menu Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowQuestionMenu(prev => !prev)}
                                    aria-expanded={showQuestionMenu}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black hover:bg-purple-100 shadow-[2px_2px_0px_#000]'
                                            : 'glass-card hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm'
                                    }`}
                                >
                                    <List className="w-4 h-4" />
                                    <span className="hidden sm:inline">Questions</span>
                                </button>
                                <div className={`font-tabular font-extrabold text-xs sm:text-sm ${isBento ? 'text-purple-700 dark:text-purple-300 font-black' : 'text-indigo-600 dark:text-indigo-400'}`}>{Math.round(progressPercentage)}%</div>
                            </div>
                            {showQuestionMenu && (
                                <div className={`absolute right-5 sm:right-8 lg:right-10 top-14 z-50 w-64 rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[5px_5px_0px_#000]'
                                        : 'bg-white dark:bg-[#121829] border border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-wider">Jump to question</span>
                                        <span className="text-[10px] font-bold text-slate-400">{Object.values(flaggedQuestions).filter(Boolean).length} flagged</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                                        {(retryMode ? wrongQuestionIndices : quiz.questions.map((_, index) => index)).map((_, position) => {
                                            const menuActualIndex = getActualQuestionIndex(position);
                                            const isMenuAnswered = answers[menuActualIndex] !== undefined;
                                            const isFlagged = flaggedQuestions[menuActualIndex];
                                            const isMenuSub = Boolean(
                                                isMenuAnswered && submittedQuestions[menuActualIndex] &&
                                                (isReviewMode || isSameAnswer(answers[menuActualIndex], submittedAnswers[menuActualIndex]))
                                            );
                                            const hasMenuChanged = Boolean(
                                                !isReviewMode && isMenuAnswered && !isMenuSub && submittedAnswers[menuActualIndex] !== undefined
                                            );
                                            const showReviewColors = isReviewMode && !delayedValidation && isMenuSub;
                                            const isMenuCorrect = showReviewColors ? questionCorrectness[menuActualIndex] : undefined;
                                            return (
                                                <button
                                                    type="button"
                                                    key={menuActualIndex}
                                                    onClick={() => goToQuestion(position)}
                                                    className={`relative h-9 rounded-lg text-xs font-black border-2 cursor-pointer transition-all ${
                                                        position === currentQuestion
                                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-[2px_2px_0px_#000]'
                                                            : showReviewColors
                                                                ? isMenuCorrect
                                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500'
                                                                    : 'bg-rose-100 text-rose-900 border-rose-600 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-500'
                                                                : isMenuSub
                                                                    ? isBento
                                                                        ? 'bg-[#ddd6fe] text-black border-black font-black hover:bg-[#c4b5fd]'
                                                                        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-500 hover:border-indigo-600'
                                                                    : hasMenuChanged
                                                                        ? isBento
                                                                            ? 'bg-[#fef08a] text-black border-black font-black hover:bg-[#fde047]'
                                                                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-500 hover:border-amber-600'
                                                                        : isBento
                                                                            ? 'bg-slate-50 text-black border-black hover:bg-purple-100'
                                                                            : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    {position + 1}
                                                    {showReviewColors ? (
                                                        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isMenuCorrect ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                                    ) : isMenuSub ? (
                                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                                    ) : hasMenuChanged ? (
                                                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    ) : isMenuAnswered ? (
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
                            <div className="perspective-1000 mb-6 w-full">
                                <div
                                    className={`preserve-3d paper-flip-spring relative w-full ${
                                        isClueFlipped ? 'paper-flipped' : ''
                                    }`}
                                >
                                    {/* FRONT FACE: Question Prompt Box */}
                                    <div className={`backface-hidden w-full min-h-[250px] sm:min-h-[280px] rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col ${
                                        isReviewModeSubmitted ? 'justify-start' : 'justify-between'
                                    } transition-all overflow-hidden relative ${
                                        theme === 'bento'
                                            ? 'border-[3.5px] border-black bg-white dark:bg-[#111827] shadow-[6px_6px_0px_#000] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.15)] text-black dark:text-white'
                                            : theme === 'dark'
                                                ? 'border border-indigo-500/35 bg-gradient-to-b from-[#11182c] via-[#0d1424] to-[#090d18] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_24px_rgba(99,102,241,0.08)] text-white'
                                                : 'border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/80 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.02)] text-slate-900'
                                    } ${isClueFlipped ? 'pointer-events-none' : ''}`}>
                                        {/* Top ambient highlight line for Dark / Light */}
                                        {theme === 'dark' && (
                                            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent pointer-events-none" />
                                        )}
                                        {theme === 'light' && (
                                            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent pointer-events-none" />
                                        )}

                                        {!isReviewModeSubmitted ? (
                                            <div className="flex flex-col h-full justify-between gap-4">
                                                {/* Themed Meta Header inside Question Box */}
                                                <div className={`flex items-center justify-between gap-2 pb-3 shrink-0 ${
                                                    theme === 'bento'
                                                        ? 'border-b-[2.5px] border-black'
                                                        : theme === 'dark'
                                                            ? 'border-b border-indigo-500/20'
                                                            : 'border-b border-slate-100'
                                                } ${isCurrentRtl ? 'flex-row-reverse' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-wider ${
                                                            theme === 'bento'
                                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                : theme === 'dark'
                                                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm flex items-center gap-1.5'
                                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-sm flex items-center gap-1.5'
                                                        }`}>
                                                            {theme === 'dark' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8] animate-pulse" />}
                                                            {theme === 'light' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                                            Question {currentQuestion + 1}
                                                        </span>
                                                        <span className={`px-2.5 py-1 rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-wider ${
                                                            theme === 'bento'
                                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                : theme === 'dark'
                                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                                        }`}>
                                                            {q.points || 10} PTS
                                                        </span>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] font-black uppercase tracking-wider ${
                                                        theme === 'bento'
                                                            ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : theme === 'dark'
                                                                ? 'bg-white/[0.06] text-slate-300 border border-white/10'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        {getQuestionTypeLabel(q)}
                                                    </span>
                                                </div>

                                                {/* Question Prompt Text */}
                                                <div className="flex-1 flex items-center py-2 sm:py-3">
                                                    <h2 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug lg:leading-normal w-full ${
                                                        theme === 'bento'
                                                            ? 'text-black dark:text-white'
                                                            : theme === 'dark'
                                                                ? 'text-white drop-shadow-sm'
                                                                : 'text-slate-900'
                                                    } ${isCurrentRtl ? 'text-right' : 'text-left'}`}>
                                                        <MathRenderer text={displayQuestionText} dir={isCurrentRtl ? 'rtl' : 'ltr'} />
                                                    </h2>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col h-full justify-between gap-3 animate-in fade-in duration-300">
                                                {/* Minimized Question Prompt */}
                                                <div className={`pb-2.5 shrink-0 ${
                                                    theme === 'bento'
                                                        ? 'border-b-[2.5px] border-black'
                                                        : theme === 'dark'
                                                            ? 'border-b border-indigo-500/25'
                                                            : 'border-b border-slate-200'
                                                } ${isCurrentRtl ? 'text-right' : 'text-left'}`}>
                                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">
                                                        <span className={theme === 'bento' ? 'text-black font-black' : theme === 'dark' ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold'}>
                                                            Question {currentQuestion + 1} • {getQuestionTypeLabel(q)}
                                                        </span>
                                                    </div>
                                                    <h3 className={`text-sm sm:text-base font-extrabold leading-snug ${
                                                        theme === 'bento' ? 'text-black dark:text-white' : theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                                                    }`}>
                                                        <MathRenderer text={displayQuestionText} dir={isCurrentRtl ? 'rtl' : 'ltr'} />
                                                    </h3>
                                                </div>

                                                {/* Explanation & Result Block */}
                                                <div className={`flex-1 p-4 sm:p-5 rounded-xl sm:rounded-2xl transition-all flex flex-col justify-between ${
                                                    theme === 'bento'
                                                        ? isEffectiveCorrect
                                                            ? 'bg-[#dcfce7] border-[2.5px] border-black shadow-[3px_3px_0px_#000] text-black'
                                                            : 'bg-[#fee2e2] border-[2.5px] border-black shadow-[3px_3px_0px_#000] text-black'
                                                        : theme === 'dark'
                                                            ? isEffectiveCorrect
                                                                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 shadow-md'
                                                                : 'bg-rose-950/40 border border-rose-500/40 text-rose-100 shadow-md'
                                                            : isEffectiveCorrect
                                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm'
                                                                : 'bg-rose-50 border border-rose-200 text-rose-950 shadow-sm'
                                                }`}>
                                                    <div className="flex items-center gap-3 mb-2.5 shrink-0">
                                                        <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${
                                                            theme === 'bento'
                                                                ? isEffectiveCorrect
                                                                    ? 'bg-emerald-500 text-white border-2 border-black font-black'
                                                                    : 'bg-rose-500 text-white border-2 border-black font-black'
                                                                : isEffectiveCorrect ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                                        }`}>
                                                            {isEffectiveCorrect ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                                        </div>
                                                        <h4 className="text-base sm:text-lg font-black tracking-tight text-inherit">
                                                            {isEffectiveCorrect ? 'Excellent! Correct Answer' : 'Incorrect Answer'}
                                                        </h4>
                                                    </div>

                                                    {displayExplanationText ? (
                                                        <div className={`pt-2.5 border-t ${
                                                            theme === 'bento' ? 'border-black/20' : theme === 'dark' ? 'border-white/10' : 'border-slate-200/60'
                                                        } overflow-y-auto no-scrollbar`}>
                                                            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest opacity-80 mb-1.5">
                                                                <Lightbulb className="w-3.5 h-3.5 text-yellow-500 animate-pulse"/>
                                                                <span>Explanation</span>
                                                            </div>
                                                            <MathRenderer text={displayExplanationText} className={`text-xs sm:text-sm leading-relaxed font-bold opacity-90 ${isCurrentRtl ? 'text-right' : 'text-left'}`} />
                                                        </div>
                                                    ) : (
                                                        <div className="pt-2 border-t border-black/10 text-xs text-gray-500 italic">
                                                            No explanation provided for this question.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BACK FACE: Revealed Socratic Clue Card (Themed for Bento, Dark, and Light) */}
                                    <div className={`backface-hidden rotate-y-180 absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all overflow-hidden ${
                                        theme === 'bento'
                                            ? 'border-[3.5px] border-black bg-[#faf5ff] text-black shadow-[6px_6px_0px_#000]'
                                            : theme === 'dark'
                                                ? 'border border-indigo-500/35 bg-gradient-to-br from-[#121833] via-[#0f1426] to-[#090d18] text-white shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]'
                                                : 'border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white text-slate-900 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08)]'
                                    } ${!isClueFlipped ? 'pointer-events-none' : ''}`}>
                                        {/* Top row: Badges & Action Buttons */}
                                        <div className={`flex items-center justify-between gap-2 shrink-0 pb-2.5 ${
                                            theme === 'bento' ? 'border-b-[2.5px] border-black/20' : theme === 'dark' ? 'border-b border-indigo-500/25' : 'border-b border-indigo-100'
                                        }`} onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider truncate ${
                                                    theme === 'bento'
                                                        ? 'bg-[#c084fc] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                        : theme === 'dark'
                                                            ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                }`}>
                                                    {getClueLevelTitle(inlineClueLevel)}
                                                </span>
                                                <div className="hidden xs:flex sm:flex items-center gap-1 shrink-0">
                                                    {[1, 2, 3, 4].map(lvl => (
                                                        <div
                                                            key={lvl}
                                                            className={`w-2 h-2 rounded-full transition-all ${
                                                                theme === 'bento'
                                                                    ? lvl <= inlineClueLevel ? 'bg-[#8b5cf6] border border-black' : 'bg-white border border-black'
                                                                    : theme === 'dark'
                                                                        ? lvl <= inlineClueLevel ? 'bg-indigo-400 shadow-[0_0_6px_#818cf8]' : 'bg-white/20'
                                                                        : lvl <= inlineClueLevel ? 'bg-indigo-600' : 'bg-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Hints Remaining Badge & Coin Top-up */}
                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                                        isBento
                                                            ? 'bg-white text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                            : theme === 'dark'
                                                                ? 'bg-white/10 text-indigo-200 border border-white/10'
                                                                : 'bg-white/80 text-indigo-700 border border-indigo-200'
                                                    }`}>
                                                        {aiCoachUsesLeft} left
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            sounds.playClick();
                                                            setShowAICoachBuyModal(true);
                                                        }}
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black cursor-pointer transition-all active:translate-y-0.5 ${
                                                            isBento
                                                                ? 'bg-[#fef08a] hover:bg-[#fde047] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                                : theme === 'dark'
                                                                    ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30'
                                                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                                        }`}
                                                        title="Add more AI hints with coins"
                                                    >
                                                        <Coins className="w-2.5 h-2.5 text-amber-500" />
                                                        <span>+ Coins</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={handleNextInlineClue}
                                                    disabled={isInlineClueLoading}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider active:translate-y-0.5 cursor-pointer disabled:opacity-50 transition-all ${
                                                        theme === 'bento'
                                                            ? 'bg-white hover:bg-purple-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                            : theme === 'dark'
                                                                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15 shadow-sm'
                                                                : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm'
                                                    }`}
                                                    title="Get a different clue from a new angle"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${isInlineClueLoading ? 'animate-spin' : ''}`} />
                                                    <span className="hidden sm:inline">Another Clue</span>
                                                    <span className="sm:hidden">Next</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={flipToClue}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider active:translate-y-0.5 cursor-pointer transition-all ${
                                                        theme === 'bento'
                                                            ? 'bg-[#fed7aa] hover:bg-[#fdba74] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                            : theme === 'dark'
                                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-md'
                                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                                    }`}
                                                    title="Return to Question"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>Flip Back</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Clue Content */}
                                        <div className="flex-1 flex items-center py-3 overflow-y-auto no-scrollbar">
                                            {isInlineClueLoading ? (
                                                <div className="flex items-center gap-2.5 text-sm font-bold text-purple-700 dark:text-purple-300 animate-pulse">
                                                    <Sparkles className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                                                    <span>Consulting AI Coach for a spoiler-free pointer...</span>
                                                </div>
                                            ) : (
                                                <p className={`text-sm sm:text-base md:text-lg font-bold sm:font-extrabold leading-relaxed ${
                                                    theme === 'bento' ? 'text-black' : theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                                                }`}>
                                                    {inlineClue || '💡 Think about the distinguishing behavior and rules that set this concept apart.'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom row */}
                                        <div className={`flex items-center justify-between pt-2.5 text-[11px] sm:text-xs font-bold shrink-0 ${
                                            theme === 'bento'
                                                ? 'border-t-2 border-black/10 text-slate-700'
                                                : theme === 'dark'
                                                    ? 'border-t border-indigo-500/20 text-slate-400'
                                                    : 'border-t border-slate-200/60 text-slate-500'
                                        }`}>
                                            <span className="flex items-center gap-1">
                                                🔒 Zero-Spoiler<span className="hidden xs:inline"> Guaranteed</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={flipToClue}
                                                className="font-black cursor-pointer hover:underline text-indigo-600 dark:text-indigo-400"
                                            >
                                                <span className="hidden sm:inline">Return to Question</span>
                                                <span className="sm:hidden">Question</span> ↩
                                            </button>
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
                            
                            {/* Helpful instructions for matching questions */}
                            {isMatchingQuestion && !isReviewModeSubmitted && (
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
                        : 'bg-slate-50/70 dark:bg-[#080c16]'
                } relative z-10 landscape:overflow-y-auto lg:overflow-y-auto no-scrollbar`}>
                    <div
                        role="radiogroup"
                        aria-label={`Options for Question ${currentQuestion + 1}`}
                        className={`flex-1 w-full ${isMatchingQuestion ? 'max-w-none' : 'max-w-2xl'} lg:mr-auto p-4 sm:p-6 lg:p-8 pt-5 sm:pt-6 landscape:pt-4 lg:landscape:pt-6 pb-6 landscape:pb-8 lg:landscape:pb-8 flex flex-col justify-start gap-3 sm:gap-3.5 no-scrollbar`}
                    >
                        {q.isCompiler ? (
                            <Suspense fallback={<div className="animate-spin w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>}>
                                <div className={`h-[400px] rounded-2xl overflow-hidden ${
                                    theme === 'bento'
                                        ? 'border-[2.5px] border-black shadow-[4px_4px_0px_#000] bg-white'
                                        : theme === 'dark'
                                            ? 'border border-indigo-500/30 bg-[#070a12] shadow-2xl'
                                            : 'border border-slate-200 bg-white shadow-lg'
                                }`}>
                                    <CompilerQuestion
                                        initialCode={q.compilerConfig?.initialCode}
                                        language={q.compilerConfig?.language || 'javascript'}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting || isReviewModeSubmitted}
                                    />
                                </div>
                            </Suspense>
                        ) : q.type === 'ordering' ? (
                            <OrderingQuestion
                                items={activeTranslation?.orderingItems || q.orderingItems || q.options || []}
                                correctOrder={q.orderingItems || q.options}
                                submitted={isReviewModeSubmitted}
                                onChange={(ordered) => handleAnswer(ordered)}
                                readOnly={isSubmitting || isReviewModeSubmitted}
                            />
                        ) : q.type === 'matching' ? (
                            <MatchingQuestion
                                pairs={activeTranslation?.matchingPairs || q.matchingPairs || []}
                                submitted={isReviewModeSubmitted}
                                onChange={(matches) => handleAnswer(matches)}
                                readOnly={isSubmitting || isReviewModeSubmitted}
                            />
                        ) : q.type === 'code-output' ? (
                            <CodeOutputQuestion
                                codeSnippet={q.codeSnippet}
                                options={activeTranslation?.options || q.options}
                                correctAnswer={q.correctAnswer as string | number}
                                submitted={isReviewModeSubmitted}
                                userAnswer={answers[actualIndex] as string | number | undefined}
                                onChange={(val) => handleAnswer(val)}
                                readOnly={isSubmitting || isReviewModeSubmitted}
                            />
                        ) : q.type === 'text' ? (
                            <TextQuestion
                                value={typeof answers[actualIndex] === 'string' ? answers[actualIndex] as string : (answers[actualIndex] !== undefined ? String(answers[actualIndex]) : '')}
                                correctAnswer={q.correctAnswer}
                                submitted={isReviewModeSubmitted}
                                isCorrect={isEffectiveCorrect}
                                onChange={(val) => handleAnswer(val)}
                                onSubmit={submitQuestion}
                                readOnly={isSubmitting || isReviewModeSubmitted}
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
                                const showCorrect = isReviewModeSubmitted && !isEffectiveCorrect && isCorrectOption;
                                const showWrong = isReviewModeSubmitted && !isEffectiveCorrect && isSelected;
                                const showSuccess = isReviewModeSubmitted && isEffectiveCorrect && isSelected;

                                const letters = ['A', 'B', 'C', 'D', 'E'];
                                const label = letters[visualIndex] || (visualIndex + 1);

                                // Dynamic classes based on state and theme
                                const baseClass = theme === 'bento'
                                    ? "group relative flex items-center p-4 sm:p-4.5 rounded-2xl cursor-pointer transition-all duration-150 w-full text-left font-bold border-[2.5px] border-black focus-visible:outline-none select-none mb-1"
                                    : theme === 'dark'
                                        ? "group relative flex items-center p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 w-full text-left border border-white/10 shadow-sm font-semibold mb-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none select-none"
                                        : "group relative flex items-center p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 w-full text-left border border-slate-200/90 shadow-sm font-semibold mb-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none select-none";
                                
                                let stateClass = theme === 'bento'
                                    ? "bg-white text-black shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]"
                                    : theme === 'dark'
                                        ? "bg-[#0e1424] hover:bg-[#131b31] hover:border-indigo-400/50 text-slate-100 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 active:translate-y-0"
                                        : "bg-white hover:bg-slate-50 hover:border-indigo-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0";
                                
                                let textClass = theme === 'bento' ? "text-black font-bold" : theme === 'dark' ? "text-slate-100 font-semibold" : "text-slate-800 font-semibold";
                                let badgeClass = theme === 'bento'
                                    ? "bg-slate-100 text-black border-2 border-black font-black"
                                    : theme === 'dark'
                                        ? "bg-white/10 text-slate-300 border border-white/15 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 font-bold transition-all"
                                        : "bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 font-bold transition-all";
                                
                                if (showSuccess) {
                                    stateClass = theme === 'bento'
                                        ? "bg-[#bbf7d0] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000] ring-2 ring-emerald-600 scale-[1.01] z-10"
                                        : theme === 'dark'
                                            ? "bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/40 text-emerald-200 scale-[1.01] z-10"
                                            : "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md text-emerald-950 scale-[1.01] z-10";
                                    badgeClass = theme === 'bento' ? "bg-emerald-500 text-white border-2 border-black font-black" : "bg-emerald-500 text-white font-black";
                                    textClass = theme === 'bento' ? "text-black font-extrabold" : theme === 'dark' ? "text-emerald-200 font-bold" : "text-emerald-950 font-bold";
                                } else if (showWrong) {
                                    stateClass = theme === 'bento'
                                        ? "bg-[#fecdd3] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000] ring-2 ring-rose-600 scale-[1.01] z-10"
                                        : theme === 'dark'
                                            ? "bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-950/40 text-rose-200 scale-[1.01] z-10"
                                            : "bg-rose-50 border-rose-500 ring-2 ring-rose-500/30 shadow-md text-rose-950 scale-[1.01] z-10";
                                    badgeClass = theme === 'bento' ? "bg-rose-500 text-white border-2 border-black font-black" : "bg-rose-500 text-white font-black";
                                    textClass = theme === 'bento' ? "text-black font-extrabold" : theme === 'dark' ? "text-rose-200 font-bold" : "text-rose-950 font-bold";
                                } else if (showCorrect) {
                                    stateClass = theme === 'bento'
                                        ? "bg-[#dcfce7] text-black border-[2.5px] border-black shadow-[3px_3px_0px_#000]"
                                        : theme === 'dark'
                                            ? "bg-emerald-950/30 border-emerald-500/60 text-emerald-300"
                                            : "bg-emerald-50/80 border-emerald-500/60 text-emerald-900";
                                    badgeClass = theme === 'bento' ? "bg-emerald-500 text-white border-2 border-black font-black" : "bg-emerald-500 text-white font-black";
                                    textClass = theme === 'bento' ? "text-black font-bold" : theme === 'dark' ? "text-emerald-300 font-bold" : "text-emerald-900 font-bold";
                                } else if (isSelected) {
                                    stateClass = theme === 'bento'
                                        ? "bg-[#ddd6fe] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000] ring-2 ring-purple-600 scale-[1.01] z-10"
                                        : theme === 'dark'
                                            ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg shadow-indigo-950/50 scale-[1.01] z-10"
                                            : "bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/30 text-indigo-950 shadow-md scale-[1.01] z-10";
                                    badgeClass = theme === 'bento' ? "bg-[#8b5cf6] text-white border-2 border-black font-black" : "bg-indigo-600 text-white font-black shadow-sm";
                                    textClass = theme === 'bento' ? "text-black font-extrabold" : theme === 'dark' ? "text-white font-bold" : "text-indigo-950 font-bold";
                                }

                                return (
                                    <button
                                        key={originalIndex}
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={`Option ${label}: ${option}`}
                                        tabIndex={0}
                                        onClick={() => handleAnswer(originalIndex)}
                                        disabled={isSubmitting || isReviewModeSubmitted}
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
            <div className={`flex-none p-3 sm:p-4 z-20 w-full flex items-center justify-between pointer-events-auto relative ${
                isBento
                    ? 'bg-white dark:bg-[#0f172a] border-t-2 border-black dark:border-white/20 shadow-[0px_-4px_12px_rgba(0,0,0,0.04)]'
                    : 'bg-white/95 dark:bg-[#0c101c]/95 border-t border-slate-200/80 dark:border-white/10 shadow-[0px_-4px_16px_rgba(15,23,42,0.03)] backdrop-blur-xl'
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
                
                {/* Unsubmitted Warning Notification Banner */}
                {unsubmittedWarning && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-400 text-black px-4 py-1.5 rounded-xl border-2 border-black font-black text-xs shadow-[3px_3px_0px_#000] flex items-center gap-2 z-30 animate-in fade-in slide-in-from-bottom-2 max-w-[90%] whitespace-nowrap">
                        <AlertCircle className="w-4 h-4 shrink-0 text-black" />
                        <span className="truncate">{unsubmittedWarning}</span>
                        <button
                            type="button"
                            onClick={() => setUnsubmittedWarning(null)}
                            className="ml-1 text-black font-black hover:opacity-70 cursor-pointer text-sm leading-none"
                            aria-label="Dismiss warning"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Answer Feedback Pill (Review Mode only) */}
                {isReviewMode && isReviewModeSubmitted && (
                    <div className={`transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 z-10 ${
                        isMatchingQuestion
                            ? 'landscape:absolute landscape:left-[38%] landscape:-translate-x-1/2 lg:absolute lg:left-[38%] xl:left-[35%] lg:-translate-x-1/2'
                            : 'landscape:absolute landscape:left-1/2 landscape:-translate-x-1/2 lg:absolute lg:left-1/2 lg:-translate-x-1/2 sm:absolute sm:left-1/2 sm:-translate-x-1/2'
                    } flex items-center justify-center pointer-events-none`}>
                        <div className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl pointer-events-auto ${
                            isEffectiveCorrect
                                ? isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-emerald-500 text-white border-2 border-emerald-700'
                                : isBento
                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-rose-500 text-white border-2 border-rose-700'
                        }`} role="status" aria-live="assertive">
                            {isEffectiveCorrect ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-black" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-black" />}
                            <span className="font-black text-xs sm:text-sm whitespace-nowrap">
                                {isEffectiveCorrect ? 'Correct answer!' : 'Not quite. Check the highlighted answer.'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Quiz Mode Submission Status Pill */}
                {!isReviewMode && (
                    <div className="hidden md:flex items-center gap-2">
                        {isCurrentQuestionSubmitted ? (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                                isBento
                                    ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20'
                            }`}>
                                <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Answer Submitted</span>
                            </div>
                        ) : hasChangedFromSubmitted ? (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black animate-pulse ${
                                isBento
                                    ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}>
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Unsubmitted Changes</span>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3 pointer-events-auto">
                    {/* Previous Question Button */}
                    <button
                        type="button"
                        onClick={previousQuestion}
                        disabled={currentQuestion === 0 || isSubmitting}
                        className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#000]'
                                : 'glass-card hover:bg-slate-100/80 dark:hover:bg-white/[0.08] disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.985]'
                        }`}
                    >
                        <span>←</span>
                        <span>Previous</span>
                    </button>

                    {/* Quiz Mode: Optional quick re-submit button if already submitted */}
                    {!isReviewMode && isCurrentQuestionSubmitted && (
                        <button
                            type="button"
                            onClick={submitQuestion}
                            disabled={!hasCompleteAnswer || isSubmitting}
                            title="Re-submit this answer"
                            className={`hidden sm:flex px-3.5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all items-center justify-center gap-1.5 cursor-pointer ${
                                isBento
                                    ? 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10'
                            }`}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Re-submit</span>
                        </button>
                    )}

                    {/* Submit / Re-submit Answer Button (when unsubmitted or answer changed) */}
                    {!isCurrentQuestionSubmitted && (
                        <button
                            type="button"
                            onClick={submitQuestion}
                            disabled={!hasCompleteAnswer || isSubmitting}
                            className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isBento
                                    ? 'bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#000]'
                                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.985]'
                            }`}
                        >
                            <span>{hasChangedFromSubmitted ? 'Re-submit Answer' : 'Submit Answer'}</span>
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    )}

                    {/* Next Question / Finish Quiz Button */}
                    {!isLastQuestion ? (
                        <>
                            <button
                                type="button"
                                onClick={nextQuestion}
                                disabled={isReviewMode && !isCurrentQuestionSubmitted}
                                className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isBento
                                        ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.985]'
                                }`}
                            >
                                <span>Next Question</span>
                                <span>→</span>
                            </button>

                            {allQuestionsSubmitted && (
                                <button
                                    type="button"
                                    onClick={() => handleQuizComplete(false)}
                                    disabled={isSubmitting}
                                    title="All questions submitted! Finish quiz now."
                                    className={`hidden md:flex px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all items-center justify-center gap-2 cursor-pointer ${
                                        isBento
                                            ? 'bg-[#22c55e] hover:bg-[#16a34a] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.985]'
                                    }`}
                                >
                                    <span>Finish Quiz</span>
                                    <Target className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleQuizComplete(false)}
                            disabled={isSubmitting}
                            className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isBento
                                    ? allQuestionsSubmitted
                                        ? 'bg-[#22c55e] hover:bg-[#16a34a] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]'
                                        : 'bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000]'
                                    : allQuestionsSubmitted
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.985]'
                                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 active:scale-[0.985]'
                            }`}
                        >
                            <span>
                                {isSubmitting
                                    ? 'Submitting...'
                                    : allQuestionsSubmitted
                                        ? 'Finish Quiz'
                                        : `Finish Quiz (${unsubmittedQuestionsList.length} left)`}
                            </span>
                            <Target className="w-4 h-4" />
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

            {/* AI Coach Hints Top-Up Modal */}
            {showAICoachBuyModal && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowAICoachBuyModal(false)}
                >
                    <div 
                        className={`max-w-md w-full rounded-3xl overflow-hidden transition-all flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ${
                            isBento
                                ? 'bg-[#faf5ff] border-[3.5px] border-black shadow-[8px_8px_0px_#000] text-black'
                                : theme === 'dark'
                                    ? 'bg-[#0c1020]/95 backdrop-blur-2xl border border-indigo-500/35 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]'
                                    : 'bg-white/95 backdrop-blur-2xl border border-slate-200 text-slate-900 shadow-2xl'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`p-6 pb-4 flex items-center justify-between border-b ${
                            isBento 
                                ? 'border-b-[2.5px] border-black bg-white' 
                                : theme === 'dark' 
                                    ? 'border-indigo-500/20 bg-white/[0.02]' 
                                    : 'border-slate-100 bg-slate-50/60'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-2xl ${
                                    isBento
                                        ? 'bg-[#c084fc] border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                                        : theme === 'dark'
                                            ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-400/30 text-purple-300 shadow-sm'
                                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black leading-tight">AI Coach Hints</h2>
                                    <p className={`text-xs font-bold mt-0.5 ${
                                        isBento ? 'text-slate-600' : theme === 'dark' ? 'text-indigo-200/70' : 'text-slate-500'
                                    }`}>
                                        Socratic pointers • 0 spoilers
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAICoachBuyModal(false)}
                                className={`p-2 rounded-xl transition-all cursor-pointer ${
                                    isBento
                                        ? 'border-2 border-black bg-white text-black hover:bg-[#fed7aa] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : theme === 'dark'
                                            ? 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/10'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                                aria-label="Close modal"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Balance & Status Banner */}
                        <div className={`p-5 pb-4 flex flex-col items-center justify-center gap-2 border-b ${
                            isBento
                                ? 'bg-white border-b-2 border-black'
                                : theme === 'dark'
                                    ? 'bg-gradient-to-b from-indigo-950/40 to-transparent border-indigo-500/15'
                                    : 'bg-gradient-to-b from-purple-50/50 to-transparent border-slate-100'
                        }`}>
                            <div className="flex items-center gap-3 w-full justify-between px-1">
                                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${
                                    isBento
                                        ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : theme === 'dark'
                                            ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                                    <span className="text-xs font-black">
                                        {aiCoachUsesLeft} hint{aiCoachUsesLeft === 1 ? '' : 's'} remaining
                                    </span>
                                </div>

                                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${
                                    isBento
                                        ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : theme === 'dark'
                                            ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}>
                                    <Coins className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs font-black">{localCoins} Coins</span>
                                </div>
                            </div>

                            {purchaseFeedback && (
                                <div className={`w-full text-center py-1.5 px-3 rounded-lg text-xs font-black animate-in fade-in slide-in-from-top-1 ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                    🎉 {purchaseFeedback}
                                </div>
                            )}
                        </div>

                        {/* Hint Packs */}
                        <div className="p-5 pt-3 overflow-y-auto no-scrollbar flex flex-col gap-3">
                            <div className={`text-[11px] font-black uppercase tracking-wider ${
                                isBento ? 'text-black' : theme === 'dark' ? 'text-indigo-300' : 'text-slate-500'
                            }`}>
                                Select a Hint Pack
                            </div>

                            {[
                                {
                                    id: 'ai-coach-1',
                                    hints: 1,
                                    price: 25,
                                    title: '+1 AI Coach Hint',
                                    desc: 'Ideal for getting unstuck on the current question',
                                    badge: null
                                },
                                {
                                    id: 'ai-coach-3',
                                    hints: 3,
                                    price: 60,
                                    title: '+3 Hints Bundle',
                                    desc: 'Great value for multi-level progressive clues',
                                    badge: 'Save 15 Coins'
                                },
                                {
                                    id: 'ai-coach-5',
                                    hints: 5,
                                    price: 95,
                                    title: '+5 Hints Master Pack',
                                    desc: 'Maximum guidance across tricky problem sets',
                                    badge: 'Best Value • Save 30'
                                }
                            ].map((pack) => {
                                const canAfford = localCoins >= pack.price;
                                const isBusy = isPurchasingHint === pack.id;

                                return (
                                    <div
                                        key={pack.id}
                                        className={`p-4 rounded-2xl transition-all relative flex flex-col justify-between gap-3 ${
                                            isBento
                                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000]'
                                                : theme === 'dark'
                                                    ? 'bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-indigo-500/50'
                                                    : 'bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                                    isBento
                                                        ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                        : theme === 'dark'
                                                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                }`}>
                                                    +{pack.hints}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-sm sm:text-base leading-snug">
                                                        {pack.title}
                                                    </h3>
                                                    <p className={`text-xs mt-0.5 ${
                                                        isBento ? 'text-slate-600' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                                    }`}>
                                                        {pack.desc}
                                                    </p>
                                                </div>
                                            </div>

                                            {pack.badge && (
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                                    isBento
                                                        ? 'bg-[#fef08a] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                        : theme === 'dark'
                                                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                                                }`}>
                                                    {pack.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div className={`flex items-center justify-between pt-2 border-t ${
                                            isBento ? 'border-black/10' : theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                                        }`}>
                                            <div className="flex items-center gap-1.5 font-black text-sm">
                                                <Coins className="w-4 h-4 text-yellow-500" />
                                                <span>{pack.price} Coins</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleBuyAICoachHints(pack.hints, pack.price, pack.id)}
                                                disabled={!canAfford || Boolean(isPurchasingHint)}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 active:translate-y-0.5 ${
                                                    isBento
                                                        ? canAfford
                                                            ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-gray-200 text-gray-400 border-2 border-gray-400'
                                                        : canAfford
                                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md'
                                                            : 'bg-white/10 text-slate-500 border border-white/10'
                                                }`}
                                            >
                                                {isBusy ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : canAfford ? (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Get Pack</span>
                                                    </>
                                                ) : (
                                                    <span>Need {pack.price - localCoins} more</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Help */}
                        <div className={`p-4 text-center text-xs font-bold border-t ${
                            isBento
                                ? 'bg-white border-t-2 border-black text-slate-600'
                                : theme === 'dark'
                                    ? 'bg-white/[0.02] border-white/10 text-slate-400'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                            💡 Hints already unlocked on a question can be viewed again for free.
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
        </div>
    );
};

export default QuizTaking;
