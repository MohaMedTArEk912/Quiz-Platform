import React, { useRef, useState } from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import {
    Trophy, TrendingUp, Award, Loader2, Star, Zap, Flame,
    Settings, Calendar, History, FileText, Eye,
    ShieldCheck, Gift, CheckCircle2, Sparkles, Pencil,
    Search, ChevronLeft, ChevronRight, CheckCircle, Package, X, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar.tsx';
import { AmbientBackground } from './AmbientBackground';
import { Certificate } from './Certificate.tsx';
import { calculateLevel } from '../lib/gamification';
import {
    exportQuizHistoryToPDF,
    exportAttemptToPDF
} from '../lib/exportUtils';
import AttemptDetailsModal from './admin/AttemptDetailsModal.tsx';
import UserSettings from './UserSettings.tsx';
import AnalyticsPanel from './engage/AnalyticsPanel.tsx';
import Avatar from './Avatar';
import AvatarEditor from './AvatarEditor';
import { StreakRewardModal } from './gamification/StreakRewardModal';
import { useTheme } from '../context/ThemeContext.tsx';

interface UserProfileProps {
    user: UserData;
    attempts: AttemptData[];
    allUsers: UserData[];
    onBack: () => void;
    onUserUpdate?: (updatedUser: UserData) => void;
}

const BadgeIcon = ({ icon, className }: { icon: string, className?: string }) => {
    switch (icon) {
        case 'Trophy': return <Trophy className={className} />;
        case 'Star': return <Star className={className} />;
        case 'Zap': return <Zap className={className} />;
        case 'Flame': return <Flame className={className} />;
        default: return <Award className={className} />;
    }
};

const UserProfile: React.FC<UserProfileProps> = ({ user, attempts, allUsers, onBack, onUserUpdate }) => {
    const { isBento } = useTheme();
    const navigate = useNavigate();
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserData>(user);
    const [inspectingAttempt, setInspectingAttempt] = useState<AttemptData | null>(null);
    const [exportingAttemptId, setExportingAttemptId] = useState<string | null>(null);

    const streak = currentUser.streak || 0;
    const dailyChallengeStreak = currentUser.dailyChallengeStreak || 0;
    const currentStreakDay = streak === 0 ? 1 : (((streak - 1) % 7) + 1);

    const streakShieldCount = (currentUser.inventory || [])
        .filter(item => item.itemId === 'streak-shield')
        .reduce((sum, item) => sum + (item.quantity || 0), 0);

    const isStreakClaimedToday = Boolean((() => {
        const todayStr = new Date().toDateString();
        if (currentUser.lastStreakClaimDate && new Date(currentUser.lastStreakClaimDate).toDateString() === todayStr) {
            return true;
        }
        const lastClaimedLocal = localStorage.getItem(`streak_claimed_${currentUser.userId}`);
        if (lastClaimedLocal && new Date(lastClaimedLocal).toDateString() === todayStr) {
            return true;
        }
        return false;
    })());

    const handleStreakClaim = (rewards: { coins?: number; xp?: number; powerUp?: string }) => {
        const updated: UserData = {
            ...currentUser,
            coins: (currentUser.coins || 0) + (rewards.coins || 0),
            xp: (currentUser.xp || 0) + (rewards.xp || 0),
            lastStreakClaimDate: new Date().toISOString()
        };
        handleUserUpdate(updated);
    };

    const currentXP = currentUser.xp || 0;
    const level = calculateLevel(currentXP);
    const xpForCurrentLevel = Math.pow(Math.max(level - 1, 0), 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpIntoLevel = Math.max(0, currentXP - xpForCurrentLevel);
    const xpToNextLevel = Math.max(0, xpForNextLevel - currentXP);
    const levelProgress = xpForNextLevel === xpForCurrentLevel
        ? 0
        : Math.min(100, (xpIntoLevel / (xpForNextLevel - xpForCurrentLevel)) * 100);

    const sortedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const rank = sortedUsers.findIndex(u => u.userId === currentUser.userId) + 1;

    const handleUserUpdate = (updatedUser: UserData) => {
        setCurrentUser(updatedUser);
        if (onUserUpdate) {
            onUserUpdate(updatedUser);
        }
    };

    // Full Activity state
    const [activitySearch, setActivitySearch] = useState('');
    const [activityFilter, setActivityFilter] = useState<'all' | 'pools' | 'passed' | 'mastered'>('all');
    const [pageSize, setPageSize] = useState<number | 'all'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    const isCertificateEligible = (attempt: AttemptData) => {
        return Boolean(
            attempt.percentage === 100 ||
            attempt.poolProgress?.justCompletedPool ||
            (attempt.poolProgress?.percentage !== undefined && attempt.poolProgress.percentage >= 100) ||
            ((attempt.poolProgress?.cycle || 0) > 0)
        );
    };

    const sortedAttempts = React.useMemo(() => {
        return [...attempts].sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
    }, [attempts]);

    const activityCounts = React.useMemo(() => {
        const total = sortedAttempts.length;
        let pools = 0;
        let passed = 0;
        let mastered = 0;

        sortedAttempts.forEach(a => {
            const isPool = Boolean(a.isQuestionPool || a.poolProgress);
            if (isPool) pools++;
            if ((a.percentage || 0) >= 60) passed++;
            if (isCertificateEligible(a)) mastered++;
        });

        return { total, pools, passed, mastered };
    }, [sortedAttempts]);

    const filteredAttempts = React.useMemo(() => {
        return sortedAttempts.filter(attempt => {
            if (activitySearch.trim()) {
                const q = activitySearch.toLowerCase().trim();
                const titleMatch = attempt.quizTitle?.toLowerCase().includes(q);
                const scoreMatch = `${attempt.score}/${attempt.totalQuestions}`.includes(q);
                const dateMatch = new Date(attempt.completedAt).toLocaleDateString().includes(q);
                if (!titleMatch && !scoreMatch && !dateMatch) return false;
            }

            if (activityFilter === 'pools') {
                return Boolean(attempt.isQuestionPool || attempt.poolProgress);
            }
            if (activityFilter === 'passed') {
                return (attempt.percentage || 0) >= 60;
            }
            if (activityFilter === 'mastered') {
                return isCertificateEligible(attempt);
            }
            return true;
        });
    }, [sortedAttempts, activitySearch, activityFilter]);

    const totalItems = filteredAttempts.length;
    const itemsPerPage = pageSize === 'all' ? totalItems : pageSize;
    const totalPages = itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;
    const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

    const displayedAttempts = React.useMemo(() => {
        if (pageSize === 'all') return filteredAttempts;
        const start = (safeCurrentPage - 1) * pageSize;
        return filteredAttempts.slice(start, start + pageSize);
    }, [filteredAttempts, safeCurrentPage, pageSize]);

    const handleExportHistoryPDF = () => {
        exportQuizHistoryToPDF(attempts, currentUser);
    };

    const handleExportSingleAttemptPDF = async (attempt: AttemptData) => {
        setExportingAttemptId(attempt.attemptId);
        try {
            // Build detailed fallback
            const questions = attempt.attemptQuestions || [];
            const breakdown = questions.map((q, idx) => {
                const userAns = attempt.answers?.[idx] ?? attempt.answers?.[q.id];
                let selected = undefined;
                let isCorrect = false;
                if (typeof userAns === 'object' && userAns !== null) {
                    selected = (userAns as { selected?: unknown }).selected;
                    isCorrect = Boolean((userAns as { isCorrect?: boolean }).isCorrect);
                } else {
                    selected = userAns;
                    isCorrect = selected !== undefined && (
                        Number(selected) === Number(q.correctAnswer) ||
                        String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
                    );
                }
                return {
                    questionId: q.id ?? idx + 1,
                    questionIndex: idx,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    points: q.points || 10,
                    type: q.type || 'multiple-choice',
                    studentAnswer: selected,
                    isCorrect,
                    isAnswered: selected !== undefined && selected !== null && selected !== ''
                };
            });

            const detailedData = {
                ...attempt,
                userName: currentUser.name,
                userEmail: currentUser.email,
                questionsBreakdown: breakdown
            };

            await exportAttemptToPDF(detailedData);
        } catch (err) {
            console.error('Failed to export attempt:', err);
            setError('Failed to export attempt');
        } finally {
            setExportingAttemptId(null);
        }
    };

    const handleDownloadCertificate = async (attempt: AttemptData) => {
        setDownloadingAttemptId(attempt.attemptId);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!certificateRef.current) return;

            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1000, 700]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 1000, 700);
            pdf.save(`${attempt.quizTitle.replace(/\s+/g, '_')}_Certificate.pdf`);
        } catch (error) {
            console.error('Error generating certificate:', error);
            setError('Failed to generate certificate');
        } finally {
            setDownloadingAttemptId(null);
        }
    };

    const currentCertificateAttempt = attempts.find(a => a.attemptId === downloadingAttemptId);

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25 relative overflow-hidden">
            {/* Ambient Background */}
            <AmbientBackground />

            <Navbar
                user={user}
                onBack={onBack}
                showBack={true}
                title="My Profile"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />

            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
                {/* Profile Card */}
                <div className="relative glass-card rounded-3xl p-6 sm:p-8 overflow-hidden mb-8">
                    {/* Settings Button - Moved to top right of card */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="absolute top-5 right-5 z-30 p-2 glass-card hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-full transition-all hover:rotate-90 active:scale-95 cursor-pointer"
                        title="Account Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full ring-4 ring-indigo-500/50 shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500 bg-white dark:bg-[#0a0a0b]">
                                {currentUser.avatar ? (
                                    <Avatar config={currentUser.avatar} size="xl" className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-black text-white">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            {/* Edit Avatar Button - Positioned nicely at bottom right */}
                            <button
                                onClick={() => setIsAvatarEditorOpen(true)}
                                className="absolute bottom-0 right-0 z-20 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg border-4 border-white dark:border-[#13141f] transition-all hover:scale-110 hover:shadow-indigo-500/25"
                                title="Customize Avatar"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left w-full">
                            <div className="mb-6">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight flex items-center justify-center md:justify-start gap-4 flex-wrap">
                                    {currentUser.name}
                                    <span className="text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full font-black shadow-sm border border-white/20 transform hover:scale-105 transition-transform cursor-default">
                                        Lvl {currentUser.level || 1}
                                    </span>
                                </h2>
                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{currentUser.email}</p>
                            </div>

                            {/* Level Progress */}
                            <div className="mb-8 max-w-xl mx-auto md:mx-0">
                                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    <span>Progress</span>
                                    <span>{xpToNextLevel} XP to Level {level + 1}</span>
                                </div>
                                <div className="h-4 bg-gray-200 dark:bg-black/40 rounded-full overflow-hidden border border-gray-300 dark:border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out relative overflow-hidden"
                                        style={{ width: `${levelProgress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                <div className="pl-2 pr-5 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                        <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-200">Rank #{rank}</span>
                                </div>
                                <div className="pl-2 pr-5 py-2 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                        <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <span className="font-bold text-orange-700 dark:text-orange-200">{currentUser.streak || 0} Day Streak</span>
                                </div>
                                <div className="pl-2 pr-5 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="font-bold text-blue-700 dark:text-blue-200">Joined {new Date(currentUser.createdAt || currentUser.lastLoginDate || new Date()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Streak & Consistency Tracking Section */}
                <div className="mb-12">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/25">
                                🔥
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Streak & Activity Tracking</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Track your daily consistency, 7-day milestones, and protected streak multipliers.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsStreakModalOpen(true)}
                            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                                isStreakClaimedToday
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 hover:scale-105 active:scale-95'
                            }`}
                        >
                            {isStreakClaimedToday ? (
                                <><CheckCircle2 className="w-4 h-4" /> Claimed Today</>
                            ) : (
                                <><Gift className="w-4 h-4 animate-bounce" /> Claim Day Reward</>
                            )}
                        </button>
                    </div>

                    {/* 4 Stat Overview Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Current Streak */}
                        <div className={`p-5 rounded-3xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
                            isBento
                                ? 'profile-stat-card-yellow bg-[#fef08a] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                : 'bg-white dark:bg-[#13141f] border border-orange-200/80 dark:border-orange-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-white/90 border border-black shadow-[1px_1px_0px_#000] text-black'
                                        : 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                                }`}>
                                    Login Streak
                                </span>
                                <Flame className={`w-5 h-5 ${isBento ? 'text-orange-600 animate-pulse' : 'text-orange-500 animate-pulse'}`} />
                            </div>
                            <div className="text-3xl font-black mb-1 tracking-tight">
                                {streak} <span className="text-sm font-bold opacity-75">Days</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-black">
                                {isStreakClaimedToday ? (
                                    <span className={isBento ? 'text-emerald-800 flex items-center gap-1' : 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1'}>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Checked in today
                                    </span>
                                ) : (
                                    <span className={isBento ? 'text-amber-900 flex items-center gap-1 animate-pulse' : 'text-orange-600 dark:text-orange-400 flex items-center gap-1 animate-pulse'}>
                                        ● Ready for check-in
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Compiler Challenge Streak */}
                        <div className={`p-5 rounded-3xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
                            isBento
                                ? 'profile-stat-card-blue bg-[#bae6fd] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                : 'bg-white dark:bg-[#13141f] border border-sky-200/80 dark:border-sky-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-white/90 border border-black shadow-[1px_1px_0px_#000] text-black'
                                        : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'
                                }`}>
                                    Challenge Streak
                                </span>
                                <Zap className={`w-5 h-5 ${isBento ? 'text-blue-700' : 'text-sky-500'}`} />
                            </div>
                            <div className="text-3xl font-black mb-1 tracking-tight">
                                {dailyChallengeStreak} <span className="text-sm font-bold opacity-75">Days</span>
                            </div>
                            <div className={`text-xs font-bold ${isBento ? 'text-sky-950' : 'text-gray-500 dark:text-gray-400'}`}>
                                Daily coding arena streak
                            </div>
                        </div>

                        {/* Current Cycle */}
                        <div className={`p-5 rounded-3xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
                            isBento
                                ? 'profile-stat-card-purple bg-[#ddd6fe] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                : 'bg-white dark:bg-[#13141f] border border-purple-200/80 dark:border-purple-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-white/90 border border-black shadow-[1px_1px_0px_#000] text-black'
                                        : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                                }`}>
                                    7-Day Cycle
                                </span>
                                <Sparkles className={`w-5 h-5 ${isBento ? 'text-purple-700' : 'text-purple-500'}`} />
                            </div>
                            <div className="text-3xl font-black mb-1 tracking-tight">
                                Day {currentStreakDay} <span className="text-sm font-bold opacity-75">/ 7</span>
                            </div>
                            <div className={`text-xs font-black ${isBento ? 'text-purple-950' : 'text-purple-600 dark:text-purple-400'}`}>
                                {currentStreakDay === 7 ? '🎁 Mystery Loot Box today!' : `${7 - currentStreakDay} days to Mystery Box`}
                            </div>
                        </div>

                        {/* Streak Shield Protection */}
                        <div className={`p-5 rounded-3xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
                            isBento
                                ? 'profile-stat-card-green bg-[#d9f99d] border-2 border-black shadow-[4px_4px_0px_#000] text-black'
                                : 'bg-white dark:bg-[#13141f] border border-emerald-200/80 dark:border-emerald-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    isBento
                                        ? 'bg-white/90 border border-black shadow-[1px_1px_0px_#000] text-black'
                                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                }`}>
                                    Protection
                                </span>
                                <ShieldCheck className={`w-5 h-5 ${isBento ? 'text-emerald-700' : 'text-emerald-500'}`} />
                            </div>
                            <div className="text-3xl font-black mb-1 tracking-tight">
                                {streakShieldCount} <span className="text-sm font-bold opacity-75">Shield{streakShieldCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className={`text-xs font-bold ${isBento ? 'text-emerald-950' : 'text-gray-500 dark:text-gray-400'}`}>
                                {streakShieldCount > 0 ? 'Streak protected against 1 miss' : 'Available in Shop'}
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Visual Progress Track */}
                    <div className={`profile-section-card rounded-3xl p-6 ${
                        isBento
                            ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                    }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-200/80 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                    Weekly Milestone Progression
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                                        : 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
                                }`}>
                                    7-Day Quest
                                </span>
                            </div>
                            <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                                {isStreakClaimedToday ? '✓ Check-in Complete' : '● Action Required'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[
                                { day: 1, label: '+25 Coins', icon: '🪙', bg: 'bg-[#fef08a]', text: 'text-amber-950' },
                                { day: 2, label: '+50 Coins & 50 XP', icon: '⚡', bg: 'bg-[#bef264]', text: 'text-lime-950' },
                                { day: 3, label: '1x Hint Power-Up', icon: '💡', bg: 'bg-[#bae6fd]', text: 'text-sky-950' },
                                { day: 4, label: '+100 Coins & 100 XP', icon: '🪙', bg: 'bg-[#c4b5fd]', text: 'text-purple-950' },
                                { day: 5, label: '1x Time Freeze', icon: '⏳', bg: 'bg-[#67e8f9]', text: 'text-cyan-950' },
                                { day: 6, label: '+150 Coins & 250 XP', icon: '🔥', bg: 'bg-[#fdba74]', text: 'text-orange-950' },
                                { day: 7, label: 'Mystery Loot Box', icon: '🎁', bg: 'bg-gradient-to-b from-[#f472b6] to-[#fde047]', text: 'text-pink-950' }
                            ].map((milestone) => {
                                const isPast = milestone.day < currentStreakDay;
                                const isToday = milestone.day === currentStreakDay;

                                let cardClass = '';
                                if (isBento) {
                                    cardClass = `border-2 border-black shadow-[3px_3px_0px_#000] ${milestone.bg} ${milestone.text} ${
                                        isToday ? 'ring-4 ring-orange-500 ring-offset-2 scale-105 z-10' : ''
                                    }`;
                                } else if (isToday) {
                                    cardClass = 'ring-2 ring-orange-500 bg-orange-50/80 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/40 text-orange-950 dark:text-orange-200 shadow-md scale-105 z-10';
                                } else if (isPast) {
                                    cardClass = 'bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300';
                                } else {
                                    cardClass = 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300';
                                }

                                return (
                                    <div
                                        key={milestone.day}
                                        className={`p-3.5 rounded-2xl flex flex-col items-center justify-between text-center transition-all relative overflow-hidden group hover:-translate-y-1 ${cardClass}`}
                                    >
                                        {milestone.day === 7 && (
                                            <span className={`absolute -top-0.5 right-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                                isBento
                                                    ? 'bg-white border border-black shadow-[1px_1px_0px_#000] rotate-2 text-black'
                                                    : 'bg-amber-400 text-black font-extrabold shadow-xs'
                                            }`}>
                                                ⭐ Grand
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                isBento
                                                    ? 'bg-white/80 border border-black shadow-[0.5px_0.5px_0px_#000] text-black'
                                                    : 'bg-white/90 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                                            }`}>
                                                Day {milestone.day}
                                            </span>
                                            {isPast && (
                                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                    isBento
                                                        ? 'bg-emerald-500 text-white border border-black shadow-[0.5px_0.5px_0px_#000]'
                                                        : 'bg-emerald-500 text-white'
                                                }`}>
                                                    ✓
                                                </span>
                                            )}
                                            {isToday && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping" />
                                            )}
                                        </div>

                                        <div className="text-3xl my-2 drop-shadow-sm transform group-hover:scale-110 transition-transform">
                                            {milestone.icon}
                                        </div>

                                        <div className="text-[11px] font-black leading-tight line-clamp-2">
                                            {milestone.label}
                                        </div>

                                        <div className="mt-2 w-full">
                                            {isPast ? (
                                                <span className={`inline-block w-full py-1 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                                                    isBento
                                                        ? 'bg-emerald-600 text-white border border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                }`}>
                                                    ✓ Claimed
                                                </span>
                                            ) : isToday ? (
                                                <span className={`inline-block w-full py-1 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                                                    isBento
                                                        ? 'bg-orange-500 text-white border border-black shadow-[1.5px_1.5px_0px_#000] animate-pulse'
                                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20'
                                                }`}>
                                                    {isStreakClaimedToday ? '✓ Done' : '🎁 Claim'}
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center justify-center gap-1 w-full py-1 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                                                    isBento
                                                        ? 'bg-white/70 text-black/80 border border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-gray-200/60 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    <Lock className="w-2.5 h-2.5" />
                                                    Locked
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>


                {/* Badges Section */}
                {currentUser.badges && currentUser.badges.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <Award className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Badges Earned</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentUser.badges.map(badge => (
                                <div key={badge.id} className="group bg-white dark:bg-[#13141f] p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-white/10 transition-colors duration-300 shadow-lg dark:shadow-none">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                            <BadgeIcon icon={badge.icon} className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{badge.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">{badge.description}</p>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider bg-gray-100 dark:bg-black/20 px-2 py-1 rounded-lg">
                                        {new Date(badge.dateEarned).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats & Analytics */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Performance Analytics</h3>
                    </div>
                    <div className={`profile-section-card rounded-[2.5rem] p-6 sm:p-8 ${
                        isBento
                            ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                    }`}>
                        <AnalyticsPanel user={currentUser} />
                    </div>
                </div>

                {/* Full Activity & History */}
                <div className={`profile-section-card rounded-[2.5rem] overflow-hidden ${
                    isBento
                        ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000]'
                        : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                }`}>
                    {/* Header */}
                    <div className={`p-6 sm:p-8 flex flex-wrap justify-between items-center gap-4 ${
                        isBento
                            ? 'border-b-2 border-black bg-[#fefce8]'
                            : 'border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                                isBento
                                    ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}>
                                <History className={`w-5 h-5 ${isBento ? 'text-black' : 'text-purple-600 dark:text-purple-400'}`} />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Full Activity History</h2>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                                    {attempts.length} Total Quiz Attempts {activityCounts.mastered > 0 && `• ${activityCounts.mastered} Mastered`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {error && (
                                <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-red-500/30 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> {error}
                                </span>
                            )}

                            {/* Direct PDF Transcript Export */}
                            {attempts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleExportHistoryPDF}
                                    className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                        isBento
                                            ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white border-2 border-black shadow-[3px_3px_0px_#000]'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                                    }`}
                                    title="Download Academic Transcript PDF"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Export PDF Transcript</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className={`p-4 sm:p-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center ${
                        isBento
                            ? 'border-b-2 border-black bg-white'
                            : 'border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#13141f]'
                    }`}>
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
                            <button
                                type="button"
                                onClick={() => { setActivityFilter('all'); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    isBento
                                        ? `border-2 border-black ${activityFilter === 'all' ? 'bg-[#8b5cf6] text-white shadow-[2.5px_2.5px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
                                        : activityFilter === 'all'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent'
                                }`}
                            >
                                <span>All</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isBento ? 'bg-black/20 text-white' : activityFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {activityCounts.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActivityFilter('pools'); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    isBento
                                        ? `border-2 border-black ${activityFilter === 'pools' ? 'bg-[#38bdf8] text-black shadow-[2.5px_2.5px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
                                        : activityFilter === 'pools'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent'
                                }`}
                            >
                                <Package className="w-3.5 h-3.5" />
                                <span>Question Pools</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isBento ? 'bg-black/20 text-white' : activityFilter === 'pools' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {activityCounts.pools}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActivityFilter('mastered'); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    isBento
                                        ? `border-2 border-black ${activityFilter === 'mastered' ? 'bg-[#fde047] text-black shadow-[2.5px_2.5px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
                                        : activityFilter === 'mastered'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent'
                                }`}
                            >
                                <Award className="w-3.5 h-3.5" />
                                <span>100% Mastered</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isBento ? 'bg-black/20 text-black' : activityFilter === 'mastered' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {activityCounts.mastered}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActivityFilter('passed'); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    isBento
                                        ? `border-2 border-black ${activityFilter === 'passed' ? 'bg-[#bef264] text-black shadow-[2.5px_2.5px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
                                        : activityFilter === 'passed'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent'
                                }`}
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Passed (≥60%)</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isBento ? 'bg-black/20 text-black' : activityFilter === 'passed' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {activityCounts.passed}
                                </span>
                            </button>
                        </div>

                        {/* Search & Page Size */}
                        <div className="flex items-center gap-3 flex-1 md:max-w-md justify-end">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={activitySearch}
                                    onChange={(e) => { setActivitySearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search quiz, score or date..."
                                    className={`w-full pl-9 pr-8 py-2 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none ${
                                        isBento
                                            ? 'bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500'
                                    }`}
                                />
                                {activitySearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setActivitySearch(''); setCurrentPage(1); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Page Size Selector */}
                            <div className={`flex items-center gap-1 p-0.5 rounded-xl shrink-0 ${
                                isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                            }`}>
                                {([10, 25, 50, 'all'] as const).map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                                            pageSize === size
                                                ? 'bg-[#8b5cf6] text-white shadow-sm'
                                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {size === 'all' ? 'All' : size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="overflow-x-auto">
                        {/* Mobile View (Cards) */}
                        <div className="md:hidden">
                            {displayedAttempts.map((attempt) => {
                                const isPool = Boolean(attempt.isQuestionPool || attempt.poolProgress);
                                const poolCompleted = Boolean(
                                    attempt.poolProgress?.justCompletedPool ||
                                    (attempt.poolProgress?.percentage !== undefined && attempt.poolProgress.percentage >= 100) ||
                                    ((attempt.poolProgress?.cycle || 0) > 0)
                                );
                                const eligibleForCert = isCertificateEligible(attempt);

                                return (
                                    <div key={attempt.attemptId} className="p-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="min-w-0 flex-1 pr-2">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{attempt.quizTitle}</h4>
                                                    {isPool && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                            <Package className="w-3 h-3" /> Pool
                                                        </span>
                                                    )}
                                                    {poolCompleted && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                            <Award className="w-3 h-3 text-amber-500" /> 100% Solved
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    <span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</span>
                                                    {isPool && attempt.poolProgress && !poolCompleted && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                                                Bank: {attempt.poolProgress.seenCount}/{attempt.poolProgress.totalCount} ({attempt.poolProgress.percentage}%)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 ${
                                                    attempt.percentage >= 60
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                                }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </div>

                                        {/* Action Buttons for Mobile Card */}
                                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-white/5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => setInspectingAttempt(attempt)}
                                                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                title="View question-by-question breakdown"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>Inspect</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleExportSingleAttemptPDF(attempt)}
                                                disabled={exportingAttemptId === attempt.attemptId}
                                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                title="Export PDF Report"
                                            >
                                                {exportingAttemptId === attempt.attemptId ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <FileText className="w-3.5 h-3.5" />
                                                )}
                                                <span>PDF</span>
                                            </button>

                                            {eligibleForCert && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadCertificate(attempt)}
                                                    disabled={downloadingAttemptId === attempt.attemptId}
                                                    className="px-2.5 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors ml-auto cursor-pointer"
                                                    title={poolCompleted ? "Download Certificate (Pool 100% Solved)" : "Download Certificate"}
                                                >
                                                    {downloadingAttemptId === attempt.attemptId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Award className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>Certificate</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {attempts.length === 0 && (
                                <div className="px-6 py-14 text-center bg-white dark:bg-[#13141f]">
                                    <div className="max-w-md mx-auto space-y-4">
                                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl font-black ${
                                            isBento
                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                        }`}>
                                            📜
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
                                            }`}>
                                                Quest Log Awaiting
                                            </span>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                                Your Chronicle Begins Here!
                                            </h3>
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-relaxed">
                                                No quiz attempts recorded yet. Every quiz you solve awards XP, builds your streak, and unlocks verified completion certificates!
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate('/')}
                                                className={`px-4 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:scale-95'
                                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/20 active:scale-95'
                                                }`}
                                            >
                                                🚀 Explore Learning Roads
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/daily')}
                                                className={`px-4 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-[#fde047] hover:bg-[#facc15] text-black font-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:scale-95'
                                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white font-bold active:scale-95'
                                                }`}
                                            >
                                                ⚡ Daily Challenge
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {attempts.length > 0 && filteredAttempts.length === 0 && (
                                <div className="px-8 py-16 text-center text-gray-500">
                                    <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">No matching attempts found</p>
                                    <p className="text-xs text-gray-400 mb-4">Try clearing your search query or filter tags.</p>
                                    <button
                                        type="button"
                                        onClick={() => { setActivitySearch(''); setActivityFilter('all'); }}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Desktop View (Table) */}
                        <table className="w-full hidden md:table">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/20 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-8 py-5 text-left">Quiz &amp; Status</th>
                                    <th className="px-8 py-5 text-left">Score</th>
                                    <th className="px-8 py-5 text-left">Time</th>
                                    <th className="px-8 py-5 text-left">Date</th>
                                    <th className="px-8 py-5 text-right">Actions &amp; Exports</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {displayedAttempts.map((attempt) => {
                                    const isPool = Boolean(attempt.isQuestionPool || attempt.poolProgress);
                                    const poolCompleted = Boolean(
                                        attempt.poolProgress?.justCompletedPool ||
                                        (attempt.poolProgress?.percentage !== undefined && attempt.poolProgress.percentage >= 100) ||
                                        ((attempt.poolProgress?.cycle || 0) > 0)
                                    );
                                    const eligibleForCert = isCertificateEligible(attempt);

                                    return (
                                        <tr key={attempt.attemptId} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-gray-900 dark:text-white text-base">
                                                        {attempt.quizTitle}
                                                    </span>
                                                    {isPool && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                            <Package className="w-3.5 h-3.5" />
                                                            Question Pool ({attempt.poolProgress?.seenCount || 0}/{attempt.poolProgress?.totalCount || 0} Questions)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-8 py-5 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-base font-black ${
                                                        attempt.percentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                                        attempt.percentage >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-rose-600 dark:text-rose-400'
                                                    }`}>
                                                        {attempt.percentage}%
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-semibold">
                                                        ({attempt.score}/{attempt.totalQuestions})
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-8 py-5 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                {Math.round(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                            </td>

                                            <td className="px-8 py-5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                                {new Date(attempt.completedAt).toLocaleDateString()}
                                            </td>

                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setInspectingAttempt(attempt)}
                                                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-bold text-xs flex items-center gap-1 border border-gray-200/60 dark:border-white/5 cursor-pointer"
                                                        title="View Attempt Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        <span className="hidden lg:inline">Inspect</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleExportSingleAttemptPDF(attempt)}
                                                        disabled={exportingAttemptId === attempt.attemptId}
                                                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all font-bold text-xs flex items-center gap-1 border border-indigo-500/20 cursor-pointer"
                                                        title="Export PDF Report"
                                                    >
                                                        {exportingAttemptId === attempt.attemptId ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <FileText className="w-4 h-4" />
                                                        )}
                                                        <span className="hidden lg:inline">PDF</span>
                                                    </button>

                                                    {eligibleForCert && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadCertificate(attempt)}
                                                            disabled={downloadingAttemptId === attempt.attemptId}
                                                            className="inline-flex pl-3 pr-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl transition-all font-bold text-xs uppercase tracking-wider gap-1.5 items-center border border-yellow-500/20 hover:border-yellow-500/40 cursor-pointer"
                                                            title={poolCompleted ? "Download Certificate (100% Pool Solved)" : "Download Certificate (100% Score)"}
                                                        >
                                                            {downloadingAttemptId === attempt.attemptId ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Award className="w-4 h-4" />
                                                            )}
                                                            Certificate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {attempts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-14 text-center bg-white dark:bg-[#13141f]">
                                            <div className="max-w-md mx-auto space-y-4">
                                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl font-black ${
                                                    isBento
                                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                                                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                }`}>
                                                    📜
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                                                        isBento
                                                            ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                                            : 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
                                                    }`}>
                                                        Quest Log Awaiting
                                                    </span>
                                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                                        Your Chronicle Begins Here!
                                                    </h3>
                                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-relaxed">
                                                        No quiz attempts recorded yet. Every quiz you solve awards XP, builds your streak, and unlocks verified completion certificates!
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/')}
                                                        className={`px-4 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                                            isBento
                                                                ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:scale-95'
                                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/20 active:scale-95'
                                                        }`}
                                                    >
                                                        🚀 Explore Learning Roads
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/daily')}
                                                        className={`px-4 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                                            isBento
                                                                ? 'bg-[#fde047] hover:bg-[#facc15] text-black font-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:scale-95'
                                                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-800 dark:text-white font-bold active:scale-95'
                                                        }`}
                                                    >
                                                        ⚡ Daily Challenge
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {attempts.length > 0 && filteredAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-gray-500">
                                            <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">No matching attempts found</p>
                                            <p className="text-xs text-gray-400 mb-4">Try clearing your search query or filter tags.</p>
                                            <button
                                                type="button"
                                                onClick={() => { setActivitySearch(''); setActivityFilter('all'); }}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                                            >
                                                Reset Filters
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredAttempts.length > 0 && (
                        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-white/5 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50 dark:bg-white/5">
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {pageSize === 'all' ? (
                                    <span>Showing all {totalItems} attempts</span>
                                ) : (
                                    <span>
                                        Showing {Math.min((safeCurrentPage - 1) * (pageSize as number) + 1, totalItems)}–{Math.min(safeCurrentPage * (pageSize as number), totalItems)} of {totalItems} attempts
                                    </span>
                                )}
                            </div>

                            {pageSize !== 'all' && totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={safeCurrentPage <= 1}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            return (
                                                page === 1 ||
                                                page === totalPages ||
                                                Math.abs(page - safeCurrentPage) <= 1
                                            );
                                        })
                                        .map((page, idx, arr) => {
                                            const prev = arr[idx - 1];
                                            return (
                                                <React.Fragment key={page}>
                                                    {prev && page - prev > 1 && (
                                                        <span className="px-1 text-xs text-gray-400">...</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                            safeCurrentPage === page
                                                                ? 'bg-purple-600 text-white shadow-sm'
                                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })}

                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={safeCurrentPage >= totalPages}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Inspect Attempt Modal */}
            {inspectingAttempt && (
                <AttemptDetailsModal
                    attempt={inspectingAttempt}
                    onClose={() => setInspectingAttempt(null)}
                />
            )}

            {/* Hidden Certificate Component */}
            {currentCertificateAttempt && (
                <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                    <Certificate
                        ref={certificateRef}
                        userName={currentUser.name}
                        courseTitle={currentCertificateAttempt.quizTitle}
                        score={
                            currentCertificateAttempt.poolProgress?.percentage === 100 || currentCertificateAttempt.poolProgress?.justCompletedPool
                                ? (currentCertificateAttempt.poolProgress.totalCount || currentCertificateAttempt.totalQuestions)
                                : currentCertificateAttempt.score
                        }
                        totalQuestions={
                            currentCertificateAttempt.poolProgress?.percentage === 100 || currentCertificateAttempt.poolProgress?.justCompletedPool
                                ? (currentCertificateAttempt.poolProgress.totalCount || currentCertificateAttempt.totalQuestions)
                                : currentCertificateAttempt.totalQuestions
                        }
                        date={new Date(currentCertificateAttempt.completedAt).toLocaleDateString()}
                        certificateId={currentCertificateAttempt.attemptId}
                    />
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <UserSettings
                    user={currentUser}
                    onClose={() => setIsSettingsOpen(false)}
                    onUpdate={handleUserUpdate}
                />
            )}

            {/* Avatar Editor Modal */}
            {isAvatarEditorOpen && (
                <AvatarEditor
                    user={currentUser}
                    onClose={() => setIsAvatarEditorOpen(false)}
                    onUpdate={handleUserUpdate}
                />
            )}

            {/* Daily Streak Reward Modal */}
            {isStreakModalOpen && (
                <StreakRewardModal
                    isOpen={isStreakModalOpen}
                    user={currentUser}
                    onClose={() => setIsStreakModalOpen(false)}
                    onClaimStreak={handleStreakClaim}
                />
            )}
        </div>
    );
};

export default UserProfile;
