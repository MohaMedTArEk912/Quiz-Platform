import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    HelpCircle,
    Clock,
    User,
    Calendar,
    BookOpen,
    Filter,
    Sparkles
} from 'lucide-react';
import Modal from '../common/Modal';
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
    const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');

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
                    const questions = attempt.attemptQuestions || quiz?.questions || [];
                    const breakdown: AttemptQuestionBreakdown[] = questions.map((q, idx) => {
                        const userAns = attempt.answers?.[idx] ?? attempt.answers?.[q.id];
                        let selected = undefined;
                        let isCorrect = false;

                        if (typeof userAns === 'object' && userAns !== null) {
                            selected = (userAns as { selected?: unknown }).selected;
                            if (typeof (userAns as { isCorrect?: boolean }).isCorrect === 'boolean') {
                                isCorrect = Boolean((userAns as { isCorrect?: boolean }).isCorrect);
                            } else {
                                isCorrect = Number(selected) === Number(q.correctAnswer);
                            }
                        } else {
                            selected = userAns;
                            isCorrect = Number(selected) === Number(q.correctAnswer);
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
                            isAnswered: selected !== undefined && selected !== null && selected !== ''
                        };
                    });

                    const wrongCount = breakdown.filter(b => !b.isCorrect).length;
                    const correctCount = breakdown.filter(b => b.isCorrect).length;

                    setDetailedAttempt({
                        ...attempt,
                        questionsBreakdown: breakdown,
                        summary: {
                            total: breakdown.length,
                            correct: correctCount,
                            wrong: wrongCount,
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
    const wrongQuestions = questions.filter(q => !q.isCorrect);
    const correctQuestions = questions.filter(q => q.isCorrect);

    const filteredQuestions = filter === 'wrong'
        ? wrongQuestions
        : filter === 'correct'
            ? correctQuestions
            : questions;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
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
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-indigo-500/25"
                >
                    Close Inspector
                </button>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
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
                            {filter === 'wrong' ? 'No Wrong Answers! Flawless Execution.' : 'No Questions Found.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                        {filteredQuestions.map((q, qIndex) => {
                            const isWrong = !q.isCorrect;
                            const studentAnsIndex = typeof q.studentAnswer === 'number'
                                ? q.studentAnswer
                                : (typeof q.studentAnswer === 'string' && !isNaN(Number(q.studentAnswer)) ? Number(q.studentAnswer) : null);

                            return (
                                <div
                                    key={q.questionId || qIndex}
                                    className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                                        isWrong
                                            ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20'
                                            : 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-500/20'
                                    }`}
                                >
                                    {/* Question Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                isWrong
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-emerald-500 text-white'
                                            }`}>
                                                {isWrong ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                Question {q.questionIndex + 1}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {q.points} Points
                                            </span>
                                        </div>

                                        <div className="text-xs font-black uppercase tracking-wider">
                                            {isWrong ? (
                                                <span className="text-red-500 dark:text-red-400">Incorrect</span>
                                            ) : (
                                                <span className="text-emerald-500 dark:text-emerald-400">Correct (+{q.points})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white leading-relaxed mb-3 whitespace-pre-line">
                                        {q.question}
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
                                        const correctOptIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : null;
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
                                                    isWrong
                                                        ? 'bg-red-500/10 border-red-500/40 dark:bg-red-950/25'
                                                        : 'bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-950/25'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                            isWrong ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            {isWrong ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                            Student's Chosen Answer
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            isWrong ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                                        }`}>
                                                            {isWrong ? 'Wrong Choice' : 'Correct Choice'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-start gap-2 pt-1">
                                                        {studentOptionLetter && (
                                                            <span className={`px-2 py-0.5 rounded-md font-black text-xs shrink-0 ${
                                                                isWrong
                                                                    ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                                                                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                            }`}>
                                                                Option {studentOptionLetter}
                                                            </span>
                                                        )}
                                                        <span className="break-words font-black">
                                                            {studentOptionText}
                                                        </span>
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
                                                        <span className="break-words font-black text-emerald-700 dark:text-emerald-300">
                                                            {correctOptionText}
                                                        </span>
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
                                                            <span className="truncate">{optText}</span>
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

                                    {/* Explanation / Reference Note */}
                                    {q.explanation && (
                                        <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 flex items-start gap-2.5">
                                            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">
                                                    Explanation / Correct Logic
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                                    {q.explanation}
                                                </p>
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
