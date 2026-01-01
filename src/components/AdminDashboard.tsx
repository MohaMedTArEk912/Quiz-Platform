import React, { useState, useEffect } from 'react';
import {
    Users,
    BookOpen,
    Trophy,
    Award,
    BarChart3,
    Check,
    Zap,
    LogOut
} from 'lucide-react';

import type { UserData, Quiz, AttemptData } from '../types/index.ts';
import { api } from '../lib/api.ts';

// Import Admin Sub-Components
import UserManagement from './admin/UserManagement.tsx';
import QuizManagement from './admin/QuizManagement.tsx';
import ReviewManagement from './admin/ReviewManagement.tsx';
import StudyManagement from './admin/StudyManagement.tsx';
import DailyChallengeManagement from './admin/DailyChallengeManagement.tsx';
import TournamentManagement from './admin/TournamentManagement.tsx';
import BadgeManagement from './admin/BadgeManagement.tsx';
import AttemptsLog from './admin/AttemptsLog.tsx';

// --- Types ---
interface AdminDashboardProps {
    currentUser: UserData;
    users: UserData[];
    quizzes: Quiz[];
    attempts: AttemptData[];
    onRefresh: () => void;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    currentUser,
    users,
    quizzes,
    attempts,
    onRefresh,
    onLogout
}) => {
    // --- State ---
    const [selectedTab, setSelectedTab] = useState<'users' | 'attempts' | 'quizzes' | 'reviews' | 'study' | 'daily' | 'tournaments' | 'badges'>('users');
    const [pendingReviews, setPendingReviews] = useState<AttemptData[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuizzes: 0,
        totalAttempts: 0,
        avgScore: 0
    });
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // --- Effects ---
    useEffect(() => {
        calculateStats();
        loadPendingReviews();
    }, [users, quizzes, attempts]);

    const calculateStats = () => {
        const totalScore = attempts.reduce((acc, curr) => acc + curr.score, 0);
        const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;
        setStats({
            totalUsers: users.length,
            totalQuizzes: quizzes.length,
            totalAttempts: attempts.length,
            avgScore
        });
    };

    const loadPendingReviews = async () => {
        try {
            const reviews = await api.getPendingReviews();
            setPendingReviews(reviews);
        } catch (error) {
            console.error('Failed to load pending reviews:', error);
        }
    };

    const handleNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // Wrapper for refresh that also reloads pending reviews
    const handleRefresh = () => {
        onRefresh();
        loadPendingReviews();
    };

    // --- Navigation Configuration ---
    const navItems = [
        {
            title: 'Overview',
            items: [
                { id: 'users', label: 'Users', icon: Users },
                { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
                { id: 'badges', label: 'Badges', icon: Award },
            ]
        },
        {
            title: 'Engagement',
            items: [
                { id: 'daily', label: 'Daily Challenges', icon: Zap },
                { id: 'tournaments', label: 'Tournaments', icon: Trophy },
                { id: 'reviews', label: 'Reviews', icon: Check, badge: pendingReviews.length },
            ]
        },
        {
            title: 'Content',
            items: [
                { id: 'attempts', label: 'Attempts', icon: BarChart3 },
                { id: 'study', label: 'Study', icon: Zap },
            ]
        }
    ];

    // --- Render Content ---
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black font-['Outfit'] overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white dark:bg-[#13141f] border-r border-gray-200 dark:border-white/5 flex flex-col pt-20 pb-4">
                <div className="flex-1 overflow-y-auto px-4 space-y-6">
                    {navItems.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = selectedTab === item.id;
                                    // @ts-ignore
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedTab(item.id as any)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                                <span className="font-bold">{item.label}</span>
                                            </div>
                                            {item.badge && item.badge > 0 && (
                                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-4 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Notification Toast */}
                {notification && (
                    <div className={`absolute top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                        {notification.type === 'success' ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-white/50" />}
                        <span className="font-bold">{notification.message}</span>
                    </div>
                )}

                {/* Header Stats */}
                <div className="p-8 pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-[#13141f] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Users</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalUsers}</div>
                        </div>
                        <div className="bg-white dark:bg-[#13141f] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Quizzes</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalQuizzes}</div>
                        </div>
                        <div className="bg-white dark:bg-[#13141f] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Attempts</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalAttempts}</div>
                        </div>
                        <div className="bg-white dark:bg-[#13141f] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                            <div className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Avg Score</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.avgScore}%</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-0">
                    {/* Dynamic Content Rendering */}
                    {selectedTab === 'users' && (
                        <UserManagement
                            users={users}
                            currentUser={currentUser}
                            onRefresh={handleRefresh}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'quizzes' && (
                        <QuizManagement
                            quizzes={quizzes}
                            currentUser={currentUser}
                            onRefresh={handleRefresh}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'badges' && (
                        <BadgeManagement
                            adminId={currentUser.userId}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'daily' && (
                        <DailyChallengeManagement
                            currentUser={currentUser}
                            quizzes={quizzes}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'tournaments' && (
                        <TournamentManagement
                            currentUser={currentUser}
                            quizzes={quizzes}
                            onRefresh={handleRefresh}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'reviews' && (
                        <ReviewManagement
                            currentUser={currentUser}
                            quizzes={quizzes}
                            pendingReviews={pendingReviews}
                            onRefresh={handleRefresh}
                            onNotification={handleNotification}
                        />
                    )}
                    {selectedTab === 'attempts' && (
                        <AttemptsLog attempts={attempts} />
                    )}
                    {selectedTab === 'study' && (
                        <StudyManagement
                            currentUser={currentUser}
                            onNotification={handleNotification}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
