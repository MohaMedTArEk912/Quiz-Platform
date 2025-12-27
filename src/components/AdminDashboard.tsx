import React, { useState } from 'react';
import type { UserData, AttemptData, Quiz } from '../types/index.ts';
import { LogOut, Users, BarChart3, Award, Trash2, Edit2 } from 'lucide-react';
import { supabase, isValidSupabaseConfig } from '../lib/supabase.ts';
import { storage } from '../utils/storage.ts';

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
        if (isValidSupabaseConfig() && supabase) {
            try {
                await supabase.from('users').update(user).eq('userId', user.userId);
                setEditingUser(null);
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                alert('Failed to update user');
            }
        } else {
            try {
                await storage.set(`user:${user.userId}`, JSON.stringify(user), true);
                setEditingUser(null);
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">Quiz Platform Management</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
                                <div className="text-sm text-gray-600">Total Students</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <BarChart3 className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900">{stats.averageScore}%</div>
                                <div className="text-sm text-gray-600">Average Score</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Award className="w-8 h-8 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</div>
                                <div className="text-sm text-gray-600">Total Attempts</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setSelectedTab('users')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${selectedTab === 'users'
                                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Users Management
                        </button>
                        <button
                            onClick={() => setSelectedTab('attempts')}
                            className={`flex-1 px-6 py-4 font-semibold transition-colors ${selectedTab === 'attempts'
                                ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Quiz Attempts
                        </button>
                    </div>

                    <div className="p-6">
                        {selectedTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Total Score</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Attempts</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map((user) => (
                                            <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-blue-600">{user.totalScore || 0}</span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.totalAttempts || 0}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingUser(user)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.userId)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Quiz</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Score</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Time</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedAttempts.map((attempt) => (
                                            <tr key={attempt.attemptId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                                            {attempt.userName.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{attempt.userName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{attempt.quizTitle}</td>
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
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Edit User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateUser(editingUser)}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                                >
                                    Save
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
