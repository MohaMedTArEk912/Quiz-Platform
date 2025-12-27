import React from 'react';
import type { Quiz } from '../types/index.ts';
import { Award, RotateCcw, Home, Clock } from 'lucide-react';
import Navbar from './Navbar.tsx';

interface QuizResultsProps {
    result: any;
    quiz: Quiz;
    onBackToQuizzes: () => void;
    onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, onBackToQuizzes, onRetake }) => {
    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col transition-colors">
            <Navbar
                user={{ name: 'User', email: '', userId: '', totalScore: 0, totalAttempts: 0 }} // We might need to pass user prop or fetch from context? App.tsx has currentUser.
                onBack={onBackToQuizzes}
                showBack={true}
                title="Quiz Results"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 transition-colors">
                    <div className="text-center">
                        <Award className={`w-24 h-24 mx-auto mb-6 ${getScoreColor(result.percentage)}`} />
                        <h1 className={`text-4xl font-bold mb-4 ${getScoreColor(result.percentage)}`}>
                            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                        </h1>
                        <div className={`text-6xl font-bold mb-6 ${getScoreColor(result.percentage)}`}>
                            {result.percentage}%
                        </div>
                        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                            You scored {result.score} out of {result.totalQuestions} questions
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                                <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-semibold">Time Taken</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(result.timeTaken)}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                    <Award className="w-5 h-5" />
                                    <span className="font-semibold">Status</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {result.passed ? 'Passed' : 'Failed'}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        {result.percentage >= 80 && (
                            <p className="text-xl text-green-600 mb-6">
                                Excellent! You've mastered this topic! 🌟
                            </p>
                        )}
                        {result.percentage >= 60 && result.percentage < 80 && (
                            <p className="text-xl text-yellow-600 mb-6">
                                Good job! A bit more practice will make you perfect! 💪
                            </p>
                        )}
                        {result.percentage < 60 && (
                            <p className="text-xl text-red-600 mb-6">
                                Don't give up! Review the material and try again! 📚
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={onBackToQuizzes}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                <Home className="w-6 h-6" />
                                Back to Quizzes
                            </button>
                            <button
                                onClick={onRetake}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                            >
                                <RotateCcw className="w-6 h-6" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResults;
