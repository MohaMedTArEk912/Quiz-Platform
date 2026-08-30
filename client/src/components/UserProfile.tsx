import React, { useRef, useState } from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import {
    Trophy, TrendingUp, Award, Download, Loader2, Star, Zap, Flame,
    Settings, Calendar, History, ShieldCheck, Gift, CheckCircle2, Sparkles
} from 'lucide-react';
import Navbar from './Navbar.tsx';
import { Certificate } from './Certificate.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { calculateLevel } from '../lib/gamification';
import UserSettings from './UserSettings.tsx';
import AnalyticsPanel from './engage/AnalyticsPanel.tsx';
import Avatar from './Avatar';
import AvatarEditor from './AvatarEditor';
import { StreakRewardModal } from './gamification/StreakRewardModal';
import { Pencil } from 'lucide-react';

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
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserData>(user);

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

    const recentAttempts = [...attempts]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 10);

    const handleDownloadCertificate = async (attempt: AttemptData) => {
        setDownloadingAttemptId(attempt.attemptId);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!certificateRef.current) return;

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
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white selection:bg-purple-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] mix-blend-screen" />
            </div>

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

            <div className="relative w-full px-6 py-8 md:py-12">
                {/* Profile Card */}
                <div className="relative bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-2xl overflow-hidden mb-12">
                    {/* Settings Button - Moved to top right of card */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="absolute top-6 right-6 z-30 p-2.5 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 text-gray-700 dark:text-white rounded-full backdrop-blur-md border border-white/20 transition-all hover:rotate-90"
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
                        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg">
                                    Login Streak
                                </span>
                                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                {streak} <span className="text-sm font-bold text-gray-500">Days</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                {isStreakClaimedToday ? (
                                    <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Checked in today</span>
                                ) : (
                                    <span className="text-amber-500 flex items-center gap-1 animate-pulse">● Ready for check-in</span>
                                )}
                            </div>
                        </div>

                        {/* Compiler Challenge Streak */}
                        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                                    Challenge Streak
                                </span>
                                <Zap className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                {dailyChallengeStreak} <span className="text-sm font-bold text-gray-500">Days</span>
                            </div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                Daily coding arena streak
                            </div>
                        </div>

                        {/* Current Cycle */}
                        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                                    7-Day Cycle
                                </span>
                                <Sparkles className="w-5 h-5 text-purple-500" />
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                Day {currentStreakDay} <span className="text-sm font-bold text-gray-500">/ 7</span>
                            </div>
                            <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                {currentStreakDay === 7 ? '🎁 Mystery Loot Box today!' : `${7 - currentStreakDay} days to Mystery Box`}
                            </div>
                        </div>

                        {/* Streak Shield Protection */}
                        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                    Protection
                                </span>
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                                {streakShieldCount} <span className="text-sm font-bold text-gray-500">Shield{streakShieldCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {streakShieldCount > 0 ? 'Streak protected against 1 miss' : 'Available in Shop'}
                            </div>
                        </div>
                    </div>

                    {/* 7-Day Visual Progress Track */}
                    <div className="bg-white dark:bg-[#13141f] rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                Weekly Milestone Progression
                            </span>
                            <span className="text-xs font-bold text-orange-500">
                                {isStreakClaimedToday ? '✓ Check-in Complete' : '● Action Required'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {[
                                { day: 1, label: '+25 Coins', icon: '🪙' },
                                { day: 2, label: '+50 Coins & 50 XP', icon: '⚡' },
                                { day: 3, label: '1x Hint Power-Up', icon: '💡' },
                                { day: 4, label: '+100 Coins & 100 XP', icon: '🪙' },
                                { day: 5, label: '1x Time Freeze', icon: '⏳' },
                                { day: 6, label: '+150 Coins & 250 XP', icon: '🔥' },
                                { day: 7, label: 'Mystery Loot Box', icon: '🎁' }
                            ].map((milestone) => {
                                const isPast = milestone.day < currentStreakDay;
                                const isToday = milestone.day === currentStreakDay;
                                return (
                                    <div
                                        key={milestone.day}
                                        className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                                            isToday
                                                ? 'bg-gradient-to-b from-orange-500/20 to-amber-500/10 border-orange-500 ring-2 ring-orange-500/40 shadow-lg shadow-orange-500/20 scale-102'
                                                : isPast
                                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                isToday ? 'text-orange-600 dark:text-orange-400' : isPast ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                                            }`}>
                                                Day {milestone.day}
                                            </span>
                                            {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                            {isToday && isStreakClaimedToday && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                        </div>

                                        <div className="text-2xl my-1.5">{milestone.icon}</div>

                                        <div className="text-[10px] font-black text-gray-800 dark:text-gray-200 leading-tight">
                                            {milestone.label}
                                        </div>

                                        <div className="mt-1 text-[9px] font-bold">
                                            {isPast ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">Claimed</span>
                                            ) : isToday ? (
                                                <span className="text-orange-600 dark:text-orange-400 font-black">
                                                    {isStreakClaimedToday ? '✓ Done' : '🎁 Today'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Locked</span>
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
                    {/* Assuming AnalyticsPanel can accept dark mode styles or is already styled cleanly */}
                    <div className="bg-white dark:bg-[#13141f] rounded-[2.5rem] p-6 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-none">
                        <AnalyticsPanel user={currentUser} />
                    </div>
                </div>

                {/* Recent Attempts */}
                <div className="bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-gray-200 dark:border-white/5 flex flex-wrap justify-between items-center gap-4 bg-gray-50 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Recent Activity</h2>
                        </div>
                        {error && <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/20 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> {error}
                        </span>}
                    </div>
                    <div className="overflow-x-auto">
                        {/* Mobile View (Cards) */}
                        <div className="md:hidden">
                            {recentAttempts.map((attempt) => (
                                <div key={attempt.attemptId} className="p-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">{attempt.quizTitle}</h4>
                                            <span className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                                                {new Date(attempt.completedAt).toLocaleDateString()} • {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                            </span>
                                        </div>
                                        {attempt.percentage === 100 && (
                                            <div className="bg-yellow-100 dark:bg-yellow-500/20 p-1.5 rounded-lg text-yellow-600 dark:text-yellow-400">
                                                {downloadingAttemptId === attempt.attemptId ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Download className="w-4 h-4" onClick={() => handleDownloadCertificate(attempt)} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${attempt.percentage >= 60
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                                }`}
                                        >
                                            {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                        </span>
                                        {attempt.percentage === 100 && (
                                            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                                                <Award className="w-3 h-3" /> Certified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {recentAttempts.length === 0 && (
                                <div className="px-8 py-16 text-center text-gray-500 font-medium text-lg">
                                    No recent activity. Start a quiz to build your legacy!
                                </div>
                            )}
                        </div>

                        {/* Desktop View (Table) */}
                        <table className="w-full hidden md:table">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-black/20 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-8 py-5 text-left">Quiz</th>
                                    <th className="px-8 py-5 text-left">Score</th>
                                    <th className="px-8 py-5 text-left">Time</th>
                                    <th className="px-8 py-5 text-left">Date</th>
                                    <th className="px-8 py-5 text-right">Certificate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {recentAttempts.map((attempt) => (
                                    <tr key={attempt.attemptId} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="font-bold text-gray-900 dark:text-white text-lg">{attempt.quizTitle}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${attempt.percentage >= 60
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium">
                                            {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                        </td>
                                        <td className="px-8 py-5 text-gray-500 dark:text-gray-500 font-medium">
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {attempt.percentage === 100 ? (
                                                <button
                                                    onClick={() => handleDownloadCertificate(attempt)}
                                                    disabled={downloadingAttemptId === attempt.attemptId}
                                                    className="inline-flex pl-3 pr-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl transition-all font-bold text-xs uppercase tracking-wider gap-2 items-center border border-yellow-500/20 hover:border-yellow-500/40"
                                                    title="Download Certificate (100% Score)"
                                                >
                                                    {downloadingAttemptId === attempt.attemptId ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4" />
                                                    )}
                                                    Certificate
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                                                    {attempt.percentage >= 60 ? '100% required' : 'Not earned'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-gray-500 font-medium text-lg">
                                            No recent activity. Start a quiz to build your legacy!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Hidden Certificate Component */}
            {currentCertificateAttempt && (
                <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                    <Certificate
                        ref={certificateRef}
                        userName={currentUser.name}
                        courseTitle={currentCertificateAttempt.quizTitle}
                        score={currentCertificateAttempt.score}
                        totalQuestions={currentCertificateAttempt.totalQuestions}
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
