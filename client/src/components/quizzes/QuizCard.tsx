import React from 'react';
import { Download, Edit2, Trash2, Share2, Play, Eye, EyeOff } from 'lucide-react';
import type { Quiz } from '../../types';
import { getQuizIconOption } from '../../utils/quizIcons';

interface QuizCardProps {
    quiz: Quiz;
    onExport: (quiz: Quiz) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onShare: (quiz: Quiz) => void;
    onPlay?: (quiz: Quiz) => void;
    onHost?: (quiz: Quiz) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onExport, onEdit, onDelete, onShare, onPlay, onHost }) => {
    const quizIcon = getQuizIconOption(quiz.icon);
    const QuizIcon = quizIcon.Icon;
    const isPool = Boolean(quiz.quizType === 'pool' || quiz.isQuestionPool);
    const quizSetLabel = (() => {
        const text = `${quiz.id || ''} ${quiz.title || ''} ${quiz.description || ''}`.toLowerCase();

        if (isPool || /\b(pool|question bank|bank)\b/.test(text)) return 'Question Bank';
        if (quiz.quizType === 'exam' || /\bexam\b|final/.test(text)) return 'Exam';
        if (/home\s*work|homework/.test(text)) return 'Homework';
        if (/end\s*of\s*class|endoclass|after\s*session|\bafs\b/.test(text)) return 'Session';
        return 'Session';
    })();

    const actionButtons = [
        onPlay ? { label: 'Preview', icon: Play, action: () => onPlay(quiz), style: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20', title: 'Play / Preview quiz in student view' } : null,
        onHost ? { label: 'Host', icon: null, action: () => onHost(quiz), style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20', title: 'Host Live Classroom Arena game for this quiz' } : null,
        { label: 'Share', icon: Share2, action: () => onShare(quiz), style: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/20', title: 'Share this quiz' },
        { label: 'Export', icon: Download, action: () => onExport(quiz), style: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20', title: 'Export this quiz' },
        { label: 'Edit', icon: Edit2, action: () => onEdit(quiz), style: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20', title: 'Edit this quiz' },
        { label: 'Delete', icon: Trash2, action: () => onDelete(quiz.id), style: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20', title: 'Delete this quiz' }
    ].filter(Boolean) as Array<{ label: string; icon?: React.ComponentType<{ className?: string }>; action: () => void; style: string; title: string }>;

    return (
        <div className="group h-full rounded-[28px] border border-gray-200 bg-white/90 p-5 shadow-sm transition-all duration-200 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 dark:bg-black/20 dark:border-white/5">
            <div className="flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
                            <QuizIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-lg font-bold text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
                                {quiz.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {isPool
                                    ? `${quiz.questions?.length || 0} Pool Qs (${quiz.questionsPerAttempt || 10} / attempt)`
                                    : `${quiz.questions?.length || 0} Questions`} • {quiz.timeLimit === 0 ? 'Unlimited' : `${quiz.timeLimit}m`}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            quiz.isVisible === false
                                ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-500/10 dark:text-red-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-300'
                        }`} title={quiz.isVisible === false ? 'Hidden from students' : 'Visible to students'}>
                            {quiz.isVisible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {quiz.isVisible === false ? 'Hidden' : 'Visible'}
                        </div>
                        <div className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
                            {quiz.category}
                        </div>
                        <div className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            isPool
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
                        }`}>
                            {quizSetLabel}
                        </div>
                    </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {actionButtons.map(({ label, icon: Icon, action, style, title }) => (
                        <button
                            key={label}
                            onClick={action}
                            title={title}
                            className={`${style} flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.01] active:scale-95`}
                        >
                            {Icon ? <Icon className="h-3.5 w-3.5" /> : label === 'Host' ? '🎮' : null}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizCard;
