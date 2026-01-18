import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, Users, Eye, EyeOff, Search, BarChart3, Mail, Trophy, Calendar, X } from 'lucide-react';
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

const UserManagement: React.FC<UserManagementProps> = ({ users, attempts, currentUser, onRefresh, onNotification }) => {
    const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
    const [originalUser, setOriginalUser] = useState<EditableUser | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingAttempts, setViewingAttempts] = useState<UserData | null>(null);

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
            {viewingAttempts && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[3rem] w-full max-w-2xl max-h-[85vh] shadow-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{viewingAttempts.name}'s Pulse</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance History Log</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingAttempts(null)} className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-gray-400 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {attempts.filter(a => a.userId === viewingAttempts.userId).length > 0 ? (
                                attempts.filter(a => a.userId === viewingAttempts.userId).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map(attempt => (
                                    <div key={attempt.attemptId} className="bg-gray-50/50 dark:bg-black/20 p-5 rounded-[2rem] border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-indigo-500/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-white/10">
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
                                            <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden hidden sm:block">
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
                    </div>
                </div>,
                document.body
            )}

            {/* Edit User Modal */}
            {editingUser && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[3rem] w-full max-w-lg shadow-3xl p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Edit Agent</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update credentials and access</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-gray-400 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Display Name</label>
                                <input
                                    placeholder="e.g. John Wick"
                                    value={editingUser.name}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-black outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Identity</label>
                                <input
                                    placeholder="e.g. wick@continental.com"
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-black outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Access Key Override</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Secure blank for status quo"
                                        value={editingUser.password || ''}
                                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-gray-900 dark:text-white font-black outline-none transition-all pr-14 placeholder:text-gray-400"
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

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateUser(editingUser)}
                                    className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-1"
                                >
                                    Update Identity
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[3rem] p-10 max-w-sm w-full shadow-3xl text-center animate-in zoom-in-95 duration-300">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-red-500/10 mb-6 border border-red-500/20">
                            <Trash2 className="h-10 w-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Abolish Agent?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-bold text-sm leading-relaxed">
                            This will permanently extinguish the agent and all their progress histories.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transform hover:-translate-y-0.5 transition-all"
                            >
                                Abolish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserManagement;
