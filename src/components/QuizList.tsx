import React, { useState } from 'react';
import type { Quiz, UserData, AttemptData } from '../types/index.ts';
import {
    LogOut,
    Trophy,
    Clock,
    Award,
    Search,
    RefreshCw,
    Play,
    CheckCircle,
    BarChart3,
    TrendingUp
} from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';


interface QuizListProps {
    quizzes: Quiz[];
    user: UserData;
    attempts: AttemptData[];
    onSelectQuiz: (quiz: Quiz) => void;
    onViewProfile: () => void;
    onViewLeaderboard: () => void;
    onLogout: () => void;
}

const QuizList: React.FC<QuizListProps> = ({ quizzes, user, attempts, onSelectQuiz, onViewProfile, onViewLeaderboard, onLogout }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

    const categories = ['all', ...new Set(quizzes.map(q => q.category))];
    const difficulties = ['all', ...new Set(quizzes.map(q => q.difficulty))];

    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || quiz.category === categoryFilter;
        const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter;
        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
            case 'intermediate': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
            case 'advanced': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300';
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
        }
    };

    const getQuizAttempts = (quizId: string) => attempts.filter(a => a.quizId === quizId);
    const getBestScore = (quizId: string) => {
        const qa = getQuizAttempts(quizId);
        return qa.length === 0 ? null : Math.max(...qa.map(a => a.percentage));
    };
    const hasAttempted = (quizId: string) => getQuizAttempts(quizId).length > 0;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                            QUIZLY
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <ThemeToggle />
                        <button onClick={onViewLeaderboard} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors tooltip" title="Leaderboard">
                            <TrendingUp className="w-6 h-6 text-slate-500" />
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 mx-1"></div>
                        <button onClick={onViewProfile} className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                            <span className="hidden sm:block text-sm font-bold">{user.name}</span>
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-500/30">
                                {user.name.charAt(0)}
                            </div>
                        </button>
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                {/* Hero / Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-5 group">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Score</div>
                            <div className="text-3xl font-black">{user.totalScore || 0}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-5 group">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quizzes Taken</div>
                            <div className="text-3xl font-black">{user.totalAttempts || 0}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-indigo-600 p-6 rounded-[2rem] border border-slate-200 dark:border-indigo-500 shadow-xl shadow-indigo-200 dark:shadow-indigo-500/20 flex items-center gap-5 group">
                        <div className="w-14 h-14 bg-indigo-500 dark:bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Award className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-indigo-100/70 dark:text-indigo-200 uppercase tracking-wider">Global Rank</div>
                            <div className="text-3xl font-black text-indigo-600 dark:text-white">#{user.rank || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200 dark:border-white/5 mb-12 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Find your next challenge..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl focus:ring-2 ring-indigo-500/20 outline-none transition-all dark:text-white"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-none outline-none text-sm font-bold dark:text-white"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                            ))}
                        </select>
                        <select
                            value={difficultyFilter}
                            onChange={(e) => setDifficultyFilter(e.target.value)}
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-none outline-none text-sm font-bold dark:text-white"
                        >
                            {difficulties.map(diff => (
                                <option key={diff} value={diff}>{diff === 'all' ? 'All Levels' : diff}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quiz Grid */}
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                    Available Challenges
                    <span className="text-sm font-bold px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500">
                        {filteredQuizzes.length}
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredQuizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            onClick={() => onSelectQuiz(quiz)}
                            className="group bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col min-h-[460px]"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{quiz.icon}</span>
                                {hasAttempted(quiz.id) && (
                                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow">
                                <h3 className="text-2xl font-black mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                    {quiz.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                    {quiz.description}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getDifficultyColor(quiz.difficulty)}`}>
                                        {quiz.difficulty}
                                    </span>
                                    <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        {quiz.questions.length} Items
                                    </span>
                                    <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                        {quiz.timeLimit} Min
                                    </span>
                                </div>

                                {hasAttempted(quiz.id) && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Best</div>
                                            <div className="text-emerald-500 font-black text-xl">{getBestScore(quiz.id)}%</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tries</div>
                                            <div className="font-bold">{getQuizAttempts(quiz.id).length}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button className={`mt-8 w-full py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg ${hasAttempted(quiz.id)
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                }`}>
                                {hasAttempted(quiz.id) ? (
                                    <><RefreshCw className="w-4 h-4" /> Go Again</>
                                ) : (
                                    <><Play className="w-4 h-4 fill-white" /> Start Quiz</>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default QuizList;
