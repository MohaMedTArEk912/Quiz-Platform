import React from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import { Trophy, Clock, TrendingUp, Award } from 'lucide-react';
import Navbar from './Navbar.tsx';

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Navbar
                user={user}
                onBack={onBack}
                showBack={true}
                title="My Profile"
                onViewProfile={() => { }} // Already on profile
                onViewLeaderboard={() => { }} // Navigation handled by parent or could add callback
                onLogout={() => { }} // Logout not needed here usually, or pass prop if needed
                showActions={false}
            />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{user.name}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg font-semibold">
                                    Rank #{rank}
                                </div>
                                <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-semibold">
                                    Member since {new Date(user.createdAt || '').toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{user.totalScore || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quizzes Taken</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{user.totalAttempts || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Avg Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{avgScore}%</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Time</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {Math.floor(totalTime / 60)}m
                        </div>
                    </div>
                </div>

                {/* Recent Attempts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Quiz Attempts</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Quiz</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Score</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recentAttempts.map((attempt) => (
                                    <tr key={attempt.attemptId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{attempt.quizTitle}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attempt.percentage >= 80
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                                    : attempt.percentage >= 60
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                                                    }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {recentAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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
