import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { UserData, AttemptData, BadgeDefinition, Tournament } from '../types/index.ts';
import { formatLocalizedTournamentDateTime } from '../utils/timezoneUtils';
import {
    Trophy, Download, Award, Loader2, Star, Zap, Flame,
    Settings, Calendar, History, FileText, Eye,
    ShieldCheck, Gift, CheckCircle2, Sparkles, Pencil,
    Search, ChevronLeft, ChevronRight, CheckCircle, Package, X, Lock,
    LayoutDashboard, Palette, RefreshCw, Check, Compass, Swords, Shield,
    ShoppingBag, BarChart2, ArrowRight
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar.tsx';
import { AmbientBackground } from './AmbientBackground';
import { Certificate } from './Certificate.tsx';
import { calculateLevel } from '../lib/gamification';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationContext';
import {
    exportQuizHistoryToPDF,
    exportAttemptToPDF
} from '../lib/exportUtils';
import AttemptDetailsModal from './admin/AttemptDetailsModal.tsx';
import UserSettings from './UserSettings.tsx';
import Avatar from './Avatar';
import AvatarEditor from './AvatarEditor';
import { StreakRewardModal } from './gamification/StreakRewardModal';
import { useTheme } from '../context/ThemeContext.tsx';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';
import ThemeSkeletonPreviewCards from './ThemeSkeletonPreviewCards';

interface UserProfileProps {
    user: UserData;
    attempts: AttemptData[];
    allUsers: UserData[];
    onBack: () => void;
    onUserUpdate?: (updatedUser: UserData) => void;
}

const BadgeIcon = ({ icon, className }: { icon: string, className?: string }) => {
    if (!icon) return <Award className={className} />;
    if (/[\p{Emoji}\u200d]+/u.test(icon) || icon.length <= 4) {
        return <span className="select-none leading-none inline-flex items-center justify-center text-lg">{icon}</span>;
    }
    switch (icon) {
        case 'Trophy': return <Trophy className={className} />;
        case 'Star': return <Star className={className} />;
        case 'Zap': return <Zap className={className} />;
        case 'Flame': return <Flame className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'Swords': return <Swords className={className} />;
        case 'Compass': return <Compass className={className} />;
        default: return <Award className={className} />;
    }
};

const getRarityBadgeClasses = (rarity?: string, isBento = false) => {
    switch (rarity) {
        case 'mythic':
            return isBento
                ? 'bg-[#f472b6] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white shadow-rose-500/25';
        case 'legendary':
            return isBento
                ? 'bg-[#fde047] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/25';
        case 'epic':
            return isBento
                ? 'bg-[#c084fc] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-purple-500/25';
        case 'rare':
            return isBento
                ? 'bg-[#38bdf8] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-sky-500/25';
        case 'common':
        default:
            return isBento
                ? 'bg-slate-200 text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200';
    }
};

const getBadgeProgress = (badge: Partial<BadgeDefinition>, user: UserData, attempts: AttemptData[]) => {
    const type = badge.criteria?.type || '';
    const threshold = Number(badge.criteria?.threshold) || 1;

    let current = 0;
    let unit = '';

    switch (type) {
        case 'total_attempts':
            current = Math.max(user.totalAttempts || 0, attempts.length);
            unit = 'Quizzes';
            break;
        case 'perfect_score':
            current = attempts.filter(a => a.percentage === 100).length;
            unit = 'Perfect';
            break;
        case 'streak':
            current = user.streak || 0;
            unit = 'Days';
            break;
        case 'speed_demon': {
            const passedAttempts = attempts.filter(a => a.passed && a.timeTaken > 0);
            const fastest = passedAttempts.length > 0 ? Math.min(...passedAttempts.map(a => a.timeTaken)) : 0;
            const pct = fastest > 0 && fastest <= threshold ? 100 : fastest > 0 ? Math.min(100, Math.round((threshold / fastest) * 100)) : 0;
            return {
                current: fastest > 0 ? `${fastest}s` : '—',
                target: `${threshold}s`,
                unit: '',
                pct
            };
        }
        case 'level':
            current = user.level || 1;
            unit = 'Lvl';
            break;
        case 'total_score':
            current = user.totalScore || 0;
            unit = 'Pts';
            break;
        case 'track_started':
            current = (user.primaryTrackId || (user.skillTracks && user.skillTracks.length > 0)) ? 1 : 0;
            unit = 'Road';
            break;
        case 'track_modules':
            current = (user.skillTracks || []).reduce((acc, t) => acc + (t.completedModules?.length || 0), 0);
            unit = 'Modules';
            break;
        case 'clans':
            current = user.clanId ? 1 : 0;
            unit = 'Clan';
            break;
        case 'clan_contribution': {
            const userRecord = user as unknown as Record<string, unknown>;
            current = Number(userRecord.clanContribution ?? userRecord.contribution ?? 0);
            unit = 'XP';
            break;
        }
        case 'friend_count':
            current = user.friends?.length || 0;
            unit = 'Friends';
            break;
        case 'challenges': {
            const userRecord = user as unknown as Record<string, unknown>;
            current = Number(userRecord.challengeCount ?? (Array.isArray(userRecord.challenges) ? userRecord.challenges.length : 0));
            unit = 'Duels';
            break;
        }
        case 'challenge_wins': {
            const userRecord = user as unknown as Record<string, unknown>;
            current = Number(userRecord.challengeWins ?? userRecord.challengesWon ?? 0);
            unit = 'Wins';
            break;
        }
        default:
            current = 0;
            unit = 'Goal';
    }

    const pct = Math.min(100, Math.max(0, Math.round((Number(current) / threshold) * 100)));
    return { current, target: threshold, unit, pct };
};

export type ProfileTab =
    | 'overview'
    | 'badges'
    | 'history'
    | 'inventory'
    | 'certificates'
    | 'appearance'
    | 'settings';

const UserProfile: React.FC<UserProfileProps> = ({ user, attempts, allUsers, onBack, onUserUpdate }) => {
    const { theme, isBento } = useTheme();
    const { logout } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const initialTab = useMemo<ProfileTab>(() => {
        const t = searchParams.get('tab');
        if (t === 'badges' || t === 'history' || t === 'inventory' || t === 'certificates' || t === 'appearance' || t === 'settings') {
            return t;
        }
        return 'overview';
    }, [searchParams]);
    const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserData>(user);
    const [inspectingAttempt, setInspectingAttempt] = useState<AttemptData | null>(null);
    const [exportingAttemptId, setExportingAttemptId] = useState<string | null>(null);

    // Badge Vault & Trophy Showcase state
    const [allCatalogBadges, setAllCatalogBadges] = useState<BadgeDefinition[]>([]);
    const [badgeFilterStatus, setBadgeFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
    const [badgeFilterCategory, setBadgeFilterCategory] = useState<string>('all');
    const [badgeSearch, setBadgeSearch] = useState<string>('');
    const [isEvaluatingBadges, setIsEvaluatingBadges] = useState(false);
    const [isEquippingBadgeId, setIsEquippingBadgeId] = useState<string | null>(null);
    const [joinedTournaments, setJoinedTournaments] = useState<Tournament[]>([]);
    const [loadingTournaments, setLoadingTournaments] = useState(false);

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

    // Fetch tournaments the user has joined or requested to join
    const fetchJoinedTournaments = React.useCallback(async () => {
        if (!currentUser?.userId) return;
        setLoadingTournaments(true);
        try {
            const all = await api.getTournaments(currentUser.userId);
            if (!Array.isArray(all)) return;
            const mine = all
                .filter((t) =>
                    (t.myStatus && t.myStatus !== 'none') ||
                    (Array.isArray(t.participants) &&
                        t.participants.some((p) =>
                            typeof p === 'string' ? p === currentUser.userId : p.userId === currentUser.userId
                        ))
                )
                .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
            setJoinedTournaments(mine);
        } catch (err) {
            console.error('Failed to fetch joined tournaments', err);
        } finally {
            setLoadingTournaments(false);
        }
    }, [currentUser.userId]);

    useEffect(() => {
        fetchJoinedTournaments();
    }, [fetchJoinedTournaments]);

    // Fetch default catalog badges and auto-evaluate achievements on profile mount
    useEffect(() => {
        let isMounted = true;
        const fetchBadgesAndEvaluate = async () => {
            try {
                const res = await api.getBadges();
                if (isMounted && res?.data) {
                    setAllCatalogBadges(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch badges catalog', err);
            }

            // Automatically check and award unlocked badges when loading profile
            try {
                const evalRes = await api.evaluateBadges(currentUser.userId);
                if (isMounted && evalRes.success && evalRes.user) {
                    handleUserUpdate(evalRes.user);
                    const count = evalRes.newBadges?.length || 0;
                    if (count > 0) {
                        showNotification('success', `🎉 Unlocked ${count} new badge${count > 1 ? 's' : ''}! +${evalRes.xpGained || 0} XP`);
                    }
                }
            } catch {
                // Background evaluation silently completes
            }
        };
        fetchBadgesAndEvaluate();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSyncBadges = async () => {
        setIsEvaluatingBadges(true);
        try {
            const res = await api.evaluateBadges(currentUser.userId);
            if (res.success) {
                if (res.user) {
                    handleUserUpdate(res.user);
                }
                const count = res.newBadges?.length || 0;
                if (count > 0) {
                    showNotification('success', `🎉 Unlocked ${count} new badge${count > 1 ? 's' : ''}! +${res.xpGained || 0} XP`);
                } else {
                    showNotification('info', 'Trophies up to date! Keep playing to unlock more trophies.');
                }
            }
        } catch (err) {
            console.error('Failed to sync badges', err);
            showNotification('error', 'Failed to sync badges. Please try again.');
        } finally {
            setIsEvaluatingBadges(false);
        }
    };

    const handleEquipBadge = async (badgeId: string | null) => {
        setIsEquippingBadgeId(badgeId || 'unequip');
        try {
            const res = await api.equipBadge(badgeId, currentUser.userId);
            if (res.success && res.user) {
                handleUserUpdate(res.user);
                showNotification('success', badgeId ? 'Badge equipped to your title!' : 'Badge unequipped');
            }
        } catch (err) {
            console.error('Failed to equip badge', err);
            showNotification('error', 'Failed to equip badge');
        } finally {
            setIsEquippingBadgeId(null);
        }
    };

    const equippedBadge = useMemo(() => {
        if (!currentUser.equippedBadgeId) return null;
        const earned = currentUser.badges?.find(b => b.id === currentUser.equippedBadgeId);
        if (earned) return earned;
        const catalog = allCatalogBadges.find(b => b.id === currentUser.equippedBadgeId || b._id === currentUser.equippedBadgeId);
        if (catalog) {
            return {
                id: catalog.id || catalog._id || '',
                name: catalog.name,
                description: catalog.description,
                icon: catalog.icon,
                title: catalog.title,
                rarity: catalog.rarity,
                category: catalog.category,
                xpReward: catalog.xpReward,
                dateEarned: new Date().toISOString()
            };
        }
        return null;
    }, [currentUser.equippedBadgeId, currentUser.badges, allCatalogBadges]);

    const userEarnedMap = useMemo(() => {
        const map = new Map<string, NonNullable<UserData['badges']>[number]>();
        (currentUser.badges || []).forEach(b => {
            map.set(b.id, b);
        });
        return map;
    }, [currentUser.badges]);

    const combinedBadgeList = useMemo(() => {
        const list: Array<BadgeDefinition & { isUnlocked: boolean; dateEarned?: string }> = [];
        const seenIds = new Set<string>();

        allCatalogBadges.forEach(b => {
            const id = b.id || b._id;
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                const earned = userEarnedMap.get(id);
                list.push({
                    ...b,
                    id,
                    isUnlocked: Boolean(earned),
                    dateEarned: earned?.dateEarned,
                    rarity: b.rarity || earned?.rarity || 'common',
                    category: b.category || earned?.category || 'milestones',
                    xpReward: b.xpReward || earned?.xpReward || 50,
                    title: b.title || earned?.title
                });
            }
        });

        (currentUser.badges || []).forEach(b => {
            if (b.id && !seenIds.has(b.id)) {
                seenIds.add(b.id);
                list.push({
                    id: b.id,
                    name: b.name,
                    description: b.description,
                    icon: b.icon,
                    title: b.title,
                    isUnlocked: true,
                    dateEarned: b.dateEarned,
                    rarity: b.rarity || 'common',
                    category: b.category || 'milestones',
                    xpReward: b.xpReward || 50
                });
            }
        });

        return list;
    }, [allCatalogBadges, userEarnedMap, currentUser.badges]);

    const filteredBadges = useMemo(() => {
        return combinedBadgeList.filter(badge => {
            if (badgeFilterStatus === 'unlocked' && !badge.isUnlocked) return false;
            if (badgeFilterStatus === 'locked' && badge.isUnlocked) return false;
            if (badgeFilterCategory !== 'all') {
                const bCat = badge.category || '';
                const matchCategory =
                    bCat === badgeFilterCategory ||
                    (badgeFilterCategory === 'skills' && (bCat === 'tracks' || bCat === 'roadmaps')) ||
                    (badgeFilterCategory === 'tracks' && (bCat === 'skills' || bCat === 'roadmaps')) ||
                    (badgeFilterCategory === 'social' && (bCat === 'clans')) ||
                    (badgeFilterCategory === 'clans' && (bCat === 'social'));
                if (!matchCategory) return false;
            }
            if (badgeSearch.trim()) {
                const query = badgeSearch.toLowerCase();
                const matchName = badge.name?.toLowerCase().includes(query);
                const matchTitle = badge.title?.toLowerCase().includes(query);
                const matchDesc = badge.description?.toLowerCase().includes(query);
                if (!matchName && !matchTitle && !matchDesc) return false;
            }
            return true;
        });
    }, [combinedBadgeList, badgeFilterStatus, badgeFilterCategory, badgeSearch]);

    const unlockedBadgesCount = useMemo(() => {
        return combinedBadgeList.filter(b => b.isUnlocked).length;
    }, [combinedBadgeList]);

    const totalEarnedBadgeXp = useMemo(() => {
        return combinedBadgeList
            .filter(b => b.isUnlocked)
            .reduce((sum, b) => sum + (b.xpReward || 0), 0);
    }, [combinedBadgeList]);

    const perfectScoreCount = attempts.filter(a => a.percentage === 100).length;
    const totalQuizzesCount = attempts.length;
    const milestoneBadges = [
        {
            id: 'streak-7',
            title: '7-Day Streak Flame',
            description: 'Maintain an uninterrupted 7-day daily login streak',
            icon: 'Flame',
            current: streak,
            target: 7,
            unit: 'Days',
            unlocked: streak >= 7,
            gradient: 'from-orange-500 to-amber-500'
        },
        {
            id: 'centurion',
            title: 'Quiz Centurion',
            description: 'Complete 100 quiz attempts across all study tracks',
            icon: 'Trophy',
            current: totalQuizzesCount,
            target: 100,
            unit: 'Quizzes',
            unlocked: totalQuizzesCount >= 100,
            gradient: 'from-indigo-500 to-purple-600'
        },
        {
            id: 'master-100',
            title: '100% Mastery Master',
            description: 'Achieve a flawless 100% score on 5 assessments',
            icon: 'Star',
            current: perfectScoreCount,
            target: 5,
            unit: 'Quizzes',
            unlocked: perfectScoreCount >= 5,
            gradient: 'from-amber-400 to-yellow-500'
        },
        {
            id: 'scholar-5',
            title: 'Scholar Adept',
            description: 'Advance to Scholar Level 5 through continuous learning',
            icon: 'Zap',
            current: level,
            target: 5,
            unit: 'Lvl',
            unlocked: level >= 5,
            gradient: 'from-emerald-500 to-teal-500'
        },
        {
            id: 'scholar-10',
            title: 'Grandmaster Tier',
            description: 'Reach prestiged Level 10 status in the arena',
            icon: 'Award',
            current: level,
            target: 10,
            unit: 'Lvl',
            unlocked: level >= 10,
            gradient: 'from-purple-600 to-pink-600'
        },
        {
            id: 'xp-titan',
            title: 'Knowledge Vault',
            description: 'Amass 2,500 total XP points across all categories',
            icon: 'Sparkles',
            current: currentXP,
            target: 2500,
            unit: 'XP',
            unlocked: currentXP >= 2500,
            gradient: 'from-blue-500 to-cyan-500'
        }
    ];

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
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
                showActions={true}
            />

            {/* Mobile Sticky Tab Navigation */}
            <div className={`lg:hidden sticky top-14 z-30 pt-2 pb-2 backdrop-blur-xl border-b px-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none ${
                isBento
                    ? 'bg-white/95 border-b-2 border-black'
                    : 'bg-white/90 dark:bg-[#090d16]/90 border-slate-200 dark:border-white/10'
            }`}>
                {[
                    { id: 'overview' as ProfileTab, label: 'Overview', icon: LayoutDashboard },
                    { id: 'badges' as ProfileTab, label: 'Badges', icon: Award, badge: `${unlockedBadgesCount}` },
                    { id: 'history' as ProfileTab, label: 'Activity', icon: History, badge: `${attempts.length}` },
                    { id: 'inventory' as ProfileTab, label: 'Backpack', icon: Package, badge: `${(currentUser.inventory || []).length}` },
                    { id: 'certificates' as ProfileTab, label: 'Certificates', icon: ShieldCheck, badge: `${activityCounts.mastered}` },
                    { id: 'appearance' as ProfileTab, label: 'Theme', icon: Palette },
                    { id: 'settings' as ProfileTab, label: 'Settings', icon: Settings }
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                isActive
                                    ? isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-600 text-white shadow-sm'
                                    : isBento
                                        ? 'text-black hover:bg-slate-100'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive
                                        ? isBento ? 'bg-black text-[#bef264]' : 'bg-white/20 text-white'
                                        : isBento ? 'bg-black/10 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 flex flex-col lg:flex-row gap-8 items-start">
                {/* Desktop Left Sidebar Drawer */}
                <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-24 space-y-4">
                    <div className={`p-4 rounded-2xl ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-[#111625] border border-slate-200/90 dark:border-white/10 shadow-lg'
                    }`}>
                        <div className="px-3 py-2 mb-2 border-b border-slate-200/60 dark:border-white/10">
                            <p className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-slate-400'}`}>
                                Profile Navigation
                            </p>
                        </div>

                        <nav className="flex flex-col gap-1.5">
                            {[
                                { id: 'overview' as ProfileTab, label: 'Overview & Stats', icon: LayoutDashboard, badge: `Lvl ${level}` },
                                { id: 'badges' as ProfileTab, label: 'Badges & Trophies', icon: Award, badge: `${unlockedBadgesCount} Earned` },
                                { id: 'history' as ProfileTab, label: 'Activity & History', icon: History, badge: `${attempts.length} Quizzes` },
                                { id: 'inventory' as ProfileTab, label: 'Backpack & Loot', icon: Package, badge: `${(currentUser.inventory || []).length} Items` },
                                { id: 'certificates' as ProfileTab, label: 'Certificates', icon: ShieldCheck, badge: `${activityCounts.mastered} Earned` },
                                { id: 'appearance' as ProfileTab, label: 'Theme Switcher', icon: Palette, badge: isBento ? 'BENTO' : theme.toUpperCase() },
                                { id: 'settings' as ProfileTab, label: 'Account Settings', icon: Settings }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full h-11 px-3 rounded-xl font-black text-xs sm:text-[13px] flex items-center justify-between gap-2 transition-all cursor-pointer border-2 ${
                                            isActive
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-black shadow-[2.5px_2.5px_0px_#000]'
                                                    : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                                                : isBento
                                                    ? 'text-black border-transparent hover:bg-slate-100'
                                                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? (isBento ? 'text-black' : 'text-white') : ''}`} />
                                            <span className="truncate whitespace-nowrap">{tab.label}</span>
                                        </div>
                                        {tab.badge && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${
                                                isActive
                                                    ? isBento ? 'bg-black text-white' : 'bg-white/20 text-white'
                                                    : isBento ? 'bg-slate-200 text-black border border-black' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Sidebar User Quick Card */}
                    <div className={`p-4 rounded-2xl ${
                        isBento
                            ? 'bg-[#fef9c3] text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-[#111625] border border-slate-200/90 dark:border-white/10 shadow-sm'
                    }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${isBento ? 'border-2 border-black' : 'ring-2 ring-indigo-500/30'}`}>
                                {currentUser.avatar ? (
                                    <Avatar config={currentUser.avatar} size="sm" className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black truncate">{currentUser.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-black/10 dark:border-white/10">
                            <span className="opacity-75">Global Rank</span>
                            <span className="font-black text-indigo-600 dark:text-indigo-400">#{rank}</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 w-full min-w-0">
                    {/* TAB 1: OVERVIEW & STATS */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            {/* Profile Card */}
                            <div className="relative glass-card rounded-2xl p-6 sm:p-8 overflow-hidden mb-8">
                                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
                        <div className="relative group">
                            <div className={`w-32 h-32 rounded-full relative z-10 group-hover:scale-105 transition-transform duration-300 ${
                                isBento
                                    ? 'border-[3px] border-black shadow-[4px_4px_0px_#000] bg-white'
                                    : 'ring-4 ring-indigo-500/50 shadow-2xl bg-white dark:bg-[#0a0a0b]'
                            }`}>
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
                                className={`absolute bottom-0 right-0 z-20 p-2.5 rounded-full transition-all cursor-pointer hover:scale-110 ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-[#fde047]'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-4 border-white dark:border-[#13141f] hover:shadow-indigo-500/25'
                                }`}
                                title="Customize Avatar"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left w-full">
                            <div className="mb-6">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                    <span>{currentUser.name}</span>
                                    <span className="text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full font-black shadow-sm border border-white/20 transform hover:scale-105 transition-transform cursor-default">
                                        Lvl {currentUser.level || 1}
                                    </span>
                                    {equippedBadge && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = document.getElementById('badge-vault-section');
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all transform hover:scale-105 cursor-pointer shadow-sm ${getRarityBadgeClasses(equippedBadge.rarity, isBento)}`}
                                            title={`Equipped: ${equippedBadge.name}${equippedBadge.title ? ` • ${equippedBadge.title}` : ''} (${(equippedBadge.rarity || 'common').toUpperCase()}) - Click to view in Vault`}
                                        >
                                            <BadgeIcon icon={equippedBadge.icon} className="w-3.5 h-3.5" />
                                            <span>{equippedBadge.title || equippedBadge.name}</span>
                                        </button>
                                    )}
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
                        <div className={`p-5 rounded-2xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
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
                        <div className={`p-5 rounded-2xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
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
                        <div className={`p-5 rounded-2xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
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
                        <div className={`p-5 rounded-2xl relative overflow-hidden group transition-transform hover:-translate-y-0.5 ${
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
                    <div className={`profile-section-card rounded-2xl p-6 ${
                        isBento
                            ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
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
                                        className={`p-3.5 rounded-xl flex flex-col items-center justify-between text-center transition-all relative overflow-hidden group hover:-translate-y-1 ${cardClass}`}
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

                {/* Overview Quick Navigation Hub Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Performance Analytics Page Link Card */}
                    <div className={`p-6 rounded-2xl flex flex-col justify-between transition-all ${
                        isBento
                            ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-pink-600/10 dark:from-indigo-500/15 dark:via-purple-500/15 dark:to-pink-500/10 border border-indigo-500/30 text-slate-900 dark:text-white shadow-sm'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                }`}>
                                    <BarChart2 className="w-5 h-5" />
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]'
                                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25'
                                }`}>
                                    Dedicated Hub
                                </span>
                            </div>
                            <h4 className="text-lg font-black tracking-tight mb-1.5">
                                Performance Analytics &amp; Insights
                            </h4>
                            <p className={`text-xs font-medium leading-relaxed mb-5 ${
                                isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'
                            }`}>
                                Deep-dive into your subject mastery, personalized weak-spot diagnostics, pass rates, and AI study roadmap on the full Analytics page.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/analytics')}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-black text-white border-2 border-black hover:bg-neutral-800'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25'
                            }`}
                        >
                            <span>Open Full Analytics Page</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 2. Badges & Achievements Preview Card */}
                    <div className={`p-6 rounded-2xl flex flex-col justify-between transition-all ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-amber-500/15 text-amber-500'
                                    }`}>
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                                            Badges &amp; Trophies
                                        </h4>
                                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                            {unlockedBadgesCount} of {combinedBadgeList.length} unlocked
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                    +{totalEarnedBadgeXp} XP
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {combinedBadgeList.slice(0, 6).map((b) => (
                                    <div
                                        key={b.id}
                                        className={`p-2 rounded-xl flex flex-col items-center text-center border ${
                                            b.isUnlocked
                                                ? isBento
                                                    ? 'bg-[#fef9c3] border-black text-black'
                                                    : 'bg-amber-500/5 border-amber-500/20 text-gray-900 dark:text-white'
                                                : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200/60 dark:border-white/5 opacity-50'
                                        }`}
                                    >
                                        <BadgeIcon icon={b.icon} className="w-5 h-5 mb-1" />
                                        <span className="text-[10px] font-bold truncate w-full">{b.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('badges')}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-gray-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-gray-800 dark:text-gray-200'
                            }`}
                        >
                            <span>Explore Badge Vault</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* 3. Recent Activity Preview Card */}
                    <div className={`p-6 rounded-2xl flex flex-col justify-between transition-all ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                    }`}>
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isBento
                                            ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-purple-500/15 text-purple-500'
                                    }`}>
                                        <History className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                                            Recent Activity
                                        </h4>
                                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                            {activityCounts.total} total attempts • {activityCounts.mastered} diplomas
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {sortedAttempts.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    No quiz attempts recorded yet. Start a quiz to build your history!
                                </div>
                            ) : (
                                <div className="space-y-2 mb-5">
                                    {sortedAttempts.slice(0, 3).map((att) => (
                                        <div
                                            key={att.attemptId}
                                            className={`px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs ${
                                                isBento
                                                    ? 'bg-slate-50 border border-black text-black'
                                                    : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5'
                                            }`}
                                        >
                                            <span className="font-bold truncate">{att.quizTitle}</span>
                                            <span className={`font-black shrink-0 ${
                                                (att.percentage || 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                {Math.round(att.percentage || 0)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-gray-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-gray-800 dark:text-gray-200'
                            }`}
                        >
                            <span>View All Activity ({activityCounts.total})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 2: BADGES & TROPHY VAULT */}
        {activeTab === 'badges' && (
            <div className="space-y-8 animate-in fade-in duration-200">
                {/* Unique Milestone Badges Showcase Grid */}
                <div className={`profile-section-card rounded-2xl p-6 sm:p-8 ${
                    isBento
                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                        : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                }`}>
                    <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-500" />
                                    <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        Milestone Badges &amp; Achievements
                                    </h4>
                                </div>
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                    {milestoneBadges.filter(m => m.unlocked).length} / {milestoneBadges.length} Unlocked
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {milestoneBadges.map((milestone) => {
                                    const progressPct = Math.min(100, Math.round((milestone.current / milestone.target) * 100));
                                    return (
                                        <div
                                            key={milestone.id}
                                            className={`p-4 rounded-xl transition-all relative overflow-hidden flex flex-col justify-between ${
                                                isBento
                                                    ? milestone.unlocked
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                        : 'bg-white text-black border-2 border-black/70 shadow-[2px_2px_0px_#000]'
                                                    : milestone.unlocked
                                                        ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/30 text-slate-900 dark:text-white shadow-sm'
                                                        : 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2.5">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                        : milestone.unlocked
                                                            ? `bg-gradient-to-br ${milestone.gradient} text-white shadow-md`
                                                            : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                                                }`}>
                                                    <BadgeIcon icon={milestone.icon} className="w-5 h-5" />
                                                </div>

                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        milestone.unlocked
                                                            ? isBento ? 'bg-black text-white' : 'bg-emerald-500 text-white'
                                                            : isBento ? 'bg-black/10 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {milestone.unlocked ? '✓ Unlocked' : `${progressPct}%`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <h5 className="font-black text-sm tracking-tight leading-snug">{milestone.title}</h5>
                                                <p className="text-[11px] opacity-75 font-medium leading-relaxed mt-0.5 line-clamp-2">
                                                    {milestone.description}
                                                </p>
                                            </div>

                                            <div className="mt-auto pt-2">
                                                <div className="flex justify-between text-[10px] font-black mb-1 opacity-80">
                                                    <span>Progress</span>
                                                    <span>{milestone.current} / {milestone.target} {milestone.unit}</span>
                                                </div>
                                                <div className={`h-2 rounded-full overflow-hidden ${
                                                    isBento ? 'bg-black/10 border border-black' : 'bg-slate-200 dark:bg-white/10'
                                                }`}>
                                                    <div
                                                        className={`h-full transition-all duration-700 ${
                                                            isBento
                                                                ? 'bg-black'
                                                                : milestone.unlocked ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>


                {/* Badge Vault & Trophy Showcase */}
                <div id="badge-vault-section" className="mb-12 scroll-mt-24">
                    <div className={`rounded-[2.5rem] p-6 sm:p-8 transition-all ${
                        isBento
                            ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                    }`}>
                        {/* Header with Title, Stats & Sync Button */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500/10 rounded-2xl">
                                        <Trophy className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                            Badge Vault & Trophy Showcase
                                        </h3>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            Unlock achievements, earn XP boosts, and equip your title across clans and leaderboards
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black text-xs uppercase tracking-wider border border-indigo-500/20">
                                    🏆 {unlockedBadgesCount} / {combinedBadgeList.length} Unlocked
                                </div>
                                <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-wider border border-amber-500/20">
                                    ⚡ +{totalEarnedBadgeXp} XP Boost
                                </div>
                                <button
                                    onClick={handleSyncBadges}
                                    disabled={isEvaluatingBadges}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] disabled:opacity-50'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50'
                                    }`}
                                    title="Evaluate all recent progress and sync new badge unlocks"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingBadges ? 'animate-spin' : ''}`} />
                                    <span>{isEvaluatingBadges ? 'Checking...' : 'Sync Badges'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Filter Toolbar: Status tabs, Categories, and Search */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-white/5">
                            {/* Status Tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5">
                                {(
                                    [
                                        { id: 'all', label: `All (${combinedBadgeList.length})` },
                                        { id: 'unlocked', label: `Unlocked (${unlockedBadgesCount})` },
                                        { id: 'locked', label: `Locked (${Math.max(0, combinedBadgeList.length - unlockedBadgesCount)})` },
                                    ] as const
                                ).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setBadgeFilterStatus(tab.id)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            badgeFilterStatus === tab.id
                                                ? isBento
                                                    ? 'bg-black text-white shadow-sm'
                                                    : 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative flex-1 max-w-xs">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={badgeSearch}
                                    onChange={(e) => setBadgeSearch(e.target.value)}
                                    placeholder="Search badges or titles..."
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                {badgeSearch && (
                                    <button
                                        onClick={() => setBadgeSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
                            {[
                                { id: 'all', label: 'All Categories' },
                                { id: 'milestones', label: 'Milestones' },
                                { id: 'perfection', label: 'Perfection' },
                                { id: 'streaks', label: 'Streaks' },
                                { id: 'speed', label: 'Speed' },
                                { id: 'xp', label: 'XP & Levels' },
                                { id: 'tracks', label: 'Roadmaps' },
                                { id: 'clans', label: 'Clans & Social' },
                                { id: 'arena', label: 'Arena' },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setBadgeFilterCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        badgeFilterCategory === cat.id
                                            ? isBento
                                                ? 'bg-[#fde047] text-black border border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-indigo-600 text-white shadow-sm'
                                            : isBento
                                                ? 'bg-white text-gray-700 border border-black hover:bg-gray-100'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Badges Grid */}
                        {filteredBadges.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-gray-50/50 dark:bg-black/10 rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                                <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Badges Found</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    No badges match your active filters or search terms. Try clearing filters or sync your badges!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredBadges.map((badge) => {
                                    const isEquipped = currentUser.equippedBadgeId === badge.id;
                                    const progress = getBadgeProgress(badge, currentUser, attempts);

                                    return (
                                        <div
                                            key={badge.id}
                                            className={`group relative rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 ${
                                                badge.isUnlocked
                                                    ? isBento
                                                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                                                        : 'bg-white dark:bg-[#1a1b26] border border-gray-200/80 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-indigo-500/40 hover:-translate-y-0.5'
                                                    : isBento
                                                        ? 'bg-gray-50 border border-black/40 opacity-80'
                                                        : 'bg-gray-50/60 dark:bg-[#12131c]/60 border border-gray-200/50 dark:border-white/5 opacity-75 hover:opacity-90'
                                            }`}
                                        >
                                            {/* Top Row: Rarity tag, XP reward, Lock / Equip indicator */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    badge.isUnlocked
                                                        ? getRarityBadgeClasses(badge.rarity, isBento)
                                                        : 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    {badge.rarity || 'common'}
                                                </span>

                                                <div className="flex items-center gap-1.5">
                                                    {badge.xpReward && (
                                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                            +{badge.xpReward} XP
                                                        </span>
                                                    )}
                                                    {!badge.isUnlocked && (
                                                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Badge Icon & Name */}
                                            <div className="flex items-center gap-3.5 mb-3">
                                                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                                                    badge.isUnlocked
                                                        ? isBento
                                                            ? 'bg-amber-100 border border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md'
                                                        : 'bg-gray-200 dark:bg-white/5 text-gray-400'
                                                }`}>
                                                    <BadgeIcon icon={badge.icon} className={`w-7 h-7 ${badge.isUnlocked ? '' : 'grayscale opacity-60'}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-gray-900 dark:text-white text-sm tracking-tight truncate">
                                                        {badge.name}
                                                    </h4>
                                                    {badge.title && (
                                                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                                            «{badge.title}»
                                                        </p>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block">
                                                        {badge.category || 'Achievement'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                                {badge.description}
                                            </p>

                                            {/* Footer: Unlocked Action vs Locked Progress Bar */}
                                            <div className="pt-3 border-t border-gray-100 dark:border-white/5 mt-auto">
                                                {badge.isUnlocked ? (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-medium text-gray-400">
                                                            {badge.dateEarned ? `Unlocked ${new Date(badge.dateEarned).toLocaleDateString()}` : 'Unlocked'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleEquipBadge(isEquipped ? null : badge.id)}
                                                            disabled={isEquippingBadgeId === badge.id}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                isEquipped
                                                                    ? isBento
                                                                        ? 'bg-[#bef264] text-black border border-black shadow-[2px_2px_0px_#000]'
                                                                        : 'bg-emerald-600 text-white shadow-sm'
                                                                    : isBento
                                                                        ? 'bg-white text-black border border-black hover:bg-gray-100 shadow-[1px_1px_0px_#000]'
                                                                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-indigo-600 hover:text-white'
                                                            }`}
                                                            title={isEquipped ? 'Click to unequip badge title' : 'Equip this badge as your displayed title'}
                                                        >
                                                            {isEquippingBadgeId === badge.id ? (
                                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                            ) : isEquipped ? (
                                                                <>
                                                                    <Check className="w-3 h-3" />
                                                                    <span>Equipped</span>
                                                                </>
                                                            ) : (
                                                                <span>Equip</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                                            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Progress</span>
                                                            <span className="text-gray-700 dark:text-gray-300 font-mono">
                                                                {progress.current} / {progress.target} {progress.unit}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-200 dark:bg-black/30 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${
                                                                    isBento ? 'bg-black' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                                                }`}
                                                                style={{ width: `${progress.pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3: ACTIVITY & HISTORY */}
        {activeTab === 'history' && (
            <div className="animate-in fade-in duration-200 space-y-6">
                {/* Tournaments Joined History */}
                <div className={`profile-section-card rounded-2xl overflow-hidden ${
                    isBento
                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
                        : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                }`}>
                    <div className={`p-6 sm:p-8 flex flex-wrap justify-between items-center gap-4 ${
                        isBento
                            ? 'border-b-2 border-black bg-[#fef08a]'
                            : 'border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}>
                                <Trophy className={`w-5 h-5 ${isBento ? 'text-black' : 'text-amber-600 dark:text-amber-400'}`} />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Tournaments Joined</h2>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                                    {joinedTournaments.length} Tournament{joinedTournaments.length === 1 ? '' : 's'} Joined
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={fetchJoinedTournaments}
                                disabled={loadingTournaments}
                                className={`px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 ${
                                    isBento
                                        ? 'bg-white !text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10'
                                }`}
                                title="Refresh joined tournaments"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingTournaments ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/tournaments')}
                                className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white !text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264]'
                                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                }`}
                            >
                                <Swords className="w-4 h-4" />
                                <span>Browse Arenas</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {loadingTournaments ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-sm font-bold text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Loading tournament history...</span>
                            </div>
                        ) : joinedTournaments.length === 0 ? (
                            <div className="text-center py-8 space-y-2">
                                <Trophy className="w-8 h-8 mx-auto text-gray-400 opacity-60" />
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                    You haven't joined any tournaments yet.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {joinedTournaments.map((t) => {
                                    const rawParticipant = t.participants?.find((p) =>
                                        typeof p === 'string' ? p === currentUser.userId : p.userId === currentUser.userId
                                    );
                                    const participant = rawParticipant && typeof rawParticipant !== 'string' ? rawParticipant : undefined;
                                    const joinStatus = t.myStatus || participant?.status || 'pending';
                                    const submitted = Boolean(t.hasSubmitted || participant?.submittedAt);
                                    const nowMs = Date.now();
                                    const startMs = new Date(t.startsAt).getTime();
                                    const endMs = t.endsAt ? new Date(t.endsAt).getTime() : Infinity;
                                    const isEnded = t.status === 'completed' || nowMs > endMs;
                                    const isLive = !isEnded && (t.status === 'active' || t.status === 'live' || nowMs >= startMs);

                                    const statusLabel =
                                        joinStatus === 'approved' ? 'Approved'
                                        : joinStatus === 'rejected' ? 'Rejected'
                                        : 'Pending Approval';

                                    const statusClasses =
                                        joinStatus === 'approved'
                                            ? isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            : joinStatus === 'rejected'
                                                ? isBento ? 'bg-[#fecdd3] text-black border border-black' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                                : isBento ? 'bg-[#fef08a] text-black border border-black' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300';

                                    return (
                                        <div
                                            key={t.tournamentId}
                                            className={`p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                    : 'bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10'
                                            }`}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white leading-snug">
                                                        {t.name}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shrink-0 ${statusClasses}`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatLocalizedTournamentDateTime(t.startsAt, false)}
                                                    </span>
                                                    <span>•</span>
                                                    <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${
                                                        isEnded
                                                            ? isBento ? 'bg-slate-200 text-slate-700 border border-black' : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
                                                            : isLive
                                                                ? isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                                : isBento ? 'bg-[#93c5fd] text-black border border-black' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                        {isEnded ? 'Ended' : isLive ? 'Live Now' : 'Upcoming'}
                                                    </span>
                                                    {submitted && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                                                {t.resultsRevealed && participant?.percentage !== undefined
                                                                    ? `Score: ${Math.round(participant.percentage)}%`
                                                                    : 'Submitted'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/70 dark:border-white/10">
                                                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                                                    Prize: {t.rewardCoins || 1000} Coins
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/tournaments?invite=${encodeURIComponent(t.tournamentId)}`)}
                                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                                        isBento
                                                            ? 'bg-white !text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                    }`}
                                                >
                                                    <span>View Arena</span>
                                                    <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Full Activity & History */}
                <div className={`profile-section-card rounded-2xl overflow-hidden ${
                    isBento
                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000]'
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
                    <div className={`p-4 sm:p-5 flex flex-col gap-4 ${
                        isBento
                            ? 'border-b-2 border-black bg-white'
                            : 'border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#13141f]'
                    }`}>
                        {/* Top: Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none flex-wrap">
                            <button
                                type="button"
                                onClick={() => { setActivityFilter('all'); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                    isBento
                                        ? `border-2 border-black ${activityFilter === 'all' ? 'bg-[#8b5cf6] text-white shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
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
                                        ? `border-2 border-black ${activityFilter === 'pools' ? 'bg-[#38bdf8] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
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
                                        ? `border-2 border-black ${activityFilter === 'mastered' ? 'bg-[#fde047] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
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
                                        ? `border-2 border-black ${activityFilter === 'passed' ? 'bg-[#bef264] text-black shadow-[2px_2px_0px_#000]' : 'bg-white text-gray-800 hover:bg-gray-100 shadow-[1px_1px_0px_#000]'}`
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

                        {/* Bottom: Search Input & Page Size Selector */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                            <div className="relative flex-1 min-w-0">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={activitySearch}
                                    onChange={(e) => { setActivitySearch(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search quiz, score or date..."
                                    className={`w-full pl-10 pr-9 py-2 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none ${
                                        isBento
                                            ? 'bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500'
                                    }`}
                                />
                                {activitySearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setActivitySearch(''); setCurrentPage(1); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Page Size Selector */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <span className={`text-[11px] font-bold ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>
                                    Show:
                                </span>
                                <div className={`flex items-center gap-1 p-0.5 rounded-xl ${
                                    isBento
                                        ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                                }`}>
                                    {([10, 25, 50, 'all'] as const).map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                            className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
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

                        {/* Desktop View (Table with Responsive Wrapper) */}
                        <div className="w-full overflow-x-auto table-responsive">
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
                    )}

                    {/* TAB 4: BACKPACK & LOOT (INVENTORY) */}
                    {activeTab === 'inventory' && (
                        <div className={`p-6 sm:p-8 rounded-2xl animate-in fade-in duration-200 ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                        }`}>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200/80 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-amber-500/15 text-amber-500'
                                    }`}>
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                            Backpack &amp; Power-Up Loot
                                        </h3>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            Manage your active shields, quiz power-ups, and daily challenge tier gifts
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => navigate('/shop')}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                    }`}
                                >
                                    <span>Visit Power-Up Shop</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            {(!currentUser.inventory || currentUser.inventory.length === 0) ? (
                                <div className="text-center py-14 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h4 className="text-base font-black text-gray-900 dark:text-white mb-1">
                                        Your Backpack is Empty
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
                                        Solve daily coding challenges, claim 7-day streak milestones, or visit the shop to stock up on Streak Shields, 50/50 eliminators, and Time Freezes.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/shop')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer ${
                                            isBento
                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        }`}
                                    >
                                        <span>Browse Shop Items</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {currentUser.inventory.map((item, idx) => {
                                        const cleanName = item.itemId
                                            .replace(/[-_]/g, ' ')
                                            .replace(/\b\w/g, c => c.toUpperCase());
                                        const isShield = item.itemId.toLowerCase().includes('shield');
                                        const isHint = item.itemId.toLowerCase().includes('hint') || item.itemId.toLowerCase().includes('50');
                                        const isFreeze = item.itemId.toLowerCase().includes('freeze') || item.itemId.toLowerCase().includes('time');
                                        const emoji = isShield ? '🛡️' : isHint ? '💡' : isFreeze ? '⏳' : '🎁';

                                        return (
                                            <div
                                                key={`${item.itemId}-${idx}`}
                                                className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
                                                    isBento
                                                        ? 'bg-[#fefce8] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                        : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                                                        isBento
                                                            ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-white dark:bg-white/10 shadow-sm'
                                                    }`}>
                                                        {emoji}
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                        isBento
                                                            ? 'bg-black text-white'
                                                            : 'bg-indigo-600 text-white'
                                                    }`}>
                                                        x{item.quantity} Owned
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-base text-gray-900 dark:text-white tracking-tight">
                                                        {cleanName}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {isShield
                                                            ? 'Automatically protects your daily login & coding streak if you miss a day.'
                                                            : isHint
                                                                ? 'Available inside quizzes to eliminate wrong options or reveal guided hints.'
                                                                : isFreeze
                                                                    ? 'Pauses the countdown timer during high-stakes quiz sessions.'
                                                                    : 'Special reward item unlocked from challenges or milestones.'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: EARNED CERTIFICATES & DIPLOMAS */}
                    {activeTab === 'certificates' && (
                        <div className={`p-6 sm:p-8 rounded-2xl animate-in fade-in duration-200 ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                        }`}>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200/80 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-500/15 text-emerald-500'
                                    }`}>
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                            Official Certificates &amp; Diplomas
                                        </h3>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            Download high-resolution verifiable PDF diplomas for 100% mastered quizzes and question pools
                                        </p>
                                    </div>
                                </div>

                                <span className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}>
                                    🎓 {activityCounts.mastered} Earned
                                </span>
                            </div>

                            {sortedAttempts.filter(isCertificateEligible).length === 0 ? (
                                <div className="text-center py-14 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h4 className="text-base font-black text-gray-900 dark:text-white mb-1">
                                        No Certificates Unlocked Yet
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5">
                                        Score 100% on any quiz or complete a full Question Pool cycle to unlock an official downloadable PDF certificate.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer ${
                                            isBento
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        }`}
                                    >
                                        <span>Explore Quizzes</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sortedAttempts.filter(isCertificateEligible).map((attempt) => (
                                        <div
                                            key={attempt.attemptId}
                                            className={`p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all ${
                                                isBento
                                                    ? 'bg-[#fefce8] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 ${
                                                        isBento
                                                            ? 'bg-[#bef264] text-black border border-black'
                                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        ✓ Verified Mastery ({Math.round(attempt.percentage || 100)}%)
                                                    </span>
                                                    <h4 className="font-black text-base text-gray-900 dark:text-white tracking-tight">
                                                        {attempt.quizTitle}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Issued on {new Date(attempt.completedAt).toLocaleDateString()} • ID #{attempt.attemptId.slice(0, 8).toUpperCase()}
                                                    </p>
                                                </div>
                                                <Award className="w-8 h-8 text-amber-500 shrink-0" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleDownloadCertificate(attempt)}
                                                disabled={downloadingAttemptId === attempt.attemptId}
                                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-black text-white border-2 border-black hover:bg-neutral-800 disabled:opacity-50'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50'
                                                }`}
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>
                                                    {downloadingAttemptId === attempt.attemptId ? 'Generating PDF...' : 'Download Certificate (PDF)'}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 6: ACCOUNT SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in duration-200">
                            <UserSettings
                                user={currentUser}
                                onUpdate={handleUserUpdate}
                                embedded={true}
                            />
                        </div>
                    )}

                    {/* TAB 3: APPEARANCE & THEME SWITCHER */}
                    {activeTab === 'appearance' && (
                        <div className={`p-6 sm:p-8 rounded-2xl animate-in fade-in duration-200 ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white dark:bg-[#111625] border border-slate-200/90 dark:border-white/10 shadow-sm'
                        }`}>
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 select-none">
                                    <span className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                    }`}>
                                        <Palette className="w-3.5 h-3.5" />
                                        Visual Appearance
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                    Interface Theme Switcher
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xl">
                                    Preview and select your preferred visual style. Changes apply immediately to every screen and persist in your browser localStorage.
                                </p>
                            </div>

                            <ThemeSkeletonPreviewCards />
                        </div>
                    )}
                </main>
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
            <Footer />
        </div>
    );
};

export default UserProfile;
