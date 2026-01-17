import React from 'react';
import { Upload, Edit2, Trash2, Folder } from 'lucide-react';
import type { Subject } from '../../types';
import { getIcon } from '../../utils/icons';

interface StackCardProps {
    subject?: Subject;
    quizCount: number;
    onSelect: () => void;
    onImport?: (id: string) => void;
    onEdit?: (subject: Subject) => void;
    onDelete?: (subject: Subject) => void;
    isUncategorized?: boolean;
}

const StackCard: React.FC<StackCardProps> = ({
    subject,
    quizCount,
    onSelect,
    onImport,
    onEdit,
    onDelete,
    isUncategorized = false
}) => {
    const IconComponent = subject ? getIcon(subject.icon) : Folder;

    return (
        <div
            onClick={onSelect}
            className="bg-white dark:bg-[#1a1b26] p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all group cursor-pointer relative overflow-hidden"
        >
            {!isUncategorized && subject && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onImport?.(subject._id); }}
                        className="p-2 bg-white/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full backdrop-blur-sm shadow-sm transition-colors text-emerald-600 dark:text-emerald-400"
                        title="Import Quiz into Stack"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(subject); }}
                        className="p-2 bg-white/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full backdrop-blur-sm shadow-sm transition-colors text-blue-600 dark:text-blue-400"
                        title="Edit Stack"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(subject); }}
                        className="p-2 bg-white/50 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full backdrop-blur-sm shadow-sm transition-colors text-red-600 dark:text-red-400"
                        title="Delete Stack"
                    // disabled={quizCount > 0} // Optional safety check based on user feedback
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className={`w-16 h-16 ${isUncategorized ? 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors' : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110'} rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300`}>
                <IconComponent className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate pr-8">
                {isUncategorized ? 'Uncategorized' : subject?.title}
            </h3>
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 font-medium">
                    {quizCount} Quizzes
                </p>
                {!isUncategorized && (
                    <div className="h-1 w-12 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${Math.min((quizCount / 20) * 100, 100)}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StackCard;
