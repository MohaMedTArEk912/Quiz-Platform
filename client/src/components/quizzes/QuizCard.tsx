import React from 'react';
import { Download, Edit2, Trash2, Share2, Play, RefreshCw, Eye, EyeOff, Check } from 'lucide-react';
import type { Quiz } from '../../types';
import { getQuizIconOption } from '../../utils/quizIcons';
import { useTheme } from '../../context/ThemeContext';

interface QuizCardProps {
    quiz: Quiz;
    onExport: (quiz: Quiz) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onShare: (quiz: Quiz) => void;
    onPlay?: (quiz: Quiz) => void;
    onHost?: (quiz: Quiz) => void;
    onReplace?: (quiz: Quiz) => void;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ 
    quiz, 
    onExport, 
    onEdit, 
    onDelete, 
    onShare, 
    onPlay, 
    onHost, 
    onReplace,
    isSelected = false,
    onToggleSelect
}) => {
    const { isBento } = useTheme();
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
        onPlay ? {
            label: 'Preview',
            icon: Play,
            action: () => onPlay(quiz),
            style: isBento
                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/20',
            title: 'Play / Preview quiz in student view'
        } : null,
        onHost ? {
            label: 'Host',
            icon: null,
            action: () => onHost(quiz),
            style: isBento
                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20',
            title: 'Host Live Classroom Arena game for this quiz'
        } : null,
        {
            label: 'Share',
            icon: Share2,
            action: () => onShare(quiz),
            style: isBento
                ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/20',
            title: 'Share this quiz'
        },
        {
            label: 'Export',
            icon: Download,
            action: () => onExport(quiz),
            style: isBento
                ? 'bg-[#fed7aa] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20',
            title: 'Export this quiz'
        },
        onReplace ? {
            label: 'Replace',
            icon: RefreshCw,
            action: () => onReplace(quiz),
            style: isBento
                ? 'bg-[#67e8f9] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-500/20 border border-cyan-500/20',
            title: 'Replace this quiz questions & content with a JSON file'
        } : null,
        {
            label: 'Edit',
            icon: Edit2,
            action: () => onEdit(quiz),
            style: isBento
                ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20',
            title: 'Edit this quiz'
        },
        {
            label: 'Delete',
            icon: Trash2,
            action: () => onDelete(quiz.id),
            style: isBento
                ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20',
            title: 'Delete this quiz'
        }
    ].filter(Boolean) as Array<{ label: string; icon?: React.ComponentType<{ className?: string }>; action: () => void; style: string; title: string }>;

    return (
        <div className={`group relative h-full rounded-[28px] p-5 transition-all duration-200 ${
            isSelected
                ? isBento
                    ? 'bg-[#fef9c3] text-black border-3 border-black shadow-[6px_6px_0px_#000] ring-4 ring-[#bef264]'
                    : 'border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-lg shadow-purple-500/10'
                : isBento
                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000] hover:shadow-[7px_7px_0px_#000] hover:-translate-y-1'
                    : 'border border-gray-200 bg-white/90 shadow-sm hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 dark:bg-black/20 dark:border-white/5'
        }`}>
            <div className="flex h-full flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        {onToggleSelect && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const qId = quiz.id || quiz._id || '';
                                    if (qId) onToggleSelect(qId);
                                }}
                                aria-label={isSelected ? 'Deselect quiz' : 'Select quiz'}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-3 transition-all cursor-pointer ${
                                    isSelected
                                        ? isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                            : 'bg-purple-600 text-white shadow-sm'
                                        : isBento
                                            ? 'bg-white border-2 border-black hover:bg-gray-100 shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-transparent hover:border-purple-400'
                                }`}
                            >
                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>
                        )}
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                            <QuizIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className={`text-base font-black truncate ${
                                isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                            }`} title={quiz.title}>
                                {quiz.title}
                            </h3>
                            <p className={`mt-0.5 text-xs font-semibold ${
                                isBento ? 'text-gray-600 font-mono' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                {quiz.questions?.length || 0} Questions · {quiz.timeLimit}m
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            quiz.isVisible === false
                                ? isBento
                                    ? 'bg-gray-200 text-gray-700 border border-black'
                                    : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                                : isBento
                                    ? 'bg-[#86efac] text-black border border-black'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                            {quiz.isVisible === false ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                            {quiz.isVisible === false ? 'Hidden' : 'Visible'}
                        </span>

                        <div className={`rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                            isBento
                                ? 'bg-[#fef9c3] text-black font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-gray-100 font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400'
                        }`}>
                            {quiz.category}
                        </div>
                        <div className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                            isBento
                                ? 'bg-[#fed7aa] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : (isPool ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300')
                        }`}>
                            {quizSetLabel}
                        </div>
                    </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                    {actionButtons.map(({ label, icon: Icon, action, style, title }) => (
                        <button
                            key={label}
                            onClick={action}
                            title={title}
                            className={`${style} flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95 cursor-pointer`}
                        >
                            {Icon ? <Icon className={`h-3.5 w-3.5 ${isBento ? 'stroke-[2.5]' : ''}`} /> : label === 'Host' ? '🎮' : null}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizCard;
