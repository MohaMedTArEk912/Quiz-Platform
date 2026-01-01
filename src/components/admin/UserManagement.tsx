import React, { useState } from 'react';
import { Edit2, Trash2, Users } from 'lucide-react';
import type { UserData } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { supabase, isValidSupabaseConfig } from '../../lib/supabase.ts';
import { storage } from '../../utils/storage.ts';

type EditableUser = UserData & { password?: string };

interface UserManagementProps {
    users: UserData[];
    currentUser: UserData;
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onRefresh, onNotification }) => {
    const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
    const [originalUser, setOriginalUser] = useState<EditableUser | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);

    const handleUpdateUser = async (user: EditableUser) => {
        const normalizedEmail = user.email.toLowerCase().trim();
        const trimmedName = user.name.trim();

        if (originalUser && normalizedEmail !== originalUser.email.toLowerCase()) {
            if (isValidSupabaseConfig() && supabase) {
                const { data: existingUsers } = await supabase
                    .from('users')
                    .select('email')
                    .ilike('email', normalizedEmail);

                if (existingUsers && existingUsers.length > 0) {
                    onNotification('error', 'This email is already in use.');
                    return;
                }
            }
        }

        const updatedUser: EditableUser = {
            ...user,
            name: trimmedName,
            email: normalizedEmail,
            // Only update password if provided and not empty
            password: user.password && user.password.trim() !== ''
                ? user.password.trim()
                : originalUser?.password
        };

        if (isValidSupabaseConfig() && supabase) {
            try {
                await supabase.from('users').update(updatedUser).eq('userId', user.userId);
                setEditingUser(null);
                setOriginalUser(null);
                onNotification('success', 'User updated successfully');
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                onNotification('error', 'Failed to update user');
            }
        } else {
            try {
                await storage.set(`user:${user.userId}`, JSON.stringify(updatedUser));
                setEditingUser(null);
                setOriginalUser(null);
                onNotification('success', 'User updated successfully');
                onRefresh();
            } catch (error) {
                console.error('Update error:', error);
                onNotification('error', 'Failed to update user locally');
            }
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
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {users.map(user => (
                        <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg">
                                        {user.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">{user.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-sm">{user.email}</td>
                            <td className="px-6 py-4 font-bold text-emerald-500 dark:text-emerald-400">{user.totalScore}</td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2">
                                    <button onClick={() => { setOriginalUser({ ...user }); setEditingUser({ ...user, password: '' }); }} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteConfirmation({ isOpen: true, id: user.userId })} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={4}>
                                <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl m-4">
                                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 font-bold">No users found</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Edit User</h2>
                        <div className="space-y-4">
                            <input
                                placeholder="Name"
                                value={editingUser.name}
                                onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <input
                                placeholder="Email"
                                value={editingUser.email}
                                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1 uppercase tracking-wider">Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter new password to change"
                                    value={editingUser.password || ''}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                <p className="text-xs text-gray-500 ml-1">Leave blank to keep existing password.</p>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateUser(editingUser)}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                            <Trash2 className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
