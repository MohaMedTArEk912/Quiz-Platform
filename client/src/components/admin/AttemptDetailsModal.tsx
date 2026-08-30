import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    HelpCircle,
    MinusCircle,
    Clock,
    User,
    Calendar,
    BookOpen,
    Filter,
    Sparkles,
    FileText,
    Table,
    ShieldCheck,
    ShieldAlert,
    EyeOff,
    Copy,
    Activity,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Modal from '../common/Modal';
import { MathRenderer } from '../common/MathRenderer';
import { exportAttemptToCSV, exportAttemptToPDF } from '../../lib/exportUtils';
import type { AttemptData, DetailedAttemptData, AttemptQuestionBreakdown, Quiz } from '../../types';
import { api } from '../../lib/api';

interface AttemptDetailsModalProps {
    attempt: AttemptData;
    quiz?: Quiz;
    onClose: () => void;
}

const AttemptDetailsModal: React.FC<AttemptDetailsModalProps> = ({
    attempt,
    quiz,
    onClose
}) => {
    const [loading, setLoading] = useState(true);
    const [detailedAttempt, setDetailedAttempt] = useState<DetailedAttemptData | null>(null);
    const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'unanswered'>('all');
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const [showSecurityTimeline, setShowSecurityTimeline] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadDetails = async () => {
            setLoading(true);
            try {
                const res = await api.getAttemptDetails(attempt.attemptId);
                if (isMounted && res.success && res.attempt) {
                    setDetailedAttempt(res.attempt);
                }
            } catch (err) {
                console.warn('Failed to load server attempt details, falling back to local evaluation:', err);
                if (isMounted) {
                    // Fallback to local evaluation using attempt and quiz props
                    const allQuestions = quiz?.questions || [];
                    let questions = attempt.attemptQuestions;

                    if (!questions || questions.length === 0) {
                        if (Array.isArray(attempt.questionIds) && attempt.questionIds.length > 0) {
                            const idSet = new Set(attempt.questionIds.map(id => String(id)));
                            const matched = attempt.questionIds
                                .map(id => allQuestions.find(q => String(q.id) === String(id)))
                                .filter(Boolean);
                            if (matched.length > 0) {
                                questions = matched as typeof allQuestions;
                            } else {
                                questions = allQuestions.filter(q => idSet.has(String(q.id)));
                            }
                        } else if (
                            attempt.isQuestionPool ||
                            quiz?.isQuestionPool ||
                            quiz?.quizType === 'pool' ||
                            (attempt.totalQuestions && attempt.totalQuestions < allQuestions.length)
                        ) {
                            const answerKeys = Object.keys(attempt.answers || {});
                            const matchedById = allQuestions.filter(q => answerKeys.includes(String(q.id)));

                            if (matchedById.length > 0) {
                                questions = matchedById;
                            } else {
                                const numericKeys = answerKeys.map(k => Number(k)).filter(n => !isNaN(n));
                                const maxIndex = numericKeys.length > 0 ? Math.max(...numericKeys) : -1;

                                if (attempt.totalQuestions && allQuestions.length > attempt.totalQuestions && maxIndex < attempt.totalQuestions) {
                                    questions = allQuestions.slice(0, attempt.totalQuestions);
                                } else if (answerKeys.length > 0 && answerKeys.length < allQuestions.length) {
                                    questions = allQuestions.slice(0, answerKeys.length);
                                } else {
                                    questions = allQuestions;
                                }
                            }
                        } else {
                            questions = allQuestions;
                        }
                    }

                    const userAnswers = attempt.answers as Record<string | number, unknown> | undefined;
                    const breakdown: AttemptQuestionBreakdown[] = (questions || []).map((q, idx) => {
                        const userAns = userAnswers?.[idx] ?? userAnswers?.[String(idx)] ?? userAnswers?.[q.id] ?? userAnswers?.[String(q.id)];
                        let selected = undefined;
                        let isCorrect = false;
                        const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';

                        if (typeof userAns === 'object' && userAns !== null) {
                            selected = (userAns as { selected?: unknown }).selected;
                            if (typeof (userAns as { isCorrect?: boolean }).isCorrect === 'boolean') {
                                isCorrect = Boolean((userAns as { isCorrect?: boolean }).isCorrect);
                            } else {
                                isCorrect = selected !== undefined && selected !== null && (
                                    Number(selected) === Number(q.correctAnswer) ||
                                    String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
                                );
                            }
                        } else {
                            selected = userAns;
                            isCorrect = selected !== undefined && selected !== null && (
                                Number(selected) === Number(q.correctAnswer) ||
                                String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
                            );
                        }

                        return {
                            questionId: q.id ?? idx + 1,
                            questionIndex: idx,
                            question: q.question,
                            options: q.options || [],
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation || '',
                            points: q.points || 10,
                            imageUrl: q.imageUrl,
                            codeSnippet: q.codeSnippet,
                            type: q.type || 'multiple-choice',
                            studentAnswer: selected,
                            isCorrect,
                            isAnswered: isAnswered && selected !== undefined && selected !== null && selected !== ''
                        };
                    });

                    const correctCount = breakdown.filter(b => b.isCorrect).length;
                    const wrongCount = breakdown.filter(b => !b.isCorrect && b.isAnswered).length;
                    const unansweredCount = breakdown.filter(b => !b.isAnswered).length;

                    setDetailedAttempt({
                        ...attempt,
                        questionsBreakdown: breakdown,
                        summary: {
                            total: breakdown.length,
                            correct: correctCount,
                            wrong: wrongCount,
                            unanswered: unansweredCount,
                            percentage: attempt.percentage,
                            score: attempt.score,
                            passed: attempt.passed,
                            timeTaken: attempt.timeTaken
                        }
                    });
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDetails();
        return () => {
            isMounted = false;
        };
    }, [attempt, quiz]);

    const questions = detailedAttempt?.questionsBreakdown || [];
    const correctQuestions = questions.filter(q => q.isCorrect);
    const wrongQuestions = questions.filter(q => !q.isCorrect && q.isAnswered);
    const unansweredQuestions = questions.filter(q => !q.isAnswered);

    const filteredQuestions = filter === 'wrong'
        ? wrongQuestions
        : filter === 'correct'
            ? correctQuestions
            : filter === 'unanswered'
                ? unansweredQuestions
                : questions;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleExportPDF = async () => {
        if (!detailedAttempt) return;
        setIsExportingPDF(true);
        try {
            await exportAttemptToPDF(detailedAttempt);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleExportCSV = () => {
        if (!detailedAttempt) return;
        setIsExportingCSV(true);
        try {
            exportAttemptToCSV(detailedAttempt);
        } catch (err) {
            console.error('CSV export failed:', err);
        } finally {
            setIsExportingCSV(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Student Quiz Submission Breakdown"
            description={`Detailed answer analysis for ${attempt.userName || 'Student'}`}
            maxWidth="max-w-4xl"
            icon={<BookOpen className="w-6 h-6 text-indigo-500" />}
            footer={
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={loading || isExportingPDF || !detailedAttempt}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/20"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {isExportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={loading || isExportingCSV || !detailedAttempt}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/20"
                        >
                            <Table className="w-3.5 h-3.5" />
                            {isExportingCSV ? 'Exporting...' : 'Export Excel / CSV'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                        Close Inspector
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header Summary Banner */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-transparent dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-transparent border border-indigo-200 dark:border-indigo-500/20 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {attempt.quizTitle || 'Quiz'}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    attempt.passed
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                }`}>
                                    {attempt.passed ? 'Passed' : 'Failed'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {attempt.userName}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                    {attempt.userEmail}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Recent'}
                                </span>
                            </div>
                        </div>

                        {/* Overall Score Badge */}
                        <div className="flex items-center gap-3">
                            <div className="p-4 rounded-2xl bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-center min-w-[100px] shadow-sm">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</div>
                                <div className={`text-2xl font-black ${attempt.percentage >= 70 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {attempt.percentage}%
                                </div>
                                <div className="text-[10px] font-bold text-gray-500">{attempt.score} pts</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Metrics Row */}
                    <div className={`grid grid-cols-2 ${unansweredQuestions.length > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3 pt-2`}>
                        <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                <HelpCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Questions</div>
                                <div className="text-sm font-black text-gray-900 dark:text-white">{questions.length || attempt.totalQuestions || 0}</div>
                            </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Correct</div>
                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{correctQuestions.length}</div>
                            </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <XCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-red-500 uppercase tracking-widest">Wrong</div>
                                <div className="text-sm font-black text-red-600 dark:text-red-400">{wrongQuestions.length}</div>
                            </div>
                        </div>

                        {unansweredQuestions.length > 0 && (
                            <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <MinusCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Skipped</div>
                                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">{unansweredQuestions.length}</div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 rounded-2xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Duration</div>
                                <div className="text-sm font-black text-gray-900 dark:text-white">{formatTime(attempt.timeTaken || 0)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exam Integrity & Security Telemetry Box */}
                {(() => {
                    const telemetry = detailedAttempt?.telemetry;
                    const integrityScore = telemetry?.integrityScore ?? 100;
                    const tabSwitches = telemetry?.tabSwitches ?? 0;
                    const focusLosses = telemetry?.focusLossCount ?? 0;
                    const copyPastes = telemetry?.copyPasteAttempts ?? 0;
                    const avgTimePerQ = (questions.length > 0 && attempt.timeTaken) ? Math.round(attempt.timeTaken / questions.length) : 0;
                    const isPristine = integrityScore >= 90;
                    const isModerate = integrityScore >= 70 && integrityScore < 90;

                    return (
                        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                            isPristine
                                ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-950/15'
                                : isModerate
                                    ? 'bg-amber-500/5 border-amber-500/25 dark:bg-amber-950/15'
                                    : 'bg-red-500/5 border-red-500/25 dark:bg-red-950/15'
                        }`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        isPristine
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                            : isModerate
                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                : 'bg-red-500/15 text-red-600 dark:text-red-400'
                                    }`}>
                                        {isPristine ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exam Integrity & Security</div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Status: {isPristine ? 'Pristine (No Red Flags)' : isModerate ? 'Moderate Caution' : 'High Suspicion / Flagged'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                                        isPristine
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                            : isModerate
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                                : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                                    }`}>
                                        Score: {integrityScore}%
                                    </span>
                                    {telemetry?.events && telemetry.events.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowSecurityTimeline(!showSecurityTimeline)}
                                            className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            {showSecurityTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            {telemetry.events.length} Events
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 4 Telemetry Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-2">
                                    <EyeOff className={`w-3.5 h-3.5 ${tabSwitches > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                                    <div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase">Tab Switches</div>
                                        <div className="font-black text-gray-900 dark:text-white">{tabSwitches}</div>
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-2">
                                    <Activity className={`w-3.5 h-3.5 ${focusLosses > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                                    <div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase">Focus Losses</div>
                                        <div className="font-black text-gray-900 dark:text-white">{focusLosses}</div>
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-2">
                                    <Copy className={`w-3.5 h-3.5 ${copyPastes > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                                    <div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase">Copy / Paste</div>
                                        <div className="font-black text-gray-900 dark:text-white">{copyPastes}</div>
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase">Avg / Question</div>
                                        <div className="font-black text-gray-900 dark:text-white">{avgTimePerQ}s</div>
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible Security Event Audit Log */}
                            {showSecurityTimeline && telemetry?.events && telemetry.events.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/5 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Audit Trail Events:</div>
                                    {telemetry.events.map((evt, eIdx) => (
                                        <div key={eIdx} className="text-[11px] font-mono flex items-center justify-between p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                {evt.type === 'tab_hidden' && 'Switched Tab / Hidden'}
                                                {evt.type === 'window_blur' && 'Window Focus Lost'}
                                                {evt.type === 'copy_attempt' && 'Copied Question Content'}
                                                {evt.type === 'paste_attempt' && 'Pasted Content'}
                                                {evt.type === 'fullscreen_exit' && 'Exited Fullscreen Mode'}
                                                {evt.type === 'rapid_guess' && `Rapid Guessing (${evt.details || '< 2s'})`}
                                                {evt.type === 'context_menu' && 'Right-Click / Context Menu Blocked'}
                                                {evt.questionIndex !== undefined && ` (Question ${evt.questionIndex + 1})`}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(evt.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            filter === 'all'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        All Questions ({questions.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('wrong')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            filter === 'wrong'
                                ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                        }`}
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Wrong Answers Only ({wrongQuestions.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('correct')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            filter === 'correct'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct Answers ({correctQuestions.length})
                    </button>
                    {unansweredQuestions.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setFilter('unanswered')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                filter === 'unanswered'
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                            }`}
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                            Skipped / Not Answered ({unansweredQuestions.length})
                        </button>
                    )}
                </div>

                {/* Questions List */}
                {loading ? (
                    <div className="py-16 text-center text-sm font-bold text-gray-400 animate-pulse">
                        Loading attempt answers and questions...
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/5">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                            {filter === 'wrong'
                                ? 'No Wrong Answers! Flawless Execution.'
                                : filter === 'unanswered'
                                    ? 'All Questions in this attempt were answered!'
                                    : 'No Questions Found.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                        {filteredQuestions.map((q, qIndex) => {
                            const isAnswered = q.isAnswered ?? (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '');
                            const isCorrect = q.isCorrect;
                            const isWrong = !isCorrect && isAnswered;
                            const studentAnsIndex = typeof q.studentAnswer === 'number'
                                ? q.studentAnswer
                                : (typeof q.studentAnswer === 'string' && !isNaN(Number(q.studentAnswer)) && q.studentAnswer.trim() !== '' ? Number(q.studentAnswer) : null);

                            return (
                                <div
                                    key={q.questionId || qIndex}
                                    className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                                        isCorrect
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-500/20'
                                            : isWrong
                                                ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20'
                                                : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-500/20'
                                    }`}
                                >
                                    {/* Question Header */}
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                isCorrect
                                                    ? 'bg-emerald-500 text-white'
                                                    : isWrong
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-amber-500 text-white'
                                            }`}>
                                                {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : isWrong ? <XCircle className="w-3.5 h-3.5" /> : <MinusCircle className="w-3.5 h-3.5" />}
                                                Question {q.questionIndex + 1}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {q.points} Points
                                            </span>

                                            {/* Question-level telemetry warnings */}
                                            {detailedAttempt?.telemetry?.events?.some(e => e.questionIndex === q.questionIndex && e.type === 'tab_hidden') && (
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3" /> Tab Switch
                                                </span>
                                            )}

                                            {detailedAttempt?.telemetry?.events?.some(e => e.questionIndex === q.questionIndex && e.type === 'rapid_guess') && (
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                                    <Activity className="w-3 h-3" /> Rush / Rapid Answer (&lt;2s)
                                                </span>
                                            )}

                                            {detailedAttempt?.telemetry?.events?.some(e => e.questionIndex === q.questionIndex && e.type === 'copy_attempt') && (
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-1">
                                                    <Copy className="w-3 h-3" /> Copied Text
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs font-black uppercase tracking-wider">
                                            {isCorrect ? (
                                                <span className="text-emerald-500 dark:text-emerald-400">Correct (+{q.points})</span>
                                            ) : isWrong ? (
                                                <span className="text-red-500 dark:text-red-400">Incorrect (0 pts)</span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400">Skipped / Unanswered (0 pts)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Text with MathRenderer */}
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white leading-relaxed mb-3 whitespace-pre-line">
                                        <MathRenderer text={q.question} />
                                    </h4>

                                    {/* Question Image if present */}
                                    {q.imageUrl && (
                                        <div className="mb-4 rounded-2xl overflow-hidden max-h-60 max-w-md border border-gray-200 dark:border-white/10">
                                            <img src={q.imageUrl} alt="Question context" className="w-full h-auto object-cover" />
                                        </div>
                                    )}

                                    {/* Code Snippet if present */}
                                    {q.codeSnippet && (
                                        <div className="mb-4 p-4 rounded-2xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto border border-gray-800">
                                            <pre>{q.codeSnippet}</pre>
                                        </div>
                                    )}

                                    {/* Side-by-Side Student Choice vs Correct Answer Comparison Box */}
                                    {(() => {
                                        const correctOptIndex = typeof q.correctAnswer === 'number'
                                            ? q.correctAnswer
                                            : (typeof q.correctAnswer === 'string' && !isNaN(Number(q.correctAnswer)) && q.correctAnswer.trim() !== ''
                                                ? Number(q.correctAnswer)
                                                : null);
                                        const correctOptionLetter = correctOptIndex !== null ? String.fromCharCode(65 + correctOptIndex) : '';
                                        const correctOptionText = correctOptIndex !== null && Array.isArray(q.options) && q.options[correctOptIndex]
                                            ? q.options[correctOptIndex]
                                            : (q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer) : 'Not specified');

                                        const studentOptionLetter = studentAnsIndex !== null ? String.fromCharCode(65 + studentAnsIndex) : '';
                                        let studentOptionText = 'No Answer Given';
                                        if (studentAnsIndex !== null && Array.isArray(q.options) && q.options[studentAnsIndex]) {
                                            studentOptionText = q.options[studentAnsIndex];
                                        } else if (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '') {
                                            studentOptionText = typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : String(q.studentAnswer);
                                        }

                                        return (
                                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Student's Chosen Answer */}
                                                <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm ${
                                                    isCorrect
                                                        ? 'bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-950/25'
                                                        : isWrong
                                                            ? 'bg-red-500/10 border-red-500/40 dark:bg-red-950/25'
                                                            : 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/25'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                            isCorrect
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : isWrong
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : isWrong ? <XCircle className="w-3.5 h-3.5" /> : <MinusCircle className="w-3.5 h-3.5" />}
                                                            Student's Response
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            isCorrect
                                                                ? 'bg-emerald-500 text-white'
                                                                : isWrong
                                                                    ? 'bg-red-500 text-white'
                                                                    : 'bg-amber-500 text-white'
                                                        }`}>
                                                            {isCorrect ? 'Correct Choice' : isWrong ? 'Wrong Choice' : 'Skipped / Unanswered'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-start gap-2 pt-1">
                                                        {studentOptionLetter && isAnswered && (
                                                            <span className={`px-2 py-0.5 rounded-md font-black text-xs shrink-0 ${
                                                                isWrong
                                                                    ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                                                                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                            }`}>
                                                                Option {studentOptionLetter}
                                                            </span>
                                                        )}
                                                        <MathRenderer text={isAnswered ? studentOptionText : 'No Answer Given (Skipped / Not Reached)'} className="break-words font-black" />
                                                    </div>
                                                </div>

                                                {/* Correct Answer */}
                                                <div className="p-3.5 sm:p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-950/25 flex flex-col justify-between gap-2 shadow-sm">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                                                            Required
                                                        </span>
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-start gap-2 pt-1">
                                                        {correctOptionLetter && (
                                                            <span className="px-2 py-0.5 rounded-md font-black text-xs shrink-0 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                Option {correctOptionLetter}
                                                            </span>
                                                        )}
                                                        <MathRenderer text={correctOptionText} className="break-words font-black text-emerald-700 dark:text-emerald-300" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Options List for Multiple Choice */}
                                    {Array.isArray(q.options) && q.options.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                                All Quiz Options Breakdown:
                                            </div>
                                            {q.options.map((optText, optIdx) => {
                                                const isStudentPick = studentAnsIndex === optIdx || (typeof q.studentAnswer === 'string' && q.studentAnswer.trim() === optText.trim());
                                                const isCorrectOption = Number(q.correctAnswer) === optIdx || (typeof q.correctAnswer === 'string' && q.correctAnswer.trim() === optText.trim());

                                                let cardStyle = 'bg-white/80 dark:bg-black/30 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300';
                                                let badge = null;

                                                if (isStudentPick && isCorrectOption) {
                                                    // Student got it right
                                                    cardStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                                                    badge = (
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                                                            <CheckCircle2 className="w-3 h-3" /> Student's Pick (Correct)
                                                        </span>
                                                    );
                                                } else if (isStudentPick && !isCorrectOption) {
                                                    // Student picked wrong
                                                    cardStyle = 'bg-red-500/15 border-red-500 text-red-900 dark:text-red-200 font-bold';
                                                    badge = (
                                                        <span className="px-2 py-0.5 rounded-lg bg-red-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                                                            <XCircle className="w-3 h-3" /> Student's Choice (Wrong)
                                                        </span>
                                                    );
                                                } else if (isCorrectOption) {
                                                    // Correct answer highlight
                                                    cardStyle = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold';
                                                    badge = (
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                                                            <CheckCircle2 className="w-3 h-3" /> Correct Answer
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-all ${cardStyle}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="w-6 h-6 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center font-black text-xs shrink-0">
                                                                {String.fromCharCode(65 + optIdx)}
                                                            </span>
                                                            <MathRenderer text={optText} className="truncate" />
                                                        </div>
                                                        {badge}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Open Text / Compiler / Other Answer Representation */
                                        <div className="space-y-2 mb-4">
                                            <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-white/5 space-y-1.5">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Response:</div>
                                                <div className="text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-pre-wrap">
                                                    {typeof q.studentAnswer === 'object' && q.studentAnswer !== null
                                                        ? JSON.stringify(q.studentAnswer, null, 2)
                                                        : String(q.studentAnswer || '(No answer provided)')}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Explanation / Reference Note with MathRenderer */}
                                    {q.explanation && (
                                        <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 flex items-start gap-2.5">
                                            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                            <div className="w-full">
                                                <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">
                                                    Explanation / Correct Logic
                                                </div>
                                                <MathRenderer text={q.explanation} className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AttemptDetailsModal;
