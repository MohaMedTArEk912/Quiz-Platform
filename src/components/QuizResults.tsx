import React, { useRef, useState, useEffect } from 'react';
import type { Quiz, UserData, QuizResult, DetailedAnswer } from '../types/index.ts';
import { Award, RotateCcw, Home, Clock, Download, Loader2, Star, Zap, Check, X } from 'lucide-react';
import Navbar from './Navbar.tsx';
import { Certificate } from './Certificate.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';


const CompilerQuestion = React.lazy(() => import('./question-types/CompilerQuestion.tsx'));

interface QuizResultsProps {
    result: QuizResult;
    quiz: Quiz;
    user: UserData;
    onBackToQuizzes: () => void;
    onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, quiz, user, onBackToQuizzes, onRetake }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showReview, setShowReview] = useState(false);

    useEffect(() => {
        if (result.passed) {
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
    }, [result.passed]);

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-emerald-400';
        if (percentage >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const [error, setError] = useState<string | null>(null);

    const handleDownloadCertificate = async () => {
        if (!certificateRef.current) return;

        setIsGenerating(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1000, 700]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 1000, 700);
            pdf.save(`${quiz.title.replace(/\s+/g, '_')}_Certificate.pdf`);
        } catch (error) {
            console.error('Error generating certificate:', error);
            setError('Failed to generate certificate. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex flex-col transition-colors selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[128px] mix-blend-screen opacity-20 ${result.passed ? 'bg-emerald-600' : 'bg-red-600'
                    }`} />
            </div>

            <Navbar
                user={user}
                onBack={onBackToQuizzes}
                showBack={true}
                title="Quiz Results"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />

            <div className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
                <div className="max-w-2xl w-full bg-white dark:bg-[#13141f] rounded-3xl md:rounded-[2.5rem] shadow-2xl p-5 md:p-8 border border-gray-200 dark:border-white/5 relative overflow-hidden">
                    {/* Top Shine */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-50 dark:from-white/5 to-transparent pointer-events-none" />

                    <div className="relative text-center">
                        {/* Animated Award Icon */}
                        <div className="relative inline-block mb-8 mt-4">
                            <div className={`absolute inset-0 bg-gradient-to-r ${result.passed ? 'from-emerald-500 to-green-500' : 'from-red-500 to-pink-500'
                                } rounded-full blur-3xl opacity-20 animate-pulse`} />
                            <div className={`relative w-28 h-28 mx-auto flex items-center justify-center rounded-3xl bg-gradient-to-br ${result.passed ? 'from-emerald-500/10 to-green-500/10' : 'from-red-500/10 to-pink-500/10'
                                } border border-gray-200 dark:border-white/10`}>
                                <Award className={`w-14 h-14 ${getScoreColor(result.percentage)} drop-shadow-lg`} />
                            </div>
                        </div>

                        <h1 className={`text-3xl md:text-5xl font-black mb-4 bg-gradient-to-r ${result.passed
                            ? 'from-emerald-400 to-green-400'
                            : 'from-red-400 to-pink-400'
                            } bg-clip-text text-transparent`}>
                            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                        </h1>

                        {/* Circular Progress */}
                        <div className="relative w-56 h-56 mx-auto mb-10 py-4">
                            <div className="w-48 h-48 mx-auto relative cursor-pointer group">
                                <svg className="transform -rotate-90 w-48 h-48 drop-shadow-2xl">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-gray-100 dark:text-white/5"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="url(#gradient)"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 88}`}
                                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - result.percentage / 100)}`}
                                        className="transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={result.percentage >= 80 ? '#10B981' : result.percentage >= 60 ? '#F59E0B' : '#EF4444'} />
                                            <stop offset="100%" stopColor={result.percentage >= 80 ? '#34D399' : result.percentage >= 60 ? '#FBBF24' : '#F87171'} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                                    <div className={`text-6xl font-black ${getScoreColor(result.percentage)} drop-shadow-lg`}>
                                        {result.percentage}%
                                    </div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Score</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 font-medium">
                            You scored <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-white/5">{result.score}</span> out of <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-white/5">{result.totalQuestions}</span> questions
                        </p>

                        {/* Review Mode Indicator */}
                        {quiz.reviewMode && (
                            <div className="mb-6 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                                <p className="text-sm font-bold text-purple-900 dark:text-purple-100 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Review Mode - You received immediate feedback during the quiz
                                </p>
                            </div>
                        )}


                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-bold uppercase text-xs tracking-wider">Time Taken</span>
                                </div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white px-2 py-1">{formatTime(result.timeTaken)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                                    <Zap className="w-5 h-5" />
                                    <span className="font-bold uppercase text-xs tracking-wider">Status</span>
                                </div>
                                <div className={`text-2xl font-black ${result.passed ? 'text-emerald-400' : 'text-red-400'} px-2 py-1`}>
                                    {result.passed ? 'Passed' : 'Failed'}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        {result.percentage >= 80 && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-8">
                                <p className="text-emerald-600 dark:text-emerald-300 font-semibold flex items-center justify-center gap-2">
                                    <Star className="w-5 h-5 fill-emerald-600 dark:fill-emerald-300" />
                                    Excellent! You've mastered this topic!
                                </p>
                            </div>
                        )}
                        {result.percentage >= 60 && result.percentage < 80 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-8">
                                <p className="text-yellow-600 dark:text-yellow-300 font-semibold flex items-center justify-center gap-2">
                                    <Star className="w-5 h-5 fill-yellow-600 dark:fill-yellow-300" />
                                    Good job! A bit more practice will make you perfect!
                                </p>
                            </div>
                        )}
                        {result.percentage < 60 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
                                <p className="text-red-600 dark:text-red-300 font-semibold flex items-center justify-center gap-2">
                                    <RotateCcw className="w-5 h-5" />
                                    Don't give up! Review the material and try again!
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            {/* Certificate Button - Only for 100% */}
                            {result.percentage === 100 && (
                                <button
                                    onClick={handleDownloadCertificate}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black px-6 py-4 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-yellow-500/25 active:scale-95 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Generating Certificate...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-6 h-6" />
                                            CLAIM CERTIFICATE
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Certificate Info Message */}
                            {result.passed && result.percentage < 100 && (
                                <div className="text-center p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        🏆 Score 100% to earn a verified certificate!
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            {/* Review Answers Toggle */}
                            <button
                                onClick={() => setShowReview(!showReview)}
                                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1e1f2e] text-gray-700 dark:text-gray-300 px-6 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-[#25263a] hover:text-gray-900 dark:hover:text-white transition-all border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10"
                            >
                                {showReview ? 'Hide Answers' : 'Review Answers'}
                            </button>

                            <div className="flex gap-4">
                                <button
                                    onClick={onBackToQuizzes}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1e1f2e] text-gray-700 dark:text-gray-300 px-6 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-[#25263a] hover:text-gray-900 dark:hover:text-white transition-all border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10"
                                >
                                    <Home className="w-5 h-5" />
                                    Home
                                </button>
                                <button
                                    onClick={onRetake}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Review Section */}
                    {showReview && (
                        <div className="mt-8 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {quiz.questions.map((q, idx) => {
                                console.log(`[QuizResults] Q${idx} ID:${q.id}`, q.compilerConfig);
                                const answerEntry = result.answers[idx]; // FIX: Use index, not q.id
                                // DetailedAnswer has { selected, isCorrect, type }
                                // Or it might just be the value if legacy. But our onComplete sends DetailedAnswer.

                                const userVal = (typeof answerEntry === 'object' && answerEntry !== null && 'selected' in answerEntry)
                                    ? (answerEntry as DetailedAnswer).selected
                                    : answerEntry;

                                const isCorrect = (typeof answerEntry === 'object' && answerEntry !== null && 'isCorrect' in answerEntry)
                                    ? (answerEntry as DetailedAnswer).isCorrect
                                    : (q.correctAnswer !== undefined && userVal === q.correctAnswer);

                                return (
                                    <div key={q.id} className={`group relative p-6 rounded-3xl border transition-all duration-300 ${isCorrect
                                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                                        : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                        }`}>
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${isCorrect
                                                ? 'bg-emerald-500 text-white dark:text-black'
                                                : 'bg-red-500 text-white'
                                                }`}>
                                                {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                            </div>
                                            <p className="font-bold text-gray-900 dark:text-white text-lg leading-snug">
                                                {q.question}
                                            </p>
                                        </div>

                                        <div className="space-y-3 pl-12">
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isCorrect
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                                                }`}>
                                                <span className="text-xs font-bold uppercase tracking-wider opacity-70 w-24 shrink-0">Your Answer</span>
                                                <span className="font-medium w-full">
                                                    {q.isCompiler ? (
                                                        <div className="h-64 mt-2 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                                                            <React.Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                                                                <CompilerQuestion
                                                                    language={q.compilerConfig?.language || 'javascript'}
                                                                    allowedLanguages={q.compilerConfig?.allowedLanguages || ['javascript']}
                                                                    initialCode={String(userVal)}
                                                                    readOnly={true}
                                                                    onChange={() => { }}
                                                                    className="h-full border-0"
                                                                />
                                                            </React.Suspense>
                                                        </div>
                                                    ) : (
                                                        (userVal !== undefined && userVal !== null)
                                                            ? (q.options && typeof userVal === 'number' ? q.options[userVal] : String(userVal))
                                                            : 'Skipped'
                                                    )}
                                                </span>
                                            </div>

                                            {!isCorrect && (q.correctAnswer !== undefined || q.compilerConfig?.referenceCode) && (
                                                <div className="flex flex-col gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Correct Answer</span>
                                                    {q.isCompiler ? (
                                                        q.compilerConfig?.referenceCode ? (
                                                            <div className="h-64 mt-2 border border-emerald-500/20 rounded-xl overflow-hidden">
                                                                <React.Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                                                                    <CompilerQuestion
                                                                        language={q.compilerConfig?.language || 'javascript'}
                                                                        initialCode={q.compilerConfig.referenceCode}
                                                                        readOnly={true}
                                                                        onChange={() => { }}
                                                                        className="h-full border-0"
                                                                    />
                                                                </React.Suspense>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 mt-2 text-sm text-gray-500 italic bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                                                No reference answer provided.
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="font-medium">{q.options && q.correctAnswer !== undefined ? q.options[q.correctAnswer] : ''}</span>
                                                    )}
                                                </div>
                                            )}

                                            {q.explanation && (
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                                                    <div className="flex gap-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed bg-gray-50 dark:bg-[#0a0a0b]/50 p-4 rounded-xl">
                                                        <div className="mt-0.5 shrink-0">💡</div>
                                                        <div>
                                                            <strong className="text-gray-900 dark:text-gray-200 block mb-1">Explanation</strong>
                                                            {q.explanation}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Certificate Component */}
            {/* Same as before */}
            <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                <Certificate
                    ref={certificateRef}
                    userName={user.name}
                    courseTitle={quiz.title}
                    score={result.score}
                    totalQuestions={result.totalQuestions}
                    date={new Date().toLocaleDateString()}
                    certificateId={Date.now().toString(36)}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}} />
        </div >
    );
};

export default QuizResults;
