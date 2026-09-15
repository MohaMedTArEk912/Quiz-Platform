import React from 'react';
import { Upload, Edit2, Trash2, Folder } from 'lucide-react';
import type { Subject } from '../../types';
import { getIcon } from '../../utils/icons';
import { useTheme } from '../../context/ThemeContext';

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
    const { isBento } = useTheme();

    return (
        <div
            onClick={onSelect}
            className={`p-6 transition-all group cursor-pointer relative overflow-hidden ${
                isBento
                    ? 'card bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                    : 'bg-white dark:bg-[#1a1b26] rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'
            }`}
        >
            {!isUncategorized && subject && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onImport?.(subject._id); }}
                        className={`p-2 transition-colors ${
                            isBento
                                ? 'bg-white hover:bg-[#bef264] text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]'
                                : 'bg-white/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full backdrop-blur-sm shadow-sm text-emerald-600 dark:text-emerald-400'
                        }`}
                        title="Import Quiz into Stack"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(subject); }}
                        className={`p-2 transition-colors ${
                            isBento
                                ? 'bg-white hover:bg-[#bae6fd] text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]'
                                : 'bg-white/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full backdrop-blur-sm shadow-sm text-blue-600 dark:text-blue-400'
                        }`}
                        title="Edit Stack"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(subject); }}
                        className={`p-2 transition-colors ${
                            isBento
                                ? 'bg-white hover:bg-[#f87171] text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]'
                                : 'bg-white/50 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full backdrop-blur-sm shadow-sm text-red-600 dark:text-red-400'
                        }`}
                        title="Delete Stack"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 ${
                isBento
                    ? isUncategorized
                        ? 'bg-gray-100 border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                        : 'bg-[#fde047] border-2 border-black text-black shadow-[3px_3px_0px_#000] group-hover:scale-105'
                    : isUncategorized
                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                        : 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110'
            }`}>
                {React.createElement(subject ? getIcon(subject.icon) : Folder, { className: "w-8 h-8" })}
            </div>

            <h3 className={`text-lg mb-1 truncate pr-8 ${isBento ? 'font-black text-black' : 'font-bold text-gray-900 dark:text-white'}`}>
                {isUncategorized ? 'Uncategorized' : subject?.title}
            </h3>
            <div className="flex justify-between items-center">
                <p className={`text-sm font-medium ${isBento ? 'text-gray-700 font-bold' : 'text-gray-500'}`}>
                    {quizCount} Quizzes
                </p>
                {!isUncategorized && (
                    <div className={`overflow-hidden ${
                        isBento
                            ? 'h-2 w-14 bg-gray-200 border-2 border-black rounded-full'
                            : 'h-1 w-12 bg-gray-100 dark:bg-white/10 rounded-full'
                    }`}>
                        <div
                            className={`h-full ${isBento ? 'bg-[#bef264]' : 'bg-purple-500'}`}
                            style={{ width: `${Math.min((quizCount / 20) * 100, 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StackCard;
