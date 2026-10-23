import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { Quiz, UserData, QuizResult, DetailedAnswer } from '../types';
import { RotateCcw, Clock, Target, CheckCircle, XCircle, ArrowLeft, Trophy, Flag, AlertTriangle, List, Download, FileText, ChevronDown, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathRenderer } from './common/MathRenderer';
import {
    exportAttemptToPDF,
    exportQuizToPDF
} from '../lib/exportUtils';
import { QuestionTranslatorBar } from './common/QuestionTranslatorBar';
import { translateQuestion, isRTL, type TranslatedQuestionData } from '../lib/translationService';
import { AmbientBackground } from './AmbientBackground';
import { useTheme } from '../context/ThemeContext';
import { evaluateTextAnswer } from '../lib/stringSimilarity';

interface QuizResultsProps {
    result: QuizResult;
    quiz: Quiz;
    user: UserData;
    onBackToQuizzes: () => void;
    onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, quiz, user, onBackToQuizzes, onRetake }) => {
    const { isBento } = useTheme();
    const [showReview, setShowReview] = useState(false);
    const rightPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showReview && rightPanelRef.current) {
            rightPanelRef.current.scrollTop = 0;
        }
    }, [showReview]);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExportingResult, setIsExportingResult] = useState(false);
    const [isExportingQuiz, setIsExportingQuiz] = useState(false);
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
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedCache, setTranslatedCache] = useState<Record<number, Record<string, TranslatedQuestionData>>>({});
    const safeQuestions = useMemo(() => {
        return (result.attemptQuestions && result.attemptQuestions.length > 0) 
            ? result.attemptQuestions 
            : (Array.isArray(quiz.questions) ? quiz.questions : []);
    }, [result.attemptQuestions, quiz.questions]);

    const handleSelectLanguage = (langCode: string) => {
        setSelectedLanguage(langCode);
        try {
            localStorage.setItem('quiz_pref_lang', langCode);
        } catch {
            // Ignore storage access errors
        }
        setIsTranslated(langCode !== 'original');
    };

    const handleToggleOriginal = () => {
        setIsTranslated((prev) => !prev);
    };

    // Effect to translate review questions when opened and language is selected
    useEffect(() => {
        if (!showReview || selectedLanguage === 'original' || !isTranslated) return;

        let isCancelled = false;
        const toTranslate = safeQuestions.filter((_, idx) => !translatedCache[idx]?.[selectedLanguage]);

        if (toTranslate.length === 0) return;

        setIsTranslating(true);

        Promise.all(
            safeQuestions.map(async (q, idx) => {
                if (translatedCache[idx]?.[selectedLanguage]) {
                    return { idx, data: translatedCache[idx][selectedLanguage] };
                }
                const data = await translateQuestion(q, selectedLanguage);
                return { idx, data };
            })
        )
            .then((results) => {
                if (!isCancelled) {
                    setTranslatedCache((prev) => {
                        const next = { ...prev };
                        results.forEach(({ idx, data }) => {
                            next[idx] = { ...(next[idx] || {}), [selectedLanguage]: data };
                        });
                        return next;
                    });
                }
            })
            .catch((err) => {
                console.warn('[Review Translation] Failed:', err);
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsTranslating(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [showReview, selectedLanguage, isTranslated, safeQuestions, translatedCache]);


    useEffect(() => {
        if (result.passed || result.poolProgress?.justCompletedPool) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [result.passed, result.poolProgress?.justCompletedPool]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const correctCount = useMemo(() => {
        let count = 0;
        safeQuestions.forEach((q, idx) => {
            const ans = result.answers?.[idx];
            if (ans === undefined || ans === null) return;
            const isDetailed = typeof ans === 'object' && ans !== null && 'isCorrect' in ans;
            if (isDetailed) {
                if ((ans as DetailedAnswer).isCorrect) count++;
            } else if (q.type === 'text') {
                const evalRes = evaluateTextAnswer(ans, q.correctAnswer, 0.70);
                if (evalRes.isPassed) count++;
            } else if (ans === q.correctAnswer) {
                count++;
            }
        });
        return count;
    }, [safeQuestions, result.answers]);

    const incorrectCount = Math.max(0, result.totalQuestions - correctCount);

    const hasValidPoolProgress = useMemo(() => {
        const p = result.poolProgress;
        return Boolean(
            p &&
            typeof p === 'object' &&
            typeof p.totalCount === 'number' &&
            p.totalCount > 0 &&
            Number.isFinite(p.seenCount)
        );
    }, [result.poolProgress]);

    const poolCycle: number = (result.poolProgress && typeof result.poolProgress.cycle === 'number')
        ? (result.poolProgress.cycle + 1)
        : 1;
    const poolSeen: number = (result.poolProgress && typeof result.poolProgress.seenCount === 'number')
        ? result.poolProgress.seenCount
        : 0;
    const poolTotal: number = (result.poolProgress && typeof result.poolProgress.totalCount === 'number')
        ? result.poolProgress.totalCount
        : 0;
    const poolPercentage: number = (result.poolProgress && typeof result.poolProgress.percentage === 'number')
        ? result.poolProgress.percentage
        : (poolTotal > 0 ? Math.round((poolSeen / poolTotal) * 100) : 0);
    const poolRemaining: number = (result.poolProgress && typeof result.poolProgress.remainingCount === 'number')
        ? result.poolProgress.remainingCount
        : Math.max(0, poolTotal - poolSeen);

    const handleExportResultPDF = async () => {
        setIsExportingResult(true);
        try {
            const breakdown = safeQuestions.map((q, idx) => {
                const ans = result.answers[idx];
                const isDetailed = typeof ans === 'object' && ans !== null;
                const isCorrect = isDetailed ? ans.isCorrect : (ans !== undefined && ans !== null && ans === q.correctAnswer);
                const userAnswer = isDetailed ? ans.selected : ans;

                return {
                    questionId: q.id ?? idx + 1,
                    questionIndex: idx,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    points: q.points || 10,
                    type: q.type || 'multiple-choice',
                    studentAnswer: userAnswer,
                    isCorrect: Boolean(isCorrect),
                    isAnswered: userAnswer !== undefined && userAnswer !== null && userAnswer !== ''
                };
            });

            const detailedData = {
                attemptId: (result as { attemptId?: string }).attemptId || `att_${Date.now()}`,
                userId: user.userId,
                userName: user.name,
                userEmail: user.email,
                quizId: quiz.id,
                quizTitle: quiz.title,
                score: result.score,
                totalQuestions: result.totalQuestions,
                percentage: result.percentage,
                timeTaken: result.timeTaken,
                completedAt: new Date().toISOString(),
                passed: result.passed,
                answers: result.answers,
                attemptQuestions: safeQuestions,
                questionsBreakdown: breakdown
            };

            await exportAttemptToPDF(detailedData);
        } catch (err) {
            console.error('Error exporting result PDF:', err);
        } finally {
            setIsExportingResult(false);
            setIsExportMenuOpen(false);
        }
    };

    const handleExportQuizPDF = async () => {
        setIsExportingQuiz(true);
        try {
            await exportQuizToPDF(quiz);
        } catch (err) {
            console.error('Error exporting quiz study sheet PDF:', err);
        } finally {
            setIsExportingQuiz(false);
            setIsExportMenuOpen(false);
        }
    };

    return (
        <div className="h-screen max-h-screen overflow-hidden bg-slate-100/90 dark:bg-[#070b14] p-2 sm:p-3 lg:p-4 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25 relative flex flex-col justify-center font-sans">
            {/* Ambient Background */}
            <AmbientBackground />

            {/* --- ELEVATED RESULTS CARD BOARD (Compact, zero-scroll desktop view) --- */}
            <div className={`w-full max-w-7xl 2xl:max-w-[1536px] mx-auto rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col relative z-10 transition-all h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-1.5rem)] lg:max-h-[calc(100vh-2rem)] ${
                isBento
                    ? 'border-[3px] border-black bg-white dark:bg-[#0b0f19] shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.08)]'
                    : 'border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c101c] shadow-xl dark:shadow-2xl'
            }`}>
                {/* Header inside Card */}
                <header className={`flex-none h-12 sm:h-14 flex items-center justify-between px-3 sm:px-6 z-20 transition-all ${
                    isBento
                        ? 'bg-white dark:bg-[#0f172a] border-b-2 border-black dark:border-white/20'
                        : 'glass-panel border-b border-slate-200/80 dark:border-white/10'
                }`}>
                    <button
                        onClick={onBackToQuizzes}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 transition-all text-xs font-semibold cursor-pointer ${
                            isBento
                                ? 'bg-[#fde047] text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] font-black uppercase hover:-translate-y-0.5 active:translate-y-0.5'
                                : 'rounded-xl glass-card hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                        }`}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-black group-hover:-translate-x-0.5 transition-transform" />
                        <span>Exit</span>
                    </button>

                    <div className={`flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 ${
                        isBento
                            ? 'bg-[#bef264] text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_#000]'
                            : 'bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full border border-indigo-500/20'
                    }`}>
                        <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-widest truncate max-w-xs sm:max-w-md ${
                            isBento ? 'text-black font-black' : 'text-indigo-600 dark:text-indigo-400'
                        }`}>
                            {quiz.title} <span className="opacity-40 mx-1">•</span> Result
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowReview(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-purple-100'
                                    : 'glass-card border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{showReview ? 'Hide Review' : 'Review'}</span>
                        </button>
                    </div>
                </header>

                {/* HORIZONTAL SPLIT LAYOUT */}
                <div className="flex-1 flex flex-col lg:flex-row w-full min-h-0 overflow-hidden">
                    
                    {/* LEFT SIDE: Big Score Gauge Hero (Compact & Centered) */}
                    <div className={`w-full lg:w-[38%] xl:w-[36%] flex-none flex flex-col items-center justify-center p-3 sm:p-4 lg:p-5 overflow-hidden ${
                        isBento
                            ? 'bg-[#f8fafc] dark:bg-[#080d19] border-b-2 lg:border-b-0 lg:border-r-2 border-black dark:border-white/20'
                            : 'bg-slate-50/70 dark:bg-white/[0.02] backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/[0.08]'
                    }`}>
                        <div className={`relative z-10 flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-500 ${
                            isBento ? 'bg-white dark:bg-[#111827] border-2 border-black dark:border-white/20 shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.08)] rounded-2xl sm:rounded-3xl p-4 sm:p-5' : 'glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl'
                        }`}>
                            
                            {/* Status Icon Badge */}
                            <div className={`mb-2 p-2 sm:p-2.5 rounded-xl ${
                                isBento
                                    ? (result.passed ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000]')
                                    : (result.passed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20')
                            }`}>
                                {result.passed ? <Trophy className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </div>

                            <h2 className={`text-xl sm:text-2xl font-extrabold text-center mb-1 tracking-tight ${isBento ? 'text-black dark:text-white font-black' : 'text-slate-900 dark:text-white'}`}>
                                {result.passed ? 'Outstanding Work!' : 'Quiz Needs Review'}
                            </h2>
                            <p className={`text-center mb-3 text-xs leading-relaxed max-w-xs ${isBento ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                {result.passed ? 'You have demonstrated strong mastery of this assessment.' : 'Review your question breakdown, learn from mistakes, and give it another try.'}
                            </p>

                            {/* Circular Score Gauge */}
                            <div className="relative w-36 h-36 sm:w-40 sm:h-40 mb-3 group transition-all">
                                <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-1000 ${result.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 256 256">
                                    <circle cx="128" cy="128" r="114" stroke="currentColor" strokeWidth={isBento ? "18" : "14"} fill="transparent" className={isBento ? "text-slate-100 dark:text-white/10 stroke-slate-100 dark:stroke-white/10" : "text-slate-200/70 dark:text-white/[0.04]"} />
                                    <circle
                                        cx="128" cy="128" r="114" stroke="currentColor" strokeWidth={isBento ? "18" : "14"} fill="transparent"
                                        strokeDasharray={716.28}
                                        strokeDashoffset={716.28 - (716.28 * Math.min(100, Math.max(0, result.percentage))) / 100}
                                        className={`transition-all duration-1000 ease-out ${
                                            isBento
                                                ? (result.passed ? 'text-[#bef264] stroke-[#bef264]' : 'text-[#f43f5e] stroke-[#f43f5e]')
                                                : (result.passed ? 'text-emerald-500' : 'text-rose-500')
                                        }`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                    <span className={`font-tabular text-3xl sm:text-4xl font-black ${isBento ? 'text-black dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                        {Math.round(result.percentage)}<span className="text-xl sm:text-2xl opacity-50">%</span>
                                    </span>
                                    <span className={`text-[10px] font-black tracking-widest uppercase mt-0.5 ${isBento ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400'}`}>Accuracy</span>
                                </div>
                            </div>

                            {/* Status Pills */}
                            <div className="w-full flex flex-col items-center gap-1.5">
                                <span className={`px-3.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border text-center ${
                                    isBento
                                        ? result.passed
                                            ? 'bg-[#dcfce7] text-emerald-950 border-black shadow-[1.5px_1.5px_0px_#000]'
                                            : 'bg-[#fee2e2] text-rose-950 border-black shadow-[1.5px_1.5px_0px_#000]'
                                        : result.passed
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                }`}>
                                    {result.passed ? `PASSED (≥${quiz.passingScore || 70}% REQUIRED)` : `NEEDS PRACTICE (PASSING IS ${quiz.passingScore || 70}%)`}
                                </span>

                                <span className={`px-3 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                    isBento
                                        ? 'bg-[#fef9c3] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                        : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                }`}>
                                    {result.score?.toLocaleString() || 0} Total Points
                                </span>
                            </div>

                        </div>
                    </div>


                    {/* --- RIGHT SIDE: Detailed Stats & Actions (Compact, scrollable smoothly from top when review is open) --- */}
                    <div 
                        ref={rightPanelRef}
                        className={`w-full lg:w-[62%] xl:w-[64%] flex-1 flex flex-col p-4 sm:p-5 lg:p-6 overflow-y-auto transition-all ${
                            showReview ? 'justify-start custom-scrollbar' : 'justify-center no-scrollbar'
                        } ${
                            isBento ? 'bg-white dark:bg-[#030712]' : 'bg-transparent lg:bg-white dark:bg-[#0c101c]'
                        }`}
                    >
                        
                        <div className={`max-w-2xl w-full mx-auto flex flex-col gap-3 sm:gap-3.5 ${
                            showReview ? 'my-0' : 'my-auto'
                        } animate-in slide-in-from-right-8 duration-500 delay-150 fill-mode-both`}>
                            
                            {/* Question Bank 100% Completion Milestone Celebration */}
                            {hasValidPoolProgress && result.poolProgress?.justCompletedPool && (
                                <div className={`w-full p-3.5 rounded-xl text-center animate-in zoom-in-95 duration-500 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 dark:border-yellow-500/40 shadow-xl'
                                }`}>
                                    <div className="text-2xl mb-0.5">🏆 🎉</div>
                                    <h3 className={`text-sm uppercase tracking-wider ${isBento ? 'text-black font-black' : 'font-black text-amber-800 dark:text-amber-300'}`}>
                                        Question Bank 100% Completed!
                                    </h3>
                                    <p className={`text-xs mt-0.5 font-medium leading-relaxed ${isBento ? 'text-black' : 'text-gray-700 dark:text-gray-200'}`}>
                                        Incredible! You've mastered all <strong>{poolTotal}</strong> unique questions in this bank! The question pool has completed Cycle {poolCycle - 1} and has reset for your next attempt.
                                    </p>
                                </div>
                            )}

                            {/* Question Bank Progress Card - ONLY when valid pool progress exists */}
                            {hasValidPoolProgress && (
                                <div className={`rounded-xl p-3 ${
                                    isBento
                                        ? 'bg-[#f8fafc] dark:bg-[#111827] text-black dark:text-white border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_#000]'
                                        : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm'
                                }`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${isBento ? 'text-black dark:text-white' : 'text-blue-700 dark:text-blue-300'}`}>
                                            Question Bank Progress
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            isBento ? 'bg-[#fde047] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                        }`}>
                                            Cycle {poolCycle}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <div className={`text-lg font-black ${isBento ? 'text-black dark:text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                                            {poolSeen} <span className="text-xs font-bold opacity-60">/ {poolTotal} Qs Completed</span>
                                        </div>
                                        <div className={`text-sm font-black ${isBento ? 'text-black dark:text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                                            {poolPercentage}%
                                        </div>
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${isBento ? 'bg-slate-200 dark:bg-white/10 border border-black' : 'bg-blue-100 dark:bg-white/10'}`}>
                                        <div
                                            className={`h-full transition-all duration-1000 ${isBento ? 'bg-[#bef264]' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600'}`}
                                            style={{ width: `${poolPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className={`flex items-center justify-between pb-1.5 mb-2 ${
                                    isBento ? 'text-black dark:text-white border-b-2 border-black dark:border-white/20' : 'text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800'
                                }`}>
                                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
                                        <Flag className="w-3.5 h-3.5" /> Performance Summary
                                    </h3>
                                    <span className={`text-[11px] font-bold ${isBento ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}`}>
                                        {correctCount} of {result.totalQuestions} questions correct
                                    </span>
                                </div>
                                
                                {/* Stats 2x2 Bento Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    
                                    {/* Time Card */}
                                    <div className={`rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 ${
                                        isBento ? 'bg-white dark:bg-[#111827] text-black dark:text-white border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_#000]' : 'glass-card'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${isBento ? 'bg-[#93c5fd] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-400'}`}>Time Taken</div>
                                            <div className={`font-tabular text-base sm:text-lg font-black ${isBento ? 'text-black dark:text-white' : 'text-slate-900 dark:text-white'}`}>{formatTime(result.timeTaken || 0)}</div>
                                        </div>
                                    </div>

                                    {/* Total Points */}
                                    <div className={`rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 ${
                                        isBento ? 'bg-white dark:bg-[#111827] text-black dark:text-white border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_#000]' : 'glass-card'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${isBento ? 'bg-[#fde047] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                                            <Target className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-400'}`}>Total Score</div>
                                            <div className={`font-tabular text-base sm:text-lg font-black ${isBento ? 'text-black dark:text-white' : 'text-slate-900 dark:text-white'}`}>{result.score?.toLocaleString() || 0} pts</div>
                                        </div>
                                    </div>
                                    
                                    {/* Correct Card */}
                                    <div className={`rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 ${
                                        isBento ? 'bg-[#dcfce7] dark:bg-emerald-950/40 text-black dark:text-emerald-200 border-2 border-black dark:border-emerald-700 shadow-[2px_2px_0px_#000]' : 'glass-card'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${isBento ? 'bg-[#bef264] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-emerald-500/20 text-emerald-600'}`}>
                                            <CheckCircle className="w-4 h-4 text-emerald-800" />
                                        </div>
                                        <div>
                                            <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-emerald-800 dark:text-emerald-300' : 'font-bold text-emerald-600'}`}>Correct Answers</div>
                                            <div className="font-tabular text-base sm:text-lg font-black">
                                                {correctCount} <span className="text-xs font-bold opacity-60">/ {result.totalQuestions}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Incorrect Card */}
                                    <div className={`rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 ${
                                        isBento ? 'bg-[#fee2e2] dark:bg-rose-950/40 text-black dark:text-rose-200 border-2 border-black dark:border-rose-700 shadow-[2px_2px_0px_#000]' : 'glass-card'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${isBento ? 'bg-[#fecdd3] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-rose-500/20 text-rose-600'}`}>
                                            <XCircle className="w-4 h-4 text-rose-800" />
                                        </div>
                                        <div>
                                            <div className={`text-[9px] uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-rose-800 dark:text-rose-300' : 'font-bold text-rose-600'}`}>Incorrect Answers</div>
                                            <div className="font-tabular text-base sm:text-lg font-black">
                                                {incorrectCount} <span className="text-xs font-bold opacity-60">/ {result.totalQuestions}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
                                <button
                                    onClick={onRetake}
                                    className={`w-full sm:flex-1 group flex items-center justify-center gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl active:scale-[0.985] transition-all font-black text-xs uppercase cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                            : 'glass-card hover:bg-slate-100/80 text-slate-800 dark:text-slate-100 shadow-sm'
                                    }`}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-180 transition-transform duration-500 text-black" />
                                    <span>
                                        {hasValidPoolProgress
                                            ? (poolRemaining > 0
                                                ? `Remaining (${poolRemaining})`
                                                : 'Next Cycle')
                                            : 'Retake Quiz'}
                                    </span>
                                </button>

                                {/* Export Result & Quiz Menu */}
                                <div className="relative w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                        className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl active:scale-[0.985] transition-all font-black text-xs uppercase cursor-pointer ${
                                            isBento
                                                ? 'bg-[#fed7aa] hover:bg-[#fdba74] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                            : 'glass-card hover:bg-slate-100/80 text-slate-800 dark:text-slate-100 shadow-sm'
                                    }`}
                                >
                                    <Download className="w-3.5 h-3.5 text-black" />
                                    <span>Export</span>
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>

                                {isExportMenuOpen && (
                                    <div className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden text-left p-1 ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                                            : 'glass-panel border border-slate-200 dark:border-white/10'
                                    }`}>
                                        <div className={`px-2.5 py-1 text-[9px] uppercase tracking-wider ${isBento ? 'text-black font-black' : 'font-extrabold text-slate-400'}`}>
                                            PDF Export Options
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleExportResultPDF}
                                            disabled={isExportingResult}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                                                isBento ? 'hover:bg-[#fde047] text-black' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800'
                                            }`}
                                        >
                                            {isExportingResult ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-black" />}
                                            <span>Assessment Result (PDF)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportQuizPDF}
                                            disabled={isExportingQuiz}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
                                                isBento ? 'hover:bg-[#fde047] text-black' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800'
                                            }`}
                                        >
                                            {isExportingQuiz ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3 text-black" />}
                                            <span>Quiz Study Sheet (PDF)</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onBackToQuizzes}
                                className={`w-full sm:flex-1 group flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl active:scale-[0.985] transition-all font-black text-xs uppercase cursor-pointer ${
                                    isBento
                                        ? 'bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white'
                                }`}
                            >
                                <span>Continue</span>
                                <Target className="w-3.5 h-3.5 text-black" />
                            </button>
                        </div>

                        {/* Review Questions Toggle Button */}
                        <button
                            onClick={() => setShowReview(!showReview)}
                            className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all group cursor-pointer ${
                                isBento
                                    ? 'bg-white dark:bg-[#111827] text-black dark:text-white border-2 border-black dark:border-white/20 shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                    : 'glass-card hover:bg-slate-100/40 dark:hover:bg-white/[0.03]'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg transition-colors ${
                                    isBento ? 'bg-[#e9d5ff] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]' : 'bg-indigo-500/10 text-indigo-600'
                                }`}>
                                    <List className="w-3.5 h-3.5 text-black" />
                                </div>
                                <div className="text-left">
                                    <span className={`text-xs sm:text-sm ${isBento ? 'font-black uppercase tracking-wider block' : 'font-bold text-slate-900 dark:text-white'}`}>
                                        Review Questions & Explanations
                                    </span>
                                    <span className="text-[10px] font-bold opacity-60">
                                        Detailed breakdown of all {safeQuestions.length} questions
                                    </span>
                                </div>
                            </div>
                            <div className={`p-1.5 rounded-lg transition-transform duration-300 ${
                                isBento ? 'bg-slate-100 dark:bg-white/10 border-1.5 border-black dark:border-white/20' : 'bg-slate-100 dark:bg-white/5'
                            } ${showReview ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-3.5 h-3.5 text-black dark:text-white" />
                            </div>
                        </button>

                        {/* --- REVIEW SECTION CONTENT --- */}
                        {showReview && (
                            <div className="flex flex-col gap-4 mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
                                <QuestionTranslatorBar
                                    currentLanguage={selectedLanguage}
                                    isTranslating={isTranslating}
                                    isTranslated={isTranslated && selectedLanguage !== 'original'}
                                    autoTranslate={true}
                                    onSelectLanguage={handleSelectLanguage}
                                    onToggleOriginal={handleToggleOriginal}
                                    onToggleAutoTranslate={() => {}}
                                />

                                {safeQuestions.map((q, idx) => {
                                    const activeTrans = (isTranslated && selectedLanguage !== 'original' && translatedCache[idx]?.[selectedLanguage]) || null;
                                    const isRtl = Boolean(isTranslated && selectedLanguage !== 'original' && isRTL(selectedLanguage));
                                    const displayQ = activeTrans?.question || q.question;
                                    const displayExp = activeTrans?.explanation || q.explanation;
                                    const ans = result.answers[idx];
                                    const isDetailed = typeof ans === 'object' && ans !== null;
                                    const userAnswer = isDetailed ? ans.selected : ans;
                                    const textEval = q.type === 'text' ? evaluateTextAnswer(userAnswer, q.correctAnswer, 0.70) : null;
                                    const isCorrect = isDetailed 
                                        ? ans.isCorrect 
                                        : (textEval ? textEval.isPassed : (ans !== undefined && ans !== null && ans === q.correctAnswer));

                                    // Format user answer display for all 6 question types
                                    let userAnsText = '';
                                    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
                                        userAnsText = 'No Answer';
                                    } else if (q.type === 'text') {
                                        userAnsText = textEval ? `${textEval.userAnswer} (${textEval.percentage}% match)` : String(userAnswer);
                                    } else if (q.type === 'multiple-choice' || !q.type) {
                                        if (typeof userAnswer === 'number' && q.options) {
                                            userAnsText = (activeTrans?.options && activeTrans.options[userAnswer] !== undefined)
                                                ? activeTrans.options[userAnswer]
                                                : q.options[userAnswer] || `Option ${userAnswer + 1}`;
                                        } else {
                                            userAnsText = String(userAnswer);
                                        }
                                    } else if (q.type === 'ordering') {
                                        if (Array.isArray(userAnswer)) {
                                            userAnsText = userAnswer.map((item, i) => `${i + 1}. ${item}`).join(' ➔ ');
                                        } else {
                                            userAnsText = String(userAnswer);
                                        }
                                    } else if (q.type === 'matching') {
                                        if (typeof userAnswer === 'object' && userAnswer !== null) {
                                            userAnsText = Object.entries(userAnswer as Record<string, string>)
                                                .map(([left, right]) => `${left} ➔ ${right}`)
                                                .join(' | ');
                                        } else {
                                            userAnsText = String(userAnswer);
                                        }
                                    } else if (q.type === 'code-output') {
                                        if (typeof userAnswer === 'number' && q.options) {
                                            userAnsText = q.options[userAnswer] || String(userAnswer);
                                        } else {
                                            userAnsText = String(userAnswer);
                                        }
                                    } else if (Array.isArray(userAnswer)) {
                                        userAnsText = userAnswer.join(', ');
                                    } else {
                                        userAnsText = String(userAnswer);
                                    }

                                    // Format correct answer display
                                    let correctAnsText = '';
                                    if (q.type === 'multiple-choice' || !q.type) {
                                        if (typeof q.correctAnswer === 'number' && q.options) {
                                            correctAnsText = (activeTrans?.options && activeTrans.options[q.correctAnswer] !== undefined)
                                                ? activeTrans.options[q.correctAnswer]
                                                : q.options[q.correctAnswer] || `Option ${q.correctAnswer + 1}`;
                                        } else {
                                            correctAnsText = String(q.correctAnswer ?? '');
                                        }
                                    } else if (q.type === 'ordering') {
                                        const expectedOrder = q.orderingItems || (Array.isArray(q.correctAnswer) ? q.correctAnswer : q.options);
                                        if (Array.isArray(expectedOrder)) {
                                            correctAnsText = expectedOrder.map((item, i) => `${i + 1}. ${item}`).join(' ➔ ');
                                        } else {
                                            correctAnsText = String(q.correctAnswer ?? '');
                                        }
                                    } else if (q.type === 'matching') {
                                        if (q.matchingPairs && Array.isArray(q.matchingPairs)) {
                                            correctAnsText = q.matchingPairs.map(p => `${p.left} ➔ ${p.right}`).join(' | ');
                                        } else if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
                                            correctAnsText = Object.entries(q.correctAnswer as Record<string, string>)
                                                .map(([left, right]) => `${left} ➔ ${right}`)
                                                .join(' | ');
                                        } else {
                                            correctAnsText = String(q.correctAnswer ?? '');
                                        }
                                    } else if (q.type === 'code-output') {
                                        if (typeof q.correctAnswer === 'number' && q.options) {
                                            correctAnsText = q.options[q.correctAnswer] || String(q.correctAnswer);
                                        } else {
                                            correctAnsText = String(q.correctAnswer ?? '');
                                        }
                                    } else if (q.isCompiler) {
                                        correctAnsText = q.compilerConfig?.referenceCode ? 'Reference solution available' : '';
                                    } else if (q.type === 'text') {
                                        correctAnsText = textEval?.canonicalAnswer || (Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' or ') : String(q.correctAnswer ?? ''));
                                    } else if (Array.isArray(q.correctAnswer)) {
                                        correctAnsText = q.correctAnswer.join(' or ');
                                    } else {
                                        correctAnsText = String(q.correctAnswer ?? '');
                                    }
                                    
                                    return (
                                        <div
                                            key={idx}
                                            dir={isRtl ? 'rtl' : 'ltr'}
                                            className={`p-5 rounded-3xl transition-all ${
                                                isBento
                                                    ? (isCorrect
                                                        ? 'bg-[#f7fee7] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                                        : 'bg-[#fff1f2] text-black border-3 border-black shadow-[4px_4px_0px_#000]')
                                                    : `border shadow-sm ${
                                                        isCorrect 
                                                            ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-500/30' 
                                                            : 'border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-500/30'
                                                    }`
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    {isCorrect ? (
                                                        <CheckCircle className={`w-5 h-5 ${isBento ? 'text-emerald-700' : 'text-emerald-500'}`} />
                                                    ) : (
                                                        <XCircle className={`w-5 h-5 ${isBento ? 'text-rose-700' : 'text-rose-500'}`} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-bold mb-3 text-base leading-snug ${isBento ? 'text-black' : 'text-slate-900 dark:text-slate-100'} ${isRtl ? 'text-right' : 'text-left'}`}>
                                                        <span className="opacity-60 mr-1.5 font-tabular">{idx + 1}.</span> <MathRenderer text={displayQ} inline={true} />
                                                    </p>
                                                    
                                                    {q.codeSnippet && (
                                                        <pre dir="ltr" className={`p-3.5 mb-3 rounded-2xl font-mono text-xs overflow-x-auto ${
                                                            isBento ? 'bg-black text-[#bef264] border-2 border-black shadow-[3px_3px_0px_#000]' : 'bg-slate-900 dark:bg-[#080c16] text-emerald-400 border border-slate-800 dark:border-white/10 shadow-inner'
                                                        }`}>
                                                            {q.codeSnippet}
                                                        </pre>
                                                    )}

                                                    <div className={`flex flex-col gap-2 p-3.5 rounded-2xl transition-all ${
                                                        isBento
                                                            ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-white dark:bg-[#121829] border border-slate-200/90 dark:border-white/10 shadow-sm'
                                                    }`}>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                            <span className={`text-[10px] uppercase tracking-wider w-24 shrink-0 ${isBento ? 'font-black text-slate-600' : 'font-extrabold text-slate-400'}`}>Your Answer</span>
                                                            <span className={`text-sm font-bold ${
                                                                isCorrect
                                                                    ? (isBento ? 'text-emerald-800' : 'text-emerald-600 dark:text-emerald-400')
                                                                    : (isBento ? 'text-rose-800' : 'text-rose-600 dark:text-rose-400')
                                                            } ${isRtl ? 'text-right' : 'text-left'}`}>
                                                                {userAnsText}
                                                            </span>
                                                        </div>
                                                        
                                                        {((!isCorrect || (q.type === 'text' && !textEval?.isExact)) && Boolean(correctAnsText && correctAnsText.trim())) && (
                                                            <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 pt-2 ${
                                                                isBento ? 'border-t-2 border-black' : 'border-t border-slate-200/60 dark:border-white/[0.06]'
                                                            }`}>
                                                                <span className={`text-[10px] uppercase tracking-wider w-24 shrink-0 ${isBento ? 'font-black text-slate-600' : 'font-extrabold text-slate-400'}`}>
                                                                    {isCorrect ? 'Exact Word' : 'Correct'}
                                                                </span>
                                                                <span className={`text-sm font-bold ${isBento ? 'text-black' : 'text-slate-900 dark:text-slate-200'} ${isRtl ? 'text-right' : 'text-left'}`}>
                                                                    {correctAnsText}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {displayExp && (
                                                        <div className={`mt-3 text-xs p-3.5 rounded-2xl ${
                                                            isBento
                                                                ? 'bg-[#fef9c3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                : 'text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/25'
                                                        } ${isRtl ? 'text-right' : 'text-left'}`}>
                                                            <span className={`block mb-1 uppercase tracking-wider text-[10px] ${isBento ? 'font-black text-black' : 'font-extrabold text-indigo-600 dark:text-indigo-400'}`}>Explanation</span>
                                                            <MathRenderer text={displayExp} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>

        {/* Custom utilities */}
            <style>{`
                /* Hide scrollbar for cleaner look */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default QuizResults;
