import React from 'react';
import type { UserData } from '../types/index.ts';
import { Trophy, Medal, Award, ArrowLeft } from 'lucide-react';

interface LeaderboardProps {
    users: UserData[];
    currentUser: UserData;
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ users, currentUser, onBack }) => {
    // Sort users by total score (descending)
    const rankedUsers = [...users]
        .filter(u => u.totalScore && u.totalScore > 0) // Only users with scores
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .map((user, index) => ({ ...user, rank: index + 1 }));

    const currentUserRank = rankedUsers.find(u => u.userId === currentUser.userId);

    const getMedalIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy className="w-8 h-8 text-yellow-500" />;
            case 2: return <Medal className="w-8 h-8 text-gray-400" />;
            case 3: return <Medal className="w-8 h-8 text-amber-600" />;
            default: return <Award className="w-6 h-6 text-gray-400" />;
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700';
            case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-300 dark:border-gray-600';
            case 3: return 'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-300 dark:border-amber-700';
            default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                🏆 Leaderboard
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">Top performers across all quizzes</p>
                        </div>
                    </div>

                    {/* Current User Rank */}
                    {currentUserRank && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        #{currentUserRank.rank}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">Your Rank</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {currentUserRank.totalScore} points
                                        </div>
                                    </div>
                                </div>
                                <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Leaderboard List */}
                <div className="space-y-3">
                    {rankedUsers.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                No scores yet. Be the first to complete a quiz!
                            </p>
                        </div>
                    ) : (
                        rankedUsers.map((user) => (
                            <div
                                key={user.userId}
                                className={`border-2 rounded-xl p-4 transition-all ${getRankColor(user.rank)} 
                                    ${user.userId === currentUser.userId ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-16 text-center">
                                        {user.rank <= 3 ? (
                                            getMedalIcon(user.rank)
                                        ) : (
                                            <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                                                #{user.rank}
                                            </div>
                                        )}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                                {user.name}
                                            </div>
                                            {user.userId === currentUser.userId && (
                                                <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {user.totalAttempts || 0} quizzes completed
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {user.totalScore}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">points</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
