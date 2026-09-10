import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserData } from '../types/index.ts';
import { Trophy, Medal, Star, TrendingUp, Users, Crown, Shield } from 'lucide-react';
import Navbar from './Navbar.tsx';
import Footer from './Footer.tsx';
import Avatar from './Avatar.tsx';
import { AmbientBackground } from './AmbientBackground';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';


interface ClanLeaderboardEntry {
    clanId: string;
    name: string;
    tag: string;
    description: string;
    level: number;
    totalXP: number;
    memberCount: number;
    leaderName: string;
    rank: number;
    isPublic: boolean;
}

interface LeaderboardProps {
    users: UserData[];
    currentUser: UserData;
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ users, currentUser, onBack }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { isBento } = useTheme();
    const [activeTab, setActiveTab] = useState<'players' | 'clans'>('players');
    const [clanLeaderboard, setClanLeaderboard] = useState<ClanLeaderboardEntry[]>([]);
    const [loadingClans, setLoadingClans] = useState(false);

    // Fetch clan leaderboard
    useEffect(() => {
        const fetchClanLeaderboard = async () => {
            setLoadingClans(true);
            try {
                const data = await api.getClanLeaderboard();
                setClanLeaderboard(data);
            } catch (error) {
                console.error('Failed to load clan leaderboard:', error);
            } finally {
                setLoadingClans(false);
            }
        };

        if (activeTab === 'clans') {
            fetchClanLeaderboard();
        }
    }, [activeTab]);

    // Sort users by total score (descending), excluding admin accounts
    const rankedUsers = [...users]
        .filter(u => u.role !== 'admin' && !u.isAdmin && u.totalScore && u.totalScore > 0)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .map((user, index) => ({ ...user, rank: index + 1 }));

    const topThree = rankedUsers.slice(0, 3);
    const restOfUsers = rankedUsers.slice(3);
    const currentUserRank = rankedUsers.find(u => u.userId === currentUser.userId);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className={`w-8 h-8 ${isBento ? 'text-black' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]'} animate-pulse`} />;
            case 2: return <Medal className={`w-8 h-8 ${isBento ? 'text-black' : 'text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]'}`} />;
            case 3: return <Medal className={`w-8 h-8 ${isBento ? 'text-black' : 'text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.4)]'}`} />;
            default: return null;
        }
    };

    const PodiumUser = ({ user, rank }: { user: UserData & { rank: number }, rank: number }) => {
        const heightMap = { 1: 'h-64 sm:h-72', 2: 'h-48 sm:h-56', 3: 'h-40 sm:h-48' };
        const orderMap = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };

        // Calibrated tints for podium columns
        const podiumGradient = {
            1: isBento
                ? 'bg-[#fde047] text-black border-t-3 border-x-3 border-black shadow-[6px_6px_0px_#000]'
                : 'glass-panel bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-white/[0.02] border-t-2 border-x border-amber-400/40 shadow-lg shadow-amber-500/10',
            2: isBento
                ? 'bg-[#e2e8f0] text-black border-t-3 border-x-3 border-black shadow-[5px_5px_0px_#000]'
                : 'glass-panel bg-gradient-to-t from-slate-400/20 via-slate-300/10 to-white/[0.02] border-t-2 border-x border-slate-300/40 shadow-lg shadow-slate-300/10',
            3: isBento
                ? 'bg-[#fed7aa] text-black border-t-3 border-x-3 border-black shadow-[5px_5px_0px_#000]'
                : 'glass-panel bg-gradient-to-t from-amber-700/20 via-amber-600/10 to-white/[0.02] border-t-2 border-x border-amber-600/40 shadow-lg shadow-amber-600/10'
        };

        const avatarBorder = {
            1: isBento ? 'ring-4 ring-black shadow-[3px_3px_0px_#000]' : 'ring-4 ring-amber-400 shadow-lg shadow-amber-500/30',
            2: isBento ? 'ring-4 ring-black shadow-[3px_3px_0px_#000]' : 'ring-4 ring-slate-300 shadow-lg shadow-slate-300/30',
            3: isBento ? 'ring-4 ring-black shadow-[3px_3px_0px_#000]' : 'ring-4 ring-amber-600 shadow-lg shadow-amber-600/30'
        };

        return (
            <div className={`flex flex-col items-center justify-end ${orderMap[rank as 1 | 2 | 3]} w-1/3 md:w-44 group cursor-pointer`}>
                {/* User Info above podium */}
                <div className="mb-4 flex flex-col items-center transform transition-transform duration-300 group-hover:-translate-y-2">
                    <div className="relative mb-3">
                        <div className={`w-20 h-20 rounded-full bg-slate-100 dark:bg-[#0f1422] flex items-center justify-center text-3xl font-black text-slate-800 dark:text-white shadow-2xl ${avatarBorder[rank as 1 | 2 | 3]} ring-offset-4 ring-offset-slate-50 dark:ring-offset-[#090d16] overflow-hidden`}>
                            {user.avatar ? (
                                <Avatar config={user.avatar} size="lg" className="w-full h-full" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                            {getRankIcon(rank)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className={`font-bold text-sm truncate max-w-[120px] mb-1 ${isBento ? 'text-black font-black' : 'text-slate-900 dark:text-white'}`}>{user.name}</div>
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full shadow-sm ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                : 'glass-card border border-slate-200/80 dark:border-white/10'
                        }`}>
                            <span className="font-tabular text-xs font-black">{user.totalScore?.toLocaleString() || 0}</span>
                            <span className={`text-[9px] font-semibold uppercase tracking-wider ${isBento ? 'text-black/70 font-black' : 'text-slate-400'}`}>PTS</span>
                        </div>
                    </div>
                </div>

                {/* The Podium Column */}
                <div className={`w-full relative ${heightMap[rank as 1 | 2 | 3]} rounded-t-3xl flex flex-col items-center justify-start pt-6 ${podiumGradient[rank as 1 | 2 | 3]} transition-all duration-300 group-hover:brightness-105`}>
                    <span className={`font-tabular text-6xl font-black select-none ${isBento ? 'text-black/25' : 'text-slate-900/15 dark:text-white/15'}`}>{rank}</span>
                    {rank === 1 && !isBento && (
                        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-amber-400/10 to-transparent" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25 overflow-x-hidden relative">
            {/* Ambient Background */}
            <AmbientBackground />

            <Navbar
                user={currentUser}
                onBack={onBack}
                showBack={true}
                title="Global Leaderboard"
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
                showActions={true}
            />

            {/* Tab Navigation */}
            <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
                <div className={`max-w-xs mx-auto p-1.5 rounded-2xl flex gap-1.5 transition-all ${
                    isBento
                        ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]'
                        : 'glass-panel shadow-sm'
                }`}>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`flex-1 py-2 px-4 rounded-xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'players'
                                ? isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : isBento
                                    ? 'text-black/70 hover:bg-black/5'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Players
                    </button>
                    <button
                        onClick={() => setActiveTab('clans')}
                        className={`flex-1 py-2 px-4 rounded-xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'clans'
                                ? isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : isBento
                                    ? 'text-black/70 hover:bg-black/5'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <Shield className="w-4 h-4" />
                        Clans
                    </button>
                </div>
            </div>

            <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
                {activeTab === 'players' ? (
                    <>
                        {/* Stats Header */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
                            <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                    : 'glass-card'
                            }`}>
                                <div className={`p-3.5 rounded-2xl ${
                                    isBento
                                        ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/60' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>Participants</div>
                                    <div className={`font-tabular text-2xl sm:text-3xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white font-extrabold'}`}>{users.length.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                    : 'glass-card'
                            }`}>
                                <div className={`p-3.5 rounded-2xl ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/60' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>Total Attempts</div>
                                    <div className={`font-tabular text-2xl sm:text-3xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white font-extrabold'}`}>{users.reduce((acc, u) => acc + (u.totalAttempts || 0), 0).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden transition-all ${
                                isBento
                                    ? 'bg-[#93c5fd] text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                    : 'glass-panel bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/20 text-white'
                            }`}>
                                <div className={`p-1 rounded-2xl overflow-hidden w-14 h-14 flex items-center justify-center shrink-0 ${
                                    isBento
                                        ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white/10 backdrop-blur-sm'
                                }`}>
                                    {currentUser.avatar ? (
                                        <div className="w-full h-full rounded-xl overflow-hidden">
                                            <Avatar config={currentUser.avatar} size="md" className="w-full h-full" />
                                        </div>
                                    ) : (
                                        <Trophy className={`w-7 h-7 ${isBento ? 'text-black' : 'text-white'}`} />
                                    )}
                                </div>
                                <div className="relative z-10 min-w-0">
                                    <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/70' : 'text-indigo-200 font-semibold'}`}>Your Rank</div>
                                    <div className={`font-tabular text-2xl sm:text-3xl font-black truncate ${isBento ? 'text-black' : 'text-white font-extrabold'}`}>
                                        {(currentUser.role === 'admin' || currentUser.isAdmin)
                                            ? 'Admin (Unranked)'
                                            : `#${currentUserRank?.rank || 'N/A'}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {rankedUsers.length === 0 ? (
                            <div className={`text-center py-20 rounded-[3rem] ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                    : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 border-dashed shadow-xl dark:shadow-none'
                            }`}>
                                <Trophy className="w-24 h-24 text-gray-400 dark:text-gray-700 mx-auto mb-6" />
                                <h2 className="text-3xl font-bold text-gray-500">The Arena is Empty</h2>
                                <p className="text-gray-500 dark:text-gray-600 mt-2">Check back later for rankings.</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* Podium */}
                                {topThree.length >= 1 && (
                                    <div className="relative pt-8 pb-12">
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-500/5 to-transparent rounded-full blur-3xl" />
                                        <div className="flex flex-row items-end justify-center gap-4 md:gap-8 min-h-[400px]">
                                            {topThree.map((user) => (
                                                <PodiumUser key={user.userId} user={user} rank={user.rank} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Leaderboard List */}
                                <div className={`rounded-3xl overflow-hidden transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                        : 'glass-card border border-slate-200/80 dark:border-white/10 shadow-sm'
                                }`}>
                                    <div className={`p-5 sm:p-6 flex justify-between items-center ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-b-3 border-black'
                                            : 'border-b border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] backdrop-blur-md'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <Star className={`w-5 h-5 ${isBento ? 'text-black fill-black' : 'text-amber-400 fill-amber-400'}`} />
                                            <h3 className={`font-black text-base sm:text-lg uppercase tracking-tight ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>Challengers</h3>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black font-tabular ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                                        }`}>
                                            {restOfUsers.length} Remaining
                                        </span>
                                    </div>

                                    <div className={`${isBento ? 'divide-y-2 divide-black' : 'divide-y divide-slate-200/60 dark:divide-white/[0.05]'}`}>
                                        {restOfUsers.length === 0 && topThree.length > 0 && (
                                            <div className="p-12 text-center text-slate-400 font-medium text-sm">
                                                Top {topThree.length} have claimed all the glory!
                                            </div>
                                        )}
                                        {restOfUsers.map((user) => (
                                            <div
                                                key={user.userId}
                                                className={`group p-4 sm:p-5 flex items-center gap-4 sm:gap-5 transition-colors ${
                                                    isBento
                                                        ? user.userId === currentUser.userId
                                                            ? 'bg-[#ddd6fe]/60 border-l-6 border-black'
                                                            : 'hover:bg-amber-50/60'
                                                        : user.userId === currentUser.userId
                                                            ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-l-4 border-indigo-500'
                                                            : 'hover:bg-slate-100/40 dark:hover:bg-white/[0.03] border-l-4 border-transparent'
                                                }`}
                                            >
                                                <div className={`w-10 text-center font-tabular font-black text-lg ${
                                                    isBento ? 'text-black/80 group-hover:text-black' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
                                                } transition-colors`}>
                                                    #{user.rank}
                                                </div>

                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base overflow-hidden shrink-0 transition-all ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20'
                                                }`}>
                                                    {user.avatar ? (
                                                        <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                                    ) : (
                                                        user.name.charAt(0)
                                                    )}
                                                </div>

                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2.5 mb-0.5">
                                                        <span className={`font-black text-sm sm:text-base truncate ${isBento ? 'text-black' : 'text-slate-900 dark:text-slate-100'}`}>{user.name}</span>
                                                        {user.userId === currentUser.userId && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                isBento ? 'bg-black text-white' : 'bg-indigo-600 text-white'
                                                            } shrink-0`}>
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        Lvl {user.level || 1} • <span className="font-tabular">{user.totalAttempts || 0}</span> attempts
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <div className={`font-tabular text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>{user.totalScore?.toLocaleString() || 0}</div>
                                                    <div className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black/70' : 'text-indigo-600 dark:text-indigo-400'}`}>Points</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Clan Leaderboard */
                    <div className="space-y-6">
                        {loadingClans ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Loading clan rankings...</p>
                            </div>
                        ) : clanLeaderboard.length === 0 ? (
                            <div className={`text-center py-16 rounded-3xl ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                    : 'glass-card border border-dashed border-slate-300 dark:border-white/10'
                            }`}>
                                <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
                                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Clans Yet</h2>
                                <p className="text-slate-500 text-sm mt-1">Be the first to establish a clan and claim rank #1!</p>
                            </div>
                        ) : (
                            <>
                                {/* Clan Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                                    <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                            : 'glass-card'
                                    }`}>
                                        <div className={`p-3.5 rounded-2xl ${
                                            isBento
                                                ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                        }`}>
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/60' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>Total Clans</div>
                                            <div className={`font-tabular text-2xl sm:text-3xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white font-extrabold'}`}>{clanLeaderboard.length.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                            : 'glass-card'
                                    }`}>
                                        <div className={`p-3.5 rounded-2xl ${
                                            isBento
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/60' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>Total Members</div>
                                            <div className={`font-tabular text-2xl sm:text-3xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white font-extrabold'}`}>
                                                {clanLeaderboard.reduce((acc, clan) => acc + clan.memberCount, 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`p-5 sm:p-6 rounded-3xl flex items-center gap-4 relative overflow-hidden transition-all ${
                                        isBento
                                            ? 'bg-[#fdba74] text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                                            : 'glass-panel bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/20 text-white'
                                    }`}>
                                        <div className={`p-3 rounded-2xl shrink-0 ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-white/10 text-white backdrop-blur-sm'
                                        }`}>
                                            <Trophy className="w-6 h-6" />
                                        </div>
                                        <div className="relative z-10 min-w-0">
                                            <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black/80' : 'text-indigo-200 font-semibold'}`}>Your Clan Rank</div>
                                            <div className={`font-tabular text-2xl sm:text-3xl font-black truncate ${isBento ? 'text-black' : 'text-white font-extrabold'}`}>
                                                {currentUser.clanId
                                                    ? `#${clanLeaderboard.find(c => c.clanId === currentUser.clanId)?.rank || 'N/A'}`
                                                    : 'None'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Clan Rankings Table */}
                                <div className={`rounded-3xl overflow-hidden transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                        : 'glass-card border border-slate-200/80 dark:border-white/10 shadow-sm'
                                }`}>
                                    <div className={`p-5 sm:p-6 flex justify-between items-center ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-b-3 border-black'
                                            : 'border-b border-slate-200/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] backdrop-blur-md'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <Trophy className={`w-5 h-5 ${isBento ? 'text-black' : 'text-indigo-500'}`} />
                                            <h3 className={`font-black text-base sm:text-lg uppercase tracking-tight ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>Clan Rankings</h3>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black font-tabular ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                                        }`}>
                                            {clanLeaderboard.length} Clans
                                        </span>
                                    </div>

                                    <div className={`${isBento ? 'divide-y-2 divide-black' : 'divide-y divide-slate-200/60 dark:divide-white/[0.05]'}`}>
                                        {clanLeaderboard.map((clan) => {
                                            const isUserClan = clan.clanId === currentUser.clanId;
                                            const getRankBadge = (rank: number) => {
                                                if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
                                                if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
                                                if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
                                                return null;
                                            };

                                            return (
                                                <div
                                                    key={clan.clanId}
                                                    className={`group p-4 sm:p-5 flex items-center gap-4 sm:gap-5 transition-colors ${
                                                        isBento
                                                            ? isUserClan
                                                                ? 'bg-[#ddd6fe]/60 border-l-6 border-black'
                                                                : 'hover:bg-lime-50/60'
                                                            : isUserClan
                                                                ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-l-4 border-indigo-500'
                                                                : 'hover:bg-slate-100/40 dark:hover:bg-white/[0.03] border-l-4 border-transparent'
                                                    }`}
                                                >
                                                    {/* Rank */}
                                                    <div className="w-10 text-center shrink-0">
                                                        {getRankBadge(clan.rank) || (
                                                            <span className={`font-tabular font-black text-lg ${
                                                                isBento ? 'text-black/70 group-hover:text-black' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
                                                            } transition-colors`}>
                                                                #{clan.rank}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Clan Icon */}
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                                        isBento
                                                            ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                                    }`}>
                                                        <Shield className="w-5 h-5" />
                                                    </div>

                                                    {/* Clan Info */}
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`font-black text-sm sm:text-base truncate ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                                                                [{clan.tag}] {clan.name}
                                                            </span>
                                                            {isUserClan && (
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                    isBento ? 'bg-black text-white' : 'bg-indigo-600 text-white'
                                                                } shrink-0`}>
                                                                    Your Clan
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-xs line-clamp-1 ${isBento ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {clan.description || 'No description'}
                                                        </div>
                                                        <div className={`flex items-center gap-3 mt-1.5 text-xs ${isBento ? 'text-black/60 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            <span className="flex items-center gap-1">
                                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="font-tabular">{clan.memberCount}</span> members
                                                            </span>
                                                            <span>•</span>
                                                            <span className="truncate">Leader: {clan.leaderName}</span>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-xs font-semibold mb-0.5 ${isBento ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'}`}>Lvl {clan.level}</div>
                                                        <div className={`font-tabular text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>{clan.totalXP.toLocaleString()}</div>
                                                        <div className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black/70' : 'text-indigo-600 dark:text-indigo-400'}`}>Total XP</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Leaderboard;
