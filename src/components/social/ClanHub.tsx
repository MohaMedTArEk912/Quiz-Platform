import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Clan, UserData, ClanChatMessage } from '../../types';
import { Users, Shield, Trophy, Search, LogOut, Star, UserPlus, Edit2, Check, X, MoreVertical, Trash2, ArrowUpCircle, ArrowDownCircle, Bell, Pin, Megaphone, MessageCircle } from 'lucide-react';
import Avatar from '../Avatar';
import { ChatWindow } from '../chat/ChatWindow';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../ConfirmDialog';
import { useSocket } from '../../context/SocketContext';

interface ClanHubProps {
    user: UserData;
    onUpdateUser: () => void;
}

export const ClanHub: React.FC<ClanHubProps> = ({ user, onUpdateUser }) => {
    const { showNotification } = useNotification();
    const { confirm, confirmState, handleCancel } = useConfirm();
    const { socket } = useSocket();
    const [clan, setClan] = useState<Clan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Clan[]>([]);
    const [view, setView] = useState<'my_clan' | 'browse' | 'create'>('my_clan');

    // Create Form State
    const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '', isPublic: true });

    // Edit & Invite State
    const [showEdit, setShowEdit] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', isPublic: true });
    const [inviteQuery, setInviteQuery] = useState('');
    const [inviteResults, setInviteResults] = useState<UserData[]>([]);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ClanChatMessage[]>([]);
    const [showChat, setShowChat] = useState(false);
    const [lastViewed, setLastViewed] = useState<number>(0);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial load of lastViewed from localStorage
    useEffect(() => {
        if (clan?.clanId) {
            const savedLastViewed = localStorage.getItem(`clan_chat_last_viewed_${clan.clanId}`);
            if (savedLastViewed) {
                setLastViewed(parseInt(savedLastViewed, 10));
            } else {
                setLastViewed(0);
            }
        }
    }, [clan?.clanId]);

    // Optimize: Calculate unread count whenever messages receive or lastViewed changes
    useEffect(() => {
        if (!chatMessages.length) {
            setUnreadCount(0);
            return;
        }

        // Count messages newer than lastViewed
        const count = chatMessages.filter(msg => new Date(msg.createdAt).getTime() > lastViewed).length;
        setUnreadCount(count);
    }, [chatMessages, lastViewed]);


    // Load chat messages when clan is loaded
    useEffect(() => {
        if (clan?.chatMessages) {
            setChatMessages(clan.chatMessages);
        }
    }, [clan?.chatMessages]);

    // Socket connection for chat
    useEffect(() => {
        if (!socket || !clan?.clanId) return;

        socket.emit('join_clan_chat', clan.clanId);

        const handleNewMessage = (message: ClanChatMessage) => {
            setChatMessages(prev => [...prev, message]);

            // If chat is open, we read it immediately
            if (showChat) {
                const now = Date.now();
                setLastViewed(now);
                localStorage.setItem(`clan_chat_last_viewed_${clan.clanId}`, now.toString());
            }
        };

        const handleMessageEdited = ({ messageId, newContent }: { messageId: string, newContent: string }) => {
            setChatMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: newContent } : msg
            ));
        };

        const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
            setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
        };

        const handleChatError = ({ message }: { message: string }) => {
            showNotification('error', message);
        };

        socket.on('new_clan_message', handleNewMessage);
        socket.on('clan_message_edited', handleMessageEdited);
        socket.on('clan_message_deleted', handleMessageDeleted);
        socket.on('chat_error', handleChatError);

        // ISSUE: WebSocket didn't emit update
        // FIX: Listen for real-time kick notifications
        const handleKickedFromClan = (data: any) => {
            showNotification('error', data.message);
            setClan(null);
            setView('browse');
            onUpdateUser();
        };

        socket.on('kicked_from_clan', handleKickedFromClan);

        return () => {
            socket.off('new_clan_message', handleNewMessage);
            socket.off('clan_message_edited', handleMessageEdited);
            socket.off('clan_message_deleted', handleMessageDeleted);
            socket.off('chat_error', handleChatError);
            socket.off('kicked_from_clan', handleKickedFromClan);
            socket.emit('leave_clan_chat', clan.clanId);
        };
    }, [socket, clan?.clanId, showChat]); // Added showChat dependency to update read status live

    const handleDeleteMessage = async (messageId: string) => {
        if (!socket || !clan) return;

        const confirmed = await confirm({
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message?',
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!confirmed) return;

        socket.emit('delete_clan_message', {
            clanId: clan.clanId,
            messageId,
            userId: user.userId
        });
    };

    // Handle Opening Chat (Mark as Read)
    const handleOpenChat = () => {
        setShowChat(true);
        if (clan?.clanId) {
            const now = Date.now();
            setLastViewed(now);
            localStorage.setItem(`clan_chat_last_viewed_${clan.clanId}`, now.toString());
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        if (user.clanId) {
            loadClan(user.clanId);
        } else {
            setView('browse');
            setLoading(false);
        }
    }, [user.clanId]);

    const loadClan = async (clanId: string) => {
        try {
            const data = await api.getClan(clanId, user.userId);
            setClan(data);
            setEditForm({ name: data.name, description: data.description, isPublic: data.isPublic });
            setLoading(false);
        } catch (err) {
            setError('Failed to load clan');
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const results = await api.searchClans(searchQuery, user.userId);
            setSearchResults(results);
        } catch (err) {
            setError('Search failed');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createClan(createForm, user.userId);
            onUpdateUser(); // Refresh user to get clanId
            // The useEffect will trigger reload
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpdateClan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clan) return;
        try {
            await api.updateClan(clan.clanId, editForm, user.userId);
            loadClan(clan.clanId);
            setShowEdit(false);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleJoin = async (clanId: string) => {
        try {
            await api.joinClan(clanId, user.userId);
            onUpdateUser();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleLeave = async () => {
        const confirmed = await confirm({
            title: 'Leave Clan',
            message: 'Are you sure you want to leave your clan?',
            confirmText: 'Leave',
            type: 'danger'
        });
        if (!confirmed) return;
        try {
            await api.leaveClan(user.userId);
            setClan(null);
            onUpdateUser();
            setView('browse');
            showNotification('success', 'You have left the clan');
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to leave clan');
        }
    };

    const handleInviteSearch = async () => {
        if (!inviteQuery.trim()) return;
        try {
            const results = await api.searchUsers(inviteQuery);
            setInviteResults(results.filter((u: UserData) => !u.clanId)); // Only show users not in clan
        } catch (err) {
            console.error(err);
        }
    };

    const sendInvite = async (targetId: string) => {
        if (!clan) return;
        try {
            await api.inviteToClan(clan.clanId, targetId, user.userId);
            showNotification('success', 'Invite sent!');
            setInviteResults(inviteResults.filter(u => u.userId !== targetId));
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to send invite');
        }
    };

    const handleKick = async (targetId: string) => {
        if (!clan) return;
        const confirmed = await confirm({
            title: 'Remove Member',
            message: 'Are you sure you want to remove this member from the clan?',
            confirmText: 'Remove',
            type: 'danger'
        });
        if (!confirmed) return;
        try {
            // ISSUE: Frontend caching old clan data, user state not refreshed
            // FIX: Optimistic update + full refresh + WebSocket notification
            
            // 1. Optimistic UI update (removes stale display)
            setClan(prevClan => {
                if (!prevClan) return null;
                return {
                    ...prevClan,
                    members: prevClan.members.filter(m => m.userId !== targetId)
                };
            });

            // 2. Execute kick on backend
            await api.kickMember(clan.clanId, targetId, user.userId);

            // 3. Full refresh from server (clear cache)
            await loadClan(clan.clanId);
            // 4. Refresh user state (clear any stale clanId)
            onUpdateUser();

            // 5. WebSocket notification to kicked user
            if (socket && socket.connected) {
                socket.emit('user_kicked_from_clan', {
                    targetUserId: targetId,
                    clanId: clan.clanId,
                    clanName: clan.name
                });
            }

            showNotification('success', 'Member removed');
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to remove member');
            // Revert optimistic update
            loadClan(clan.clanId);
        }
    };

    const handleRoleUpdate = async (targetId: string, newRole: 'elder' | 'member') => {
        if (!clan) return;
        try {
            await api.updateMemberRole(clan.clanId, targetId, newRole, user.userId);
            loadClan(clan.clanId);
            showNotification('success', 'Role updated');
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to update role');
        }
    };

    const handleRequestAction = async (targetId: string, accept: boolean) => {
        if (!clan) return;
        try {
            await api.handleJoinRequest(clan.clanId, targetId, accept, user.userId);
            loadClan(clan.clanId);
            showNotification('success', accept ? 'Request accepted' : 'Request rejected');
        } catch (err: any) {
            showNotification('error', err.message || 'Failed to process request');
        }
    };

    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    if (loading) return <div className="p-8 text-center">Loading Clan...</div>;

    // View: My Clan
    if (user.clanId && clan) {
        const isLeader = clan.members.some(m => m.userId === user.userId && m.role === 'leader') || clan.leaderId === user.userId;

        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 relative">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Clan Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white relative">
                        <div className="absolute top-4 right-4 flex gap-2">
                            {isLeader && (
                                <button onClick={() => setShowEdit(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors text-white/80 hover:text-white" title="Edit Clan">
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            )}
                            <button onClick={handleLeave} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors text-white/80 hover:text-white" title="Leave Clan">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
                                <Shield className="w-12 h-12 text-white" />
                            </div>
                            <div className="text-center md:text-left">
                                <h1 className="text-4xl font-black mb-2 flex items-center gap-3 justify-center md:justify-start">
                                    [{clan.tag}] {clan.name}
                                </h1>
                                <p className="text-white/80 max-w-xl text-lg">{clan.description || 'No description provided.'}</p>
                                <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                                    <div className="px-3 py-1 bg-black/20 rounded-full text-sm font-semibold flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-yellow-300" />
                                        Lvl {clan.level}
                                    </div>
                                    <div className="px-3 py-1 bg-black/20 rounded-full text-sm font-semibold flex items-center gap-2">
                                        <Star className="w-4 h-4 text-blue-300" />
                                        {clan.totalXP.toLocaleString()} XP
                                    </div>
                                    <div className="px-3 py-1 bg-black/20 rounded-full text-sm font-semibold flex items-center gap-2">
                                        <Users className="w-4 h-4 text-green-300" />
                                        {clan.members.length} Members
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Announcements Section */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Megaphone className="w-6 h-6 text-orange-500" />
                                    Announcements
                                </h2>
                                {(isLeader || clan.members.find(m => m.userId === user.userId)?.role === 'elder') && (
                                    <button
                                        onClick={async () => {
                                            const content = prompt("Enter announcement type:");
                                            if (content) {
                                                try {
                                                    await api.createClanAnnouncement(clan.clanId, content, user.userId);
                                                    loadClan(clan.clanId);
                                                    showNotification('success', 'Announcement posted');
                                                } catch (e: any) { showNotification('error', e.message); }
                                            }
                                        }}
                                        className="text-sm font-bold text-violet-600 hover:text-violet-700"
                                    >
                                        + Post New
                                    </button>
                                )}
                            </div>

                            {clan.announcements && clan.announcements.length > 0 ? (
                                <div className="grid gap-3">
                                    {clan.announcements.map((ann) => (
                                        <div key={ann.id} className={`p-4 rounded-xl border ${ann.isPinned ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} relative group`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {ann.isPinned && <Pin className="w-4 h-4 text-orange-500 fill-orange-500" />}
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm">{ann.authorName}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">• {new Date(ann.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                {(isLeader || clan.members.find(m => m.userId === user.userId)?.role === 'elder') && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await api.pinClanAnnouncement(clan.clanId, ann.id, user.userId);
                                                                    loadClan(clan.clanId);
                                                                } catch (e: any) { showNotification('error', e.message); }
                                                            }}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400"
                                                            title={ann.isPinned ? "Unpin" : "Pin"}
                                                        >
                                                            <Pin className={`w-3 h-3 ${ann.isPinned ? 'text-orange-500' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const confirmed = await confirm({
                                                                    title: 'Delete Announcement',
                                                                    message: 'Are you sure you want to delete this announcement?',
                                                                    confirmText: 'Delete',
                                                                    type: 'danger'
                                                                });
                                                                if (!confirmed) return;
                                                                try {
                                                                    await api.deleteClanAnnouncement(clan.clanId, ann.id, user.userId);
                                                                    loadClan(clan.clanId);
                                                                } catch (e: any) { showNotification('error', e.message); }
                                                            }}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{ann.content}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No announcements yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-violet-500" />
                                Clan Members
                            </h2>
                            {isLeader && (
                                <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg font-bold hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">
                                    <UserPlus className="w-4 h-4" />
                                    Invite
                                </button>
                            )}
                        </div>

                        {/* Join Requests */}
                        {(isLeader || clan.members.find(m => m.userId === user.userId)?.role === 'elder') && clan.activeJoinRequests && clan.activeJoinRequests.length > 0 && (
                            <div className="mb-8 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-200 mb-4 flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                    Join Requests ({clan.activeJoinRequests.length})
                                </h3>
                                <div className="space-y-3">
                                    {clan.activeJoinRequests.map((req: any) => (
                                        <div key={req.userId} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                                    {(req as any).avatar ? (
                                                        <Avatar config={(req as any).avatar} size="sm" className="w-full h-full" />
                                                    ) : (
                                                        req.name ? req.name.substring(0, 2).toUpperCase() : '??'
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">{req.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-gray-500">Requested a while ago</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRequestAction(req.userId, true)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => handleRequestAction(req.userId, false)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clan.members.map((member) => (
                                <div key={member.userId} className="relative flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 group">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center font-bold text-lg text-gray-600 dark:text-gray-300 overflow-hidden">
                                        {member.avatar ? (
                                            <Avatar config={member.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            member.name ? member.name.substring(0, 2).toUpperCase() : '??'
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white">{member.name || 'Unknown User'}</span>
                                            {member.role === 'leader' && <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Leader</span>}
                                            {member.role === 'elder' && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Elder</span>}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            Contributed: <span className="font-medium text-violet-600 dark:text-violet-400">{member.contribution || 0} XP</span>
                                        </div>
                                    </div>

                                    {/* Action Menu - Only if user has power and target is not self */}
                                    {user.userId !== member.userId && (
                                        (isLeader || (clan.members.find(m => m.userId === user.userId)?.role === 'elder' && member.role === 'member')) && (
                                            <div className="relative">
                                                <button onClick={() => setActiveMenu(activeMenu === member.userId ? null : member.userId)} className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-white transition-colors">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                                {activeMenu === member.userId && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                                        {isLeader && member.role !== 'leader' && (
                                                            <>
                                                                {member.role === 'member' ? (
                                                                    <button onClick={() => handleRoleUpdate(member.userId, 'elder')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                        <ArrowUpCircle className="w-4 h-4 text-blue-500" /> Promote to Elder
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => handleRoleUpdate(member.userId, 'member')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                        <ArrowDownCircle className="w-4 h-4 text-orange-500" /> Demote to Member
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        <button onClick={() => handleKick(member.userId)} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 text-sm font-medium">
                                                            <Trash2 className="w-4 h-4" /> Kick Member
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating Chat Button */}
                {/* Floating Chat Button */}
                <button
                    onClick={handleOpenChat}
                    className="fixed bottom-6 right-6 p-4 bg-violet-600 text-white rounded-full shadow-2xl hover:bg-violet-700 transition-all hover:scale-110 z-50 flex items-center justify-center group"
                >
                    <MessageCircle className="w-8 h-8" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white dark:border-gray-900 animate-bounce">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Open Clan Chat
                    </span>
                </button>

                {/* Chat Overlay */}
                {showChat && (
                    <div className="fixed inset-0 z-[120] flex justify-end items-stretch pointer-events-none">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto transition-opacity"
                            onClick={() => setShowChat(false)}
                        />
                        <div className="relative w-full max-w-md pointer-events-auto h-full animate-in slide-in-from-right duration-300">
                            <ChatWindow
                                currentUser={user}
                                messages={chatMessages}
                                onSendMessage={(content) => {
                                    // But wait, the existing sendChatMessage uses 'chatInput' state.
                                    // I should refactor sendChatMessage to take content as argument
                                    if (!socket || !clan) return;
                                    socket.emit('send_clan_message', {
                                        clanId: clan.clanId,
                                        senderId: user.userId,
                                        senderName: user.name,
                                        content: content.trim()
                                    });
                                    const now = Date.now();
                                    setLastViewed(now);
                                    localStorage.setItem(`clan_chat_last_viewed_${clan.clanId}`, now.toString());
                                }}
                                onClose={() => setShowChat(false)}
                                title="Clan Chat"
                                canEditMessage={(msg) => msg.senderId === user.userId}
                                canDeleteMessage={(msg) => msg.senderId === user.userId || isLeader}
                                onEditMessage={(id, content) => {
                                    // Check if we need to set state first? 
                                    // The existing handleEditMessage didn't depend on state for the *args*, 
                                    // but used setEditingMessageId. 
                                    // ChatWindow handles the edit UI state internally, 
                                    // so we just need the backend emit function.
                                    if (!socket || !clan) return;
                                    socket.emit('edit_clan_message', {
                                        clanId: clan.clanId,
                                        messageId: id,
                                        newContent: content,
                                        userId: user.userId
                                    });
                                }}
                                onDeleteMessage={handleDeleteMessage}
                            />
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {
                    showEdit && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Clan</h2>
                                <form onSubmit={handleUpdateClan} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">Name</label>
                                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">Description</label>
                                        <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1">Privacy</label>
                                        <select value={editForm.isPublic ? 'public' : 'private'} onChange={e => setEditForm({ ...editForm, isPublic: e.target.value === 'public' })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10">
                                            <option value="public">Public</option>
                                            <option value="private">Private (Invite Only)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 bg-gray-200 dark:bg-white/10 rounded-xl font-bold">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold">Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Invite Modal */}
                {
                    showInvite && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl h-[80vh] flex flex-col">
                                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Invite Members</h2>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        placeholder="Search username..."
                                        className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                                        value={inviteQuery}
                                        onChange={e => setInviteQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleInviteSearch()}
                                    />
                                    <button onClick={handleInviteSearch} className="px-4 bg-violet-600 text-white rounded-xl font-bold">Search</button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {inviteResults.map(u => (
                                        <div key={u.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                    {u.avatar ? (
                                                        <Avatar config={u.avatar} size="sm" className="w-full h-full" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-500">
                                                            {u.name.substring(0, 1)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white">{u.name}</span>
                                            </div>
                                            <button onClick={() => sendInvite(u.userId)} className="px-3 py-1 bg-violet-600 text-white rounded-lg text-sm font-bold">Invite</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setShowInvite(false)} className="mt-4 w-full py-3 bg-gray-200 dark:bg-white/10 rounded-xl font-bold">Close</button>
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    // View: Browse / Setup
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Clan Hub</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Join forces with other players, compete in clan wars, and earn exclusive rewards.</p>

                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => setView('browse')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${view === 'browse' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                        Find a Clan
                    </button>
                    <button
                        onClick={() => setView('create')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${view === 'create' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                        Create New Clan
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            {view === 'browse' && (
                <div className="space-y-6">
                    {/* Pending Invites */}
                    {user.clanInvites && user.clanInvites.length > 0 && (
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-xl shadow-violet-500/20 text-white relative overflow-hidden mb-6 animate-in slide-in-from-top-5 duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <Bell className="w-5 h-5 animate-pulse" />
                                </div>
                                Clan Invitations
                                <span className="bg-white text-violet-600 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{user.clanInvites.length}</span>
                            </h3>
                            <div className="space-y-3 relative z-10">
                                {user.clanInvites.map((invite) => (
                                    <div key={invite.clanId} className="bg-black/20 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:bg-black/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-transparent rounded-lg flex items-center justify-center border border-white/10">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg leading-tight">{invite.clanName}</div>
                                                <div className="text-white/60 text-xs mt-0.5">Invited by a clan member</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.respondToClanInvite(invite.clanId, true, user.userId);
                                                        onUpdateUser(); // Refresh user to update state
                                                    } catch (e: any) { setError(e.message); }
                                                }}
                                                className="px-4 py-2 bg-white text-violet-600 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.respondToClanInvite(invite.clanId, false, user.userId);
                                                        onUpdateUser();
                                                    } catch (e: any) { setError(e.message); }
                                                }}
                                                className="px-4 py-2 bg-black/20 text-white hover:bg-black/30 rounded-lg font-bold text-sm transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search clans by name or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-violet-500 focus:outline-none text-lg transition-colors"
                        />
                        <button
                            onClick={handleSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition"
                        >
                            Search
                        </button>
                    </div>

                    {searchResults.length > 0 ? (
                        <div className="grid gap-4">
                            {searchResults.map((clan) => (
                                <div key={clan.clanId} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                                            <Shield className="w-8 h-8 text-violet-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                [{clan.tag}] {clan.name}
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1">{clan.description}</p>
                                            <div className="flex gap-4 mt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                <span>Lvl {clan.level}</span>
                                                <span>{clan.totalXP} XP</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(clan.clanId)}
                                        className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" /> Join
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Search for a clan to join.</p>
                        </div>
                    )}
                </div>
            )}

            {view === 'create' && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Your Clan</h2>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Clan Name</label>
                            <input
                                type="text"
                                required
                                value={createForm.name}
                                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                placeholder="e.g. The Night's Watch"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Clan Tag</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={5}
                                    minLength={2}
                                    value={createForm.tag}
                                    onChange={e => setCreateForm({ ...createForm, tag: e.target.value.toUpperCase() })}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono uppercase"
                                    placeholder="NIGHT"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Privacy</label>
                                <select
                                    value={createForm.isPublic ? 'public' : 'private'}
                                    onChange={e => setCreateForm({ ...createForm, isPublic: e.target.value === 'public' })}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                >
                                    <option value="public">Public (Anyone can join)</option>
                                    <option value="private">Private (Invite only)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Description</label>
                            <textarea
                                value={createForm.description}
                                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                rows={3}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                                placeholder="Tell us what your clan is about..."
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                        >
                            Create Clan (Free)
                        </button>
                    </form>
                </div>
            )}
            {confirmState.isOpen && (
                <ConfirmDialog
                    title={confirmState.title}
                    message={confirmState.message}
                    confirmText={confirmState.confirmText}
                    cancelText={confirmState.cancelText}
                    type={confirmState.type}
                    onConfirm={confirmState.onConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};
