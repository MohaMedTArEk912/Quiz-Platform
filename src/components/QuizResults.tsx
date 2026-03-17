import React, { useEffect } from 'react';
import type { Quiz, UserData, QuizResult } from '../types';
import { RotateCcw, Clock, Target, CheckCircle, XCircle, ArrowLeft, Trophy, Flag, AlertTriangle, List } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizResultsProps {
    result: QuizResult;
    quiz: Quiz;
    user: UserData;
    onBackToQuizzes: () => void;
    onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, quiz, onBackToQuizzes, onRetake }) => {
    const [showReview, setShowReview] = React.useState(false);

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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const correctCount = Object.values(result.answers).filter((a: any) =>
        a && typeof a === 'object' && 'isCorrect' in a && a.isCorrect
    ).length;

    const incorrectCount = result.totalQuestions - correctCount;

    return (
        <div className="h-screen bg-gray-50 dark:bg-[#080812] relative overflow-hidden flex flex-col w-full min-h-0 font-sans text-gray-900 dark:text-gray-100 transition-colors">
            
            {/* === Ambient Background Glows === */}
            <div className="absolute inset-x-[-50%] inset-y-[-50%] lg:inset-0 w-[200%] h-[200%] lg:w-full lg:h-full overflow-hidden pointer-events-none z-0">
                {/* Light Mode Blobs */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-red-400/40 lg:bg-[#FFB2B2] rounded-full mix-blend-multiply filter blur-[100px] lg:blur-[120px] opacity-[0.5] animate-blob dark:hidden" />
                <div className="absolute top-1/2 -right-32 lg:right-0 w-[500px] h-[500px] bg-blue-400/40 lg:bg-[#B2C8FF] rounded-full mix-blend-multiply filter blur-[100px] lg:blur-[140px] opacity-[0.4] animate-blob animation-delay-2000 dark:hidden" />
                <div className="absolute bottom-[-100px] left-1/4 w-[400px] h-[400px] lg:w-[450px] lg:h-[450px] bg-pink-400/40 lg:bg-[#FCE7F3] rounded-full mix-blend-multiply filter blur-[90px] lg:blur-[100px] opacity-[0.6] animate-blob animation-delay-4000 dark:hidden" />
                <div className="absolute top-[20%] right-[30%] w-[350px] h-[350px] lg:w-[400px] lg:h-[400px] bg-yellow-400/30 lg:bg-[#FEF08A] rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[110px] opacity-[0.4] animate-blob animation-delay-[6000ms] dark:hidden" />

                {/* Dark Mode Blobs */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob hidden dark:block" />
                <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-violet-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob animation-delay-2000 hidden dark:block" />
                <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob animation-delay-4000 hidden dark:block" />
                <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-sky-500 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.08] animate-blob animation-delay-2000 hidden dark:block" />
            </div>

            {/* === Top Navigation Bar === */}
            <header className="flex-none h-16 landscape:h-12 lg:landscape:h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-[#0d0d1c]/70 lg:bg-transparent border-b border-gray-100 lg:border-transparent dark:border-white/[0.06] backdrop-blur-xl lg:backdrop-blur-none z-20 transition-all">
                <button
                    onClick={onBackToQuizzes}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] border border-transparent dark:border-white/[0.08] transition-all"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="hidden sm:inline text-sm font-semibold text-gray-600 dark:text-slate-400">Exit</span>
                </button>

                <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate max-w-xs sm:max-w-md">
                        {quiz.title} <span className="opacity-50 mx-1">•</span> RESULTS
                    </span>
                </div>

                <div className="w-[88px]" /> {/* Spacer for centering */}
            </header>

            {/* === HORIZONTAL SPLIT LAYOUT === */}
            <div className="flex-1 flex flex-col lg:flex-row w-full overflow-y-auto lg:overflow-hidden z-10">
                
                {/* --- LEFT SIDE: Big Score / Result --- */}
                <div className="w-full lg:w-1/2 flex-none lg:flex-1 h-auto lg:h-full flex flex-col items-center justify-center bg-white/90 dark:bg-[#111827]/90 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 p-8 py-16 landscape:py-8 lg:p-12 relative overflow-hidden transition-all">
                    
                    {/* Subtle Background pattern for Left Side */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                    <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-in zoom-in-95 duration-500">
                        
                        {/* Status Icon Header */}
                        <div className={`mb-8 p-4 rounded-full ${result.passed ? 'bg-green-100 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-fuchsia-500/20 text-red-600 dark:text-fuchsia-400'} shadow-lg`}>
                            {result.passed ? <Trophy className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                        </div>

                        <h2 className="text-3xl lg:text-5xl font-black text-center mb-2 tracking-tight">
                            {result.passed ? 'Outstanding Work!' : 'Quiz Failed'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-center mb-12 text-lg">
                            {result.passed ? "You truly mastered this material." : "Review the material and try again."}
                        </p>

                        {/* Huge Circular Score Ring */}
                        <div className="relative w-64 h-64 landscape:w-40 landscape:h-40 lg:landscape:w-64 lg:landscape:h-64 mb-10 landscape:mb-6 lg:landscape:mb-10 group transition-all">
                            <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000 ${result.passed ? 'bg-emerald-500 group-hover:opacity-40' : 'bg-fuchsia-500 group-hover:opacity-40'}`} />
                            <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 256 256">
                                <circle cx="128" cy="128" r="116" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-100 dark:text-white/[0.03]" />
                                <circle
                                    cx="128" cy="128" r="116" stroke="currentColor" strokeWidth="16" fill="transparent"
                                    strokeDasharray={728.84} // 2 * pi * r
                                    strokeDashoffset={728.84 - (728.84 * result.percentage) / 100}
                                    className={`transition-all duration-1500 ease-out drop-shadow-lg ${result.passed ? 'text-green-500 dark:text-emerald-500' : 'text-red-500 dark:text-fuchsia-500'}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <span className={`text-6xl landscape:text-4xl lg:landscape:text-6xl font-black ${result.passed ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-fuchsia-400'}`}>
                                    {Math.round(result.percentage)}<span className="text-3xl landscape:text-xl lg:landscape:text-3xl opacity-60">%</span>
                                </span>
                                <span className="text-sm landscape:text-[10px] lg:landscape:text-sm font-bold tracking-widest uppercase text-gray-400 dark:text-gray-500 mt-1">Score</span>
                            </div>
                        </div>

                    </div>
                </div>


                {/* --- RIGHT SIDE: Detailed Stats & Actions --- */}
                <div className="w-full lg:w-1/2 flex-none lg:flex-1 h-auto lg:h-full flex flex-col bg-transparent lg:bg-white/40 dark:bg-[#0b0f19] overflow-visible lg:overflow-y-auto no-scrollbar relative p-8 landscape:p-6 lg:p-16 transition-all">
                    
                    <div className="max-w-xl w-full mx-auto flex flex-col gap-8 animate-in slide-in-from-right-8 duration-500 delay-150 fill-mode-both">
                        
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800 pb-4">
                                <Flag className="w-5 h-5 text-indigo-500" /> Performance Summary
                            </h3>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2 gap-4 landscape:gap-3">
                                
                                {/* Time Card */}
                                <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                                        <Clock className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Time Taken</div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{formatTime(result.timeTaken || 0)}</div>
                                    </div>
                                </div>

                                {/* Total Points */}
                                <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                                        <Target className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Total Points</div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{result.score}</div>
                                    </div>
                                </div>
                                
                                {/* Correct Card */}
                                <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                                    <div className="flex items-center gap-2 mb-3 relative z-10">
                                        <CheckCircle className="w-5 h-5 text-green-500 dark:text-emerald-500" />
                                        <span className="text-sm font-bold text-gray-600 dark:text-emerald-500/80 uppercase tracking-widest">Correct</span>
                                    </div>
                                    <div className="text-4xl font-black text-green-600 dark:text-emerald-400 relative z-10">{correctCount} <span className="text-lg opacity-40 font-bold ml-1">/ {result.totalQuestions}</span></div>
                                </div>

                                {/* Incorrect Card */}
                                <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                                    <div className="flex items-center gap-2 mb-3 relative z-10">
                                        <XCircle className="w-5 h-5 text-red-500 dark:text-fuchsia-500" />
                                        <span className="text-sm font-bold text-gray-600 dark:text-fuchsia-500/80 uppercase tracking-widest">Incorrect</span>
                                    </div>
                                    <div className="text-4xl font-black text-red-600 dark:text-fuchsia-400 relative z-10">{incorrectCount} <span className="text-lg opacity-40 font-bold ml-1">/ {result.totalQuestions}</span></div>
                                </div>

                            </div>
                        </div>

                        <div className="flex-1 min-h-[20px]" /> {/* Spacer */}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 landscape:mb-4 lg:landscape:mb-8 transition-all">
                            <button
                                onClick={onRetake}
                                className="w-full sm:w-1/2 group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all font-black text-gray-700 dark:text-gray-200 shadow-sm"
                            >
                                <RotateCcw className="w-5 h-5 text-indigo-500 dark:text-indigo-400 group-hover:-rotate-180 transition-transform duration-700" />
                                Retake Quiz
                            </button>
                            <button
                                onClick={onBackToQuizzes}
                                className="w-full sm:w-1/2 group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 font-black text-white"
                            >
                                Continue <Target className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowReview(!showReview)}
                            className="w-full flex items-center justify-between p-6 landscape:p-4 lg:landscape:p-6 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                                    <List className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <span className="text-xl font-bold text-gray-800 dark:text-gray-200">Review Questions</span>
                            </div>
                            <div className={`p-2 rounded-full bg-gray-50 dark:bg-gray-800 transition-transform duration-300 ${showReview ? 'rotate-180' : ''}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400" />
                                </svg>
                            </div>
                        </button>

                        {/* --- REVIEW SECTION CONTENT --- */}
                        {showReview && (
                            <div className="flex flex-col gap-4 mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
                                {quiz.questions.map((q, idx) => {
                                    const ansData = (result.answers as any)[idx];
                                    const isCorrect = ansData?.isCorrect;
                                    const userAnswer = ansData?.selected;
                                    
                                    return (
                                        <div key={idx} className={`p-5 rounded-3xl border ${isCorrect ? 'bg-green-50/50 dark:bg-emerald-500/5 border-green-200 dark:border-emerald-500/20' : 'bg-red-50/50 dark:bg-fuchsia-500/5 border-red-200 dark:border-fuchsia-500/20'} transition-all hover:shadow-md`}>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    {isCorrect ? (
                                                        <CheckCircle className="w-6 h-6 text-green-500 dark:text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="w-6 h-6 text-red-500 dark:text-fuchsia-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-3 landscape:mb-1.5 lg:landscape:mb-3 text-lg landscape:text-base lg:landscape:text-lg leading-snug">
                                                        <span className="opacity-50 mr-2">{idx + 1}.</span> {q.question}
                                                    </p>
                                                    
                                                    {q.codeSnippet && (
                                                        <pre className="p-4 mb-4 bg-white/60 dark:bg-black/40 rounded-2xl font-mono text-sm text-indigo-600 dark:text-emerald-400 overflow-x-auto border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
                                                            {q.codeSnippet}
                                                        </pre>
                                                    )}

                                                    <div className="flex flex-col gap-2 mt-4 landscape:mt-2 lg:landscape:mt-4 bg-white/50 dark:bg-black/20 p-4 landscape:p-3 lg:landscape:p-4 rounded-2xl border border-gray-100 dark:border-white/5 transition-all">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 w-24">Your Answer</span>
                                                            <span className={`font-semibold ${isCorrect ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-fuchsia-400'}`}>
                                                                {q.type === 'multiple-choice' || !q.type 
                                                                    ? (q.options ? q.options[userAnswer as number] : userAnswer) 
                                                                    : userAnswer?.toString()}
                                                                {userAnswer === undefined && 'No Answer'}
                                                            </span>
                                                        </div>
                                                        
                                                        {!isCorrect && q.type !== 'text' && (
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                                                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 w-24">Correct</span>
                                                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                    {q.type === 'multiple-choice' || !q.type 
                                                                        ? (q.options ? q.options[q.correctAnswer as number] : q.correctAnswer) 
                                                                        : q.correctAnswer?.toString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {q.explanation && (
                                                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-blue-100 dark:border-indigo-500/20">
                                                            <span className="font-bold block mb-1 text-blue-600 dark:text-indigo-400">Explanation</span>
                                                            {q.explanation}
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

            {/* Custom styles */}
            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 10s infinite alternate; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                
                /* Hide scrollbar for cleaner look */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default QuizResults;
