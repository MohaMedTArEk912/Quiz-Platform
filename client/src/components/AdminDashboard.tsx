import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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
    X,
    Home,
    ArrowRight,
    ArrowLeft,
    ShieldAlert,
    Inbox,
    AlertTriangle,
    Layers,
    type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { UserData, Quiz, AttemptData } from '../types/index.ts';
import { api } from '../lib/api.ts';
import ThemeToggle from './ThemeToggle.tsx';
import NotificationCenter from './NotificationCenter.tsx';
import Avatar from './Avatar.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

// Import Admin Sub-Components
import UserManagement from './admin/UserManagement.tsx';
import ReviewManagement from './admin/ReviewManagement.tsx';
import DailyChallengeManagement from './admin/DailyChallengeManagement.tsx';
import TournamentManagement from './admin/TournamentManagement.tsx';
import QuestionAnalyticsManagement from './admin/QuestionAnalyticsManagement.tsx';
import CohortAnalyticsManagement from './admin/CohortAnalyticsManagement.tsx';
import LiveProctoringManagement from './admin/LiveProctoringManagement.tsx';
import BadgeManagement from './admin/BadgeManagement.tsx';
import AttemptDetailsModal from './admin/AttemptDetailsModal.tsx';

import RoadManager from './admin/RoadManager';
import QuizManager from '../pages/QuizManager';
import AdminSettings from './AdminSettings.tsx';
import TrackRequestManagement from './admin/TrackRequestManagement.tsx';

// --- Types ---
type AdminTab = 'main' | 'users' | 'quizzes' | 'road' | 'badges' | 'daily' | 'tournaments' | 'reviews' | 'track-requests' | 'question-analytics' | 'cohort-analytics' | 'live-proctoring';

interface NavItem {
    id: AdminTab;
    label: string;
    icon: LucideIcon;
    badge?: number;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

interface AdminDashboardProps {
    currentUser: UserData;
    users: UserData[];
    quizzes: Quiz[];
    attempts: AttemptData[];
    onRefresh: () => void | Promise<void>;
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
    const navigate = useNavigate();
    const { isBento } = useTheme();

    // --- State ---
    const [selectedTab, setSelectedTab] = useState<AdminTab>('main');
    const [pendingReviews, setPendingReviews] = useState<AttemptData[]>([]);
    const [pendingTrackRequests, setPendingTrackRequests] = useState<number>(0);
    const [selectedAttemptForInspection, setSelectedAttemptForInspection] = useState<AttemptData | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    // --- Effects & Helpers ---
    const stats = useMemo(() => {
        const safeAttempts = Array.isArray(attempts) ? attempts : [];
        const safeUsers = Array.isArray(users) ? users : [];
        const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
        const totalScore = safeAttempts.reduce((acc, curr) => acc + (curr?.score || 0), 0);
        const avgScore = safeAttempts.length > 0 ? Math.round(totalScore / safeAttempts.length) : 0;
        return {
            totalUsers: safeUsers.length,
            totalQuizzes: safeQuizzes.length,
            totalAttempts: safeAttempts.length,
            avgScore
        };
    }, [attempts, users, quizzes]);

    const loadPendingData = useCallback(async () => {
        try {
            const [reviews, trackReqRes] = await Promise.all([
                api.getPendingReviews().catch(() => []),
                api.getTrackRequests('pending', currentUser.userId).catch(() => ({ requests: [] }))
            ]);
            setPendingReviews(Array.isArray(reviews) ? reviews : []);
            setPendingTrackRequests(Array.isArray(trackReqRes?.requests) ? trackReqRes.requests.length : 0);
        } catch (error) {
            console.error('Failed to load pending admin data:', error);
            setPendingReviews([]);
            setPendingTrackRequests(0);
        }
    }, [currentUser.userId]);

    useEffect(() => {
        const refreshTimer = setTimeout(() => {
            loadPendingData();
        }, 0);
        return () => clearTimeout(refreshTimer);
    }, [loadPendingData]);

    const handleNotification = (type: 'success' | 'error' | 'warning', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // Wrapper for refresh that also reloads pending reviews and requests
    const handleRefresh = useCallback(async () => {
        const currentTab = selectedTab;
        await Promise.resolve(onRefresh());
        setSelectedTab(currentTab);
        loadPendingData();
    }, [loadPendingData, onRefresh, selectedTab]);

    // --- Navigation Configuration ---
    const navItems: NavGroup[] = [
        {
            title: 'Overview & Content',
            items: [
                { id: 'users', label: 'Users', icon: Users },
                { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
                { id: 'road', label: 'Roads', icon: Route },
                { id: 'badges', label: 'Badges', icon: Award },
            ]
        },
        {
            title: 'Analytics & Proctoring',
            items: [
                { id: 'live-proctoring', label: 'Live Proctoring', icon: ShieldAlert },
                { id: 'cohort-analytics', label: 'Cohort Intelligence', icon: Layers },
                { id: 'question-analytics', label: 'Error Diagnostics', icon: AlertTriangle },
            ]
        },
        {
            title: 'Engagement',
            items: [
                { id: 'track-requests', label: 'Track Requests', icon: Inbox, badge: pendingTrackRequests },
                { id: 'daily', label: 'Daily Challenges', icon: Zap },
                { id: 'tournaments', label: 'Tournaments', icon: Trophy },
                { id: 'reviews', label: 'Reviews', icon: Check, badge: pendingReviews.length },
            ]
        }
    ];

    const currentTabTitle = useMemo(() => {
        switch (selectedTab) {
            case 'users': return 'User Management';
            case 'quizzes': return 'Quiz Manager';
            case 'live-proctoring': return 'Live Proctoring & Telemetry Monitor';
            case 'cohort-analytics': return 'Student Cohort & Tier Analytics';
            case 'question-analytics': return 'Question Error Analytics';
            case 'road': return 'Roads & Tracks';
            case 'badges': return 'Badge Management';
            case 'track-requests': return 'Track Access Requests';
            case 'daily': return 'Daily Challenges';
            case 'tournaments': return 'Tournaments';
            case 'reviews': return 'Reviews & Grading';
            default: return 'Overview';
        }
    }, [selectedTab]);

    return (
        <div className={`admin-dashboard flex flex-col h-screen font-sans overflow-hidden relative selection:bg-purple-500/30 pt-safe pb-safe pl-safe pr-safe ${
            isBento ? 'bg-transparent text-black' : 'bg-gray-50 dark:bg-[#050505]'
        }`}>
            {/* Ambient Background Glows */}
            {!isBento && (
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-500/15 dark:bg-purple-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/15 dark:bg-indigo-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000" />
                </div>
            )}

            {/* Custom Admin Header - Responsive for all screen sizes */}
            <div className={`z-40 sticky top-0 transition-colors ${
                isBento
                    ? 'bg-white border-b-2 border-black shadow-[0_2px_0px_#000]'
                    : 'bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-2xl border-b border-gray-200/80 dark:border-white/10 shadow-sm dark:shadow-purple-900/10'
            }`}>
                <div className="w-full px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2">
                    {/* Left: Mobile Menu + Branding */}
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`md:hidden p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-gray-50'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                            aria-label="Toggle menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedTab('main')}
                            className="flex items-center gap-2.5 group text-left cursor-pointer min-w-0"
                            title="Go to Admin Overview"
                        >
                            <div className={`p-2 sm:p-2.5 rounded-xl text-white transition-all shrink-0 ${
                                isBento
                                    ? 'bg-[#8b5cf6] border-2 border-black shadow-[2px_2px_0px_#000] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px]'
                                    : 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30 ring-1 ring-white/20 group-hover:scale-105'
                            }`}>
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-lg font-black tracking-tight truncate">
                                    <span className="hidden sm:inline text-gray-900 dark:text-white">Admin </span>
                                    <span className={isBento ? 'text-black font-mono' : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-400'}>
                                        Dashboard
                                    </span>
                                </h1>
                                <div className={`md:hidden text-[10px] font-bold uppercase tracking-wider truncate ${
                                    isBento ? 'text-black/60 font-mono' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    {currentTabTitle}
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        {/* Switch to Student / Home View */}
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 font-mono'
                                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm hover:scale-105 active:scale-95'
                            }`}
                            title="Switch to Student / Home View"
                        >
                            <Home className="w-4 h-4" />
                            <span className="hidden sm:inline">Student View</span>
                        </button>

                        <NotificationCenter currentUser={currentUser} />
                        <ThemeToggle />

                        {/* Admin Info (Desktop only) */}
                        <div className={`hidden lg:flex items-center gap-2 pl-2 border-l ${
                            isBento ? 'border-black/20' : 'border-gray-200 dark:border-white/10'
                        }`}>
                            <div className="text-right">
                                <div className={`text-xs font-bold leading-tight truncate max-w-[120px] ${
                                    isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                }`}>
                                    {currentUser?.name || currentUser?.userId || 'Admin'}
                                </div>
                                <div className={`text-[10px] font-black tracking-wider uppercase ${
                                    isBento
                                        ? 'text-black/60 font-mono'
                                        : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400'
                                }`}>
                                    Administrator
                                </div>
                            </div>
                        </div>

                        {/* Admin Avatar Button */}
                        <button
                            type="button"
                            onClick={() => setSelectedTab('main')}
                            aria-label="Go to Main Dashboard"
                            title="Go to Main Overview"
                            className={`hidden sm:block w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all cursor-pointer overflow-hidden ${
                                isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                    : 'bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-md shadow-purple-500/20 hover:scale-105'
                            }`}
                        >
                            <div className={`w-full h-full rounded-[9px] flex items-center justify-center overflow-hidden ${
                                isBento ? 'bg-[#fde047]' : 'bg-white dark:bg-[#0a0a0b]'
                            }`}>
                                {currentUser?.avatar ? (
                                    <Avatar config={currentUser.avatar} size="sm" className="w-full h-full" />
                                ) : (
                                    <span className={`font-bold text-xs ${
                                        isBento ? 'text-black font-mono' : 'text-purple-600 dark:text-purple-400'
                                    }`}>
                                        {(currentUser?.name || currentUser?.userId || 'A').charAt(0)}
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:scale-105 active:scale-95'
                            }`}
                            title="Admin Settings"
                            aria-label="Admin Settings"
                        >
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Prominent Header Logout Button */}
                        <button
                            onClick={() => setIsLogoutConfirmOpen(true)}
                            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer font-bold text-xs ${
                                isBento
                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 font-mono'
                                    : 'text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:scale-105 active:scale-95'
                            }`}
                            title="Log Out of Admin"
                            aria-label="Log Out of Admin"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden z-10">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden animate-in fade-in duration-200"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar - Desktop */}
                <div className={`hidden md:flex w-72 shrink-0 flex-col py-4 transition-all duration-200 ${
                    isBento
                        ? 'bg-white border-r-2 border-black'
                        : 'bg-white/95 dark:bg-[#0c0d14]/95 backdrop-blur-xl border-r border-gray-200/80 dark:border-white/5'
                }`}>
                    <div className="flex-1 overflow-y-auto px-3.5 space-y-5 custom-scrollbar">
                        {navItems.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                <h3 className={`px-3 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${
                                    isBento
                                        ? 'text-black/60 font-mono'
                                        : 'text-gray-400 dark:text-gray-500 opacity-70'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isBento ? 'bg-black' : 'bg-indigo-500'
                                    }`} />
                                    <span className="truncate">{group.title}</span>
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = selectedTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedTab(item.id)}
                                                className={`w-full h-11 flex items-center justify-between px-3.5 py-2 rounded-2xl transition-all duration-200 font-bold group relative cursor-pointer ${
                                                    isActive
                                                        ? isBento
                                                            ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                                                        : isBento
                                                            ? 'text-black hover:bg-[#fde047] hover:border-black hover:shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 border-2 border-transparent'
                                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1">
                                                    <div className={`p-1.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                                                        isActive
                                                            ? isBento
                                                                ? 'bg-black text-white border border-black shadow-[1px_1px_0px_#000]'
                                                                : 'bg-white/20 text-white'
                                                            : isBento
                                                                ? 'bg-black/5 text-black group-hover:bg-black group-hover:text-white group-hover:border group-hover:border-black group-hover:shadow-[1px_1px_0px_#000]'
                                                                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 dark:group-hover:bg-purple-500/10 dark:group-hover:text-purple-400'
                                                    }`}>
                                                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" />
                                                    </div>
                                                    <span className={`text-xs uppercase tracking-wider font-black whitespace-nowrap text-left truncate ${
                                                        isBento ? 'font-mono' : ''
                                                    }`}>{item.label}</span>
                                                </div>

                                                {item.badge && item.badge > 0 && (
                                                    <span className={`relative z-10 text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0 ml-2 ${
                                                        isBento
                                                            ? isActive
                                                                ? 'bg-white text-black border border-black'
                                                                : 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                            : isActive
                                                                ? 'bg-white text-purple-600 shadow-sm'
                                                                : 'bg-purple-600 text-white'
                                                    }`}>
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

                    {/* Bottom Actions (Desktop) */}
                    <div className={`p-4 border-t space-y-2 mt-auto ${
                        isBento ? 'border-black/20' : 'border-gray-200/60 dark:border-white/5'
                    }`}>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={`w-full h-11 flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all font-black text-xs uppercase tracking-wider group cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 font-mono'
                                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}
                            title="Switch to Student / Home View"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-xl group-hover:scale-110 transition-transform shrink-0 ${
                                    isBento
                                        ? 'bg-black text-white border border-black shadow-[1px_1px_0px_#000]'
                                        : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                }`}>
                                    <Home className="w-4 h-4" />
                                </div>
                                <span className="whitespace-nowrap truncate">Student App</span>
                            </div>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                        </button>
                    </div>
                </div>

                {/* Sidebar - Mobile Drawer with Smooth Animation & Easy Logout */}
                <div className={`md:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] flex flex-col z-[95] transform transition-transform duration-300 ease-out shadow-2xl pt-safe pb-safe ${
                    isBento
                        ? 'bg-white border-r-2 border-black'
                        : 'bg-white dark:bg-[#0d0e17] backdrop-blur-2xl border-r border-gray-200 dark:border-white/10'
                } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Drawer Header */}
                    <div className={`p-5 border-b flex items-center justify-between ${
                        isBento ? 'border-black/20' : 'border-gray-200/50 dark:border-white/10'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl p-0.5 shadow-md ${
                                isBento ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                            }`}>
                                <div className={`w-full h-full rounded-[14px] flex items-center justify-center overflow-hidden ${
                                    isBento ? 'bg-[#fde047]' : 'bg-white dark:bg-[#0a0a0b]'
                                }`}>
                                    {currentUser?.avatar ? (
                                        <Avatar config={currentUser.avatar} size="md" className="w-full h-full" />
                                    ) : (
                                        <span className={`font-bold text-sm ${
                                            isBento ? 'text-black font-mono' : 'text-purple-600 dark:text-purple-400'
                                        }`}>
                                            {(currentUser?.name || currentUser?.userId || 'A').charAt(0)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className={`text-sm font-black truncate ${
                                    isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                }`}>
                                    {currentUser?.name || 'Admin'}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest ${
                                    isBento ? 'text-black/60 font-mono' : 'text-purple-600 dark:text-purple-400'
                                }`}>
                                    Administrator
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-gray-50'
                                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Drawer Navigation List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                        {/* Main Overview button */}
                        <button
                            onClick={() => {
                                setSelectedTab('main');
                                setIsSidebarOpen(false);
                            }}
                            className={`w-full h-11 flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 font-black uppercase tracking-wider text-xs cursor-pointer ${
                                selectedTab === 'main'
                                    ? isBento
                                        ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30'
                                    : isBento
                                        ? 'text-black hover:bg-[#fde047] hover:border-black hover:shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 border-2 border-transparent'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Trophy className="w-5 h-5 shrink-0" />
                                <span className="whitespace-nowrap truncate">Dashboard Overview</span>
                            </div>
                        </button>

                        {navItems.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                <h3 className={`px-3 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${
                                    isBento ? 'text-black/60 font-mono' : 'text-gray-400 dark:text-gray-500 opacity-70'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isBento ? 'bg-black' : 'bg-indigo-500'
                                    }`} />
                                    <span className="truncate">{group.title}</span>
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = selectedTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedTab(item.id);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={`w-full h-11 flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 font-bold group relative cursor-pointer ${
                                                    isActive
                                                        ? isBento
                                                            ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30'
                                                        : isBento
                                                            ? 'text-black hover:bg-[#fde047] hover:border-black hover:shadow-[2px_2px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 border-2 border-transparent'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={`p-1.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                                                        isActive
                                                            ? isBento
                                                                ? 'bg-black text-white border border-black shadow-[1px_1px_0px_#000]'
                                                                : 'bg-white/20 text-white'
                                                            : isBento
                                                                ? 'bg-black/5 text-black group-hover:bg-black group-hover:text-white group-hover:border group-hover:border-black group-hover:shadow-[1px_1px_0px_#000]'
                                                                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                        <Icon className="w-4 h-4 shrink-0" />
                                                    </div>
                                                    <span className={`text-xs uppercase tracking-wider font-black whitespace-nowrap text-left truncate ${
                                                        isBento ? 'font-mono' : ''
                                                    }`}>{item.label}</span>
                                                </div>

                                                {item.badge && item.badge > 0 && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0 ml-2 ${
                                                        isBento
                                                            ? isActive
                                                                ? 'bg-white text-black border border-black'
                                                                : 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                            : isActive
                                                                ? 'bg-white text-purple-600 shadow-sm'
                                                                : 'bg-purple-600 text-white'
                                                    }`}>
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

                    {/* Bottom Drawer Actions with Prominent Logout */}
                    <div className={`p-4 border-t space-y-2.5 mt-auto ${
                        isBento ? 'border-black/20 bg-white' : 'border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-black/20'
                    }`}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSidebarOpen(false);
                                navigate('/');
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all font-black text-xs uppercase tracking-wider group cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] font-mono'
                                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Home className="w-4 h-4" />
                                <span>Switch to Student App</span>
                            </div>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsSidebarOpen(false);
                                setIsSettingsOpen(true);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all font-black text-xs uppercase tracking-wider cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] font-mono'
                                    : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Settings className="w-4 h-4" />
                                <span>Admin Settings</span>
                            </div>
                        </button>

                        {/* Prominent Big Logout Button in Mobile Drawer */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSidebarOpen(false);
                                setIsLogoutConfirmOpen(true);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-wider cursor-pointer ${
                                isBento
                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] font-mono'
                                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/25'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <LogOut className="w-4 h-4" />
                                <span>Log Out of Admin</span>
                            </div>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${
                    isBento ? 'bg-transparent' : 'bg-gray-50 dark:bg-[#0a0a0b]'
                }`}>
                    {/* Notification Toast */}
                    {notification && (
                        <div className={`absolute top-4 right-4 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 border ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000] text-black font-mono font-bold'
                                : notification.type === 'success'
                                    ? 'bg-emerald-500/95 border-emerald-400/50 text-white shadow-emerald-500/20 backdrop-blur-xl'
                                    : notification.type === 'warning'
                                        ? 'bg-amber-500/95 border-amber-400/50 text-white shadow-amber-500/20 backdrop-blur-xl'
                                        : 'bg-red-500/95 border-red-400/50 text-white shadow-red-500/20 backdrop-blur-xl'
                        }`}>
                            {notification.type === 'success' ? (
                                <Check className={`w-5 h-5 shrink-0 ${isBento ? 'text-black' : 'text-white'}`} />
                            ) : notification.type === 'warning' ? (
                                <div className="w-5 h-5 flex items-center justify-center font-bold shrink-0">!</div>
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-white/50 shrink-0" />
                            )}
                            <span className="font-bold text-xs sm:text-sm">{notification.message}</span>
                        </div>
                    )}

                    <div
                        ref={mainScrollRef}
                        className="flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto custom-scrollbar"
                    >
                        {/* Universal Top Tab Breadcrumb / Return to Overview (for any active tab) */}
                        {selectedTab !== 'main' && (
                            <div className={`flex items-center justify-between gap-3 p-3 sm:p-4 mb-4 sm:mb-6 rounded-2xl animate-in slide-in-from-top-2 ${
                                isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-white/80 dark:bg-[#13141f]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-sm'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTab('main')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] font-mono'
                                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm'
                                    }`}
                                    title="Return to Admin Overview"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>← Overview</span>
                                </button>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isBento ? 'bg-black' : 'bg-purple-500 animate-pulse'}`} />
                                    <span className={`text-xs sm:text-sm font-black uppercase tracking-wider truncate ${
                                        isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {currentTabTitle}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Dynamic Content Rendering */}
                        {selectedTab === 'main' && (
                            <div className="space-y-4 sm:space-y-8">
                                {/* Top Stats Overview Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                                    {[
                                        {
                                            label: 'Total Users',
                                            shortLabel: 'Users',
                                            value: stats.totalUsers,
                                            icon: Users,
                                            color: 'from-blue-500 to-violet-500',
                                            bg: 'bg-blue-500/10',
                                            iconColor: 'text-blue-600 dark:text-blue-400',
                                            bentoBg: 'bg-[#93c5fd]',
                                        },
                                        {
                                            label: 'Total Quizzes',
                                            shortLabel: 'Quizzes',
                                            value: stats.totalQuizzes,
                                            icon: BookOpen,
                                            color: 'from-emerald-500 to-teal-500',
                                            bg: 'bg-emerald-500/10',
                                            iconColor: 'text-emerald-600 dark:text-emerald-400',
                                            bentoBg: 'bg-[#86efac]',
                                        },
                                        {
                                            label: 'Total Attempts',
                                            shortLabel: 'Attempts',
                                            value: stats.totalAttempts,
                                            icon: Activity,
                                            color: 'from-orange-500 to-red-500',
                                            bg: 'bg-orange-500/10',
                                            iconColor: 'text-orange-600 dark:text-orange-400',
                                            bentoBg: 'bg-[#fdba74]',
                                        },
                                        {
                                            label: 'Avg Score',
                                            shortLabel: 'Avg Score',
                                            value: `${stats.avgScore}%`,
                                            icon: Trophy,
                                            color: 'from-amber-400 to-yellow-500',
                                            bg: 'bg-yellow-500/10',
                                            iconColor: 'text-amber-600 dark:text-amber-400',
                                            bentoBg: 'bg-[#fde047]',
                                        }
                                    ].map((stat, i) => {
                                        const Icon = stat.icon;
                                        return (
                                            <div
                                                key={i}
                                                className={`relative overflow-hidden p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 group hover:-translate-y-0.5 ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                                                        : 'bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-purple-500/10'
                                                }`}
                                            >
                                                {!isBento && (
                                                    <div className={`absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-10`} />
                                                )}

                                                <div className="flex items-center justify-between mb-2 sm:mb-4 relative z-10">
                                                    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-transform group-hover:scale-105 ${
                                                        isBento
                                                            ? `${stat.bentoBg} text-black border-2 border-black shadow-[2px_2px_0px_#000]`
                                                            : `${stat.bg} shadow-inner`
                                                    }`}>
                                                        <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${isBento ? 'text-black' : stat.iconColor}`} />
                                                    </div>
                                                </div>

                                                <div className="relative z-10">
                                                    <div className={`font-bold text-[10px] sm:text-xs uppercase tracking-wider mb-0.5 sm:mb-1 ${
                                                        isBento ? 'text-black font-mono font-black' : 'text-gray-500 dark:text-gray-400 opacity-70'
                                                    }`}>
                                                        <span className="hidden sm:inline">{stat.label}</span>
                                                        <span className="sm:hidden">{stat.shortLabel}</span>
                                                    </div>
                                                    <div className={`text-xl sm:text-4xl font-black transition-all ${
                                                        isBento
                                                            ? 'text-black font-mono'
                                                            : 'text-gray-900 dark:text-white bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 dark:group-hover:from-white dark:group-hover:to-gray-300'
                                                    }`}>
                                                        {stat.value}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Quick Actions */}
                                <div className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
                                    isBento
                                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                                        : 'bg-white/60 dark:bg-[#13141f]/60 border border-white/40 dark:border-white/5 shadow-sm'
                                }`}>
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <h2 className={`text-base sm:text-xl font-black ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>Quick Actions</h2>
                                        <span className={`text-xs ${isBento ? 'text-black font-mono' : 'text-gray-500 dark:text-gray-400'}`}>Boost your workflow</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                                        {([
                                            { tab: 'road' as AdminTab, label: 'Review Roads', desc: 'Manage content', icon: BookOpen, bentoBg: 'bg-[#c4b5fd]', normalBg: 'from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20', iconColor: 'text-purple-600 dark:text-purple-400', iconBox: 'bg-purple-500/10' },
                                            { tab: 'users' as AdminTab, label: 'Manage Users', desc: 'Roles, access, details', icon: Users, bentoBg: 'bg-[#93c5fd]', normalBg: 'from-blue-500/10 to-violet-500/10 hover:from-blue-500/20 hover:to-violet-500/20', iconColor: 'text-blue-600 dark:text-blue-400', iconBox: 'bg-blue-500/10' },
                                            { tab: 'reviews' as AdminTab, label: 'Review Work', desc: 'Handle submissions', icon: Check, bentoBg: 'bg-[#86efac]', normalBg: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400', iconBox: 'bg-emerald-500/10' },
                                            { tab: 'quizzes' as AdminTab, label: 'Quiz Bank', desc: 'Manage quizzes', icon: Zap, bentoBg: 'bg-[#fde047]', normalBg: 'from-amber-400/10 to-yellow-500/10 hover:from-amber-400/20 hover:to-yellow-500/20', iconColor: 'text-amber-600 dark:text-amber-400', iconBox: 'bg-amber-400/10' },
                                        ]).map((action, idx) => {
                                            const ActionIcon = action.icon;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedTab(action.tab)}
                                                    className={`group flex items-center gap-2.5 sm:gap-3 w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer ${
                                                        isBento
                                                            ? 'bg-white hover:bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                                            : `bg-gradient-to-br ${action.normalBg} border border-white/40 dark:border-white/10 hover:scale-[1.02]`
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-lg shrink-0 ${
                                                        isBento
                                                            ? `${action.bentoBg} text-black border-2 border-black shadow-[1px_1px_0px_#000]`
                                                            : action.iconBox
                                                    }`}>
                                                        <ActionIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isBento ? 'text-black' : action.iconColor} group-hover:scale-110 transition-transform`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`text-xs sm:text-sm font-bold truncate ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{action.label}</div>
                                                        <div className={`text-[10px] sm:text-[11px] truncate ${isBento ? 'text-gray-600 font-mono' : 'text-gray-500 dark:text-gray-400'}`}>{action.desc}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Engagement Overview */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                    <div className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
                                        isBento
                                            ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                                            : 'bg-white/60 dark:bg-[#13141f]/60 border border-white/40 dark:border-white/5 shadow-sm'
                                    }`}>
                                        <h3 className={`text-sm font-bold mb-3 sm:mb-4 ${isBento ? 'text-black font-mono font-black' : 'text-gray-900 dark:text-white'}`}>Engagement Overview</h3>
                                        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                                            {(() => {
                                                const safeAttempts = Array.isArray(attempts) ? attempts : [];
                                                const total = safeAttempts.length || 1;
                                                const passed = safeAttempts.filter(a => a?.passed).length;
                                                const passRate = safeAttempts.length > 0 ? Math.round((passed / total) * 100) : 0;
                                                const avgTime = Math.round((safeAttempts.reduce((acc, a) => acc + (a?.timeTaken || 0), 0) / total) || 0);
                                                const attemptsToday = safeAttempts.filter(a => {
                                                    if (!a?.completedAt) return false;
                                                    try {
                                                        const d = new Date(a.completedAt);
                                                        const now = new Date();
                                                        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                                                    } catch { return false; }
                                                }).length;
                                                const items = [
                                                    { label: 'Pending Reviews', value: pendingReviews.length, color: 'from-orange-500 to-red-500', icon: Check, bentoBg: 'bg-[#fdba74]' },
                                                    { label: 'Pass Rate', value: `${passRate}%`, color: 'from-emerald-500 to-teal-500', icon: Trophy, bentoBg: 'bg-[#86efac]' },
                                                    { label: 'Avg Time', value: `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`, color: 'from-blue-500 to-violet-500', icon: Activity, bentoBg: 'bg-[#93c5fd]' },
                                                    { label: 'Attempts Today', value: attemptsToday, color: 'from-amber-400 to-yellow-500', icon: BarChart3, bentoBg: 'bg-[#fde047]' },
                                                ];
                                                return items.map((s, i) => {
                                                    const Icon = s.icon;
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`relative overflow-hidden p-3 sm:p-4 rounded-xl ${
                                                                isBento
                                                                    ? 'bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'bg-white/60 dark:bg-[#0f1020]/60 backdrop-blur-xl border border-white/30 dark:border-white/10'
                                                            }`}
                                                        >
                                                            {!isBento && (
                                                                <div className={`absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${s.color} opacity-[0.06] dark:opacity-[0.1] rounded-bl-full`} />
                                                            )}
                                                            <div className="flex items-center justify-between mb-1.5 relative z-10">
                                                                <div className={`p-1.5 sm:p-2 rounded-lg ${
                                                                    isBento
                                                                        ? `${s.bentoBg} text-black border border-black`
                                                                        : 'bg-white/50 dark:bg-white/5'
                                                                }`}>
                                                                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isBento ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`} />
                                                                </div>
                                                            </div>
                                                            <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${
                                                                isBento ? 'text-black font-mono' : 'text-gray-500 dark:text-gray-400'
                                                            }`}>{s.label}</div>
                                                            <div className={`text-lg sm:text-2xl font-black ${
                                                                isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                                            }`}>{s.value}</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Top Quizzes */}
                                    <div className={`lg:col-span-2 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
                                        isBento
                                            ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                                            : 'bg-white/60 dark:bg-[#13141f]/60 border border-white/40 dark:border-white/5 shadow-sm'
                                    }`}>
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <h3 className={`text-sm font-bold ${isBento ? 'text-black font-mono font-black' : 'text-gray-900 dark:text-white'}`}>Top Quizzes</h3>
                                            <button
                                                onClick={() => setSelectedTab('quizzes')}
                                                className={`text-xs font-bold cursor-pointer hover:underline ${
                                                    isBento ? 'text-black font-mono underline font-black' : 'text-purple-600 dark:text-purple-400'
                                                }`}
                                            >
                                                View all
                                            </button>
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
                                                return <div className={`text-sm py-6 text-center ${isBento ? 'text-black font-mono' : 'text-gray-500 dark:text-gray-400'}`}>No attempts yet.</div>;
                                            }
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                                    {items.map((q, i) => (
                                                        <div
                                                            key={i}
                                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                                                isBento
                                                                    ? 'bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'border border-white/40 dark:border-white/10 bg-white/60 dark:bg-[#0f1020]/60'
                                                            }`}
                                                        >
                                                            <div className="min-w-0 flex-1 pr-2">
                                                                <div className={`text-xs sm:text-sm font-bold truncate ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{q.title}</div>
                                                                <div className={`text-[10px] sm:text-[11px] ${isBento ? 'text-gray-600 font-mono' : 'text-gray-500 dark:text-gray-400'}`}>{q.attempts} attempts</div>
                                                            </div>
                                                            <div className={`text-xs sm:text-sm font-bold shrink-0 ${isBento ? 'text-black font-mono font-black' : 'text-indigo-600 dark:text-indigo-400'}`}>Avg {q.avg}%</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Recent Attempts */}
                                <div className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
                                    isBento
                                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                                        : 'bg-white/60 dark:bg-[#13141f]/60 border border-white/40 dark:border-white/5 shadow-sm'
                                }`}>
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <h3 className={`text-base sm:text-xl font-black ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>Recent Attempts</h3>
                                        <span className={`text-xs font-bold ${isBento ? 'text-black font-mono' : 'text-gray-400 dark:text-gray-500'}`}>Latest Activity</span>
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
                                            return (
                                                <div className="py-8 text-center opacity-40">
                                                    <Activity className="w-8 h-8 mx-auto mb-2" />
                                                    <p className="text-xs font-black uppercase tracking-widest">No recent pulse activity</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                                {items.map((a, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setSelectedAttemptForInspection(a)}
                                                        className={`flex flex-col p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl transition-all group cursor-pointer ${
                                                            isBento
                                                                ? 'bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                                                : 'bg-gray-50/50 dark:bg-black/20 border border-white/5 hover:border-indigo-500/30 hover:scale-[1.02] shadow-sm'
                                                        }`}
                                                        title="Click to inspect question-by-question breakdown"
                                                    >
                                                        <div className="flex justify-between items-start mb-2.5">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                                                                    isBento
                                                                        ? 'bg-[#c4b5fd] text-black border border-black'
                                                                        : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'
                                                                }`}>
                                                                    {(a.userName || 'S').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className={`text-xs font-black uppercase tracking-tight truncate max-w-[120px] ${
                                                                        isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                                                    }`}>{a.userName || 'Student'}</div>
                                                                    <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                                                                        isBento ? 'text-gray-500 font-mono' : 'text-gray-400'
                                                                    }`}>{formatDate(a.completedAt).split(',')[0]}</div>
                                                                </div>
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                                                                isBento
                                                                    ? (a.percentage || 0) >= 70
                                                                        ? 'bg-[#86efac] text-black border border-black font-mono'
                                                                        : 'bg-[#fecdd3] text-black border border-black font-mono'
                                                                    : (a.percentage || 0) >= 70
                                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                                        : 'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                {a.percentage || 0}%
                                                            </div>
                                                        </div>
                                                        <div className={`text-[11px] font-bold uppercase tracking-tight line-clamp-1 ${
                                                            isBento ? 'text-black font-mono' : 'text-gray-600 dark:text-gray-300'
                                                        }`}>{a.quizTitle || 'Quiz'}</div>
                                                        <div className={`mt-2 text-[9px] font-black uppercase flex items-center gap-1 ${
                                                            isBento
                                                                ? 'text-black font-mono opacity-80 group-hover:opacity-100'
                                                                : 'text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity'
                                                        }`}>
                                                            <span>Inspect student answers →</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                        {selectedTab === 'users' && (
                            <UserManagement
                                users={users}
                                attempts={attempts}
                                currentUser={currentUser}
                                onRefresh={handleRefresh}
                                onNotification={handleNotification}
                            />
                        )}

                        {selectedTab === 'quizzes' && (
                            <QuizManager
                                currentUser={currentUser}
                                onRefresh={handleRefresh}
                                onNotification={handleNotification}
                                quizzes={quizzes}
                            />
                        )}

                        {selectedTab === 'question-analytics' && (
                            <QuestionAnalyticsManagement
                                currentUser={currentUser}
                                quizzes={quizzes}
                                onNotification={handleNotification}
                            />
                        )}

                        {selectedTab === 'cohort-analytics' && (
                            <CohortAnalyticsManagement
                                onNotification={handleNotification}
                            />
                        )}

                        {selectedTab === 'live-proctoring' && (
                            <LiveProctoringManagement
                                onInspectAttempt={(att) => setSelectedAttemptForInspection(att)}
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

                        {selectedTab === 'road' && (
                            <RoadManager
                                currentUser={currentUser}
                                onNotification={handleNotification}
                            />
                        )}

                        {selectedTab === 'track-requests' && (
                            <TrackRequestManagement
                                currentUser={currentUser}
                                onNotification={handleNotification}
                                onRefresh={handleRefresh}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Inspect Attempt Questions Modal */}
            {selectedAttemptForInspection && (
                <AttemptDetailsModal
                    attempt={selectedAttemptForInspection}
                    onClose={() => setSelectedAttemptForInspection(null)}
                />
            )}

            {/* Admin Settings Modal */}
            {isSettingsOpen && (
                <AdminSettings
                    adminEmail={currentUser.email}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            {/* Modern Admin Logout Confirmation Modal */}
            {isLogoutConfirmOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsLogoutConfirmOpen(false)}
                >
                    <div
                        className={`rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[6px_6px_0px_#000]'
                                : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-2xl'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                isBento
                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className={`font-black text-base ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>Log Out of Admin?</h3>
                                <p className={`text-xs ${isBento ? 'text-gray-600 font-mono' : 'text-gray-500 dark:text-gray-400'}`}>End your administrator session</p>
                            </div>
                        </div>

                        <p className={`text-xs mb-6 leading-relaxed ${isBento ? 'text-gray-700 font-mono' : 'text-gray-600 dark:text-gray-300'}`}>
                            Are you sure you want to log out? You will be redirected to the sign-in screen and will need administrator credentials to access this dashboard again.
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsLogoutConfirmOpen(false)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[2px_2px_0px_#000] font-mono'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogoutConfirmOpen(false);
                                    onLogout();
                                }}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#fecdd3] hover:bg-[#fda4af] text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 font-mono'
                                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/30 active:scale-95'
                                }`}
                            >
                                Yes, Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
