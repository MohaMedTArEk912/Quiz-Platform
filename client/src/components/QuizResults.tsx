import React, { useEffect, useState, useMemo } from 'react';
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

    const correctCount = Object.values(result.answers).filter((a): a is DetailedAnswer =>
        Boolean(a && typeof a === 'object' && 'isCorrect' in a && a.isCorrect)
    ).length;

    const incorrectCount = result.totalQuestions - correctCount;

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
        <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25 relative overflow-hidden flex flex-col w-full font-sans pb-safe">
            {/* Ambient Background */}
            <AmbientBackground />

            {/* Top Navigation Bar */}
            <header className={`flex-none h-16 flex items-center justify-between px-6 z-20 transition-all pt-safe pl-safe pr-safe ${
                isBento
                    ? 'bg-white text-black border-b-3 border-black shadow-[0_4px_0px_#000]'
                    : 'glass-panel border-b border-slate-200/80 dark:border-white/10'
            }`}>
                <button
                    onClick={onBackToQuizzes}
                    className={`group flex items-center gap-2 px-3.5 py-1.5 transition-all text-xs font-semibold cursor-pointer ${
                        isBento
                            ? 'bg-[#fde047] text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] font-black uppercase hover:-translate-y-0.5'
                            : 'rounded-xl glass-card hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                    }`}
                >
                    <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Exit</span>
                </button>

                <div className={`flex items-center gap-2 px-3.5 py-1 ${
                    isBento
                        ? 'bg-[#bef264] text-black border-2 border-black rounded-full shadow-[2px_2px_0px_#000]'
                        : 'bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full border border-indigo-500/20'
                }`}>
                    <span className={`text-xs font-extrabold uppercase tracking-widest truncate max-w-xs sm:max-w-md ${
                        isBento ? 'text-black font-black' : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                        {quiz.title} <span className="opacity-40 mx-1">•</span> Result
                    </span>
                </div>

                <div className="w-16" /> {/* Spacer */}
            </header>

            {/* HORIZONTAL SPLIT LAYOUT */}
            <div className="flex-1 flex flex-col lg:flex-row w-full overflow-y-auto lg:overflow-hidden z-10">
                
                {/* LEFT SIDE: Big Score Gauge */}
                <div className={`w-full lg:w-1/2 flex-none lg:flex-1 h-auto lg:h-full flex flex-col items-center justify-center p-8 py-12 lg:p-12 relative overflow-hidden ${
                    isBento
                        ? 'bg-[#f8fafc] border-b-3 lg:border-b-0 lg:border-r-3 border-black'
                        : 'bg-white/70 dark:bg-white/[0.02] backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/[0.06]'
                }`}>
                    <div className={`relative z-10 flex flex-col items-center max-w-md w-full animate-in zoom-in-95 duration-500 ${
                        isBento ? 'bg-white border-3 border-black shadow-[8px_8px_0px_#000] rounded-3xl p-8' : ''
                    }`}>
                        
                        {/* Status Icon */}
                        <div className={`mb-6 p-4 rounded-3xl ${
                            isBento
                                ? (result.passed ? 'bg-[#bef264] text-black border-3 border-black shadow-[3px_3px_0px_#000]' : 'bg-[#fecdd3] text-black border-3 border-black shadow-[3px_3px_0px_#000]')
                                : (result.passed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-md' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-md')
                        }`}>
                            {result.passed ? <Trophy className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                        </div>

                        <h2 className={`text-3xl lg:text-4xl font-extrabold text-center mb-1.5 tracking-tight ${isBento ? 'text-black font-black' : 'text-slate-900 dark:text-white'}`}>
                            {result.passed ? 'Outstanding Work!' : 'Quiz Needs Review'}
                        </h2>
                        <p className={`text-center mb-8 text-sm ${isBento ? 'text-slate-700 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                            {result.passed ? "You have demonstrated strong mastery of this assessment." : "Review the question breakdown below and give it another try."}
                        </p>

                        {/* Circular Score Gauge */}
                        <div className="relative w-56 h-56 sm:w-60 sm:h-60 mb-6 group transition-all">
                            <div className={`absolute inset-0 rounded-full blur-2xl opacity-25 transition-all duration-1000 ${result.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 256 256">
                                <circle cx="128" cy="128" r="116" stroke="currentColor" strokeWidth={isBento ? "18" : "14"} fill="transparent" className={isBento ? "text-slate-200 stroke-slate-200" : "text-slate-200/70 dark:text-white/[0.04]"} />
                                <circle
                                    cx="128" cy="128" r="116" stroke="currentColor" strokeWidth={isBento ? "18" : "14"} fill="transparent"
                                    strokeDasharray={728.84}
                                    strokeDashoffset={728.84 - (728.84 * result.percentage) / 100}
                                    className={`transition-all duration-1000 ease-out ${
                                        isBento
                                            ? (result.passed ? 'text-[#bef264] stroke-[#bef264]' : 'text-[#f43f5e] stroke-[#f43f5e]')
                                            : (result.passed ? 'text-emerald-500' : 'text-rose-500')
                                    }`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <span className={`font-tabular text-5xl sm:text-6xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                                    {Math.round(result.percentage)}<span className="text-2xl sm:text-3xl opacity-50">%</span>
                                </span>
                                <span className={`text-xs font-semibold tracking-widest uppercase mt-1 ${isBento ? 'text-black font-black' : 'text-slate-400'}`}>Accuracy</span>
                            </div>
                        </div>

                    </div>
                </div>


                {/* --- RIGHT SIDE: Detailed Stats & Actions --- */}
                <div className={`w-full lg:w-1/2 flex-none lg:flex-1 h-auto lg:h-full flex flex-col overflow-visible lg:overflow-y-auto no-scrollbar relative p-8 landscape:p-6 lg:p-16 transition-all ${
                    isBento ? 'bg-[#f8fafc]' : 'bg-transparent lg:bg-white/40 dark:bg-[#0b0f19]'
                }`}>
                    
                    <div className="max-w-xl w-full mx-auto flex flex-col gap-8 animate-in slide-in-from-right-8 duration-500 delay-150 fill-mode-both">
                        
                        {/* Question Bank 100% Completion Milestone Celebration */}
                        {result.poolProgress?.justCompletedPool && (
                            <div className={`w-full p-6 rounded-3xl text-center animate-in zoom-in-95 duration-500 ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                    : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 dark:border-yellow-500/40 shadow-xl'
                            }`}>
                                <div className="text-4xl mb-2">🏆 🎉</div>
                                <h3 className={`text-xl uppercase tracking-wider ${isBento ? 'text-black font-black' : 'font-black text-amber-800 dark:text-amber-300'}`}>
                                    Question Bank 100% Completed!
                                </h3>
                                <p className={`text-sm mt-1 font-medium leading-relaxed ${isBento ? 'text-black' : 'text-gray-700 dark:text-gray-200'}`}>
                                    Incredible! You've mastered all <strong>{result.poolProgress.totalCount}</strong> unique questions in this bank! The question pool has completed Cycle {result.poolProgress.cycle} and has reset for your next attempt.
                                </p>
                            </div>
                        )}

                        {/* Question Bank Progress Card */}
                        {result.poolProgress && (
                            <div className={`rounded-3xl p-6 ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                    : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm'
                            }`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📦</span>
                                        <span className={`text-xs font-black uppercase tracking-widest ${isBento ? 'text-black' : 'text-blue-700 dark:text-blue-300'}`}>Question Bank Progress</span>
                                    </div>
                                    <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                        isBento ? 'bg-[#fde047] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                    }`}>
                                        Cycle {result.poolProgress.cycle + 1}
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <div className={`text-3xl font-black ${isBento ? 'text-black' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {result.poolProgress.seenCount} <span className="text-sm font-bold opacity-60">/ {result.poolProgress.totalCount} Qs Completed</span>
                                    </div>
                                    <div className={`text-lg font-black ${isBento ? 'text-black' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {result.poolProgress.percentage}%
                                    </div>
                                </div>
                                <div className={`w-full h-3.5 rounded-full overflow-hidden ${isBento ? 'bg-slate-200 border-2 border-black' : 'bg-blue-100 dark:bg-white/10'}`}>
                                    <div
                                        className={`h-full transition-all duration-1000 ${isBento ? 'bg-[#bef264]' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600'}`}
                                        style={{ width: `${result.poolProgress.percentage}%` }}
                                    />
                                </div>
                                {result.poolProgress.remainingCount !== undefined && result.poolProgress.remainingCount > 0 && !result.poolProgress.justCompletedPool && (
                                    <p className={`text-xs font-medium mt-2.5 flex items-center gap-1.5 ${isBento ? 'text-slate-800' : 'text-blue-600/80 dark:text-blue-300/80'}`}>
                                        <span>✨</span> {result.poolProgress.remainingCount} fresh questions left to see in this cycle.
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <h3 className={`text-xl font-bold flex items-center gap-2 mb-6 pb-4 ${
                                isBento ? 'text-black font-black border-b-3 border-black' : 'text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800'
                            }`}>
                                <Flag className={`w-5 h-5 ${isBento ? 'text-black' : 'text-indigo-500'}`} /> Performance Summary
                            </h3>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                
                                {/* Time Card */}
                                <div className={`rounded-3xl p-5 sm:p-6 flex items-center gap-4 ${
                                    isBento ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]' : 'glass-card'
                                }`}>
                                    <div className={`p-3.5 rounded-2xl ${isBento ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className={`text-xs uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-slate-600' : 'font-semibold text-slate-500 dark:text-slate-400'}`}>Time Taken</div>
                                        <div className={`font-tabular text-2xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>{formatTime(result.timeTaken || 0)}</div>
                                    </div>
                                </div>

                                {/* Total Points */}
                                <div className={`rounded-3xl p-5 sm:p-6 flex items-center gap-4 ${
                                    isBento ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]' : 'glass-card'
                                }`}>
                                    <div className={`p-3.5 rounded-2xl ${isBento ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'}`}>
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className={`text-xs uppercase tracking-wider mb-0.5 ${isBento ? 'font-black text-slate-600' : 'font-semibold text-slate-500 dark:text-slate-400'}`}>Total Score</div>
                                        <div className={`font-tabular text-2xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>{result.score?.toLocaleString() || 0}</div>
                                    </div>
                                </div>
                                
                                {/* Correct Card */}
                                <div className={`rounded-3xl p-5 sm:p-6 flex flex-col relative overflow-hidden group ${
                                    isBento ? 'bg-[#d9f99d] text-black border-3 border-black shadow-[4px_4px_0px_#000]' : 'glass-card'
                                }`}>
                                    <div className="flex items-center gap-2 mb-2 relative z-10">
                                        <CheckCircle className={`w-4 h-4 ${isBento ? 'text-black' : 'text-emerald-500'}`} />
                                        <span className={`text-xs uppercase tracking-wider ${isBento ? 'font-black text-black' : 'font-bold text-emerald-600 dark:text-emerald-400'}`}>Correct</span>
                                    </div>
                                    <div className={`font-tabular text-3xl font-black relative z-10 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                                        {correctCount} <span className={`text-base font-normal ml-1 ${isBento ? 'text-black/70' : 'text-slate-400'}`}>/ {result.totalQuestions}</span>
                                    </div>
                                </div>

                                {/* Incorrect Card */}
                                <div className={`rounded-3xl p-5 sm:p-6 flex flex-col relative overflow-hidden group ${
                                    isBento ? 'bg-[#fecdd3] text-black border-3 border-black shadow-[4px_4px_0px_#000]' : 'glass-card'
                                }`}>
                                    <div className="flex items-center gap-2 mb-2 relative z-10">
                                        <XCircle className={`w-4 h-4 ${isBento ? 'text-black' : 'text-rose-500'}`} />
                                        <span className={`text-xs uppercase tracking-wider ${isBento ? 'font-black text-black' : 'font-bold text-rose-600 dark:text-rose-400'}`}>Incorrect</span>
                                    </div>
                                    <div className={`font-tabular text-3xl font-black relative z-10 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                                        {incorrectCount} <span className={`text-base font-normal ml-1 ${isBento ? 'text-black/70' : 'text-slate-400'}`}>/ {result.totalQuestions}</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="flex-1 min-h-[12px]" />
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                            <button
                                onClick={onRetake}
                                className={`w-full sm:flex-1 group flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl active:scale-[0.985] transition-all font-bold cursor-pointer text-sm ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-3 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none font-black uppercase'
                                        : 'glass-card hover:bg-slate-100/80 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-100 shadow-sm'
                                }`}
                            >
                                <RotateCcw className={`w-4 h-4 group-hover:-rotate-180 transition-transform duration-500 ${isBento ? 'text-black' : 'text-indigo-500'}`} />
                                <span>
                                    {result.poolProgress
                                        ? ((result.poolProgress.remainingCount || 0) > 0
                                            ? `Remaining (${result.poolProgress.remainingCount})`
                                            : 'Next Cycle')
                                        : 'Retake'}
                                </span>
                            </button>

                            {/* Export Result & Quiz Menu */}
                            <div className="relative w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl active:scale-[0.985] transition-all font-bold cursor-pointer text-sm ${
                                        isBento
                                            ? 'bg-[#fdba74] text-black border-3 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none font-black uppercase'
                                            : 'glass-card hover:bg-slate-100/80 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-100 shadow-sm'
                                    }`}
                                >
                                    <Download className={`w-4 h-4 ${isBento ? 'text-black' : 'text-indigo-500'}`} />
                                    <span>Export</span>
                                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                                </button>

                                {isExportMenuOpen && (
                                    <div className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-56 rounded-2xl shadow-2xl z-50 overflow-hidden text-left p-1 ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                            : 'glass-panel border border-slate-200 dark:border-white/10'
                                    }`}>
                                        <div className={`px-3 py-2 text-[10px] uppercase tracking-wider ${isBento ? 'text-black font-black' : 'font-extrabold text-slate-400'}`}>
                                            PDF Export Options
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleExportResultPDF}
                                            disabled={isExportingResult}
                                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${
                                                isBento ? 'hover:bg-[#fde047] text-black font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            {isExportingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-indigo-500" />}
                                            <span>Assessment Result (PDF)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportQuizPDF}
                                            disabled={isExportingQuiz}
                                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${
                                                isBento ? 'hover:bg-[#fde047] text-black font-bold' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200'
                                            }`}
                                        >
                                            {isExportingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-amber-500" />}
                                            <span>Quiz Study Sheet (PDF)</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onBackToQuizzes}
                                className={`w-full sm:flex-1 group flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl active:scale-[0.985] transition-all font-bold cursor-pointer text-sm ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-3 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none font-black uppercase'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-white'
                                }`}
                            >
                                <span>Continue</span>
                                <Target className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowReview(!showReview)}
                            className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all group cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]'
                                    : 'glass-card hover:bg-slate-100/40 dark:hover:bg-white/[0.03]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20'
                                }`}>
                                    <List className="w-5 h-5" />
                                </div>
                                <span className={`text-base ${isBento ? 'text-black font-black uppercase tracking-wider' : 'font-bold text-slate-900 dark:text-white'}`}>Review Questions</span>
                            </div>
                            <div className={`p-2 rounded-full transition-transform duration-300 ${
                                isBento ? 'bg-slate-100 border-2 border-black' : 'bg-slate-100 dark:bg-white/5'
                            } ${showReview ? 'rotate-180' : ''}`}>
                                <ChevronDown className={`w-4 h-4 ${isBento ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`} />
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
                                    const isCorrect = isDetailed ? ans.isCorrect : (ans !== undefined && ans !== null && ans === q.correctAnswer);
                                    const userAnswer = isDetailed ? ans.selected : ans;

                                    const rawUserAnsText = q.type === 'multiple-choice' || !q.type 
                                        ? (q.options && typeof userAnswer === 'number' ? q.options[userAnswer] : String(userAnswer ?? '')) 
                                        : String(userAnswer ?? '');
                                    const userAnsText = (activeTrans?.options && typeof userAnswer === 'number' && activeTrans.options[userAnswer] !== undefined)
                                        ? activeTrans.options[userAnswer]
                                        : rawUserAnsText;

                                    const rawCorrectText = q.type === 'multiple-choice' || !q.type 
                                        ? (q.options && typeof q.correctAnswer === 'number' ? q.options[q.correctAnswer] : String(q.correctAnswer ?? '')) 
                                        : String(q.correctAnswer ?? '');
                                    const correctAnsText = (activeTrans?.options && typeof q.correctAnswer === 'number' && activeTrans.options[q.correctAnswer] !== undefined)
                                        ? activeTrans.options[q.correctAnswer]
                                        : rawCorrectText;
                                    
                                    return (
                                        <div
                                            key={idx}
                                            dir={isRtl ? 'rtl' : 'ltr'}
                                            className={`p-5 rounded-3xl transition-all ${
                                                isBento
                                                    ? (isCorrect
                                                        ? 'bg-[#f7fee7] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                                        : 'bg-[#fff1f2] text-black border-3 border-black shadow-[4px_4px_0px_#000]')
                                                    : `border glass-card ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-rose-500/30 bg-rose-500/[0.03]'}`
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
                                                            isBento ? 'bg-black text-[#bef264] border-2 border-black shadow-[3px_3px_0px_#000]' : 'bg-slate-900/90 dark:bg-[#070a12] text-emerald-400 border border-white/10 shadow-inner'
                                                        }`}>
                                                            {q.codeSnippet}
                                                        </pre>
                                                    )}

                                                    <div className={`flex flex-col gap-2 p-3.5 rounded-2xl transition-all ${
                                                        isBento
                                                            ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]'
                                                    }`}>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                            <span className={`text-[10px] uppercase tracking-wider w-24 shrink-0 ${isBento ? 'font-black text-slate-600' : 'font-extrabold text-slate-400'}`}>Your Answer</span>
                                                            <span className={`text-sm font-bold ${
                                                                isCorrect
                                                                    ? (isBento ? 'text-emerald-800' : 'text-emerald-600 dark:text-emerald-400')
                                                                    : (isBento ? 'text-rose-800' : 'text-rose-600 dark:text-rose-400')
                                                            } ${isRtl ? 'text-right' : 'text-left'}`}>
                                                                {userAnsText}
                                                                {userAnswer === undefined && 'No Answer'}
                                                            </span>
                                                        </div>
                                                        
                                                        {!isCorrect && q.type !== 'text' && (
                                                            <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 pt-2 ${
                                                                isBento ? 'border-t-2 border-black' : 'border-t border-slate-200/60 dark:border-white/[0.06]'
                                                            }`}>
                                                                <span className={`text-[10px] uppercase tracking-wider w-24 shrink-0 ${isBento ? 'font-black text-slate-600' : 'font-extrabold text-slate-400'}`}>Correct</span>
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
                                                                : 'text-slate-600 dark:text-slate-400 bg-indigo-500/[0.06] border border-indigo-500/20'
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
