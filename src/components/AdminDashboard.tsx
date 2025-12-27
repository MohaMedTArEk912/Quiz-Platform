import React, { useState } from 'react';
import type { UserData, AttemptData, Quiz } from '../types/index.ts';
import { LogOut, Users, BarChart3, Award, Trash2, Edit2 } from 'lucide-react';
import { supabase, isValidSupabaseConfig } from '../lib/supabase.ts';
import { storage } from '../utils/storage.ts';
import ThemeToggle from './ThemeToggle.tsx';

interface AdminDashboardProps {
    users: UserData[];
    attempts: AttemptData[];
    quizzes: Quiz[];
    onLogout: () => void;
    onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, attempts, onLogout, onRefresh }) => {
    const [selectedTab, setSelectedTab] = useState<'users' | 'attempts'>('users');
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [originalUser, setOriginalUser] = useState<UserData | null>(null);

    const stats = {
        totalUsers: users.length,
        totalAttempts: attempts.length,
        averageScore: attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
            : 0
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        if (isValidSupabaseConfig() && supabase) {
            try {
                await supabase.from('users').delete().eq('userId', userId);
                await supabase.from('attempts').delete().eq('userId', userId);
                onRefresh();
            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete user');
            }
        } else {
            try {
                await storage.set(`user:${userId}`, '', true);
                // Delete attempts
                const attemptsToDelete = attempts.filter(a => a.userId === userId);
                for (const attempt of attemptsToDelete) {
                    await storage.set(`attempt:${attempt.attemptId}`, '', true);
                }
                onRefresh();
            } catch (error) {
                console.error('Delete error:', error);
            }
        }
    };

    const handleUpdateUser = async (user: UserData) => {
        // Normalize email and name
        const normalizedEmail = user.email.toLowerCase().trim();
        const trimmedName = user.name.trim();

        // Check if email is being changed to one that already exists
        if (normalizedEmail !== originalUser?.email.toLowerCase()) {
            if (isValidSupabaseConfig() && supabase) {
                const { data: existingUsers } = await supabase
                    .from('users')
                    .select('email')
                    .ilike('email', normalizedEmail);

                if (existingUsers && existingUsers.length > 0) {
                    alert('This email is already in use by another account.');
                    return;
                }
            }
        }

        // If password field is empty, use the original password
        const updatedUser = {
            ...user,
            name: trimmedName,
            email: normalizedEmail,
            password: user.password && user.password.trim() !== ''
                ? user.password
                : originalUser?.password || user.password
        };

        if (isValidSupabaseConfig() && supabase) {
            try {
                await supabase.from('users').update(updatedUser).eq('userId', user.userId);
                setEditingUser(null);
                setOriginalUser(null);
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                alert('Failed to update user');
            }
        } else {
            try {
                await storage.set(`user:${user.userId}`, JSON.stringify(updatedUser), true);
                setEditingUser(null);
                setOriginalUser(null);
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
            }
        }
    };

    const sortedAttempts = [...attempts].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">Quiz Platform Management</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.averageScore}%</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAttempts}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex border-b border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setSelectedTab('users')}
                            className={`flex-1 px-4 sm:px-6 py-4 font-semibold transition-colors text-sm sm:text-base ${selectedTab === 'users'
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Users Management
                        </button>
                        <button
                            onClick={() => setSelectedTab('attempts')}
                            className={`flex-1 px-4 sm:px-6 py-4 font-semibold transition-colors text-sm sm:text-base ${selectedTab === 'attempts'
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Quiz Attempts
                        </button>
                    </div>

                    <div className="p-4 sm:p-6">
                        {selectedTab === 'users' && (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <table className="w-full min-w-[640px]">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Name</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Total Score</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Attempts</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {users.map((user) => (
                                            <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">{user.totalScore || 0}</span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">{user.totalAttempts || 0}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setOriginalUser({ ...user });
                                                                setEditingUser({ ...user, password: '' });
                                                            }}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="Edit user"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.userId)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {selectedTab === 'attempts' && (
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <table className="w-full min-w-[640px]">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Student</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Quiz</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Score</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {sortedAttempts.map((attempt) => (
                                            <tr key={attempt.attemptId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                                                            {attempt.userName.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{attempt.userName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">{attempt.quizTitle}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attempt.percentage >= 80
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                            : attempt.percentage >= 60
                                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                            }`}
                                                    >
                                                        {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">
                                                    {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                    {new Date(attempt.completedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Edit User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Leave blank to keep current)</span>
                                </label>
                                <input
                                    type="password"
                                    value={editingUser.password || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                    placeholder="Enter new password"
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => {
                                        setEditingUser(null);
                                        setOriginalUser(null);
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateUser(editingUser)}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
