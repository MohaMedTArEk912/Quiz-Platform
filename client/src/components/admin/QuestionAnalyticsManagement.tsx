import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Search,
    HelpCircle,
    Sparkles,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    TrendingDown,
    Flame,
    BookOpen,
    Table
} from 'lucide-react';
import type { UserData, Quiz, QuestionAnalyticsItem, QuestionAnalyticsSummary } from '../../types';
import { api } from '../../lib/api';
import { MathRenderer } from '../common/MathRenderer';
import { exportQuestionAnalyticsToCSV } from '../../lib/exportUtils';

interface QuestionAnalyticsManagementProps {
    currentUser?: UserData;
    quizzes?: Quiz[];
    onNotification?: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const QuestionAnalyticsManagement: React.FC<QuestionAnalyticsManagementProps> = ({
    quizzes = [],
    onNotification
}) => {
    const [questions, setQuestions] = useState<QuestionAnalyticsItem[]>([]);
    const [summary, setSummary] = useState<QuestionAnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
    const [failureThreshold, setFailureThreshold] = useState<'all' | 'high' | 'critical'>('all');
    const [expandedQuestionKey, setExpandedQuestionKey] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            const quizFilter = selectedQuizId !== 'all' ? selectedQuizId : undefined;
            const res = await api.getQuestionAnalytics(quizFilter);
            if (res.success) {
                setQuestions(res.questions || []);
                setSummary(res.summary || null);
            }
        } catch (error) {
            console.error('Failed to load question error analytics:', error);
            if (onNotification) {
                onNotification('error', 'Failed to load question error analytics');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedQuizId, onNotification]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    // Filter questions based on search & failure rate threshold
    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            if (failureThreshold === 'critical' && q.failureRate < 70) return false;
            if (failureThreshold === 'high' && q.failureRate < 40) return false;

            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                q.questionText.toLowerCase().includes(term) ||
                q.quizTitle.toLowerCase().includes(term) ||
                q.quizCategory.toLowerCase().includes(term)
            );
        });
    }, [questions, failureThreshold, searchTerm]);

    const toggleExpand = (key: string) => {
        setExpandedQuestionKey(prev => prev === key ? null : key);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Intro Banner */}
            <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-red-500/10 via-amber-500/5 to-purple-500/10 dark:from-red-950/30 dark:via-amber-950/20 dark:to-purple-950/20 border border-red-500/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Error Diagnostic Hub
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Question-Level Error & Misconception Analytics
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-2xl mt-1">
                        Identify where students struggle the most. Pinpoint top failed questions, distractor traps, and analyze student response distributions to optimize quiz clarity and learning roads.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => exportQuestionAnalyticsToCSV(filteredQuestions, summary)}
                        disabled={isLoading || filteredQuestions.length === 0}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm disabled:opacity-50"
                    >
                        <Table className="w-3.5 h-3.5" />
                        <span>Export CSV / Excel</span>
                    </button>

                    <button
                        type="button"
                        onClick={loadAnalytics}
                        disabled={isLoading}
                        className="px-4 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Failure Rate</span>
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                        {summary?.avgFailureRate ?? 0}%
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">Across all evaluated attempts</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Accuracy</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {summary?.avgAccuracy ?? 0}%
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">Global student correct rate</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toughest Quiz</span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                            <Flame className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate">
                        {summary?.hardestQuiz?.title || 'None'}
                    </div>
                    <div className="text-[10px] font-bold text-purple-500 mt-1">
                        {summary?.hardestQuiz ? `${summary.hardestQuiz.averageFailureRate}% error rate` : 'No data'}
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Questions Analyzed</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <HelpCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                        {summary?.totalQuestionsAnalyzed ?? 0}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">
                        from {summary?.totalAttemptsAnalyzed ?? 0} total attempts
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-3 px-5 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-3">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search failed questions by text, quiz, or topic..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                    />
                </div>

                {/* Quiz Filter Selector */}
                <div className="min-w-[200px] bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/5 px-4 py-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                    <select
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                    >
                        <option value="all" className="dark:bg-[#1a1b26]">All Quizzes</option>
                        {quizzes.map(q => (
                            <option key={q.id} value={q.id} className="dark:bg-[#1a1b26]">{q.title}</option>
                        ))}
                    </select>
                </div>

                {/* Failure Rate Threshold Filter */}
                <div className="flex items-center gap-1 bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-1.5 rounded-3xl border border-gray-200 dark:border-white/5">
                    <button
                        type="button"
                        onClick={() => setFailureThreshold('all')}
                        className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            failureThreshold === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setFailureThreshold('high')}
                        className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            failureThreshold === 'high'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                        }`}
                    >
                        &gt; 40% Missed
                    </button>
                    <button
                        type="button"
                        onClick={() => setFailureThreshold('critical')}
                        className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            failureThreshold === 'critical'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                        }`}
                    >
                        &gt; 70% Critical
                    </button>
                </div>
            </div>

            {/* Questions Leaderboard List */}
            {isLoading ? (
                <div className="py-20 text-center text-sm font-bold text-gray-400 animate-pulse">
                    Computing error distributions and ranking questions...
                </div>
            ) : filteredQuestions.length === 0 ? (
                <div className="py-20 text-center bg-white/50 dark:bg-white/5 rounded-[2.5rem] border border-gray-200 dark:border-white/5">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        No Problematic Questions Found
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                        Either no attempts match your current filters or all questions have great pass rates!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQuestions.map((q, rankIndex) => {
                        const isExpanded = expandedQuestionKey === q.key;
                        const isCritical = q.failureRate >= 70;
                        const isHigh = q.failureRate >= 40 && q.failureRate < 70;

                        return (
                            <div
                                key={q.key}
                                className={`rounded-3xl border transition-all overflow-hidden ${
                                    isCritical
                                        ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-500/20'
                                        : isHigh
                                            ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-500/20'
                                            : 'bg-white/70 dark:bg-[#13141f]/70 border-gray-200 dark:border-white/5'
                                } shadow-sm hover:shadow-md`}
                            >
                                {/* Main Question Card Row */}
                                <div
                                    onClick={() => toggleExpand(q.key)}
                                    className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    {/* Left Info */}
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                                            rankIndex === 0
                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                : rankIndex === 1
                                                    ? 'bg-orange-500 text-white'
                                                    : rankIndex === 2
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                        }`}>
                                            #{rankIndex + 1}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                    {q.quizTitle}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                                                    {q.quizCategory}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    {q.totalAttempts} total attempts • {q.wrongCount} wrong
                                                </span>
                                            </div>

                                            <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-2">
                                                <MathRenderer text={q.questionText} />
                                            </h4>

                                            {/* Most Common Wrong Choice Highlight */}
                                            {q.mostCommonWrongChoice && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">
                                                        Top Misconception: <span className="font-bold underline decoration-red-400/50">"{q.mostCommonWrongChoice}"</span> ({q.mostCommonWrongCount} students)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Failure Gauge */}
                                    <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200/40 dark:border-white/5">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                                                Failure Rate
                                            </div>
                                            <div className={`text-2xl font-black ${
                                                isCritical
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : isHigh
                                                        ? 'text-amber-500'
                                                        : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                                {q.failureRate}%
                                            </div>
                                        </div>

                                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Diagnostics Drawer */}
                                {isExpanded && (
                                    <div className="p-5 sm:p-6 border-t border-gray-200/60 dark:border-white/5 bg-white/40 dark:bg-black/20 space-y-5 animate-in slide-in-from-top-2 duration-150">
                                        {/* Option Selection Distribution Breakdown */}
                                        {Array.isArray(q.optionDistribution) && q.optionDistribution.length > 0 && (
                                            <div>
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                                                    Option Choice Distribution (% of students who selected each option)
                                                </h5>
                                                <div className="space-y-2">
                                                    {q.optionDistribution.map((opt) => (
                                                        <div
                                                            key={opt.optionIndex}
                                                            className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                                                                opt.isCorrect
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                                                    : opt.isTopMisconception
                                                                        ? 'bg-red-500/10 border-red-500/30'
                                                                        : 'bg-white/60 dark:bg-white/5 border-gray-200/50 dark:border-white/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="w-5 h-5 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                                                                        {String.fromCharCode(65 + opt.optionIndex)}
                                                                    </span>
                                                                    <span className="truncate text-gray-900 dark:text-gray-100">{opt.text}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {opt.isCorrect && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                            <CheckCircle2 className="w-2.5 h-2.5" /> Correct Answer
                                                                        </span>
                                                                    )}
                                                                    {opt.isTopMisconception && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                                            <AlertTriangle className="w-2.5 h-2.5" /> Top Trap ({opt.count} picked)
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                                                        {opt.percentage}% ({opt.count})
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        opt.isCorrect
                                                                            ? 'bg-emerald-500'
                                                                            : opt.isTopMisconception
                                                                                ? 'bg-red-500'
                                                                                : 'bg-gray-400 dark:bg-gray-600'
                                                                    }`}
                                                                    style={{ width: `${opt.percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Explanation Note */}
                                        {q.explanation && (
                                            <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 flex items-start gap-3">
                                                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                                <div className="w-full">
                                                    <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">
                                                        Reference Guide / Explanation
                                                    </div>
                                                    <MathRenderer text={q.explanation} className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default QuestionAnalyticsManagement;
