import React from 'react';
import type { Quiz, UserData } from '../types/index.ts';
import { LogOut, User, Trophy, Clock } from 'lucide-react';

interface QuizListProps {
    quizzes: Quiz[];
    user: UserData;
    onSelectQuiz: (quiz: Quiz) => void;
    onViewProfile: () => void;
    onLogout: () => void;
}

const QuizList: React.FC<QuizListProps> = ({ quizzes, user, onSelectQuiz, onViewProfile, onLogout }) => {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-700';
            case 'intermediate': return 'bg-yellow-100 text-yellow-700';
            case 'advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Quiz Platform
                            </h1>
                            <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onViewProfile}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors font-semibold"
                            >
                                <User className="w-5 h-5" />
                                Profile
                            </button>
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Trophy className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{user.totalScore || 0}</div>
                                <div className="text-sm text-gray-600">Total Score</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{user.totalAttempts || 0}</div>
                                <div className="text-sm text-gray-600">Quizzes Taken</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <User className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">#{user.rank || '-'}</div>
                                <div className="text-sm text-gray-600">Global Rank</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quiz Grid */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Quizzes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                            <div
                                key={quiz.id}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer transform hover:scale-105"
                                onClick={() => onSelectQuiz(quiz)}
                            >
                                <div className="text-5xl mb-4">{quiz.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                                <p className="text-gray-600 text-sm mb-4">{quiz.description}</p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(quiz.difficulty)}`}>
                                        {quiz.difficulty}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                        {quiz.questions.length} Questions
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                        {quiz.timeLimit} min
                                    </span>
                                </div>

                                <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all">
                                    Start Quiz
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizList;
