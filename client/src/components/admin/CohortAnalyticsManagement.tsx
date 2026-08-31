import React, { useState, useEffect, useCallback } from 'react';
import {
    Users,
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
    RefreshCw,
    Search,
    BookOpen,
    Layers,
    UserCheck
} from 'lucide-react';
import type { CohortAnalyticsResponse } from '../../types';
import { api } from '../../lib/api';

interface CohortAnalyticsManagementProps {
    onNotification?: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const CohortAnalyticsManagement: React.FC<CohortAnalyticsManagementProps> = ({
    onNotification
}) => {
    const [data, setData] = useState<CohortAnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTier, setSelectedTier] = useState<'high' | 'medium' | 'atRisk'>('atRisk');
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.getCohortAnalytics();
            if (res.success) {
                setData(res);
            }
        } catch (err: unknown) {
            console.error('Failed to load cohort analytics:', err);
            if (onNotification) {
                onNotification('error', 'Failed to load cohort analytics data');
            }
        } finally {
            setIsLoading(false);
        }
    }, [onNotification]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const summary = data?.summary;
    const levelCohorts = summary?.levelCohorts || [];
    const performanceTiers = summary?.performanceTiers;
    const categoryPerformance = summary?.categoryPerformance || [];

    const activeTierUsers = performanceTiers?.[selectedTier]?.users || [];
    const filteredTierUsers = activeTierUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                            <Layers className="w-3 h-3" />
                            Group & Cohort Intelligence
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Student Cohort & Tier Performance Analytics
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-2xl mt-1">
                        Compare learning trends across student cohorts. Evaluate high performers vs. at-risk learners, assess level progression, and monitor category pass rates.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadData}
                    disabled={isLoading}
                    className="px-4 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Students</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                        {summary?.totalStudents ?? 0}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">
                        from {summary?.totalAttemptsEvaluated ?? 0} total attempts
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">High Performers</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {performanceTiers?.high?.count ?? 0} Students
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500 mt-1">Average score ≥ 80%</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proficient Learners</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                        {performanceTiers?.medium?.count ?? 0} Students
                    </div>
                    <div className="text-[10px] font-bold text-blue-500 mt-1">Average score 60-79%</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Needs Attention</span>
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                        {performanceTiers?.atRisk?.count ?? 0} Students
                    </div>
                    <div className="text-[10px] font-bold text-red-500 mt-1">Average score &lt; 60%</div>
                </div>
            </div>

            {/* Level Cohort Progression Cards */}
            <div className="bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Experience & Gamification Cohorts
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {levelCohorts.map((cohort, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-2xl bg-gray-50/80 dark:bg-black/20 border border-gray-200/60 dark:border-white/5 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">
                                    {cohort.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black">
                                    {cohort.users} Students
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Avg Score</div>
                                    <div className="text-lg font-black text-gray-900 dark:text-white">{cohort.avgScore}%</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Pass Rate</div>
                                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{cohort.passRate}%</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                    style={{ width: `${cohort.passRate}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Performance Tier Explorer */}
            <div className="bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            Performance Tier Roster
                        </h3>
                    </div>

                    {/* Tier Switcher Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedTier('atRisk')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                selectedTier === 'atRisk'
                                    ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            Needs Attention ({performanceTiers?.atRisk?.count ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTier('medium')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                selectedTier === 'medium'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            Proficient ({performanceTiers?.medium?.count ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTier('high')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                selectedTier === 'high'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            High Performers ({performanceTiers?.high?.count ?? 0})
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search student by name or email in this tier..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>

                {/* Tier Student List */}
                <div className="space-y-2">
                    {filteredTierUsers.length === 0 ? (
                        <div className="py-12 text-center text-xs text-gray-400 font-bold">
                            No students currently in this performance cohort.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredTierUsers.map((u) => (
                                <div
                                    key={u.userId}
                                    className="p-4 rounded-2xl bg-gray-50/80 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-gray-900 dark:text-white truncate">
                                            {u.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate">
                                            {u.email}
                                        </div>
                                        <div className="text-[9px] font-bold text-gray-400 mt-1">
                                            Level {u.level} • {u.attempts} attempts
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className={`text-base font-black ${
                                            u.avgScore >= 80
                                                ? 'text-emerald-500'
                                                : u.avgScore >= 60
                                                    ? 'text-blue-500'
                                                    : 'text-red-500'
                                        }`}>
                                            {u.avgScore}%
                                        </span>
                                        <div className="text-[9px] font-bold text-gray-400">Avg Score</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Mastery Table */}
            <div className="bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Topic & Category Mastery Matrix
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPerformance.map((cat, cIdx) => (
                        <div
                            key={cIdx}
                            className="p-4 rounded-2xl bg-gray-50/80 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-black text-gray-900 dark:text-white truncate mb-1">
                                    {cat.category}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            cat.passRate >= 75
                                                ? 'bg-emerald-500'
                                                : cat.passRate >= 50
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500'
                                        }`}
                                        style={{ width: `${cat.passRate}%` }}
                                    />
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 mt-1">
                                    {cat.totalAttempts} attempts evaluated
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <div className="text-sm font-black text-gray-900 dark:text-white">
                                    {cat.avgScore}% Avg
                                </div>
                                <div className={`text-[10px] font-black ${
                                    cat.passRate >= 75 ? 'text-emerald-500' : cat.passRate >= 50 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                    {cat.passRate}% Pass Rate
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CohortAnalyticsManagement;
