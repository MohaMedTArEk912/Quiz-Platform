import React, { useState } from 'react';
import { X, Search, Clock, Trophy } from 'lucide-react';
import type { Quiz } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface QuizSelectionModalProps {
    quizzes: Quiz[];
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quizId: string) => void;
    title?: string;
}

const QuizSelectionModal: React.FC<QuizSelectionModalProps> = ({ quizzes, isOpen, onClose, onSelect, title = "Select a Quiz" }) => {
    const { isBento } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredQuizzes = (Array.isArray(quizzes) ? quizzes : []).filter(q => {
        if (!q) return false;
        const term = (searchTerm || '').toLowerCase();
        const title = (q.title || '').toLowerCase();
        const category = (q.category || '').toLowerCase();
        return title.includes(term) || category.includes(term);
    });

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isBento ? 'bg-black/60' : 'bg-black/50 backdrop-blur-sm'
        }`}>
            <div className={`rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden relative ${
                isBento
                    ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_#000]'
                    : 'bg-white dark:bg-[#1a1b26] rounded-3xl border border-white/10'
            }`}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-10 ${
                        isBento
                            ? 'border-2 border-black bg-white hover:bg-[#fed7aa] text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                            : 'bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500'
                    }`}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className={`p-6 border-b ${
                    isBento
                        ? 'bg-[#fde047] border-b-[2.5px] border-black'
                        : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5'
                }`}>
                    <h2 className={`text-2xl font-black mb-1 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{title}</h2>
                    <p className={`text-sm ${isBento ? 'text-black/80 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>Choose the battlefield for your challenge.</p>
                </div>

                {/* Search */}
                <div className={`p-4 border-b ${
                    isBento
                        ? 'border-b-[2.5px] border-black bg-[#f5f3ec]'
                        : 'border-gray-100 dark:border-white/5'
                }`}>
                    <div className="relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl transition-all ${
                                isBento
                                    ? 'border-2 border-black bg-white text-black font-medium shadow-[2px_2px_0px_#000] focus:outline-none placeholder-gray-500'
                                    : 'bg-gray-100 dark:bg-black/20 border-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-500'
                            }`}
                        />
                    </div>
                </div>

                {/* Quiz Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredQuizzes.map(quiz => (
                            <button
                                key={quiz.id || quiz._id}
                                onClick={() => onSelect(quiz.id || quiz._id!)}
                                className={`group relative flex flex-col p-4 rounded-2xl transition-all text-left ${
                                    isBento
                                        ? 'bg-[#f5f3ec] border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5'
                                        : 'bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-[#25263a] border border-gray-200 dark:border-white/5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3 w-full">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                                        isBento
                                            ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                        {quiz.icon || '📝'}
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-xs uppercase tracking-wider ${
                                        isBento
                                            ? 'bg-[#bef264] text-black font-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-200 dark:bg-white/10 font-bold text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {quiz.difficulty}
                                    </div>
                                </div>
                                <h3 className={`line-clamp-1 mb-1 ${
                                    isBento
                                        ? 'font-black text-black'
                                        : 'font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                }`}>
                                    {quiz.title}
                                </h3>
                                <div className={`text-xs flex items-center gap-3 mt-auto ${
                                    isBento ? 'text-gray-700 font-bold' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil((quiz.timeLimit || 0) / 60)}m</span>
                                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {quiz.questions?.length || 0} Qs</span>
                                </div>

                                {!isBento && (
                                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                )}
                            </button>
                        ))}
                    </div>
                    {filteredQuizzes.length === 0 && (
                        <div className={`text-center py-12 ${isBento ? 'text-gray-700 font-bold' : 'text-gray-500'}`}>
                            No quizzes found matching your search.
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.8); }
            `}} />
        </div>
    );
};

export default QuizSelectionModal;
