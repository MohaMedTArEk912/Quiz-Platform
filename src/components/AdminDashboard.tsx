import React, { useState, useEffect } from 'react';

import {
    Users,
    BookOpen,
    Trophy,
    Award,
    BarChart3,
    Check,
    Zap,
    LogOut,
    Activity,
    Route
} from 'lucide-react';

import type { UserData, Quiz, AttemptData } from '../types/index.ts';
import { api } from '../lib/api.ts';
import ThemeToggle from './ThemeToggle.tsx';
import Avatar from './Avatar.tsx';

// Import Admin Sub-Components
import UserManagement from './admin/UserManagement.tsx';
import QuizManagement from './admin/QuizManagement.tsx';
import ReviewManagement from './admin/ReviewManagement.tsx';
import StudyManagement from './admin/StudyManagement.tsx';
import DailyChallengeManagement from './admin/DailyChallengeManagement.tsx';
import TournamentManagement from './admin/TournamentManagement.tsx';
import BadgeManagement from './admin/BadgeManagement.tsx';
import AttemptsLog from './admin/AttemptsLog.tsx';
import RoadmapManagement from './admin/RoadmapManagement.tsx';

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
    const [selectedTab, setSelectedTab] = useState<'users' | 'attempts' | 'quizzes' | 'reviews' | 'study' | 'daily' | 'tournaments' | 'badges' | 'roadmaps'>('users');
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
                { id: 'roadmaps', label: 'Roadmaps', icon: Route },
            ]
        }
    ];

    // --- Render Content ---
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#050505] font-['Outfit'] overflow-hidden relative selection:bg-purple-500/30">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-500/20 dark:bg-purple-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/20 dark:bg-indigo-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000" />
            </div>

            {/* Custom Admin Header */}
            <div className="z-40 bg-white/70 dark:bg-[#0a0a0b]/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/10 sticky top-0 shadow-sm dark:shadow-purple-900/10">
                <div className="w-full px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-400">Dashboard</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">

                        <ThemeToggle />

                        <div className="flex items-center gap-3 pl-2">
                            <div className="hidden text-right sm:block">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{currentUser.name}</div>
                                <div className="text-xs text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 font-bold">Administrator</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/20 transition-transform hover:scale-105">
                                <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#0a0a0b] flex items-center justify-center overflow-hidden">
                                    {currentUser.avatar ? (
                                        <Avatar config={currentUser.avatar} size="md" className="w-full h-full" />
                                    ) : (
                                        <span className="font-bold text-purple-600 dark:text-purple-400">{currentUser.name.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden z-10">
                {/* Sidebar */}
                <div className="w-64 bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5 flex flex-col py-6">
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
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-bold group ${isActive
                                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/20'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 hover:shadow-md dark:hover:shadow-black/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'}`} />
                                                    <span>{item.label}</span>
                                                </div>
                                                {item.badge && item.badge > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shadow-red-500/50">
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
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Notification Toast */}
                    {notification && (
                        <div className={`absolute top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 border backdrop-blur-xl ${notification.type === 'success'
                            ? 'bg-emerald-500/90 border-emerald-400/50 text-white shadow-emerald-500/20'
                            : 'bg-red-500/90 border-red-400/50 text-white shadow-red-500/20'
                            }`}>
                            {notification.type === 'success' ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-white/50" />}
                            <span className="font-bold">{notification.message}</span>
                        </div>
                    )}

                    {/* Header Stats */}
                    <div className="p-8 pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            {[
                                {
                                    label: 'Total Users',
                                    value: stats.totalUsers,
                                    icon: Users,
                                    color: 'from-blue-500 to-violet-500',
                                    bg: 'bg-blue-500/10',
                                    iconColor: 'text-blue-600 dark:text-blue-400'
                                },
                                {
                                    label: 'Total Quizzes',
                                    value: stats.totalQuizzes,
                                    icon: BookOpen,
                                    color: 'from-emerald-500 to-teal-500',
                                    bg: 'bg-emerald-500/10',
                                    iconColor: 'text-emerald-600 dark:text-emerald-400'
                                },
                                {
                                    label: 'Total Attempts',
                                    value: stats.totalAttempts,
                                    icon: Activity,
                                    color: 'from-orange-500 to-red-500',
                                    bg: 'bg-orange-500/10',
                                    iconColor: 'text-orange-600 dark:text-orange-400'
                                },
                                {
                                    label: 'Avg Score',
                                    value: `${stats.avgScore}%`,
                                    icon: Trophy,
                                    color: 'from-amber-400 to-yellow-500',
                                    bg: 'bg-yellow-500/10',
                                    iconColor: 'text-amber-600 dark:text-amber-400'
                                }
                            ].map((stat, i) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={i} className="relative overflow-hidden bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group hover:-translate-y-1 hover:border-white/60 dark:hover:border-white/20">
                                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-10`} />

                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <div className={`p-3 rounded-2xl ${stat.bg} shadow-inner`}>
                                                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                                            </div>
                                            {/* Optional Trend Indicator - static for now or calculate dynamic */}
                                            {/* <div className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.bg} text-gray-600 dark:text-gray-300 uppercase tracking-wider`}>+12%</div> */}
                                        </div>

                                        <div className="relative z-10">
                                            <div className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-1 opacity-70">{stat.label}</div>
                                            <div className="text-4xl font-black text-gray-900 dark:text-white bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                                                {stat.value}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
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
                        {selectedTab === 'roadmaps' && (
                            <RoadmapManagement
                                adminId={currentUser.userId}
                                onNotification={handleNotification}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
