import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quiz, UserData, AttemptData } from '../types/index.ts';
import { DIFFICULTY_COLORS } from '../constants/quizDefaults.ts';
import {
    Search,
    RefreshCw,
    Play,
    CheckCircle,
    BarChart3,
    Clock,
    Award,

    Zap,
    Target,
    Shield,
    Bell
} from 'lucide-react';
import Navbar from './Navbar.tsx';

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
    const navigate = useNavigate();
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
    }).sort((a, b) => {
        const getNum = (str: string) => {
            const match = str.match(/(\d+)/);
            return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
        };
        const numA = getNum(a.title);
        const numB = getNum(b.title);
        if (numA !== numB) return numA - numB;
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });



    const getDifficultyBadgeBg = (difficulty: string) => {
        return DIFFICULTY_COLORS[difficulty.toLowerCase()] || DIFFICULTY_COLORS.default;
    };

    const getQuizId = (quiz: Quiz) => quiz.id || quiz._id || '';
    const getQuizAttempts = (quizId: string) => attempts.filter(a => a.quizId === quizId);
    const getBestScore = (quizId: string) => {
        const qa = getQuizAttempts(quizId);
        return qa.length === 0 ? null : Math.max(...qa.map(a => a.percentage));
    };
    const hasAttempted = (quizId: string) => getQuizAttempts(quizId).length > 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white selection:bg-indigo-500/30">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-1000" />
            </div>

            <Navbar
                user={user}
                onViewProfile={onViewProfile}
                onViewLeaderboard={onViewLeaderboard}
                onLogout={onLogout}
                title="Quiz Platform"
                showActions={true}
            />

            <main className="relative w-full px-4 sm:px-6 py-8 md:py-12">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {[
                        {
                            label: "Total Score",
                            value: user.totalScore || 0,
                            icon: <BarChart3 className="w-6 h-6 text-white" />,
                            gradient: "from-blue-600 to-indigo-600"
                        },
                        {
                            label: "Quizzes Taken",
                            value: user.totalAttempts || 0,
                            icon: <Clock className="w-6 h-6 text-white" />,
                            gradient: "from-emerald-500 to-teal-500"
                        },
                        {
                            label: "Global Rank",
                            value: `#${user.rank || '-'}`,
                            icon: <Award className="w-6 h-6 text-white" />,
                            gradient: "from-violet-600 to-purple-600"
                        }
                    ].map((stat, idx) => (
                        <div key={idx} className="group relative">
                            <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-500`} />
                            <div className="relative bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300 shadow-xl dark:shadow-none">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{stat.label}</div>
                                    <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Clan Invites Banner */}
                {user.clanInvites && user.clanInvites.length > 0 && (
                    <div onClick={() => navigate('/clans')} className="mb-12 cursor-pointer relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-violet-500/20 group animate-in slide-in-from-top-5 duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-white animate-pulse" />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-black flex items-center gap-2">
                                        Pending Clan Invite{user.clanInvites.length > 1 ? 's' : ''}
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{user.clanInvites.length}</span>
                                    </h3>
                                    <p className="text-white/80 font-medium">
                                        You have been invited to join <span className="text-white font-bold">{user.clanInvites[0].clanName}</span> {user.clanInvites.length > 1 ? `and ${user.clanInvites.length - 1} others` : ''}.
                                    </p>
                                </div>
                            </div>
                            <div className="hidden md:flex px-6 py-2 bg-white text-violet-600 rounded-xl font-bold hover:scale-105 transition-transform items-center gap-2">
                                View Invites <Shield className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters Bar */}
                <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-gray-200 dark:border-white/10 mb-12 flex flex-col md:flex-row gap-4 shadow-xl">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Find your next challenge..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-black/20 border border-transparent dark:border-white/5 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-6 py-3 bg-gray-100 dark:bg-black/20 text-gray-700 dark:text-white rounded-2xl border border-gray-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold cursor-pointer hover:bg-gray-200 dark:hover:bg-black/30 transition-colors appearance-none"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{cat === 'all' ? 'All Categories' : cat}</option>
                            ))}
                        </select>
                        <select
                            value={difficultyFilter}
                            onChange={(e) => setDifficultyFilter(e.target.value)}
                            className="px-6 py-3 bg-gray-100 dark:bg-black/20 text-gray-700 dark:text-white rounded-2xl border border-gray-200 dark:border-white/5 outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold cursor-pointer hover:bg-gray-200 dark:hover:bg-black/30 transition-colors appearance-none"
                        >
                            {difficulties.map(diff => (
                                <option key={diff} value={diff} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{diff === 'all' ? 'All Levels' : diff}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Available Challenges</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{filteredQuizzes.length} quizzes ready to play</p>
                    </div>
                </div>

                {/* Quiz Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredQuizzes.map((quiz) => {
                        const quizId = getQuizId(quiz);
                        const bestScore = getBestScore(quizId);
                        const attempted = hasAttempted(quizId);

                        return (
                            <div
                                key={quizId}
                                onClick={() => onSelectQuiz(quiz)}
                                className="group relative min-h-[420px] cursor-pointer"
                            >
                                {/* Hover Glow */}
                                <div className={`absolute -inset-0.5 bg-gradient-to-br ${attempted ? 'from-emerald-500 to-teal-500' : 'from-indigo-500 to-purple-500'} rounded-[2.5rem] opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500`} />

                                {/* Card Content */}
                                <div className="relative h-full bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex flex-col overflow-hidden group-hover:-translate-y-2 transition-transform duration-300 shadow-xl dark:shadow-none">
                                    {/* Top Shine */}
                                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-50 dark:from-white/5 to-transparent pointer-events-none" />

                                    <div className="relative flex justify-between items-start mb-6">
                                        <div className="text-5xl group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl filter">
                                            {quiz.icon}
                                        </div>
                                        {attempted && (
                                            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl animate-in fade-in zoom-in duration-300">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative flex-grow">
                                        <h3 className="text-2xl font-black mb-3 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-transparent dark:group-hover:bg-clip-text dark:group-hover:bg-gradient-to-r dark:group-hover:from-indigo-400 dark:group-hover:to-purple-400 transition-all duration-300">
                                            {quiz.title}
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                            {quiz.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-8">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getDifficultyBadgeBg(quiz.difficulty)}`}>
                                                {quiz.difficulty}
                                            </span>
                                            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {quiz.questions.length} Qs
                                            </span>
                                            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {quiz.timeLimit === 0 ? 'Unlimited' : `${quiz.timeLimit} Min`}
                                            </span>
                                        </div>

                                        {attempted && (
                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between mb-4 backdrop-blur-sm">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Best Score</div>
                                                    <div className="text-2xl font-black text-gray-900 dark:text-white">{bestScore}%</div>
                                                </div>
                                                <Target className="w-8 h-8 text-emerald-500/20" />
                                            </div>
                                        )}
                                    </div>

                                    <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${attempted
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-emerald-500/25'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/25'
                                        } group-hover:scale-[1.02] transform`}>
                                        {attempted ? (
                                            <><RefreshCw className="w-4 h-4" /> Try Again</>
                                        ) : (
                                            <><Play className="w-4 h-4 fill-white" /> Start Quiz</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default QuizList;
