import React from 'react';
import { Download, Edit2, Trash2, Share2 } from 'lucide-react';
import type { Quiz } from '../../types';
import { getQuizIconOption } from '../../utils/quizIcons';

interface QuizCardProps {
    quiz: Quiz;
    onExport: (quiz: Quiz) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onShare: (quiz: Quiz) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onExport, onEdit, onDelete, onShare }) => {
    const quizIcon = getQuizIconOption(quiz.icon);
    const QuizIcon = quizIcon.Icon;
    const quizSetLabel = (() => {
        const text = `${quiz.id || ''} ${quiz.title || ''} ${quiz.description || ''}`.toLowerCase();

        if (quiz.quizType === 'exam' || /\bexam\b|final/.test(text)) return 'Exam';
        if (/home\s*work|homework/.test(text)) return 'Homework';
        if (/end\s*of\s*class|endoclass|after\s*session|\bafs\b/.test(text)) return 'Session';
        return 'Session';
    })();

    return (
        <div className="bg-white dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3 min-w-0 pr-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                        <QuizIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                            {quiz.title}
                        </h3>
                    <p className="text-sm text-gray-500">{quiz.questions?.length || 0} Questions • {quiz.timeLimit === 0 ? 'Unlimited' : `${quiz.timeLimit}m`}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{quiz.category}</div>
                    <div className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-500/10 text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">{quizSetLabel}</div>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => onShare(quiz)} className="flex-1 py-2 bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 min-w-[80px]">
                    <Share2 className="w-4 h-4" /> Share
                </button>
                <button onClick={() => onExport(quiz)} className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 min-w-[80px]">
                    <Download className="w-4 h-4" /> Export
                </button>
                <button onClick={() => onEdit(quiz)} className="flex-1 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 min-w-[80px]">
                    <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => onDelete(quiz.id)} className="flex-1 py-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 min-w-[80px]">
                    <Trash2 className="w-4 h-4" /> Delete
                </button>
            </div>
        </div>
    );
};

export default QuizCard;
