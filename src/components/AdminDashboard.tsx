import React, { useState, useEffect } from 'react';
import type { UserData, AttemptData, Quiz, Question, BadgeDefinition, BadgeCriteria } from '../types/index.ts';
import { LogOut, Users, BarChart3, Award, Trash2, Edit2, Plus, X, Check, Upload, Download, Settings, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api.ts';
import { supabase, isValidSupabaseConfig } from '../lib/supabase.ts';
import { storage } from '../utils/storage.ts';
import ThemeToggle from './ThemeToggle.tsx';
import AdminSettings from './AdminSettings.tsx';

interface AdminDashboardProps {
    users: UserData[];
    attempts: AttemptData[];
    quizzes: Quiz[];
    badges: BadgeDefinition[];
    currentUser: UserData;
    onLogout: () => void;
    onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, attempts, quizzes, badges, currentUser, onLogout, onRefresh }) => {
    const [selectedTab, setSelectedTab] = useState<'users' | 'attempts' | 'quizzes' | 'gamification' | 'reviews'>('users');
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [originalUser, setOriginalUser] = useState<UserData | null>(null);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'questions'>('general');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isquestionFormOpen, setIsQuestionFormOpen] = useState(false);
    const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
    const [pendingReviews, setPendingReviews] = useState<AttemptData[]>([]);
    const [reviewingAttempt, setReviewingAttempt] = useState<AttemptData | null>(null);
    const [reviewFeedback, setReviewFeedback] = useState<Record<string, any>>({});
    const [reviewScores, setReviewScores] = useState<Record<string, number>>({});
    const [showSettings, setShowSettings] = useState(false);
    const [showEditUserPassword, setShowEditUserPassword] = useState(false);

    // Local state for quizzes to enable immediate UI updates
    const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>(quizzes);

    // New states for standardizing UI interaction
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; type: 'quiz' | 'user' | 'badge'; id: string } | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Sync local quizzes with prop changes
    useEffect(() => {
        setLocalQuizzes(quizzes);
    }, [quizzes]);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        if (selectedTab === 'reviews') {
            api.getPendingReviews()
                .then(setPendingReviews)
                .catch(err => console.error('Failed to load reviews', err));
        }
    }, [selectedTab]);


    const stats = {
        totalUsers: users.length,
        totalAttempts: attempts.length,
        averageScore: attempts.length > 0
            ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
            : 0
    };

    const handleDownloadQuiz = (quiz: Quiz) => {
        const dataStr = JSON.stringify(quiz, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${quiz.id || quiz.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setNotification({ type: 'success', message: `Quiz "${quiz.title}" downloaded successfully` });
    };

    const handleDeleteQuiz = (quizId: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'quiz', id: quizId });
    };

    const confirmDeleteQuiz = async () => {
        if (!deleteConfirmation || deleteConfirmation.type !== 'quiz') return;
        try {
            await api.deleteQuiz(deleteConfirmation.id, currentUser.userId);
            // Update local state immediately
            setLocalQuizzes(prev => prev.filter(q => q.id !== deleteConfirmation.id));
            setNotification({ type: 'success', message: 'Quiz deleted successfully' });
            onRefresh();
        } catch (error) {
            console.error('Delete error:', error);
            setNotification({ type: 'error', message: 'Failed to delete quiz' });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleSaveQuiz = async () => {
        if (!editingQuiz) return;

        try {
            if (editingQuiz.id && localQuizzes.some(q => q.id === editingQuiz.id)) {
                await api.updateQuiz(editingQuiz.id, editingQuiz, currentUser.userId);
                // Update local state immediately
                setLocalQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? editingQuiz : q));
                setNotification({ type: 'success', message: 'Quiz updated successfully' });
            } else {
                // Ensure ID is generated if not present (though Backend usually handles ID, our frontend types expect it)
                const newQuiz = { ...editingQuiz, id: editingQuiz.id || crypto.randomUUID() };
                await api.createQuiz(newQuiz, currentUser.userId);
                // Add to local state immediately
                setLocalQuizzes(prev => [...prev, newQuiz]);
                setNotification({ type: 'success', message: 'Quiz created successfully' });
            }
            setEditingQuiz(null);
            onRefresh();
        } catch (error) {
            console.error('Save quiz error:', error);
            setNotification({ type: 'error', message: 'Failed to save quiz' });
        }
    };

    const handleImportQuiz = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const result = await api.importQuizzes(json, currentUser.userId);
                setNotification({ type: 'success', message: result.message || 'Quizzes imported successfully' });
                // Refresh will update localQuizzes via useEffect
                onRefresh();
            } catch (error) {
                console.error('Import error:', error);
                setNotification({ type: 'error', message: 'Failed to import quizzes. Invalid JSON or server error.' });
            }
        };
        reader.readAsText(file);
        // Reset file input
        event.target.value = '';
    };

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        if (!editingQuiz) return;
        const newQuestions = editingQuiz.questions.map(q =>
            q.id === updatedQuestion.id ? updatedQuestion : q
        );
        setEditingQuiz({ ...editingQuiz, questions: newQuestions });
        setEditingQuestion(null);
        setIsQuestionFormOpen(false);
    };

    const handleAddQuestion = (newQuestion: Question) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: [...editingQuiz.questions, newQuestion]
        });
        setIsQuestionFormOpen(false);
    };

    const handleDeleteQuestion = (questionId: number) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: editingQuiz.questions.filter(q => q.id !== questionId)
        });
    };

    const handleDeleteUser = (userId: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'user', id: userId });
    };

    const confirmDeleteUser = async () => {
        if (!deleteConfirmation || deleteConfirmation.type !== 'user') return;

        const userId = deleteConfirmation.id;
        try {
            await api.deleteUser(userId, currentUser.userId);
            setNotification({ type: 'success', message: 'User deleted successfully' });
            onRefresh();
        } catch (error) {
            console.error('Delete user error:', error);
            setNotification({ type: 'error', message: 'Failed to delete user' });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleReviewSubmit = async () => {
        if (!reviewingAttempt) return;

        // Calculate additional points from manual grading
        const additionalPoints = Object.values(reviewScores).reduce((sum, score) => sum + score, 0);

        try {
            await api.submitReview(reviewingAttempt.attemptId, {
                feedback: reviewFeedback,
                scoreAdjustment: additionalPoints
            }, currentUser.userId);

            // Success
            setReviewingAttempt(null);
            setReviewFeedback({});
            setReviewScores({});
            setNotification({ type: 'success', message: 'Review submitted successfully' });
            if (selectedTab === 'reviews') {
                const reviews = await api.getPendingReviews();
                setPendingReviews(reviews);
            }
            onRefresh(); // Refresh main stats
        } catch (error) {
            console.error('Submit review error:', error);
            setNotification({ type: 'error', message: 'Failed to submit review' });
        }
    };

    const getQuizForAttempt = (attempt: AttemptData) => {
        return quizzes.find(q => q.id === attempt.quizId);
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
                    setNotification({ type: 'error', message: 'This email is already in use by another account.' });
                    return;
                }
            }
        }

        // If password field is empty, use the original password
        const updatedUser = {
            ...user,
            name: trimmedName,
            email: normalizedEmail,
            password: (user as any).password && (user as any).password.trim() !== ''
                ? (user as any).password
                : (originalUser as any)?.password || (user as any).password
        };

        if (isValidSupabaseConfig() && supabase) {
            try {
                await supabase.from('users').update(updatedUser).eq('userId', user.userId);
                setEditingUser(null);
                setOriginalUser(null);
                setNotification({ type: 'success', message: 'User updated successfully' });
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                setNotification({ type: 'error', message: 'Failed to update user' });
            }
        } else {
            try {
                await storage.set(`user:${user.userId}`, JSON.stringify(updatedUser), true);
                setEditingUser(null);
                setOriginalUser(null);
                setNotification({ type: 'success', message: 'User updated successfully' });
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                setNotification({ type: 'error', message: 'Failed to update user locally' });
            }
        }
    };

    const sortedAttempts = [...attempts].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    const handleDeleteBadge = (badgeId: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'badge', id: badgeId });
    };

    const confirmDeleteBadge = async () => {
        if (!deleteConfirmation || deleteConfirmation.type !== 'badge') return;
        try {
            await api.deleteBadge(deleteConfirmation.id, currentUser.userId);
            setNotification({ type: 'success', message: 'Badge deleted successfully' });
            onRefresh();
        } catch (error) {
            console.error('Delete badge error:', error);
            setNotification({ type: 'error', message: 'Failed to delete badge' });
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleSaveBadge = async () => {
        if (!editingBadge) return;
        try {
            await api.createBadge(editingBadge, currentUser.userId);
            setEditingBadge(null);
            setNotification({ type: 'success', message: 'Badge saved successfully' });
            onRefresh();
        } catch (error) {
            console.error('Save badge error:', error);
            setNotification({ type: 'error', message: 'Failed to save badge' });
        }
    };

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
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold"
                                title="Admin Settings"
                            >
                                <Settings className="w-5 h-5" />
                                <span className="hidden sm:inline">Settings</span>
                            </button>
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

                {/* Extended Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Quiz Popularity */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quiz Popularity</h3>
                        <div className="space-y-4">
                            {Object.entries(attempts.reduce((acc, attempt) => {
                                acc[attempt.quizTitle] = (acc[attempt.quizTitle] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>))
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5)
                                .map(([title, count], _, arr) => {
                                    const max = arr[0][1];
                                    const percent = (count / max) * 100;
                                    return (
                                        <div key={title}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">{title}</span>
                                                <span className="text-gray-500 dark:text-gray-400">{count} attempts</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                                                <div
                                                    className="bg-purple-600 h-2.5 rounded-full"
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Pass/Fail Rate */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pass vs Fail Rate</h3>
                        <div className="flex items-center justify-center p-4">
                            {(() => {
                                const passed = attempts.filter(a => a.percentage >= 60).length;
                                const failed = attempts.length - passed;
                                const total = attempts.length || 1;
                                const passPercent = Math.round((passed / total) * 100);
                                const failPercent = 100 - passPercent;

                                return (
                                    <div className="w-full max-w-xs space-y-6">
                                        <div className="flex h-8 rounded-full overflow-hidden text-xs font-bold text-white shadow-inner">
                                            <div
                                                className="bg-green-500 flex items-center justify-center transition-all duration-500"
                                                style={{ width: `${passPercent}%` }}
                                            >
                                                {passPercent > 10 && `${passPercent}%`}
                                            </div>
                                            <div
                                                className="bg-red-500 flex items-center justify-center transition-all duration-500"
                                                style={{ width: `${failPercent}%` }}
                                            >
                                                {failPercent > 10 && `${failPercent}%`}
                                            </div>
                                        </div>
                                        <div className="flex justify-around text-center">
                                            <div>
                                                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{passed}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">Passed</div>
                                            </div>
                                            <div>
                                                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{failed}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden grid grid-cols-2 md:flex">
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
                        onClick={() => setSelectedTab('quizzes')}
                        className={`flex-1 px-4 sm:px-6 py-4 font-semibold transition-colors text-sm sm:text-base ${selectedTab === 'quizzes'
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Quiz Management
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
                    <button
                        onClick={() => setSelectedTab('gamification')}
                        className={`flex-1 px-4 sm:px-6 py-4 font-semibold transition-colors text-sm sm:text-base ${selectedTab === 'gamification'
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Gamification
                    </button>
                    <button
                        onClick={() => setSelectedTab('reviews')}
                        className={`flex-1 px-4 sm:px-6 py-4 font-semibold transition-colors text-sm sm:text-base ${selectedTab === 'reviews'
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        Reviews
                        {pendingReviews.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {pendingReviews.length}
                            </span>
                        )}
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
                                                            setEditingUser({ ...user, password: '' } as any);
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

                    {selectedTab === 'quizzes' && (
                        <div>
                            <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Quizzes</h3>
                                <button
                                    onClick={() => {
                                        setEditingQuiz({
                                            id: '',
                                            title: '',
                                            description: '',
                                            timeLimit: 10,
                                            passingScore: 60,
                                            category: 'General',
                                            difficulty: 'Beginner',
                                            icon: 'Code',
                                            questions: []
                                        });
                                        setActiveModalTab('general');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Quiz
                                </button>
                                <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    Import JSON
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={handleImportQuiz}
                                    />
                                </label>
                            </div>
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <table className="w-full min-w-[640px]">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Title</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Category</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Questions</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time Limit</th>
                                            <th className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {localQuizzes.map((quiz) => (
                                            <tr key={quiz.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className="font-medium text-gray-900 dark:text-white">{quiz.title}</span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">{quiz.category}</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                        {quiz.questions.length}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-gray-600 dark:text-gray-400">{quiz.timeLimit} mins</td>
                                                <td className="px-4 sm:px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDownloadQuiz(quiz)}
                                                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                            title="Download as JSON"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingQuiz(quiz)}
                                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="Edit Quiz"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteQuiz(quiz.id)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title="Delete Quiz"
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
                        </div>
                    )}
                </div>

                {selectedTab === 'gamification' && (
                    <div>
                        <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Badges</h3>
                            <button
                                onClick={() => {
                                    setEditingBadge({
                                        id: '',
                                        name: '',
                                        description: '',
                                        icon: 'Trophy',
                                        criteria: { type: 'total_attempts', threshold: 1 }
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Badge
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {badges.map(badge => (
                                <div key={badge.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{badge.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{badge.description}</p>
                                        <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                                            {badge.criteria.type}: {badge.criteria.threshold}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteBadge(badge.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Badge"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {badges.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    No badges defined yet. Create one!
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {
                    editingUser && (
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
                                        <div className="relative">
                                            <input
                                                type={showEditUserPassword ? 'text' : 'password'}
                                                value={(editingUser as any).password || ''}
                                                onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value } as any)}
                                                placeholder="Enter new password"
                                                className="w-full px-4 py-3 pr-10 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                {showEditUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
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
                    )
                }

                {/* Edit Quiz Modal */}
                {
                    editingQuiz && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {editingQuiz.id ? 'Edit Quiz' : 'Create New Quiz'}
                                    </h2>
                                    <button onClick={() => setEditingQuiz(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                                    <button
                                        onClick={() => setActiveModalTab('general')}
                                        className={`pb-3 px-1 font-semibold transition-colors ${activeModalTab === 'general'
                                            ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        General Settings
                                    </button>
                                    <button
                                        onClick={() => setActiveModalTab('questions')}
                                        className={`pb-3 px-1 font-semibold transition-colors ${activeModalTab === 'questions'
                                            ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Questions ({editingQuiz.questions.length})
                                    </button>
                                </div>

                                {activeModalTab === 'general' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                            <input
                                                type="text"
                                                value={editingQuiz.title}
                                                onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                            <textarea
                                                value={editingQuiz.description}
                                                onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Time Limit (mins)</label>
                                                <input
                                                    type="number"
                                                    value={editingQuiz.timeLimit}
                                                    onChange={(e) => setEditingQuiz({ ...editingQuiz, timeLimit: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Passing Score (%)</label>
                                                <input
                                                    type="number"
                                                    value={editingQuiz.passingScore}
                                                    onChange={(e) => setEditingQuiz({ ...editingQuiz, passingScore: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                                                <input
                                                    type="text"
                                                    value={editingQuiz.category}
                                                    onChange={(e) => setEditingQuiz({ ...editingQuiz, category: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                                                <select
                                                    value={editingQuiz.difficulty}
                                                    onChange={(e) => setEditingQuiz({ ...editingQuiz, difficulty: e.target.value })}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                >
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={() => setEditingQuiz(null)}
                                                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveQuiz}
                                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Questions Tab Content */}
                                        {isquestionFormOpen ? (
                                            <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                                        {editingQuestion?.id ? 'Edit Question' : 'New Question'}
                                                    </h3>
                                                    <button
                                                        onClick={() => setIsQuestionFormOpen(false)}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        Back to List
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="md:col-span-1">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                                        <select
                                                            value={editingQuestion?.type || 'multiple-choice'}
                                                            onChange={(e) => setEditingQuestion(curr => curr ? ({ ...curr, type: e.target.value as Question['type'] }) : null)}
                                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        >
                                                            <option value="multiple-choice">Multiple Choice</option>
                                                            <option value="text">Written Answer</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Question Text</label>
                                                        <textarea
                                                            value={editingQuestion?.question || ''}
                                                            onChange={(e) => setEditingQuestion(curr => curr ? ({ ...curr, question: e.target.value }) : null)}
                                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>

                                                {(editingQuestion?.type === 'multiple-choice' || !editingQuestion?.type) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {[0, 1, 2, 3].map((idx) => (
                                                            <div key={idx}>
                                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Option {String.fromCharCode(65 + idx)}</label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editingQuestion?.options?.[idx] || ''}
                                                                        onChange={(e) => {
                                                                            if (!editingQuestion) return;
                                                                            const newOptions = [...(editingQuestion.options || [])];
                                                                            newOptions[idx] = e.target.value;
                                                                            setEditingQuestion({ ...editingQuestion, options: newOptions });
                                                                        }}
                                                                        className={`w-full px-4 py-2 border-2 rounded-xl focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${editingQuestion?.correctAnswer === idx
                                                                            ? 'border-green-500 dark:border-green-500'
                                                                            : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'
                                                                            }`}
                                                                    />
                                                                    <button
                                                                        onClick={() => setEditingQuestion(curr => curr ? ({ ...curr, correctAnswer: idx }) : null)}
                                                                        className={`p-2 rounded-lg transition-colors ${editingQuestion?.correctAnswer === idx
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'
                                                                            }`}
                                                                        title="Mark as correct"
                                                                    >
                                                                        <Check className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Points</label>
                                                        <input
                                                            type="number"
                                                            value={editingQuestion?.points || 10}
                                                            onChange={(e) => setEditingQuestion(curr => curr ? ({ ...curr, points: parseInt(e.target.value) || 0 }) : null)}
                                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Explanation</label>
                                                        <input
                                                            type="text"
                                                            value={editingQuestion?.explanation || ''}
                                                            onChange={(e) => setEditingQuestion(curr => curr ? ({ ...curr, explanation: e.target.value }) : null)}
                                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-4">
                                                    <button
                                                        onClick={() => setIsQuestionFormOpen(false)}
                                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (editingQuestion) {
                                                                if (editingQuestion.id === 0) { // New (using 0 as logic flag for new)
                                                                    const newId = editingQuiz.questions.length > 0
                                                                        ? Math.max(...editingQuiz.questions.map(q => q.id)) + 1
                                                                        : 1;
                                                                    handleAddQuestion({ ...editingQuestion, id: newId });
                                                                } else {
                                                                    handleQuestionUpdate(editingQuestion);
                                                                }
                                                            }
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                                    >
                                                        Save Question
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <button
                                                    onClick={() => {
                                                        setEditingQuestion({
                                                            id: 0, // Flag for new
                                                            type: 'multiple-choice',
                                                            part: 'A', // Default?
                                                            question: '',
                                                            options: ['', '', '', ''],
                                                            correctAnswer: 0,
                                                            explanation: '',
                                                            points: 10
                                                        });
                                                        setIsQuestionFormOpen(true);
                                                    }}
                                                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 dark:hover:border-purple-400 dark:hover:text-purple-400 transition-colors flex items-center justify-center gap-2 font-semibold"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Add New Question
                                                </button>

                                                <div className="space-y-3">
                                                    {editingQuiz.questions.map((q, idx) => (
                                                        <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex justify-between items-center group">
                                                            <div className="flex items-center gap-4">
                                                                <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                                                                    {idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{q.question}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{q.points} points</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingQuestion(q);
                                                                        setIsQuestionFormOpen(true);
                                                                    }}
                                                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {editingQuiz.questions.length === 0 && (
                                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                            No questions yet. Click "Add New Question" above.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Reviews Tab Content */}
                {selectedTab === 'reviews' && (
                    <div className="space-y-6">
                        {!reviewingAttempt ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Pending Reviews</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Attempts waiting for manual grading</p>
                                </div>
                                {pendingReviews.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                        <p>All caught up! No pending reviews.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {pendingReviews.map((attempt) => (
                                            <div key={attempt.attemptId} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{attempt.quizTitle}</h4>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                        <span>User: {attempt.userName}</span>
                                                        <span>•</span>
                                                        <span>Score: {attempt.score} (Provisional)</span>
                                                        <span>•</span>
                                                        <span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setReviewingAttempt(attempt)}
                                                    className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 font-semibold transition-colors"
                                                >
                                                    Review
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Reviewing: {reviewingAttempt.userName}</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">{reviewingAttempt.quizTitle}</p>
                                    </div>
                                    <button
                                        onClick={() => setReviewingAttempt(null)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="p-6 space-y-8">
                                    {(() => {
                                        const quiz = getQuizForAttempt(reviewingAttempt);
                                        if (!quiz) return <div className="text-red-500">Quiz not found for this attempt</div>;

                                        return quiz.questions.map((q, idx) => {
                                            const answer = reviewingAttempt.answers[idx];
                                            // Handle case where answer might be object or simple value
                                            const answerText = typeof answer === 'object' ? (answer as { selected: string | number }).selected : answer;
                                            const isText = q.type === 'text';

                                            if (!isText) return null; // Skip multiple choice for manual review focus (or show them read-only if desired)

                                            // Actually, showing all is better context, but let's focus on text for now or show all
                                            return (
                                                <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
                                                    <div className="mb-2">
                                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Question {idx + 1}</span>
                                                        <p className="mt-1 font-medium text-gray-900 dark:text-white">{q.question}</p>
                                                    </div>

                                                    <div className="mb-4">
                                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User Answer</span>
                                                        <div className="mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                                            {answerText || <span className="italic text-gray-400">No answer provided</span>}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Score (Max: {q.points})</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={q.points}
                                                                value={reviewScores[idx] || 0}
                                                                onChange={(e) => setReviewScores(curr => ({ ...curr, [idx]: parseInt(e.target.value) || 0 }))}
                                                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feedback</label>
                                                            <input
                                                                type="text"
                                                                value={reviewFeedback[idx] || ''}
                                                                onChange={(e) => setReviewFeedback(curr => ({ ...curr, [idx]: e.target.value }))}
                                                                placeholder="Good job! / Needs improvement..."
                                                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
                                    <button
                                        onClick={() => setReviewingAttempt(null)}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReviewSubmit}
                                        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        Submit Grading
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {
                    editingBadge && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Badge</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Internal ID</label>
                                        <input
                                            type="text"
                                            value={editingBadge.id}
                                            onChange={(e) => setEditingBadge({ ...editingBadge, id: e.target.value })}
                                            placeholder="e.g. veteran_1"
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={editingBadge.name}
                                            onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                        <input
                                            type="text"
                                            value={editingBadge.description}
                                            onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                                        <select
                                            value={editingBadge.icon}
                                            onChange={(e) => setEditingBadge({ ...editingBadge, icon: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="Trophy">Trophy</option>
                                            <option value="Star">Star</option>
                                            <option value="Zap">Zap</option>
                                            <option value="Flame">Flame</option>
                                            <option value="Award">Award</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Criteria Type</label>
                                            <select
                                                value={editingBadge.criteria.type}
                                                onChange={(e) => setEditingBadge({
                                                    ...editingBadge,
                                                    criteria: { ...editingBadge.criteria, type: e.target.value as BadgeCriteria['type'] }
                                                })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="total_attempts">Total Attempts</option>
                                                <option value="total_score">Total Score</option>
                                                <option value="streak">Streak</option>
                                                <option value="level">Level</option>
                                                <option value="perfect_score">Perfect Score</option>
                                                <option value="speed_demon">Speed Demon</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Threshold</label>
                                            <input
                                                type="number"
                                                value={editingBadge.criteria.threshold}
                                                onChange={(e) => setEditingBadge({
                                                    ...editingBadge,
                                                    criteria: { ...editingBadge.criteria, threshold: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={() => setEditingBadge(null)}
                                            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveBadge}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                                        >
                                            Save Badge
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg transform transition-all duration-300 z-50 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                    {notification.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    <span className="font-semibold">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Delete {deleteConfirmation.type === 'quiz' ? 'Quiz' : deleteConfirmation.type === 'user' ? 'User' : 'Badge'}?</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (deleteConfirmation.type === 'quiz') confirmDeleteQuiz();
                                        else if (deleteConfirmation.type === 'user') confirmDeleteUser();
                                        else if (deleteConfirmation.type === 'badge') confirmDeleteBadge();
                                    }}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Settings Modal */}
            {showSettings && (
                <AdminSettings
                    adminEmail={currentUser.email}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
