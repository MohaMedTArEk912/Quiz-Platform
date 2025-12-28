import React from 'react';
import type { UserData } from '../types/index.ts';
import { Trophy, Medal, Award, Star, TrendingUp, Users } from 'lucide-react';
import Navbar from './Navbar.tsx';

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
            case 1: return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />;
            case 2: return <Medal className="w-9 h-9 text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]" />;
            case 3: return <Medal className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />;
            default: return <Award className="w-5 h-5 text-indigo-400" />;
        }
    };

    const PodiumUser = ({ user, rank }: { user: UserData & { rank: number }, rank: number }) => {
        const heightMap = { 1: 'h-48 md:h-56', 2: 'h-40 md:h-48', 3: 'h-32 md:h-40' };
        const orderMap = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };
        const shadowMap = {
            1: 'shadow-[0_0_50px_-12px_rgba(234,179,8,0.4)]',
            2: 'shadow-[0_0_50px_-12px_rgba(148,163,184,0.4)]',
            3: 'shadow-[0_0_50px_-12px_rgba(180,83,9,0.4)]'
        };

        return (
            <div className={`flex flex-col items-center justify-end ${orderMap[rank as 1 | 2 | 3]} flex-1 min-w-[100px] transition-all duration-500 hover:transform hover:scale-105`}>
                <div className="mb-4 text-center">
                    <div className="relative inline-block mb-3">
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-white to-indigo-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400 border-4 ${rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-slate-300' : 'border-amber-600'} ${shadowMap[rank as 1 | 2 | 3]}`}>
                            {user.name.charAt(0)}
                        </div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                            {getRankIcon(rank)}
                        </div>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{user.name}</div>
                    <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{user.totalScore} PTS</div>
                </div>
                <div className={`w-full relative ${heightMap[rank as 1 | 2 | 3]} rounded-t-2xl flex flex-col items-center justify-start p-4 transition-all duration-700 ${rank === 1
                        ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[0_-10px_40px_-10px_rgba(234,179,8,0.4)]'
                        : rank === 2
                            ? 'bg-gradient-to-b from-slate-300 to-slate-500'
                            : 'bg-gradient-to-b from-amber-600 to-amber-800'
                    }`}>
                    <span className="text-4xl md:text-6xl font-black text-white/40">{rank}</span>
                    {rank === 1 && (
                        <Star className="w-8 h-8 text-white/50 absolute bottom-4 animate-pulse" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100">
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

            <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                {/* Stats Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl">
                            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Participants</div>
                            <div className="text-2xl font-black">{users.length}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Activity</div>
                            <div className="text-2xl font-black">{users.reduce((acc, u) => acc + (u.totalAttempts || 0), 0)}</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-indigo-600 p-6 rounded-3xl border border-slate-200 dark:border-indigo-500 shadow-xl shadow-indigo-200 dark:shadow-indigo-500/20 flex items-center gap-4 group transition-all duration-300 hover:scale-105">
                        <div className="p-3 bg-indigo-500 dark:bg-white/20 rounded-2xl">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="text-sm text-indigo-100/70 dark:text-indigo-200 font-medium">Your Rank</div>
                            <div className="text-2xl font-black text-indigo-600 dark:text-white">#{currentUserRank?.rank || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {rankedUsers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] p-16 text-center border border-slate-200 dark:border-white/10 border-dashed">
                        <Trophy className="w-24 h-24 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-2">The arena is empty!</h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Be the first champion to claim the gold. Take a quiz and start your journey.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Podium Section */}
                        <div className="flex flex-row items-end justify-center gap-2 md:gap-8 bg-white/50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-white/20 min-h-[400px] shadow-[inset_0_0_100px_rgba(79,70,229,0.05)]">
                            {topThree.map((user) => (
                                <PodiumUser key={user.userId} user={user} rank={user.rank} />
                            ))}
                        </div>

                        {/* Leaderboard List */}
                        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/40 dark:bg-white/5">
                                <h3 className="font-black text-xl uppercase tracking-wider text-slate-400">All Rankings</h3>
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {restOfUsers.length === 0 && topThree.length > 0 && (
                                    <div className="p-12 text-center text-slate-400 font-medium">
                                        End of the leaderboard. More champions needed!
                                    </div>
                                )}
                                {restOfUsers.map((user) => (
                                    <div
                                        key={user.userId}
                                        className={`group p-6 flex items-center gap-6 transition-all duration-300 hover:bg-white/60 dark:hover:bg-white/[0.07] ${user.userId === currentUser.userId ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : ''
                                            }`}
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center font-black text-2xl text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                                            #{user.rank}
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xl text-slate-500 border border-slate-200 dark:border-white/10 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-black text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {user.name}
                                                {user.userId === currentUser.userId && (
                                                    <span className="ml-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-500 text-indigo-700 dark:text-white rounded-lg">
                                                        Hero
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium text-slate-400 uppercase tracking-tighter">
                                                {user.totalAttempts || 0} Attempts • {user.level || 1} Level
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.totalScore}</div>
                                            <div className="text-[10px] font-black text-indigo-500 uppercase">Points</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.2);
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.4);
                }
            `}} />
        </div>
    );
};

export default Leaderboard;
