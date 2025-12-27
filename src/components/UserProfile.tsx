import React from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import { ArrowLeft, Trophy, Clock, TrendingUp, Award } from 'lucide-react';

interface UserProfileProps {
    user: UserData;
    attempts: AttemptData[];
    allUsers: UserData[];
    onBack: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, attempts, allUsers, onBack }) => {
    // Calculate rank
    const sortedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const rank = sortedUsers.findIndex(u => u.userId === user.userId) + 1;

    const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
    const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0;

    const recentAttempts = [...attempts]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 10);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                My Profile
                            </h1>
                            <p className="text-gray-600 mt-1">Track your progress and achievements</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h2>
                            <p className="text-gray-600 mb-4">{user.email}</p>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold">
                                    Rank #{rank}
                                </div>
                                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                                    Member since {new Date(user.createdAt || '').toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-6 h-6 text-yellow-600" />
                            <span className="text-sm font-semibold text-gray-600">Total Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{user.totalScore || 0}</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-6 h-6 text-purple-600" />
                            <span className="text-sm font-semibold text-gray-600">Quizzes Taken</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{user.totalAttempts || 0}</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                            <span className="text-sm font-semibold text-gray-600">Avg Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{avgScore}%</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-6 h-6 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-600">Total Time</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                            {Math.floor(totalTime / 60)}m
                        </div>
                    </div>
                </div>

                {/* Recent Attempts */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">Recent Quiz Attempts</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Quiz</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Score</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Time</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentAttempts.map((attempt) => (
                                    <tr key={attempt.attemptId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">{attempt.quizTitle}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attempt.percentage >= 80
                                                    ? 'bg-green-100 text-green-800'
                                                    : attempt.percentage >= 60
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {recentAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No quiz attempts yet. Start taking quizzes to see your progress!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
