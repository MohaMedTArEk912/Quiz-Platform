import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    EyeOff,
    Activity,
    Copy,
    RefreshCw,
    Search,
    Clock,
    Zap,
    ExternalLink
} from 'lucide-react';
import type { LiveProctoringResponse, AttemptData } from '../../types';
import { api } from '../../lib/api';

interface LiveProctoringManagementProps {
    onInspectAttempt: (attempt: AttemptData) => void;
    onNotification?: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const LiveProctoringManagement: React.FC<LiveProctoringManagementProps> = ({
    onInspectAttempt,
    onNotification
}) => {
    const [data, setData] = useState<LiveProctoringResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'moderate' | 'clean'>('all');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.getLiveProctoringData();
            if (res.success) {
                setData(res);
            }
        } catch (err: unknown) {
            console.error('Failed to load proctoring data:', err);
            if (onNotification) {
                onNotification('error', 'Failed to load live proctoring telemetry data');
            }
        } finally {
            setIsLoading(false);
        }
    }, [onNotification]);

    useEffect(() => {
        loadData();
        // Auto poll every 15 seconds for live sessions
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [loadData]);

    const summary = data?.summary;
    const allSessions = data?.sessions || [];

    const filteredSessions = allSessions.filter(s => {
        const matchesSearch =
            s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.quizTitle.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRisk =
            riskFilter === 'all' ||
            (riskFilter === 'high' && s.riskLevel === 'high') ||
            (riskFilter === 'moderate' && s.riskLevel === 'moderate') ||
            (riskFilter === 'clean' && s.riskLevel === 'clean');

        return matchesSearch && matchesRisk;
    });

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Live Exam Security Center
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Real-Time Proctoring & Integrity Telemetry
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-2xl mt-1">
                        Live surveillance of student exam sessions. Detect tab switching, window focus loss, clipboard copying, fullscreen exits, and rapid response rushing in real time.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadData}
                    disabled={isLoading}
                    className="px-4 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Live Refresh</span>
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Integrity</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {summary?.avgIntegrityScore ?? 100}%
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">{summary?.cleanCount ?? 0} pristine sessions</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">High Risk Flags</span>
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
                        {summary?.highRiskCount ?? 0}
                    </div>
                    <div className="text-[10px] font-bold text-red-500 mt-1">Score &lt; 70% integrity</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tab Switches</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <EyeOff className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                        {summary?.totalTabSwitches ?? 0}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">Total focus losses: {summary?.totalFocusLosses ?? 0}</div>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl border border-gray-200/70 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rushing Flags</span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        {summary?.totalRapidGuesses ?? 0}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1">Answers &lt; 1.8 seconds</div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 bg-white/70 dark:bg-[#13141f]/70 backdrop-blur-xl p-3 px-5 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm flex items-center gap-3">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student by name, email, or quiz..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setRiskFilter('all')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            riskFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                : 'bg-white/70 dark:bg-[#13141f]/70 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                    >
                        All ({allSessions.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('high')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                            riskFilter === 'high'
                                ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        High Risk ({summary?.highRiskCount ?? 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('moderate')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                            riskFilter === 'moderate'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Moderate ({summary?.moderateCount ?? 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => setRiskFilter('clean')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                            riskFilter === 'clean'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Pristine ({summary?.cleanCount ?? 0})
                    </button>
                </div>
            </div>

            {/* Live Proctoring Grid */}
            {isLoading ? (
                <div className="py-20 text-center text-sm font-bold text-gray-400 animate-pulse">
                    Scanning active exam sessions and telemetry streams...
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="py-20 text-center bg-white/70 dark:bg-[#13141f]/70 rounded-3xl border border-gray-200 dark:border-white/5">
                    <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        {riskFilter === 'high' ? 'No High Risk Breaches Detected!' : 'No Exam Sessions Found.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSessions.map((s) => {
                        const tel = s.telemetry;
                        const integrity = tel.integrityScore ?? 100;
                        const isHighRisk = s.riskLevel === 'high';
                        const isModerate = s.riskLevel === 'moderate';

                        return (
                            <div
                                key={s.attemptId}
                                className={`p-5 sm:p-6 rounded-3xl border transition-all hover:shadow-lg flex flex-col justify-between gap-4 ${
                                    isHighRisk
                                        ? 'bg-red-50/50 dark:bg-red-950/15 border-red-300 dark:border-red-500/30'
                                        : isModerate
                                            ? 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-300 dark:border-amber-500/30'
                                            : 'bg-white/70 dark:bg-[#13141f]/70 border-gray-200 dark:border-white/5'
                                }`}
                            >
                                <div>
                                    {/* Student Header */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 truncate">
                                                    {s.quizTitle}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    s.passed
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                }`}>
                                                    {s.passed ? 'Passed' : 'Failed'} ({s.percentage}%)
                                                </span>
                                            </div>
                                            <h4 className="text-base font-black text-gray-900 dark:text-white truncate">
                                                {s.userName}
                                            </h4>
                                            <p className="text-xs text-gray-400 truncate">
                                                {s.userEmail}
                                            </p>
                                        </div>

                                        {/* Integrity Gauge Badge */}
                                        <div className="text-right shrink-0">
                                            <div className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${
                                                isHighRisk
                                                    ? 'bg-red-500 text-white border-red-600 shadow-red-500/25'
                                                    : isModerate
                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/25'
                                                        : 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/25'
                                            }`}>
                                                {isHighRisk ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                <span>{integrity}% Integrity</span>
                                            </div>
                                            <div className="text-[9px] font-bold text-gray-400 mt-1">
                                                {new Date(s.completedAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security Event Pills */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                                            tel.tabSwitches > 0
                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                : 'bg-black/5 dark:bg-white/5 text-gray-500'
                                        }`}>
                                            <EyeOff className="w-3 h-3" /> {tel.tabSwitches} Tab Switches
                                        </span>

                                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                                            tel.focusLossCount > 0
                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                : 'bg-black/5 dark:bg-white/5 text-gray-500'
                                        }`}>
                                            <Activity className="w-3 h-3" /> {tel.focusLossCount} Focus Loss
                                        </span>

                                        {(tel.copyPasteAttempts || 0) > 0 && (
                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 flex items-center gap-1">
                                                <Copy className="w-3 h-3" /> {tel.copyPasteAttempts} Copy/Paste
                                            </span>
                                        )}

                                        {(tel.fullscreenExits || 0) > 0 && (
                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {tel.fullscreenExits} Fullscreen Exits
                                            </span>
                                        )}

                                        {(tel.rapidGuesses || 0) > 0 && (
                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> {tel.rapidGuesses} Rushed (&lt;2s)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="pt-3 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Duration: {Math.floor(s.timeTaken / 60)}m {s.timeTaken % 60}s
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => onInspectAttempt({
                                            attemptId: s.attemptId,
                                            userId: s.userId,
                                            userName: s.userName,
                                            userEmail: s.userEmail,
                                            quizId: s.quizId,
                                            quizTitle: s.quizTitle,
                                            score: s.score,
                                            totalQuestions: 0,
                                            percentage: s.percentage,
                                            timeTaken: s.timeTaken,
                                            answers: {},
                                            completedAt: s.completedAt,
                                            passed: s.passed,
                                            telemetry: s.telemetry
                                        })}
                                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
                                    >
                                        <span>Inspect Telemetry</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LiveProctoringManagement;
