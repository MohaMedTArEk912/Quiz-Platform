import React, { useState } from 'react';
import type { UserData, ChallengeData } from '../../types';
import { api } from '../../lib/api';
import { Users, UserPlus, Search, Check, X, Shield, Trophy, MessageCircle, Zap, Star, Swords } from 'lucide-react';
import Avatar from '../Avatar';
import { DirectChat } from './DirectChat';
import { useTheme } from '../../context/ThemeContext';


interface FriendListProps {
    currentUser: UserData;
    allUsers: UserData[];
    onRefresh: () => void | Promise<void>;
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
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeChatFriend, setActiveChatFriend] = useState<UserData | null>(null);
    const { isBento } = useTheme();

    // Build a comprehensive friend ID set from:
    // 1. The explicit friends array
    // 2. Accepted incoming friend requests (from field)
    // 3. Accepted outgoing friend requests (to field)
    // This handles data inconsistency where friends array might not be properly synced
    const friendIds = new Set<string>([
        ...(currentUser.friends || []),
        ...((currentUser.friendRequests || [])
            .filter(r => r.status === 'accepted')
            .map(r => r.from === currentUser.userId ? r.to : r.from)
            .filter((id): id is string => Boolean(id)))
    ]);

    const friendsList = allUsers.filter(u => friendIds.has(u.userId));

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
        if (processingIds.has(targetId)) return;

        setProcessingIds(prev => new Set(prev).add(targetId));
        try {
            await api.sendFriendRequest(targetId);
            setMessage({ type: 'success', text: 'Friend request sent!' });
            setSearchResults(prev => prev.filter(u => u.userId !== targetId));
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: (error as Error).message });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(targetId);
                return next;
            });
        }
    };

    const respond = async (fromId: string, action: 'accept' | 'reject') => {
        try {
            await api.respondToFriendRequest(fromId, action);
            await Promise.resolve(onRefresh());
        } catch (error) {
            console.error(error);
        }
    };

    // Bento color rotation for friend cards
    const bentoCardColors = ['#bef264', '#fde047', '#bae6fd', '#ddd6fe'];
    const getBentoColor = (index: number) => bentoCardColors[index % bentoCardColors.length];

    const tabConfig = [
        { id: 'friends', label: 'Friends', count: friendsList.length, icon: Users, bentoColor: '#bef264' },
        { id: 'requests', label: 'Requests', count: requestList.length, icon: Shield, bentoColor: '#fde047' },
        { id: 'challenges', label: 'Challenges', count: challenges.length, icon: Swords, bentoColor: '#bae6fd' },
        { id: 'add', label: 'Add Friend', count: null, icon: UserPlus, bentoColor: '#ddd6fe' }
    ];

    return (
        <div className={`social-hub-container min-h-[600px] flex flex-col relative select-none ${
            isBento
                ? 'bg-white rounded-[2rem] border-[3px] border-black shadow-[6px_6px_0px_#000]'
                : 'bg-white dark:bg-[#13141f] rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-2xl'
        } overflow-hidden`}>

            {/* Decorative Corner Elements (Bento Only) */}
            {isBento && (
                <>
                    <div className="absolute top-4 right-4 w-8 h-8 bg-[#fde047] border-[2.5px] border-black rounded-full shadow-[2px_2px_0px_#000] z-20 flex items-center justify-center">
                        <Star className="w-4 h-4 text-black" fill="black" />
                    </div>
                    <div className="absolute top-4 right-16 w-6 h-6 bg-[#bef264] border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] z-20 rotate-12" />
                    <div className="absolute bottom-4 left-4 w-5 h-5 bg-[#bae6fd] border-[2px] border-black rotate-45 shadow-[2px_2px_0px_#000] z-20" />
                </>
            )}

            {/* Top Shine (light/dark only) */}
            {!isBento && (
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            )}

            {/* Header */}
            <div className={`p-8 relative z-10 ${
                isBento
                    ? 'border-b-[3px] border-black bg-[#bef264]'
                    : 'border-b border-gray-200 dark:border-white/5'
            }`}>
                <h2 className={`text-3xl font-black flex items-center gap-3 ${
                    isBento ? 'text-black' : 'text-gray-900 dark:text-white'
                }`}>
                    <div className={`w-10 h-10 flex items-center justify-center ${
                        isBento
                            ? 'rounded-xl bg-white border-[2.5px] border-black shadow-[3px_3px_0px_#000]'
                            : 'rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg'
                    }`}>
                        <Users className={`w-5 h-5 ${isBento ? 'text-black' : 'text-white'}`} />
                    </div>
                    SOCIAL HUB
                    {isBento && <span className="text-sm font-black tracking-widest bg-black text-white px-3 py-1 rounded-full ml-auto border-[2px] border-black">🎯 SQUAD</span>}
                </h2>
            </div>

            {/* Tabs */}
            <div className={`flex p-4 gap-2 overflow-x-auto relative z-10 ${
                isBento ? 'border-b-[2.5px] border-black bg-white' : ''
            }`}>
                {tabConfig.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'friends' | 'requests' | 'challenges' | 'add')}
                        className={`flex-1 py-3 px-4 text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                            isBento
                                ? `rounded-xl border-[2.5px] border-black ${
                                    activeTab === tab.id
                                        ? `bg-[${tab.bentoColor}] shadow-[3px_3px_0px_#000] -translate-y-0.5`
                                        : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_#000] hover:-translate-y-0.5'
                                } text-black`
                                : `rounded-xl ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                                }`
                        }`}
                        style={isBento && activeTab === tab.id ? { backgroundColor: tab.bentoColor } : undefined}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label} {tab.count !== null && <span className={`ml-1 ${isBento ? 'bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full font-black' : 'opacity-70'}`}>{isBento ? tab.count : `(${tab.count})`}</span>}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 relative z-10 overflow-y-auto custom-scrollbar">
                {message && (
                    <div className={`mb-6 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                        isBento
                            ? `rounded-xl border-[2.5px] border-black shadow-[3px_3px_0px_#000] font-black ${
                                message.type === 'success' ? 'bg-[#bef264] text-black' : 'bg-[#fde047] text-black'
                            }`
                            : `rounded-2xl backdrop-blur-md ${message.type === 'success'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                            }`
                    }`}>
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        <span className="font-bold">{message.text}</span>
                    </div>
                )}

                {activeTab === 'friends' && (
                    <div className="space-y-3">
                        {friendsList.length === 0 && (
                            <div className={`text-center py-12 ${
                                isBento ? 'bg-[#fde047]/30 rounded-2xl border-[2.5px] border-black border-dashed p-8' : ''
                            }`}>
                                <div className={`mx-auto mb-4 flex items-center justify-center ${
                                    isBento ? 'w-20 h-20 bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]' : ''
                                }`}>
                                    <Users className={`${isBento ? 'w-10 h-10' : 'w-16 h-16'} text-gray-700`} />
                                </div>
                                <p className={`font-medium ${isBento ? 'text-black font-black text-lg' : 'text-gray-500'}`}>
                                    {isBento ? 'NO SQUAD YET! 🚀' : 'Your squad is empty. Add some friends!'}
                                </p>
                                {isBento && <p className="text-sm text-gray-600 mt-1 font-semibold">Hit "Add Friend" and find your crew!</p>}
                            </div>
                        )}
                        {friendsList.map((friend, index) => (
                            <div key={friend.userId} className={`flex items-center justify-between p-4 transition-all group ${
                                isBento
                                    ? 'bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000]'
                                    : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/5 transition-colors'
                            }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 flex items-center justify-center text-lg font-black overflow-hidden ${
                                        isBento
                                            ? 'rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                            : 'rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-inner'
                                    }`} style={isBento ? { backgroundColor: getBentoColor(index) } : undefined}>
                                        {friend.avatar ? (
                                            <Avatar config={friend.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <span className={isBento ? 'text-black' : 'text-white'}>{friend.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-lg ${
                                            isBento
                                                ? 'text-black font-black'
                                                : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'
                                        }`}>{friend.name}</div>
                                        <div className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                                            isBento ? 'text-gray-700' : 'text-gray-500'
                                        }`}>
                                            {isBento && <Zap className="w-3 h-3" />}
                                            <span>Rank #{friend.rank || '-'}</span>
                                            <span className={`w-1 h-1 rounded-full ${isBento ? 'bg-black' : 'bg-gray-400 dark:bg-gray-600'}`} />
                                            <span>Level {friend.level || 1}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveChatFriend(friend)}
                                        className={`p-3 transition-all ${
                                            isBento
                                                ? 'rounded-xl bg-[#bae6fd] border-[2.5px] border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 text-black'
                                                : 'rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20'
                                        }`}
                                        title="Chat & Challenge"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeChatFriend && (
                    <DirectChat
                        currentUser={currentUser}
                        friend={activeChatFriend}
                        onClose={() => setActiveChatFriend(null)}
                        onStartChallenge={(onQuizSelected) => {
                            // Store callback for when quiz is selected
                            window.__pendingChallengeCallback = onQuizSelected;
                            onChallenge?.(activeChatFriend.userId, null);
                        }}
                        onStartAsyncChallenge={(onQuizSelected) => {
                            window.__pendingAsyncChallengeCallback = onQuizSelected;
                            onAsyncChallenge?.(activeChatFriend.userId);
                        }}
                    />
                )}


                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {requestList.length === 0 && (
                            <div className={`text-center py-12 ${
                                isBento ? 'bg-[#bae6fd]/30 rounded-2xl border-[2.5px] border-black border-dashed p-8' : ''
                            }`}>
                                <div className={`mx-auto mb-4 flex items-center justify-center ${
                                    isBento ? 'w-20 h-20 bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]' : ''
                                }`}>
                                    <Shield className={`${isBento ? 'w-10 h-10' : 'w-16 h-16'} text-gray-700`} />
                                </div>
                                <p className={`font-medium ${isBento ? 'text-black font-black text-lg' : 'text-gray-500'}`}>
                                    {isBento ? 'ALL CLEAR! ✅' : 'No pending requests.'}
                                </p>
                                {isBento && <p className="text-sm text-gray-600 mt-1 font-semibold">No friend requests waiting.</p>}
                            </div>
                        )}
                        {requestList.map(({ request, user }, index) => (
                            <div key={request.createdAt} className={`flex items-center justify-between p-4 ${
                                isBento
                                    ? 'bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5'
                            }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 flex items-center justify-center text-lg font-black overflow-hidden ${
                                        isBento
                                            ? 'rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                            : 'rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white'
                                    }`} style={isBento ? { backgroundColor: getBentoColor(index + 1) } : undefined}>
                                        {user?.avatar ? (
                                            <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <span className={isBento ? 'text-black' : 'text-white'}>{user?.name.charAt(0) || '?'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-lg ${isBento ? 'text-black font-black' : 'text-gray-900 dark:text-white'}`}>{user?.name || 'Unknown'}</div>
                                        <div className={`text-xs font-semibold ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>
                                            {isBento ? '⚡ WANTS TO JOIN YOUR SQUAD' : 'Wants to act friendly'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => respond(request.from, 'accept')}
                                        className={`p-3 ${
                                            isBento
                                                ? 'bg-[#bef264] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                                : 'bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30'
                                        }`}
                                    ><Check className="w-5 h-5" /></button>
                                    <button
                                        onClick={() => respond(request.from, 'reject')}
                                        className={`p-3 ${
                                            isBento
                                                ? 'bg-[#fde047] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                                : 'bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 border border-red-500/30'
                                        }`}
                                    ><X className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'add' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                            <div className="relative flex-1 group">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                                    isBento ? 'text-black' : 'text-gray-500 group-focus-within:text-purple-400'
                                }`} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Find users by name..."
                                    className={`w-full pl-12 pr-4 py-4 font-medium transition-all ${
                                        isBento
                                            ? 'bg-white border-[2.5px] border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:shadow-[4px_4px_0px_#000] shadow-[2px_2px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50'
                                    }`}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-6 font-bold transition-all disabled:opacity-50 ${
                                    isBento
                                        ? 'bg-[#bef264] text-black rounded-xl border-[2.5px] border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_#000] active:translate-y-0.5'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-lg hover:shadow-purple-500/25'
                                }`}
                            >
                                {isLoading ? <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isBento ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} /> : <Search className="w-5 h-5" />}
                            </button>
                        </form>

                        <div className="space-y-3">
                            {searchResults.filter(u => u.userId !== currentUser.userId).map((user, index) => {
                                const relationship = user.relationship;
                                const isFriend = relationship === 'friend' || currentUser.friends?.includes(user.userId!);
                                const sentRequest = relationship === 'pending_outgoing' || currentUser.friendRequests?.find(r => r.to === user.userId && r.status === 'pending');
                                const receivedRequest = relationship === 'pending_incoming' || currentUser.friendRequests?.find(r => r.from === user.userId && r.status === 'pending');

                                return (
                                    <div key={user.userId} className={`flex items-center justify-between p-4 ${
                                        isBento
                                            ? 'bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 flex items-center justify-center text-lg font-bold overflow-hidden ${
                                                isBento
                                                    ? 'rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                                    : 'rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 text-white border border-white/10'
                                            }`} style={isBento ? { backgroundColor: getBentoColor(index + 2) } : undefined}>
                                                {user.avatar ? (
                                                    <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                                ) : (
                                                    <span className={isBento ? 'text-black font-black' : ''}>{user.name?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-lg ${isBento ? 'text-black font-black' : 'text-gray-900 dark:text-white'}`}>{user.name}</div>
                                                <div className={`text-xs font-medium ${isBento ? 'text-gray-600' : 'text-gray-500'}`}>{user.email}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {isFriend ? (
                                                <button disabled className={`px-4 py-2 font-bold text-sm cursor-default flex items-center gap-2 ${
                                                    isBento
                                                        ? 'bg-[#bef264] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20'
                                                }`}>
                                                    <Check className="w-4 h-4" /> Friends
                                                </button>
                                            ) : sentRequest ? (
                                                <button disabled className={`px-4 py-2 font-bold text-sm cursor-default ${
                                                    isBento
                                                        ? 'bg-[#fde047] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20'
                                                }`}>
                                                    Request Sent
                                                </button>
                                            ) : receivedRequest ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => respond(user.userId!, 'accept')} className={`p-2 ${
                                                        isBento
                                                            ? 'bg-[#bef264] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 border border-emerald-500/30'
                                                    }`}><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => respond(user.userId!, 'reject')} className={`p-2 ${
                                                        isBento
                                                            ? 'bg-[#fde047] text-black rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 border border-red-500/30'
                                                    }`}><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => sendRequest(user.userId!)}
                                                    disabled={processingIds.has(user.userId!)}
                                                    className={`flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all ${
                                                        isBento
                                                            ? `rounded-xl border-[2.5px] border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 ${
                                                                processingIds.has(user.userId!) ? 'bg-gray-200 cursor-wait' : 'bg-[#ddd6fe] text-black'
                                                            }`
                                                            : `rounded-xl ${processingIds.has(user.userId!)
                                                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                                                : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30'
                                                            }`
                                                    }`}
                                                >
                                                    {processingIds.has(user.userId!) ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <UserPlus className="w-4 h-4" />
                                                    )}
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
                            <div className={`text-center py-12 ${
                                isBento ? 'bg-[#ddd6fe]/30 rounded-2xl border-[2.5px] border-black border-dashed p-8' : ''
                            }`}>
                                <div className={`mx-auto mb-4 flex items-center justify-center ${
                                    isBento ? 'w-20 h-20 bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]' : ''
                                }`}>
                                    <Trophy className={`${isBento ? 'w-10 h-10' : 'w-16 h-16'} text-gray-700`} />
                                </div>
                                <p className={`font-medium ${isBento ? 'text-black font-black text-lg' : 'text-gray-500'}`}>
                                    {isBento ? 'NO BATTLES YET! ⚔️' : 'No active challenges.'}
                                </p>
                                {isBento && <p className="text-sm text-gray-600 mt-1 font-semibold">Challenge a friend to show your skills!</p>}
                            </div>
                        )}
                        {challenges.map((challenge, index) => {
                            const isCreator = challenge.fromId === currentUser.userId;
                            const hasPlayed = isCreator ? !!challenge.fromResult : !!challenge.toResult;
                            const opponentId = isCreator ? challenge.toId : challenge.fromId;
                            const opponentUser = allUsers.find(u => u.userId === opponentId);
                            const statusLabel = challenge.status === 'completed'
                                ? 'Completed'
                                : hasPlayed ? 'Waiting for opponent' : 'Pending';

                            return (
                                <div key={challenge.token} className={`flex items-center justify-between p-4 ${
                                    isBento
                                        ? 'bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
                                        : 'bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 flex items-center justify-center text-lg font-black overflow-hidden ${
                                            isBento
                                                ? 'rounded-xl border-[2.5px] border-black shadow-[2px_2px_0px_#000] p-0.5'
                                                : 'rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white p-0.5 shadow-md'
                                        }`} style={isBento ? { backgroundColor: getBentoColor(index) } : undefined}>
                                            {isBento ? (
                                                opponentUser?.avatar ? (
                                                    <Avatar config={opponentUser.avatar} size="md" className="w-full h-full" />
                                                ) : (
                                                    <span className="text-black">{opponentUser?.name.charAt(0) || '?'}</span>
                                                )
                                            ) : (
                                                <div className="w-full h-full bg-white dark:bg-[#13141f] rounded-[10px] flex items-center justify-center overflow-hidden">
                                                    {opponentUser?.avatar ? (
                                                        <Avatar config={opponentUser.avatar} size="md" className="w-full h-full" />
                                                    ) : (
                                                        <span className="text-gray-900 dark:text-white">{opponentUser?.name.charAt(0) || '?'}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-lg ${isBento ? 'text-black font-black' : 'text-gray-900 dark:text-white'}`}>vs {opponentUser?.name || 'Unknown'}</div>
                                            <div className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>
                                                <span className={`${
                                                    isBento
                                                        ? (hasPlayed ? 'text-black' : 'text-black')
                                                        : (hasPlayed ? 'text-yellow-600 dark:text-yellow-500' : 'text-emerald-600 dark:text-emerald-400')
                                                }`}>{statusLabel}</span>
                                                <span className={`w-1 h-1 rounded-full ${isBento ? 'bg-black' : 'bg-gray-400 dark:bg-gray-600'}`} />
                                                <span>Quiz ID: {challenge.quizId.slice(0, 4)}...</span>
                                            </div>
                                        </div>
                                    </div>
                                    {onStartChallenge && (
                                        <button
                                            onClick={() => onStartChallenge(challenge)}
                                            disabled={hasPlayed}
                                            className={`px-5 py-2.5 text-sm font-black uppercase tracking-wider transition-all ${
                                                isBento
                                                    ? `rounded-xl border-[2.5px] border-black ${
                                                        hasPlayed
                                                            ? 'bg-gray-200 text-gray-500 shadow-[2px_2px_0px_#000] cursor-not-allowed'
                                                            : 'bg-[#bef264] text-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                                    }`
                                                    : `rounded-xl border ${
                                                        hasPlayed
                                                            ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                                                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                                    }`
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
