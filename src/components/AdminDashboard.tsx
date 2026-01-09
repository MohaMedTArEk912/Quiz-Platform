import React, { useState, useEffect, useRef } from 'react';

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
    Route,
    Settings,
    Menu,
    Sparkles
} from 'lucide-react';

import type { UserData, Quiz, AttemptData } from '../types/index.ts';
import { api } from '../lib/api.ts';
import ThemeToggle from './ThemeToggle.tsx';
import Avatar from './Avatar.tsx';

// Import Admin Sub-Components
import UserManagement from './admin/UserManagement.tsx';
import QuizManagement from './admin/QuizManagement.tsx';
import ReviewManagement from './admin/ReviewManagement.tsx';
import StudyCardManagement from './admin/StudyCardManagement';
import DailyChallengeManagement from './admin/DailyChallengeManagement.tsx';
import TournamentManagement from './admin/TournamentManagement.tsx';
import BadgeManagement from './admin/BadgeManagement.tsx';
import AttemptsLog from './admin/AttemptsLog.tsx';
import RoadmapManagement from './admin/RoadmapManagement.tsx';
import AiStudio from './admin/AiStudio.tsx';
import AdminSettings from './AdminSettings.tsx';

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
    const [selectedTab, setSelectedTab] = useState<'main' | 'users' | 'attempts' | 'quizzes' | 'reviews' | 'study' | 'daily' | 'tournaments' | 'badges' | 'roadmaps' | 'ai-studio'>('main');
    const [pendingReviews, setPendingReviews] = useState<AttemptData[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [statsCollapsed, setStatsCollapsed] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalQuizzes: 0,
        totalAttempts: 0,
        avgScore: 0
    });
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);


    // --- Effects & Helpers ---
    useEffect(() => {
        calculateStats();
        loadPendingReviews();
    }, [users, quizzes, attempts]);

    // Auto-collapse stats when scrolling down on Main tab
    useEffect(() => {
        const el = mainScrollRef.current;
        if (!el) return;
        const onScroll = () => {
            if (selectedTab !== 'main') return;
            setStatsCollapsed(el.scrollTop > 80);
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [selectedTab]);

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
                { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
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
                <div className="w-full px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 sm:p-2.5 rounded-xl text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight drop-shadow-sm">
                                <span className="hidden sm:inline">Admin </span><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-400">Dashboard</span>
                            </h1>
                            {/* Mobile: Show current tab */}
                            <div className="md:hidden text-xs text-gray-500 dark:text-gray-400 font-medium capitalize">
                                {selectedTab === 'main' && 'Dashboard'}
                                {selectedTab === 'users' && 'User Management'}
                                {selectedTab === 'quizzes' && 'Quiz Management'}
                                {selectedTab === 'badges' && 'Badge Management'}
                                {selectedTab === 'daily' && 'Daily Challenges'}
                                {selectedTab === 'tournaments' && 'Tournaments'}
                                {selectedTab === 'reviews' && 'Reviews'}
                                {selectedTab === 'attempts' && 'Attempts Log'}
                                {selectedTab === 'study' && 'Study Cards'}
                                {selectedTab === 'roadmaps' && 'Roadmaps'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">

                        <ThemeToggle />

                        <div className="flex items-center gap-3 pl-2">
                            <div className="hidden text-right sm:block">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{currentUser.name}</div>
                                <div className="text-xs text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 font-bold">Administrator</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('main')}
                                aria-label="Go to Main Dashboard"
                                title="Go to Main"
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/60 cursor-pointer"
                            >
                                <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#0a0a0b] flex items-center justify-center overflow-hidden">
                                    {currentUser.avatar ? (
                                        <Avatar config={currentUser.avatar} size="md" className="w-full h-full" />
                                    ) : (
                                        <span className="font-bold text-purple-600 dark:text-purple-400">{currentUser.name.charAt(0)}</span>
                                    )}
                                </div>
                            </button>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
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
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar - Desktop */}
                <div className="hidden md:flex w-64 bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5 flex-col py-6">
                    <div className="flex-1 overflow-y-auto px-4 space-y-16 pt-24">
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

                {/* Sidebar - Mobile Drawer */}
                <div className={`md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#13141f] backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5 flex flex-col py-6 z-[95] transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex-1 overflow-y-auto px-4 space-y-16 pt-24">
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
                                                onClick={() => {
                                                    setSelectedTab(item.id as any);
                                                    setIsSidebarOpen(false);
                                                }}
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
                <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50 dark:bg-[#0a0a0b]">
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

                    {/* Header Stats shown only on Main tab */}
                    {selectedTab === 'main' && (
                        <div className={`p-4 sm:p-8 pb-0 transition-all duration-300 ${statsCollapsed ? 'max-h-0 opacity-0 -mt-2' : 'max-h-[1000px] opacity-100'}`}>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                                {[
                                    {
                                        label: 'Total Users',
                                        shortLabel: 'Users',
                                        value: stats.totalUsers,
                                        icon: Users,
                                        color: 'from-blue-500 to-violet-500',
                                        bg: 'bg-blue-500/10',
                                        iconColor: 'text-blue-600 dark:text-blue-400'
                                    },
                                    {
                                        label: 'Total Quizzes',
                                        shortLabel: 'Quizzes',
                                        value: stats.totalQuizzes,
                                        icon: BookOpen,
                                        color: 'from-emerald-500 to-teal-500',
                                        bg: 'bg-emerald-500/10',
                                        iconColor: 'text-emerald-600 dark:text-emerald-400'
                                    },
                                    {
                                        label: 'Total Attempts',
                                        shortLabel: 'Attempts',
                                        value: stats.totalAttempts,
                                        icon: Activity,
                                        color: 'from-orange-500 to-red-500',
                                        bg: 'bg-orange-500/10',
                                        iconColor: 'text-orange-600 dark:text-orange-400'
                                    },
                                    {
                                        label: 'Avg Score',
                                        shortLabel: 'Avg Score',
                                        value: `${stats.avgScore}%`,
                                        icon: Trophy,
                                        color: 'from-amber-400 to-yellow-500',
                                        bg: 'bg-yellow-500/10',
                                        iconColor: 'text-amber-600 dark:text-amber-400'
                                    }
                                ].map((stat, i) => {
                                    const Icon = stat.icon;
                                    return (
                                        <div key={i} className="relative overflow-hidden bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group hover:-translate-y-1 hover:border-white/60 dark:hover:border-white/20">
                                            <div className={`absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-10`} />

                                            <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                                                <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${stat.bg} shadow-inner`}>
                                                    <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.iconColor}`} />
                                                </div>
                                            </div>

                                            <div className="relative z-10">
                                                <div className="text-gray-500 dark:text-gray-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-1 opacity-70">
                                                    <span className="hidden sm:inline">{stat.label}</span>
                                                    <span className="sm:hidden">{stat.shortLabel}</span>
                                                </div>
                                                <div className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300 transition-all">
                                                    {stat.value}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Collapse control */}
                            <div className="flex justify-end -mt-2">
                                <button
                                    type="button"
                                    onClick={() => setStatsCollapsed(!statsCollapsed)}
                                    className="text-xs font-bold px-3 py-1 rounded-lg bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/20"
                                    aria-expanded={!statsCollapsed}
                                >
                                    {statsCollapsed ? 'Show Stats' : 'Hide Stats'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 pt-0 custom-scrollbar">
                        {/* Dynamic Content Rendering */}
                        {selectedTab === 'main' && (
                            <div className="space-y-8">
                                {/* Quick Actions */}
                                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Quick Actions</h2>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Boost your workflow</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                        <button onClick={() => setSelectedTab('quizzes')} className="group flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 border border-white/40 dark:border-white/10 transition-all">
                                            <div className="p-2 rounded-lg bg-purple-500/10">
                                                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">Create or Manage Quizzes</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Add new content</div>
                                            </div>
                                        </button>
                                        <button onClick={() => setSelectedTab('users')} className="group flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 hover:from-blue-500/20 hover:to-violet-500/20 border border-white/40 dark:border-white/10 transition-all">
                                            <div className="p-2 rounded-lg bg-blue-500/10">
                                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">Manage Users</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Roles, access, details</div>
                                            </div>
                                        </button>
                                        <button onClick={() => setSelectedTab('reviews')} className="group flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-white/40 dark:border-white/10 transition-all">
                                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">Review Submissions</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Handle pending reviews</div>
                                            </div>
                                        </button>
                                        <button onClick={() => setSelectedTab('roadmaps')} className="group flex items-center gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400/10 to-yellow-500/10 hover:from-amber-400/20 hover:to-yellow-500/20 border border-white/40 dark:border-white/10 transition-all">
                                            <div className="p-2 rounded-lg bg-amber-400/10">
                                                <Route className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">Roadmaps</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">Organize learning paths</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Engagement Overview */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Engagement Overview</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                            {(() => {
                                                const total = attempts.length || 1;
                                                const passed = attempts.filter(a => a.passed).length;
                                                const passRate = Math.round((passed / total) * 100);
                                                const avgTime = Math.round((attempts.reduce((acc, a) => acc + (a.timeTaken || 0), 0) / total) || 0);
                                                const attemptsToday = attempts.filter(a => {
                                                    try {
                                                        const d = new Date(a.completedAt);
                                                        const now = new Date();
                                                        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                                                    } catch { return false; }
                                                }).length;
                                                const items = [
                                                    { label: 'Pending Reviews', value: pendingReviews.length, color: 'from-orange-500 to-red-500', icon: Check },
                                                    { label: 'Pass Rate', value: `${passRate}%`, color: 'from-emerald-500 to-teal-500', icon: Trophy },
                                                    { label: 'Avg Time', value: `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`, color: 'from-blue-500 to-violet-500', icon: Activity },
                                                    { label: 'Attempts Today', value: attemptsToday, color: 'from-amber-400 to-yellow-500', icon: BarChart3 },
                                                ];
                                                return items.map((s, i) => {
                                                    const Icon = s.icon as any;
                                                    return (
                                                        <div key={i} className="relative overflow-hidden bg-white/60 dark:bg-[#0f1020]/60 backdrop-blur-xl p-4 rounded-xl border border-white/30 dark:border-white/10">
                                                            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${s.color} opacity-[0.06] dark:opacity-[0.1] rounded-bl-full`} />
                                                            <div className="flex items-center justify-between mb-2 relative z-10">
                                                                <div className="p-2 rounded-lg bg-white/50 dark:bg-white/5">
                                                                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                                                </div>
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{s.label}</div>
                                                            <div className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Top Quizzes */}
                                    <div className="lg:col-span-2 bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Quizzes</h3>
                                            <button onClick={() => setSelectedTab('quizzes')} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">View all</button>
                                        </div>
                                        {(() => {
                                            const counts: Record<string, { title: string; attempts: number; avg: number; }> = {};
                                            attempts.forEach(a => {
                                                const key = a.quizId;
                                                const title = a.quizTitle;
                                                const entry = counts[key] || { title, attempts: 0, avg: 0 };
                                                entry.attempts += 1;
                                                entry.avg += a.percentage || 0;
                                                counts[key] = entry;
                                            });
                                            const items = Object.values(counts).map(e => ({
                                                title: e.title,
                                                attempts: e.attempts,
                                                avg: Math.round(e.avg / (e.attempts || 1))
                                            }))
                                                .sort((a, b) => b.attempts - a.attempts)
                                                .slice(0, 6);
                                            if (items.length === 0) {
                                                return <div className="text-sm text-gray-500 dark:text-gray-400">No attempts yet.</div>;
                                            }
                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {items.map((q, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-[#0f1020]/60">
                                                            <div>
                                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{q.title}</div>
                                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{q.attempts} attempts</div>
                                                            </div>
                                                            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Avg {q.avg}%</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Recent Attempts */}
                                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Recent Attempts</h3>
                                        <button onClick={() => setSelectedTab('attempts')} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">Open Log</button>
                                    </div>
                                    {(() => {
                                        const items = [...attempts].sort((a, b) => {
                                            const ad = new Date(a.completedAt).getTime();
                                            const bd = new Date(b.completedAt).getTime();
                                            return bd - ad;
                                        }).slice(0, 6);
                                        const formatDate = (iso?: string) => {
                                            try {
                                                const d = new Date(iso || '');
                                                return d.toLocaleString();
                                            } catch { return iso || ''; }
                                        };
                                        if (items.length === 0) {
                                            return <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</div>;
                                        }
                                        return (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-500 dark:text-gray-400">
                                                            <th className="py-2 pr-4">User</th>
                                                            <th className="py-2 pr-4">Quiz</th>
                                                            <th className="py-2 pr-4">Score</th>
                                                            <th className="py-2 pr-4">Completed</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((a, i) => (
                                                            <tr key={i} className="border-t border-white/40 dark:border-white/10">
                                                                <td className="py-3 pr-4 font-bold text-gray-900 dark:text-white">{a.userName}</td>
                                                                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{a.quizTitle}</td>
                                                                <td className="py-3 pr-4 font-bold text-indigo-600 dark:text-indigo-400">{a.percentage}%</td>
                                                                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatDate(a.completedAt)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
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
                                users={users}
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
                            <StudyCardManagement
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
                        {selectedTab === 'ai-studio' && (
                            <AiStudio
                                adminId={currentUser.userId}
                                onNotification={handleNotification}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <AdminSettings
                    adminEmail={currentUser.email}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
