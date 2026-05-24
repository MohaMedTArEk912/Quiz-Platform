import React from 'react';
import { Plus, Check, Link2, Unlink, Loader2, Edit, GraduationCap } from 'lucide-react';
import type { Quiz } from '../../../types';

interface RoadQuizzesProps {
    assignedQuizzes: Quiz[];
    availableQuizzes: Quiz[];
    isAssigning: string | null;
    onAssign: (quiz: Quiz, assign: boolean) => Promise<void>;
    onEditQuiz: (quiz: Quiz) => void;
    onCreateQuiz: () => void;
}

const RoadQuizzes: React.FC<RoadQuizzesProps> = ({
    assignedQuizzes,
    availableQuizzes,
    isAssigning,
    onAssign,
    onEditQuiz,
    onCreateQuiz
}) => {
    return (
        <div className="h-full overflow-y-auto space-y-6">
            {/* Assigned Quizzes Section */}
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="p-2 bg-green-500/10 rounded-lg">
                            <Check className="w-5 h-5 text-green-500" />
                        </span>
                        Assigned to This Road ({assignedQuizzes.length})
                    </h3>
                    <button
                        onClick={onCreateQuiz}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Create New Quiz
                    </button>
                </div>
                {assignedQuizzes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No quizzes assigned yet</p>
                        <p className="text-sm">Select quizzes from below to add them</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignedQuizzes.map(quiz => (
                            <div key={quiz.id} className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-800/50 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{quiz.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{quiz.questions?.length || 0} questions</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEditQuiz(quiz)}
                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-colors"
                                        title="Edit quiz"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onAssign(quiz, false)}
                                        disabled={isAssigning === quiz.id}
                                        className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-colors disabled:opacity-50"
                                        title="Remove from this road"
                                    >
                                        {isAssigning === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* All Available Quizzes Section */}
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-indigo-500" />
                    </span>
                    Available Quizzes ({availableQuizzes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableQuizzes.map(quiz => (
                        <div key={quiz.id} className="bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 dark:text-white truncate">{quiz.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {quiz.questions?.length || 0} questions
                                    {quiz.subjectId && <span className="ml-2 text-amber-500">(assigned elsewhere)</span>}
                                </p>
                            </div>
                            <button
                                onClick={() => onAssign(quiz, true)}
                                disabled={isAssigning === quiz.id}
                                className="p-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors disabled:opacity-50"
                                title="Add to this road"
                            >
                                {isAssigning === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                            </button>
                        </div>
                    ))}
                    {availableQuizzes.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-400">
                            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">All quizzes are assigned</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadQuizzes;
