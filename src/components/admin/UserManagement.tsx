import React, { useState } from 'react';
import { Edit2, Trash2, Users, Eye, EyeOff, Search, BarChart3, Mail, Trophy, Calendar, Map, Lock, Unlock, CheckCircle, Gift, ChevronDown } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../Avatar.tsx';
import type { UserData, AttemptData } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

type EditableUser = UserData & { password?: string };

interface UserManagementProps {
    users: UserData[];
    attempts: AttemptData[];
    currentUser: UserData;
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const RoadmapEditorModal: React.FC<{
    user: UserData;
    currentUser: UserData;
    onClose: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
    onRefresh?: () => void;
}> = ({ user, currentUser, onClose, onNotification, onRefresh }) => {
    const [tracks, setTracks] = useState<any[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<string>('');
    const [progress, setProgress] = useState<{ completedModules: string[], unlockedModules: string[] }>({ completedModules: [], unlockedModules: [] });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_loading, setLoading] = useState(false);

    React.useEffect(() => {
        api.getSkillTracks().then(setTracks).catch(console.error);
    }, []);

    React.useEffect(() => {
        if (!selectedTrack) return;
        setLoading(true);
        api.getUserRoadmapProgress(user.userId, selectedTrack, currentUser.userId)
            .then(p => setProgress({ completedModules: p.completedModules || [], unlockedModules: p.unlockedModules || [] }))
            .catch((_e) => onNotification('error', 'Failed to load progress'))
            .finally(() => setLoading(false));
    }, [selectedTrack, user.userId]);

    const handleSave = async () => {
        if (!selectedTrack) return;
        try {
            // First, get the track details to find which quizzes are in completed modules
            const allTracks = await api.getSkillTracks();
            const currentTrack = allTracks.find((t: any) => t.trackId === selectedTrack);

            if (currentTrack) {
                // Find modules that were just marked as completed (not in original progress)
                const originalProgress = await api.getUserRoadmapProgress(user.userId, selectedTrack, currentUser.userId);
                const originalCompleted = new Set(originalProgress?.completedModules || []);
                const newCompleted = new Set(progress.completedModules);

                // Get newly completed modules
                const newlyCompletedModules = Array.from(newCompleted).filter(moduleId => !originalCompleted.has(moduleId));

                if (newlyCompletedModules.length > 0) {
                    // Get all quizzes for the newly completed modules
                    const quizzesToMark = currentTrack.modules
                        .filter((m: any) => newlyCompletedModules.includes(m.moduleId))
                        .flatMap((m: any) => m.quizIds || []);

                    if (quizzesToMark.length > 0) {
                        // Get all available quizzes to get their full data
                        const allQuizzes = await api.getQuizzes();
                        const quizzesToMarkFull = allQuizzes.filter((q: any) => quizzesToMark.includes(q.id || q._id));

                        // Create attempts for each quiz with 100% score
                        for (const quiz of quizzesToMarkFull) {
                            const quizId = quiz.id || quiz._id;

                            const attempt = {
                                attemptId: crypto.randomUUID(),
                                userId: user.userId,
                                userName: user.name,
                                userEmail: user.email,
                                quizId: quizId,
                                quizTitle: quiz.title,
                                score: quiz.questions.length,
                                totalQuestions: quiz.questions.length,
                                percentage: 100,
                                timeTaken: 0,
                                answers: {},
                                completedAt: new Date().toISOString(),
                                passed: true,
                                powerUpsUsed: []
                            };

                            await api.saveAttempt(attempt);
                        }

                        // Update user stats
                        const existingUser = await api.getUserData(user.userId);
                        const newStats = {
                            totalAttempts: (existingUser.user?.totalAttempts || 0) + quizzesToMarkFull.length,
                            totalScore: (existingUser.user?.totalScore || 0) + quizzesToMarkFull.length * 10,
                            xp: (existingUser.user?.xp || 0) + (quizzesToMarkFull.length * 50),
                            totalTime: (existingUser.user?.totalTime || 0),
                            inventory: existingUser.user?.inventory,
                            powerUps: existingUser.user?.powerUps,
                            streak: existingUser.user?.streak,
                            friends: existingUser.user?.friends,
                            rank: existingUser.user?.rank
                        };

                        await api.updateUser(user.userId, newStats);
                    }

                    // Auto-unlock next modules
                    newlyCompletedModules.forEach(completedModuleId => {
                        const moduleIndex = currentTrack.modules.findIndex((m: any) => m.moduleId === completedModuleId);
                        if (moduleIndex >= 0 && moduleIndex + 1 < currentTrack.modules.length) {
                            const nextModuleId = currentTrack.modules[moduleIndex + 1].moduleId;
                            // Add to unlocked modules if not already there
                            if (!progress.unlockedModules.includes(nextModuleId)) {
                                progress.unlockedModules.push(nextModuleId);
                            }
                        }
                    });
                }
            }

            // Update roadmap progress
            await api.updateUserRoadmapProgress(user.userId, selectedTrack, progress, currentUser.userId);

            // Force a full data refresh to ensure the UI updates with latest skill track progress
            onNotification('success', 'Module marked complete! Quizzes completed, user stats updated, and next modules unlocked!');

            // Small delay to ensure database is updated before refresh
            setTimeout(() => {
                // Call onRefresh to update the user list
                if (onRefresh) {
                    onRefresh();
                }
                onClose();
            }, 500);
        } catch (e) {
            console.error('Error saving progress:', e);
            onNotification('error', 'Failed to save: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    const toggleModule = (moduleId: string) => {
        const isCompleted = progress.completedModules.includes(moduleId);
        const isUnlocked = progress.unlockedModules.includes(moduleId);

        let newCompleted = [...progress.completedModules];
        let newUnlocked = [...progress.unlockedModules];

        if (isCompleted) {
            newCompleted = newCompleted.filter(id => id !== moduleId);
            newUnlocked = newUnlocked.filter(id => id !== moduleId);
        } else if (isUnlocked) {
            newCompleted.push(moduleId);
        } else {
            newUnlocked.push(moduleId);
        }

        setProgress({ completedModules: newCompleted, unlockedModules: newUnlocked });
    };

    const track = tracks.find(t => t.trackId === selectedTrack);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Manage Roadmap"
            description={user.name}
            maxWidth="max-w-2xl"
            footer={
                <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                >
                    Save Changes
                </button>
            }
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select Track</label>
                    <div className="relative">
                        <select
                            className="w-full p-4 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-bold"
                            value={selectedTrack}
                            onChange={e => setSelectedTrack(e.target.value)}
                        >
                            <option value="">Select a Roadmap...</option>
                            {tracks.map(t => <option key={t.trackId} value={t.trackId}>{t.title}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            ▼
                        </div>
                    </div>
                </div>

                {/* Legend */}
                {track && (
                    <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Lock size={14} /> Locked
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
                            <Unlock size={14} /> Unlocked
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                            <CheckCircle size={14} /> Completed
                        </div>
                    </div>
                )}

                {track && (
                    <div className="space-y-2">
                        {track.modules.map((m: any) => {
                            const isComp = progress.completedModules.includes(m.moduleId);
                            const isUnl = progress.unlockedModules.includes(m.moduleId) || isComp;

                            let status = 'Locked';
                            let color = 'text-gray-500 opacity-75';
                            let icon = <Lock size={16} />;
                            let containerClass = 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5';

                            if (isComp) {
                                status = 'Completed';
                                color = 'text-emerald-500';
                                icon = <CheckCircle size={16} />;
                                containerClass = 'bg-emerald-500/5 border-emerald-500/20';
                            } else if (isUnl) {
                                status = 'Unlocked';
                                color = 'text-indigo-500';
                                icon = <Unlock size={16} />;
                                containerClass = 'bg-indigo-500/5 border-indigo-500/20';
                            }

                            return (
                                <div key={m.moduleId}
                                    onClick={() => toggleModule(m.moduleId)}
                                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all ${containerClass}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-white dark:bg-black/20 ${color}`}>
                                            {isComp ? <CheckCircle size={14} /> : <Map size={14} />}
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-200 block">{m.title}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{m.moduleId}</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 ${color} text-xs font-bold uppercase tracking-wider`}>
                                        {status} {icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
};

const UserManagement: React.FC<UserManagementProps> = ({ users, attempts, currentUser, onRefresh, onNotification }) => {
    const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
    const [originalUser, setOriginalUser] = useState<EditableUser | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingAttempts, setViewingAttempts] = useState<UserData | null>(null);
    const [managingRoadmap, setManagingRoadmap] = useState<UserData | null>(null);
    const [giftingUser, setGiftingUser] = useState<UserData | null>(null);
    const [giftType, setGiftType] = useState<'coins' | 'xp' | 'shopitem'>('coins');
    const [giftAmount, setGiftAmount] = useState('');
    const [selectedShopItem, setSelectedShopItem] = useState('');
    const [shopItems, setShopItems] = useState<any[]>([]);

    // Fetch shop items when component mounts
    React.useEffect(() => {
        const fetchShopItems = async () => {
            try {
                const items = await api.getShopItems?.() || [];
                setShopItems(Array.isArray(items) ? items : []);
            } catch (error) {
                console.error('Failed to fetch shop items:', error);
                setShopItems([]);
            }
        };
        fetchShopItems();
    }, []);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpdateUser = async (user: EditableUser) => {
        const normalizedEmail = user.email.toLowerCase().trim();
        const trimmedName = user.name.trim();

        try {
            if (user.name !== originalUser?.name || user.email !== originalUser?.email) {
                await api.updateUser(user.userId, {
                    name: trimmedName,
                    email: normalizedEmail
                });
            }

            if (user.password && user.password.trim() !== '') {
                await api.adminChangeUserPassword(
                    user.userId,
                    user.password.trim(),
                    currentUser.userId
                );
            }

            setEditingUser(null);
            setOriginalUser(null);
            onNotification('success', 'User updated successfully');
            onRefresh();
        } catch (error) {
            console.error('Update error:', error);
            const msg = error instanceof Error ? error.message : 'Failed to update user';
            onNotification('error', msg);
        }
    };

    const handleGiftSend = async (user: UserData) => {
        if (!giftAmount && giftType !== 'shopitem') {
            onNotification('error', 'Please enter an amount');
            return;
        }

        if (giftType === 'shopitem' && !selectedShopItem) {
            onNotification('error', 'Please select an item');
            return;
        }

        try {
            const updates: any = {};

            if (giftType === 'coins') {
                updates.coins = (user.coins || 0) + parseInt(giftAmount);
            } else if (giftType === 'xp') {
                updates.totalScore = (user.totalScore || 0) + parseInt(giftAmount);
            } else if (giftType === 'shopitem') {
                // Add to inventory
                const inventory = Array.isArray(user.inventory) ? user.inventory : [];
                const itemExists = inventory.some((item: any) =>
                    (typeof item === 'string' ? item : item.itemId) === selectedShopItem
                );
                if (!itemExists) {
                    inventory.push({ itemId: selectedShopItem, quantity: 1 });
                    updates.inventory = inventory;
                }
            }

            await api.updateUser(user.userId, updates);

            const itemName = giftType === 'coins' ? `${giftAmount} Coins` :
                giftType === 'xp' ? `${giftAmount} XP` :
                    selectedShopItem;

            onNotification('success', `Gifted ${itemName} to ${user.name}`);
            setGiftingUser(null);
            setGiftAmount('');
            setSelectedShopItem('');
            onRefresh();
        } catch (error) {
            console.error('Gift error:', error);
            onNotification('error', 'Failed to send gift');
        }
    };

    const confirmDeleteUser = async () => {
        if (!deleteConfirmation) return;
        const userId = deleteConfirmation.id;
        try {
            await api.deleteUser(userId, currentUser.userId);
            onNotification('success', 'User deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Delete user error:', error);
            onNotification('error', 'Failed to delete user');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-3 px-5 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm flex items-center gap-4 group transition-all focus-within:border-indigo-500/50">
                    <Search className="w-5 h-5 text-indigo-500" />
                    <input
                        type="text"
                        placeholder="Search identities by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder:text-gray-500 font-bold text-sm uppercase tracking-tight"
                    />
                </div>
                <div className="hidden lg:flex items-center gap-3 px-6 py-3 bg-indigo-500/10 rounded-3xl border border-white/10">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] whitespace-nowrap">Total: {users.length} Users</span>
                </div>
            </div>

            {/* User Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredUsers.map(user => {
                    const userAttempts = attempts.filter(a => a.userId === user.userId);
                    const avgScore = userAttempts.length > 0
                        ? Math.round(userAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / userAttempts.length)
                        : 0;

                    return (
                        <div
                            key={user.userId}
                            className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

                            {/* Card Header: Avatar & Info */}
                            <div className="flex items-start gap-4 mb-6 relative z-10">
                                <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                    <div className="w-full h-full bg-white dark:bg-[#1e1e2d] rounded-[1.1rem] overflow-hidden flex items-center justify-center">
                                        {user.avatar ? (
                                            <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-xl">{user.name.charAt(0)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-tight truncate group-hover:text-indigo-500 transition-colors">{user.name}</h3>
                                    <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold truncate opacity-75">{user.email}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => { setOriginalUser({ ...user }); setEditingUser({ ...user, password: '' }); }}
                                        className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all hover:scale-110"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setManagingRoadmap(user)}
                                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all hover:scale-110"
                                        title="Manage Roadmap"
                                    >
                                        <Map className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGiftingUser(user);
                                            setGiftType('coins');
                                            setGiftAmount('');
                                            setSelectedShopItem('');
                                        }}
                                        className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all hover:scale-110"
                                        title="Send Gift"
                                    >
                                        <Gift className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmation({ isOpen: true, id: user.userId })}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                                <div className="bg-gray-50/50 dark:bg-black/20 p-3 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total XP</span>
                                    </div>
                                    <div className="text-sm font-black text-gray-900 dark:text-white">{user.totalScore?.toLocaleString() || 0}</div>
                                </div>
                                <div className="bg-gray-50/50 dark:bg-black/20 p-3 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg Hub</span>
                                    </div>
                                    <div className="text-sm font-black text-gray-900 dark:text-white">{avgScore}%</div>
                                </div>
                            </div>

                            {/* Quick Action: View Attempts */}
                            <button
                                onClick={() => setViewingAttempts(user)}
                                className="w-full py-3 bg-white/40 dark:bg-white/5 hover:bg-indigo-500/10 group-hover/btn:bg-indigo-500/20 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl border border-white/10 transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-auto"
                            >
                                <BarChart3 className="w-4 h-4" />
                                View {userAttempts.length} Attempts
                            </button>
                        </div>
                    );
                })}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white/40 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
                        <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-sm text-center">No identities found</p>
                    </div>
                )}
            </div>

            {/* User Attempts Explorer Modal */}
            <Modal
                isOpen={!!viewingAttempts}
                onClose={() => setViewingAttempts(null)}
                title={viewingAttempts ? `${viewingAttempts.name}'s Pulse` : 'Attempts'}
                description="Performance History Log"
                maxWidth="max-w-2xl"
                icon={<BarChart3 className="w-6 h-6" />}
            >
                <div className="space-y-3">
                    {viewingAttempts && attempts.filter(a => a.userId === viewingAttempts.userId).length > 0 ? (
                        attempts.filter(a => a.userId === viewingAttempts.userId).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map(attempt => (
                            <div key={attempt.attemptId} className="bg-gray-50/50 dark:bg-black/20 p-5 rounded-[2rem] border border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-indigo-500/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                        <Trophy className={`w-5 h-5 ${attempt.percentage >= 60 ? 'text-emerald-500' : 'text-red-500'}`} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight mb-0.5">{attempt.quizTitle}</div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">SCORE</div>
                                        <div className={`text-lg font-black ${attempt.percentage >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {attempt.percentage}%
                                        </div>
                                    </div>
                                    <div className="w-1.5 h-12 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                        <div
                                            className={`w-full transition-all duration-1000 ${attempt.percentage >= 60 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ height: `${attempt.percentage}%`, marginTop: `${100 - attempt.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-40">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">No activity recorded for this agent</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Edit Agent"
                description="Update credentials and access"
                maxWidth="max-w-lg"
                footer={
                    <>
                        <button
                            onClick={() => setEditingUser(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => editingUser && handleUpdateUser(editingUser)}
                            className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-1"
                        >
                            Update Identity
                        </button>
                    </>
                }
            >
                <div className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                        <input
                            placeholder="e.g. John Wick"
                            value={editingUser?.name || ''}
                            onChange={e => editingUser && setEditingUser({ ...editingUser, name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/50 rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Email Identity</label>
                        <input
                            placeholder="e.g. wick@continental.com"
                            value={editingUser?.email || ''}
                            onChange={e => editingUser && setEditingUser({ ...editingUser, email: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/50 rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Access Key Override</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Secure blank for status quo"
                                value={editingUser?.password || ''}
                                onChange={e => editingUser && setEditingUser({ ...editingUser, password: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/50 rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold outline-none transition-all pr-14 placeholder:text-gray-400"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Roadmap Manager Modal */}
            {managingRoadmap && (
                <RoadmapEditorModal
                    user={managingRoadmap}
                    currentUser={currentUser}
                    onClose={() => setManagingRoadmap(null)}
                    onNotification={onNotification}
                    onRefresh={onRefresh}
                />
            )}

            {/* Gift Modal */}
            <Modal
                isOpen={!!giftingUser}
                onClose={() => setGiftingUser(null)}
                title="Send Gift"
                description={giftingUser ? `To: ${giftingUser.name}` : ''}
                icon={<Gift className="w-6 h-6" />}
                maxWidth="max-w-xl"
                footer={
                    <>
                        <button
                            onClick={() => setGiftingUser(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => giftingUser && handleGiftSend(giftingUser)}
                            disabled={!giftAmount && giftType !== 'shopitem' || (giftType === 'shopitem' && !selectedShopItem)}
                            className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send Gift
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                            Gift Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['coins', 'xp', 'shopitem'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setGiftType(type);
                                        setGiftAmount('');
                                    }}
                                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${giftType === type
                                        ? type === 'coins' ? 'bg-yellow-500/10 border border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                            : type === 'xp' ? 'bg-purple-500/10 border border-purple-500 text-purple-600 dark:text-purple-400'
                                                : 'bg-blue-500/10 border border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'bg-gray-100 dark:bg-[#1a1b26] border border-transparent text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    {type === 'coins' ? '🪙 Coins' : type === 'xp' ? '⭐ XP' : '🛍️ Item'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {giftType === 'coins' && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Coins Amount
                            </label>
                            <input
                                type="number"
                                value={giftAmount}
                                onChange={(e) => setGiftAmount(e.target.value)}
                                placeholder="Enter coins amount"
                                min="0"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                            />
                        </div>
                    )}

                    {giftType === 'xp' && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                XP Amount
                            </label>
                            <input
                                type="number"
                                value={giftAmount}
                                onChange={(e) => setGiftAmount(e.target.value)}
                                placeholder="Enter XP amount"
                                min="0"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>
                    )}

                    {giftType === 'shopitem' && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                                Select Item
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedShopItem}
                                    onChange={(e) => setSelectedShopItem(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900 dark:bg-[#1a1b26] border border-gray-700 dark:border-gray-800 rounded-xl font-bold text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                                >
                                    <option value="">Choose an item...</option>
                                    {shopItems.length > 0 ? (
                                        shopItems.map(item => (
                                            <option key={item.itemId} value={item.itemId}>
                                                {item.name} ({item.price} coins)
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Loading items...</option>
                                    )}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                            💡 The gift will be added to the user's inventory immediately.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title="Abolish Agent?"
                description="This will permanently extinguish the agent and all their progress histories."
                icon={<Trash2 className="w-6 h-6 text-red-500" />}
                maxWidth="max-w-md"
                footer={
                    <>
                        <button
                            onClick={() => setDeleteConfirmation(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
                        >
                            Back
                        </button>
                        <button
                            onClick={confirmDeleteUser}
                            className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transform hover:-translate-y-0.5 transition-all hover:bg-red-700"
                        >
                            Abolish
                        </button>
                    </>
                }
            >
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-red-500 text-sm font-bold text-center">
                        ⚠️ This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
