import React, { useState } from 'react';
import type { UserData, ChallengeData } from '../../types';
import { api } from '../../lib/api';
import { Users, UserPlus, Search, Check, X, Shield, Swords, Zap, Trophy } from 'lucide-react';
import Avatar from '../Avatar';

interface FriendListProps {
    currentUser: UserData;
    allUsers: UserData[];
    onRefresh: () => void;
    onChallenge?: (friendId: string, socket: unknown) => void;
    onAsyncChallenge?: (friendId: string) => void;
    onStartChallenge?: (challenge: ChallengeData) => void;
    challenges?: ChallengeData[];
}

const FriendList: React.FC<FriendListProps> = ({ currentUser, allUsers, onRefresh, onChallenge, onAsyncChallenge, onStartChallenge, challenges = [] }) => {
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add' | 'challenges'>('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Partial<UserData>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const friendsList = currentUser.friends
        ? allUsers.filter(u => currentUser.friends!.includes(u.userId))
        : [];

    const requestList = currentUser.friendRequests
        ? currentUser.friendRequests.filter(r => r.status === 'pending').map(req => {
            const user = allUsers.find(u => u.userId === req.from);
            return { request: req, user };
        })
        : [];

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const results = await api.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendRequest = async (targetId: string) => {
        try {
            await api.sendFriendRequest(targetId);
            setMessage({ type: 'success', text: 'Friend request sent!' });
            setSearchResults(prev => prev.filter(u => u.userId !== targetId));
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: (error as Error).message });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const respond = async (fromId: string, action: 'accept' | 'reject') => {
        try {
            await api.respondToFriendRequest(fromId, action);
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white dark:bg-[#13141f] rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col relative select-none">
            {/* Top Shine */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 relative z-10">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    SOCIAL HUB
                </h2>
            </div>

            {/* Tabs */}
            <div className="flex p-4 gap-2 overflow-x-auto relative z-10">
                {[
                    { id: 'friends', label: 'Friends', count: friendsList.length },
                    { id: 'requests', label: 'Requests', count: requestList.length },
                    { id: 'challenges', label: 'Challenges', count: challenges.length },
                    { id: 'add', label: 'Add Friend', count: null }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        {tab.label} {tab.count !== null && <span className="ml-1 opacity-70">({tab.count})</span>}
                    </button>
                ))}
            </div>

            {/* Content Content */}
            <div className="flex-1 p-6 relative z-10 overflow-y-auto custom-scrollbar">
                {message && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        <span className="font-bold">{message.text}</span>
                    </div>
                )}

                {activeTab === 'friends' && (
                    <div className="space-y-3">
                        {friendsList.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">Your squad is empty. Add some friends!</p>
                            </div>
                        )}
                        {friendsList.map(friend => (
                            <div key={friend.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-inner overflow-hidden">
                                        {friend.avatar ? (
                                            <Avatar config={friend.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            friend.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{friend.name}</div>
                                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                            <span>Rank #{friend.rank || '-'}</span>
                                            <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full" />
                                            <span>Level {friend.level || 1}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {onChallenge && (
                                        <button
                                            onClick={() => onChallenge(friend.userId, null)}
                                            className="p-3 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                                            title="Live Challenge"
                                        >
                                            <Swords className="w-5 h-5" />
                                        </button>
                                    )}
                                    {onAsyncChallenge && (
                                        <button
                                            onClick={() => onAsyncChallenge(friend.userId)}
                                            className="p-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                                            title="Async Challenge"
                                        >
                                            <Zap className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {requestList.length === 0 && (
                            <div className="text-center py-12">
                                <Shield className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No pending requests.</p>
                            </div>
                        )}
                        {requestList.map(({ request, user }) => (
                            <div key={request.createdAt} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-lg overflow-hidden">
                                        {user?.avatar ? (
                                            <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            user?.name.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">{user?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500 font-semibold">Wants to act friendly</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => respond(request.from, 'accept')} className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30"><Check className="w-5 h-5" /></button>
                                    <button onClick={() => respond(request.from, 'reject')} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 border border-red-500/30"><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'add' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 w-5 h-5 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Find users by name..."
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                        </form>

                        <div className="space-y-3">
                            {searchResults.filter(u => u.userId !== currentUser.userId).map(user => {
                                const relationship = user.relationship;
                                const isFriend = relationship === 'friend' || currentUser.friends?.includes(user.userId!);
                                const sentRequest = relationship === 'pending_outgoing' || currentUser.friendRequests?.find(r => r.to === user.userId && r.status === 'pending');
                                const receivedRequest = relationship === 'pending_incoming' || currentUser.friendRequests?.find(r => r.from === user.userId && r.status === 'pending');

                                return (
                                    <div key={user.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-lg border border-white/10 overflow-hidden">
                                                {user.avatar ? (
                                                    <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                                ) : (
                                                    user.name?.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white text-lg">{user.name}</div>
                                                <div className="text-xs text-gray-500 font-medium">{user.email}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {isFriend ? (
                                                <button disabled className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 font-bold text-sm cursor-default flex items-center gap-2">
                                                    <Check className="w-4 h-4" /> Friends
                                                </button>
                                            ) : sentRequest ? (
                                                <button disabled className="px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 font-bold text-sm cursor-default">
                                                    Request Sent
                                                </button>
                                            ) : receivedRequest ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => respond(user.userId!, 'accept')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => respond(user.userId!, 'reject')} className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 border border-red-500/30"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => sendRequest(user.userId!)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl hover:bg-purple-600/30 border border-purple-500/30 font-bold text-sm transition-all"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    ADD
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'challenges' && (
                    <div className="space-y-3">
                        {challenges.length === 0 && (
                            <div className="text-center py-12">
                                <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No active challenges.</p>
                            </div>
                        )}
                        {challenges.map((challenge) => {
                            const isCreator = challenge.fromId === currentUser.userId;
                            const hasPlayed = isCreator ? !!challenge.fromResult : !!challenge.toResult;
                            const opponentId = isCreator ? challenge.toId : challenge.fromId;
                            const opponentUser = allUsers.find(u => u.userId === opponentId);
                            const statusLabel = challenge.status === 'completed'
                                ? 'Completed'
                                : hasPlayed ? 'Waiting for opponent' : 'Pending';

                            return (
                                <div key={challenge.token} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg">
                                            <Swords className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white text-lg">vs {opponentUser?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                                <span className={`${hasPlayed ? 'text-yellow-600 dark:text-yellow-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{statusLabel}</span>
                                                <span className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full" />
                                                <span>Quiz ID: {challenge.quizId.slice(0, 4)}...</span>
                                            </div>
                                        </div>
                                    </div>
                                    {onStartChallenge && (
                                        <button
                                            onClick={() => onStartChallenge(challenge)}
                                            disabled={hasPlayed}
                                            className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border ${hasPlayed
                                                ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                                }`}
                                        >
                                            {hasPlayed ? 'DONE' : 'PLAY'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.5);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}} />
        </div>
    );
};

export default FriendList;
