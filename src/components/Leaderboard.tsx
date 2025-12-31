import React from 'react';
import type { UserData } from '../types/index.ts';
import { Trophy, Medal, Star, TrendingUp, Users, Crown } from 'lucide-react';
import Navbar from './Navbar.tsx';
import Avatar from './Avatar.tsx';

interface LeaderboardProps {
    users: UserData[];
    currentUser: UserData;
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ users, currentUser, onBack }) => {
    // Sort users by total score (descending)
    const rankedUsers = [...users]
        .filter(u => u.totalScore && u.totalScore > 0)
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .map((user, index) => ({ ...user, rank: index + 1 }));

    const topThree = rankedUsers.slice(0, 3);
    const restOfUsers = rankedUsers.slice(3);
    const currentUserRank = rankedUsers.find(u => u.userId === currentUser.userId);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-8 h-8 text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-pulse" />;
            case 2: return <Medal className="w-8 h-8 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]" />;
            case 3: return <Medal className="w-8 h-8 text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.4)]" />;
            default: return null;
        }
    };

    const PodiumUser = ({ user, rank }: { user: UserData & { rank: number }, rank: number }) => {
        const heightMap = { 1: 'h-64', 2: 'h-52', 3: 'h-44' }; // Taller podiums
        const orderMap = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };

        // Premium Gradients for columns
        const podiumGradient = {
            1: 'bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-400 border-yellow-400/30',
            2: 'bg-gradient-to-t from-slate-600 via-slate-500 to-slate-400 border-slate-400/30',
            3: 'bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 border-amber-500/30'
        };

        const avatarBorder = {
            1: 'ring-4 ring-yellow-400 shadow-yellow-500/50',
            2: 'ring-4 ring-slate-300 shadow-slate-400/50',
            3: 'ring-4 ring-amber-600 shadow-amber-600/50'
        };

        return (
            <div className={`flex flex-col items-center justify-end ${orderMap[rank as 1 | 2 | 3]} w-1/3 md:w-40 group cursor-pointer`}>
                {/* User Info above podium */}
                <div className="mb-4 flex flex-col items-center transform transition-transform duration-300 group-hover:-translate-y-2">
                    <div className="relative mb-3">
                        <div className={`w-20 h-20 rounded-full bg-slate-100 dark:bg-[#1e293b] flex items-center justify-center text-3xl font-black text-gray-800 dark:text-white shadow-2xl ${avatarBorder[rank as 1 | 2 | 3]} ring-offset-4 ring-offset-gray-50 dark:ring-offset-[#0f172a] overflow-hidden`}>
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
                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[120px] mb-1">{user.name}</div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 backdrop-blur-sm shadow-sm dark:shadow-none">
                            <span className="text-xs font-black text-gray-900 dark:text-white">{user.totalScore}</span>
                            <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400">PTS</span>
                        </div>
                    </div>
                </div>

                {/* The Podium Column */}
                <div className={`w-full relative ${heightMap[rank as 1 | 2 | 3]} rounded-t-3xl flex flex-col items-center justify-start pt-6 border-t border-x ${podiumGradient[rank as 1 | 2 | 3]} shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:brightness-110`}>
                    <span className="text-6xl font-black text-white/40 dark:text-white/20 select-none mix-blend-overlay">{rank}</span>
                    {rank === 1 && (
                        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-yellow-500/20 to-transparent animate-pulse" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[128px] mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[128px] mix-blend-screen" />
            </div>

            <Navbar
                user={currentUser}
                onBack={onBack}
                showBack={true}
                title="Global Leaderboard"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />

            <main className="relative w-full px-4 sm:px-6 py-12">
                {/* Stats Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/10 flex items-center gap-5 shadow-xl dark:shadow-none">
                        <div className="p-4 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Participants</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{users.length}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-gray-200 dark:border-white/10 flex items-center gap-5 shadow-xl dark:shadow-none">
                        <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Attempts</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{users.reduce((acc, u) => acc + (u.totalAttempts || 0), 0)}</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-3xl shadow-xl shadow-indigo-500/20 flex items-center gap-5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-4 bg-white/20 rounded-2xl text-white backdrop-blur-sm">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-sm text-indigo-100 font-bold uppercase tracking-wider">Your Rank</div>
                            <div className="text-3xl font-black text-white">#{currentUserRank?.rank || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {rankedUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-white/5 rounded-[3rem] border border-gray-200 dark:border-white/10 border-dashed shadow-xl dark:shadow-none">
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
                        <div className="bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                    <h3 className="font-black text-xl uppercase tracking-widest text-gray-900 dark:text-white">Challengers</h3>
                                </div>
                                <span className="px-4 py-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/5">
                                    {restOfUsers.length} Remaining
                                </span>
                            </div>

                            <div className="divide-y divide-gray-200 dark:divide-white/5">
                                {restOfUsers.length === 0 && topThree.length > 0 && (
                                    <div className="p-16 text-center text-gray-500 font-medium">
                                        Top {topThree.length} have claimed all the glory!
                                    </div>
                                )}
                                {restOfUsers.map((user) => (
                                    <div
                                        key={user.userId}
                                        className={`group p-6 flex items-center gap-6 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/5 ${user.userId === currentUser.userId ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="w-12 text-center font-black text-2xl text-gray-400 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                            #{user.rank}
                                        </div>

                                        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xl text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/10 group-hover:border-gray-400 dark:group-hover:border-white/30 group-hover:text-gray-900 dark:group-hover:text-white transition-all overflow-hidden">
                                            {user.avatar ? (
                                                <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                            ) : (
                                                user.name.charAt(0)
                                            )}
                                        </div>

                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-lg text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{user.name}</span>
                                                {user.userId === currentUser.userId && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500 text-white">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400">
                                                Lvl {user.level || 1} • {user.totalAttempts || 0} Attempts
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-2xl font-black text-gray-900 dark:text-white">{user.totalScore}</div>
                                            <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Points</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Leaderboard;
