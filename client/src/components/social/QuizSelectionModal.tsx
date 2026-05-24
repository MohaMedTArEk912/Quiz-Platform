import React, { useState } from 'react';
import { X, Search, Clock, Trophy } from 'lucide-react';
import type { Quiz } from '../../types';

interface QuizSelectionModalProps {
    quizzes: Quiz[];
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quizId: string) => void;
    title?: string;
}

const QuizSelectionModal: React.FC<QuizSelectionModalProps> = ({ quizzes, isOpen, onClose, onSelect, title = "Select a Quiz" }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1b26] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-white/10 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Choose the battlefield for your challenge.</p>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search quizzes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white placeholder-gray-500"
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
                                className="group relative flex flex-col p-4 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-[#25263a] rounded-2xl border border-gray-200 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all text-left group hover:shadow-lg hover:shadow-indigo-500/10"
                            >
                                <div className="flex items-start justify-between mb-3 w-full">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                                        {quiz.icon || '📝'}
                                    </div>
                                    <div className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        {quiz.difficulty}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                                    {quiz.title}
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-auto">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil((quiz.timeLimit || 0) / 60)}m</span>
                                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {quiz.questions?.length || 0} Qs</span>
                                </div>

                                <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </button>
                        ))}
                    </div>
                    {filteredQuizzes.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
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
