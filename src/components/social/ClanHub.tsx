import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Clan, UserData } from '../../types';
import { Users, Shield, Trophy, Search, LogOut, Star, UserPlus, Edit2, Check, X, MoreVertical, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface ClanHubProps {
    user: UserData;
    onUpdateUser: () => void;
}

export const ClanHub: React.FC<ClanHubProps> = ({ user, onUpdateUser }) => {
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
        if (!confirm('Are you sure you want to leave your clan?')) return;
        try {
            await api.leaveClan(user.userId);
            setClan(null);
            onUpdateUser();
            setView('browse');
        } catch (err: any) {
            setError(err.message);
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
            alert('Invite sent!');
            setInviteResults(inviteResults.filter(u => u.userId !== targetId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleKick = async (targetId: string) => {
        if (!clan || !confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.kickMember(clan.clanId, targetId, user.userId);
            loadClan(clan.clanId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRoleUpdate = async (targetId: string, newRole: 'elder' | 'member') => {
        if (!clan) return;
        try {
            await api.updateMemberRole(clan.clanId, targetId, newRole, user.userId);
            loadClan(clan.clanId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRequestAction = async (targetId: string, accept: boolean) => {
        if (!clan) return;
        try {
            await api.handleJoinRequest(clan.clanId, targetId, accept, user.userId);
            loadClan(clan.clanId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    if (loading) return <div className="p-8 text-center">Loading Clan...</div>;

    // View: My Clan
    if (user.clanId && clan) {
        const isLeader = clan.leaderId === user.userId;

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
                                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-gray-500">
                                                    {req.name ? req.name.substring(0, 2).toUpperCase() : '??'}
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
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center font-bold text-lg text-gray-600 dark:text-gray-300">
                                        {member.name ? member.name.substring(0, 2).toUpperCase() : '??'}
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
                                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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

                {/* Edit Modal */}
                {showEdit && (
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
                )}

                {/* Invite Modal */}
                {showInvite && (
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
                                        <span className="font-bold  text-gray-900 dark:text-white">{u.name}</span>
                                        <button onClick={() => sendInvite(u.userId)} className="px-3 py-1 bg-violet-600 text-white rounded-lg text-sm font-bold">Invite</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowInvite(false)} className="mt-4 w-full py-3 bg-gray-200 dark:bg-white/10 rounded-xl font-bold">Close</button>
                        </div>
                    </div>
                )}
            </div>
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
                        <div className="bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                                </span>
                                Clan Invitations
                            </h3>
                            <div className="space-y-3">
                                {user.clanInvites.map((invite) => (
                                    <div key={invite.clanId} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{invite.clanName}</div>
                                            <div className="text-xs text-gray-500">Invited by a clan member</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.respondToClanInvite(invite.clanId, true, user.userId);
                                                        onUpdateUser(); // Refresh user to update state
                                                    } catch (e: any) { setError(e.message); }
                                                }}
                                                className="px-4 py-2 bg-violet-600 text-white rounded-lg font-bold text-sm hover:bg-violet-700"
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
                                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-bold text-sm"
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
        </div>
    );
};
