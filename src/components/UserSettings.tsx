import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, User as UserIcon, Lock, Check, AlertCircle } from 'lucide-react';
import type { UserData } from '../types/index.ts';
import { api } from '../lib/api.ts';

interface UserSettingsProps {
    user: UserData;
    onClose: () => void;
    onUpdate: (updatedUser: UserData) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            setNotification({ type: 'error', message: 'Name cannot be empty' });
            return;
        }

        if (!email.trim()) {
            setNotification({ type: 'error', message: 'Email cannot be empty' });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setNotification({ type: 'error', message: 'Please enter a valid email address' });
            return;
        }

        // Password validation if changing password
        if (newPassword || confirmPassword) {
            if (!currentPassword) {
                setNotification({ type: 'error', message: 'Please enter your current password to change it' });
                return;
            }

            if (newPassword !== confirmPassword) {
                setNotification({ type: 'error', message: 'New passwords do not match' });
                return;
            }

            if (newPassword.length < 6) {
                setNotification({ type: 'error', message: 'New password must be at least 6 characters long' });
                return;
            }
        }

        setIsLoading(true);
        setNotification(null);

        try {
            // Update basic info (name, email)
            const updatedUser = {
                ...user,
                name: name.trim(),
                email: email.toLowerCase().trim()
            };

            await api.updateUser(user.userId, {
                name: updatedUser.name,
                email: updatedUser.email
            });

            // If password is being changed
            if (newPassword) {
                await api.changePassword(user.email, currentPassword, newPassword);
            }

            setNotification({ type: 'success', message: 'Settings updated successfully!' });

            // Update parent component
            onUpdate(updatedUser);

            // Close after a short delay to show success message
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Update error:', error);
            const message = error instanceof Error ? error.message : 'Failed to update settings. Please try again.';
            setNotification({
                type: 'error',
                message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Account Settings</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Manage your profile and security</p>
                    </div>

                    {notification && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${notification.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            } animate-in slide-in-from-top-2`}>
                            {notification.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                            <span className="font-bold text-sm">{notification.message}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Profile Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Profile Info
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="sr-only">Full Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium transition-all"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="sr-only">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium transition-all"
                                            placeholder="Email Address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="pt-6 border-t border-gray-200 dark:border-white/5 space-y-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Security
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mb-2">Leave blank to keep current password</p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium transition-all"
                                        placeholder="Current Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium transition-all"
                                        placeholder="New Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-medium transition-all"
                                        placeholder="Confirm New Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettings;
