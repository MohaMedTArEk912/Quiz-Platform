import React, { useState, useEffect } from 'react';
import {
    Trophy,
    Award,
    Flame,
    Clock,
    Star,
    Check,
    CheckCircle2,
    XCircle,
    UserPlus,
    UserCheck,
    MessageCircle,
    Swords,
    Share2,
    ExternalLink,
    Loader2,
    Sparkles,
    BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../Avatar';
import { ClanEmblem } from '../social/ClanEmblem';
import { GitHubActivityHeatmap } from './GitHubActivityHeatmap';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { calculateLevel } from '../../lib/gamification';
import type { UserData, ClanLogo } from '../../types';

export interface PublicUserProfileData {
    user: UserData & {
        friendsCount?: number;
        badgesCount?: number;
    };
    clan?: {
        clanId: string;
        name: string;
        tag: string;
        description: string;
        level: number;
        totalXP: number;
        logo?: ClanLogo;
        role: 'leader' | 'elder' | 'member';
        contribution: number;
    } | null;
    attempts: Array<{
        attemptId: string;
        quizId: string;
        quizTitle: string;
        score: number;
        totalQuestions: number;
        percentage: number;
        timeTaken: number;
        completedAt: string;
        passed?: boolean;
    }>;
    activityHeatmap: Record<string, {
        count: number;
        avgPercentage: number;
        totalScore: number;
    }>;
    totalYearAttempts: number;
    relationship: 'self' | 'friend' | 'pending_outgoing' | 'pending_incoming' | 'none';
}

interface PublicUserProfileViewProps {
    userId: string;
    onClose?: () => void;
    isModal?: boolean;
}

export const PublicUserProfileView: React.FC<PublicUserProfileViewProps> = ({
    userId,
    onClose,
    isModal = false
}) => {
    const { currentUser } = useAuth();
    const { openChat } = useChat();
    const { isBento } = useTheme();
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<PublicUserProfileData | null>(null);
    const [friendActionLoading, setFriendActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity' | 'history'>('overview');

    // Fetch user public profile
    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.getPublicUserProfile(userId, currentUser?.userId);
                if (isMounted) {
                    setProfile(data as PublicUserProfileData);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : 'User profile not found';
                    setError(message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();
        return () => { isMounted = false; };
    }, [userId, currentUser?.userId]);

    // Handle Friend Request Send
    const handleSendFriendRequest = async () => {
        if (!currentUser || currentUser.userId === 'guest') {
            showNotification('error', 'Please log in to add friends');
            return;
        }
        if (!profile) return;

        setFriendActionLoading(true);
        try {
            await api.sendFriendRequest(profile.user.userId);
            setProfile(prev => prev ? { ...prev, relationship: 'pending_outgoing' } : prev);
            showNotification('success', `Friend request sent to ${profile.user.name}!`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send request';
            showNotification('error', message);
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Handle Accept Friend Request
    const handleAcceptFriendRequest = async () => {
        if (!profile) return;
        setFriendActionLoading(true);
        try {
            await api.respondToFriendRequest(profile.user.userId, 'accept');
            setProfile(prev => prev ? { ...prev, relationship: 'friend' } : prev);
            showNotification('success', `You are now friends with ${profile.user.name}!`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to accept request';
            showNotification('error', message);
        } finally {
            setFriendActionLoading(false);
        }
    };

    // Handle Copy Profile Link
    const handleShareProfile = async () => {
        const url = `${window.location.origin}/profile/${encodeURIComponent(userId)}`;
        try {
            await navigator.clipboard.writeText(url);
            showNotification('success', 'Profile link copied to clipboard!');
        } catch {
            showNotification('info', `Profile link: ${url}`);
        }
    };

    // Handle Direct Message
    const handleOpenChat = () => {
        if (!profile) return;
        if (onClose) onClose();
        openChat('direct', profile.user);
    };

    // Handle 1v1 Duel Challenge
    const handleStartChallenge = () => {
        if (!profile) return;
        if (onClose) onClose();
        navigate('/social', { state: { challengeTargetId: profile.user.userId } });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center">
                <Loader2 className={`w-10 h-10 animate-spin mb-3 ${isBento ? 'text-black' : 'text-indigo-600'}`} />
                <p className={`font-bold text-sm ${isBento ? 'text-black' : 'text-slate-500'}`}>Loading profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className={`p-8 text-center rounded-3xl ${
                isBento ? 'bg-white border-3 border-black text-black' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10'
            }`}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black mb-1">User Not Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || 'Unable to retrieve user information.'}</p>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm cursor-pointer ${
                            isBento
                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                        Close
                    </button>
                )}
            </div>
        );
    }

    const { user, clan, attempts, activityHeatmap, totalYearAttempts, relationship } = profile;

    // Gamification level stats
    const currentXP = user.xp || 0;
    const level = calculateLevel(currentXP);
    const xpForCurrentLevel = Math.pow(Math.max(level - 1, 0), 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpIntoLevel = Math.max(0, currentXP - xpForCurrentLevel);
    const xpProgressPercent = xpForNextLevel === xpForCurrentLevel
        ? 100
        : Math.min(100, Math.round((xpIntoLevel / (xpForNextLevel - xpForCurrentLevel)) * 100));

    // Equipped badge
    const equippedBadge = user.badges?.find(b => b.id === user.equippedBadgeId);

    // Badges / Trophies stats
    const earnedBadges = user.badges || [];
    const completedQuizzesCount = user.totalAttempts || attempts.length;

    // Helper for badge rarity classes
    const getRarityPillClasses = (rarity?: string) => {
        switch (rarity) {
            case 'mythic':
                return isBento ? 'bg-[#f472b6] text-black border border-black' : 'bg-rose-500 text-white';
            case 'legendary':
                return isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-amber-400 text-black';
            case 'epic':
                return isBento ? 'bg-[#c084fc] text-black border border-black' : 'bg-purple-500 text-white';
            case 'rare':
                return isBento ? 'bg-[#38bdf8] text-black border border-black' : 'bg-sky-500 text-white';
            default:
                return isBento ? 'bg-slate-200 text-black border border-black' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Profile Banner (GitHub-style Identity Card) */}
            <div className={`relative p-6 sm:p-8 rounded-3xl overflow-hidden transition-all ${
                isBento
                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                    : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xl'
            }`}>
                {/* Decorative Top Accent Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-3 ${
                    isBento
                        ? 'bg-gradient-to-r from-[#bef264] via-[#fde047] to-[#93c5fd] border-b-2 border-black'
                        : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500'
                }`} />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
                    {/* Left: Avatar + Names + Title & Clan */}
                    <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
                        {/* Avatar Frame with Level Badge */}
                        <div className="relative shrink-0">
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center font-black text-2xl overflow-hidden ${
                                isBento
                                    ? 'bg-[#fde047] border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 text-white ring-4 ring-indigo-500/20 shadow-2xl'
                            }`}>
                                {user.avatar ? (
                                    <Avatar config={user.avatar} size="lg" className="w-full h-full" />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>

                            {/* Level Pill */}
                            <span className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                isBento
                                    ? 'bg-black text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-indigo-600 text-white border-2 border-white dark:border-[#111625] shadow-md'
                            }`}>
                                Lvl {level}
                            </span>
                        </div>

                        {/* Name and Meta */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h2 className="text-xl sm:text-2xl font-black truncate">{user.name}</h2>
                                {user.role === 'admin' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-black uppercase bg-rose-500 text-white">
                                        Admin
                                    </span>
                                )}
                                {user.rank && user.rank > 0 && user.role !== 'admin' && (
                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30'
                                    }`}>
                                        <Trophy className="w-3 h-3" />
                                        <span>#{user.rank} on Leaderboard</span>
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">
                                @{user.userId} • Member since {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </p>

                            {/* Equipped Title & Clan badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {equippedBadge && (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                        getRarityPillClasses(equippedBadge.rarity)
                                    }`}>
                                        <span>{equippedBadge.icon}</span>
                                        <span>{equippedBadge.title || equippedBadge.name}</span>
                                    </span>
                                )}

                                {clan && (
                                    <div
                                        onClick={() => {
                                            if (onClose) onClose();
                                            navigate('/clans');
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                                            isBento
                                                ? 'bg-[#ddd6fe] text-black border border-black shadow-[1.5px_1.5px_0px_#000] hover:-translate-y-0.5'
                                                : 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-500/25'
                                        }`}
                                        title={`Clan ${clan.name}`}
                                    >
                                        <ClanEmblem logo={clan.logo} tag={clan.tag} size="xs" />
                                        <span>[{clan.tag}] {clan.name}</span>
                                        <span className="text-[10px] opacity-75 font-semibold">({clan.role})</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Dynamic Social & Friendship Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
                        {relationship === 'self' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (onClose) onClose();
                                    navigate('/profile');
                                }}
                                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                Edit Your Profile
                            </button>
                        ) : relationship === 'friend' ? (
                            <>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Friends</span>
                                </span>

                                <button
                                    type="button"
                                    onClick={handleOpenChat}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                            : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
                                    }`}
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>Message</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleStartChallenge}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                            : 'bg-amber-500 text-black hover:bg-amber-400 font-bold'
                                    }`}
                                >
                                    <Swords className="w-3.5 h-3.5" />
                                    <span>1v1 Duel</span>
                                </button>
                            </>
                        ) : relationship === 'pending_outgoing' ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black ${
                                isBento
                                    ? 'bg-slate-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                            }`}>
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                <span>Friend Request Sent</span>
                            </span>
                        ) : relationship === 'pending_incoming' ? (
                            <button
                                type="button"
                                onClick={handleAcceptFriendRequest}
                                disabled={friendActionLoading}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Friend Request</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSendFriendRequest}
                                disabled={friendActionLoading}
                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/25'
                                }`}
                            >
                                {friendActionLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <UserPlus className="w-3.5 h-3.5" />
                                )}
                                <span>Add Friend</span>
                            </button>
                        )}

                        {/* Share Profile button */}
                        <button
                            type="button"
                            onClick={handleShareProfile}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-50'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                            title="Share Profile Link"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>

                        {/* Open full page view if inside modal */}
                        {isModal && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (onClose) onClose();
                                    navigate(`/profile/${encodeURIComponent(userId)}`);
                                }}
                                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-50'
                                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                }`}
                                title="Open Full Page View"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Level Progress Bar */}
                <div className="mt-6 pt-5 border-t border-black/10 dark:border-white/10">
                    <div className="flex items-center justify-between text-xs font-black mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Level {level} Progress</span>
                        </span>
                        <span className="font-tabular opacity-75">
                            {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP ({xpProgressPercent}%)
                        </span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${
                        isBento ? 'bg-slate-200 border-2 border-black' : 'bg-slate-100 dark:bg-white/10'
                    }`}>
                        <div
                            className={`h-full transition-all duration-500 ${
                                isBento ? 'bg-[#bef264]' : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                            }`}
                            style={{ width: `${xpProgressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Key Stats Strip (GitHub / Platform Overview) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-2xl flex items-center gap-3.5 ${
                    isBento
                        ? 'bg-white text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5'
                }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                        isBento ? 'bg-[#bef264] border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                        <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total Score</p>
                        <p className="font-tabular text-lg font-black truncate">{(user.totalScore || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3.5 ${
                    isBento
                        ? 'bg-white text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5'
                }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                        isBento ? 'bg-[#fde047] border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                        <Flame className="w-5 h-5 fill-current" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400">Daily Streak</p>
                        <p className="font-tabular text-lg font-black truncate">{user.streak || 0} Days</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3.5 ${
                    isBento
                        ? 'bg-white text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5'
                }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                        isBento ? 'bg-[#93c5fd] border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-sky-500/10 text-sky-500'
                    }`}>
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400">Quizzes Done</p>
                        <p className="font-tabular text-lg font-black truncate">{completedQuizzesCount.toLocaleString()}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3.5 ${
                    isBento
                        ? 'bg-white text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5'
                }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                        isBento ? 'bg-[#f472b6] border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-pink-500/10 text-pink-500'
                    }`}>
                        <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400">Trophies</p>
                        <p className="font-tabular text-lg font-black truncate">{earnedBadges.length}</p>
                    </div>
                </div>
            </div>

            {/* 3. GitHub-Style 52-Week Activity Heatmap */}
            <GitHubActivityHeatmap
                activityMap={activityHeatmap}
                totalYearAttempts={totalYearAttempts}
                currentStreak={user.streak || 0}
                totalTimeSeconds={user.totalTime || 0}
                userName={user.name}
            />

            {/* 4. Tab Navigation (Overview, Achievements, Recent Attempts) */}
            <div className="space-y-4">
                <div className={`flex items-center gap-2 border-b pb-2 ${
                    isBento ? 'border-black' : 'border-slate-200 dark:border-white/10'
                }`}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            activeTab === 'overview'
                                ? (isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-600 text-white')
                                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        Achievements ({earnedBadges.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            activeTab === 'history'
                                ? (isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-indigo-600 text-white')
                                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                        }`}
                    >
                        Recent Quizzes ({attempts.length})
                    </button>
                </div>

                {/* Tab: Achievements Showcase */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {earnedBadges.length === 0 ? (
                            <div className={`p-10 text-center rounded-3xl ${
                                isBento ? 'bg-white border-2 border-black' : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5'
                            }`}>
                                <Award className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                <p className="font-black text-sm text-slate-700 dark:text-slate-300">No trophies unlocked yet</p>
                                <p className="text-xs text-slate-500 mt-1">Quizzes and challenges will unlock trophies for this challenger.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {earnedBadges.map((badge) => {
                                    const isEquipped = badge.id === user.equippedBadgeId;
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`p-4 rounded-2xl flex items-start gap-3.5 transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:shadow-[3.5px_3.5px_0px_#000]'
                                                    : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                                                isBento
                                                    ? 'bg-[#fde047] border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-slate-100 dark:bg-white/10 shadow-inner'
                                            }`}>
                                                {badge.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <h4 className="font-black text-sm truncate">{badge.name}</h4>
                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider shrink-0 ${
                                                        getRarityPillClasses(badge.rarity)
                                                    }`}>
                                                        {badge.rarity || 'common'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5">
                                                    {badge.description}
                                                </p>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                    <span>Earned {new Date(badge.dateEarned || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    {isEquipped && (
                                                        <span className="text-amber-500 font-black flex items-center gap-0.5">
                                                            <Star className="w-2.5 h-2.5 fill-current" /> Equipped
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Recent Quizzes History */}
                {activeTab === 'history' && (
                    <div className="space-y-2.5">
                        {attempts.length === 0 ? (
                            <div className={`p-10 text-center rounded-3xl ${
                                isBento ? 'bg-white border-2 border-black' : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5'
                            }`}>
                                <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                <p className="font-black text-sm text-slate-700 dark:text-slate-300">No recent quizzes</p>
                                <p className="text-xs text-slate-500 mt-1">This user hasn't completed any quizzes recently.</p>
                            </div>
                        ) : (
                            attempts.map((attempt) => {
                                const passed = attempt.passed ?? (attempt.percentage >= 70);
                                return (
                                    <div
                                        key={attempt.attemptId}
                                        className={`p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                passed
                                                    ? (isBento ? 'bg-[#bef264] border-2 border-black' : 'bg-emerald-500/10 text-emerald-500')
                                                    : (isBento ? 'bg-rose-200 border-2 border-black' : 'bg-rose-500/10 text-rose-500')
                                            }`}>
                                                {passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                            </div>
                                            <div className="truncate">
                                                <h4 className="font-black text-sm truncate">{attempt.quizTitle}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                                    {new Date(attempt.completedAt).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                    {attempt.timeTaken > 0 && ` • ${Math.round(attempt.timeTaken)}s`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className={`font-tabular text-base font-black ${
                                                passed ? (isBento ? 'text-black' : 'text-emerald-500') : 'text-rose-500'
                                            }`}>
                                                {attempt.percentage}%
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold">
                                                {attempt.score} / {attempt.totalQuestions} pts
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
