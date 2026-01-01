import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Clan, UserData } from '../../types';
import { Users, Shield, Trophy, Search, LogOut, Star, UserPlus } from 'lucide-react';

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

    if (loading) return <div className="p-8 text-center">Loading Clan...</div>;

    // View: My Clan
    if (user.clanId && clan) {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Clan Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white relative">
                        <div className="absolute top-4 right-4">
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
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Users className="w-6 h-6 text-violet-500" />
                            Clan Members
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {clan.members.map((member) => (
                                <div key={member.userId} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
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
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
