import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Mail, User as UserIcon, Lock, Check, AlertCircle, Sliders } from 'lucide-react';
import type { UserData } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { useNavArrangement } from '../context/NavArrangementContext';

interface UserSettingsProps {
    user: UserData;
    onClose?: () => void;
    onUpdate: (updatedUser: UserData) => void;
    embedded?: boolean;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate, embedded = false }) => {
    const { isBento } = useTheme();
    const { openCustomizer, config } = useNavArrangement();
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

    useEffect(() => {
        setName(user.name || '');
        setEmail(user.email || '');
    }, [user.name, user.email]);

    const hasChanges = Boolean(
        name.trim() !== (user.name || '').trim() ||
        email.trim().toLowerCase() !== (user.email || '').trim().toLowerCase() ||
        currentPassword.length > 0 ||
        newPassword.length > 0 ||
        confirmPassword.length > 0
    );

    const handleCancel = () => {
        setName(user.name || '');
        setEmail(user.email || '');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNotification(null);
        if (!embedded && onClose) {
            onClose();
        }
    };

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

            // Close after a short delay to show success message if modal
            if (!embedded && onClose) {
                setTimeout(() => {
                    onClose();
                }, 1500);
            }
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

    const formBody = (
        <div className={embedded ? "p-6 sm:p-8" : "p-8"}>
            <div className="mb-8">
                <h2 className={`text-2xl font-black mb-1 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>Account Settings</h2>
                <p className={`text-sm ${isBento ? 'text-gray-700 font-bold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>Manage your personal details and account security</p>
            </div>

                    {notification && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                            isBento
                                ? notification.type === 'success'
                                    ? 'bg-[#dcfce7] border-2 border-black text-black font-bold shadow-[3px_3px_0px_#000]'
                                    : 'bg-[#fee2e2] border-2 border-black text-black font-bold shadow-[3px_3px_0px_#000]'
                                : notification.type === 'success'
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
                        } animate-in slide-in-from-top-2`}>
                            {notification.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                            <span className="font-bold text-sm">{notification.message}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Profile Info */}
                        <div className="space-y-4">
                            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                                isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                <UserIcon className={`w-4 h-4 ${isBento ? 'text-black' : 'text-purple-600 dark:text-purple-400'}`} /> Profile Info
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="sr-only">Full Name</label>
                                    <div className="relative">
                                        <UserIcon className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={`w-full pl-12 pr-4 py-3 rounded-xl font-medium transition-all ${
                                                isBento
                                                    ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                                    : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500'
                                            }`}
                                            placeholder="Full Name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="sr-only">Email Address</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full pl-12 pr-4 py-3 rounded-xl font-medium transition-all ${
                                                isBento
                                                    ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                                    : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                            }`}
                                            placeholder="Email Address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation & Layout Arrangement */}
                        <div className={`pt-6 space-y-3 border-t ${isBento ? 'border-black' : 'border-gray-200 dark:border-white/5'}`}>
                            <div className="flex items-center justify-between">
                                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                                    isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <Sliders className={`w-4 h-4 ${isBento ? 'text-black' : 'text-indigo-600 dark:text-indigo-400'}`} /> Navigation & Tabs
                                </h3>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                    {config.primaryPaths.length} Pinned
                                </span>
                            </div>
                            <p className={`text-xs ${isBento ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                                Customize your top navigation pill, reorder buttons, choose curated presets, and sync with your mobile bottom bar.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onClose) onClose();
                                    openCustomizer();
                                }}
                                className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.99]'
                                }`}
                            >
                                <Sliders className="w-4 h-4" />
                                <span>Arrange Navigation Tabs & Layout</span>
                            </button>
                        </div>

                        {/* Security */}
                        <div className={`pt-6 space-y-4 border-t ${isBento ? 'border-black' : 'border-gray-200 dark:border-white/5'}`}>
                            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                                isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                <Lock className={`w-4 h-4 ${isBento ? 'text-black' : 'text-purple-600 dark:text-purple-400'}`} /> Security
                            </h3>
                            <p className={`text-xs font-bold mb-2 ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>Leave blank to keep current password</p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className={`w-full pl-12 pr-12 py-3 rounded-xl font-medium transition-all ${
                                            isBento
                                                ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                        }`}
                                        placeholder="Current Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={`w-full pl-12 pr-12 py-3 rounded-xl font-medium transition-all ${
                                            isBento
                                                ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                        }`}
                                        placeholder="New Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full pl-12 pr-12 py-3 rounded-xl font-medium transition-all ${
                                            isBento
                                                ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                        }`}
                                        placeholder="Confirm New Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {hasChanges && (
                            <div className="flex gap-4 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-3 rounded-xl font-black transition-all disabled:opacity-50 cursor-pointer ${
                                        isBento
                                            ? 'bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                            : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20'
                                    }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isBento ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
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
                        )}
                    </div>
                </div>
            );

    if (embedded) {
        return (
            <div className={`w-full max-w-2xl mx-auto rounded-2xl ${
                isBento
                    ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
            }`}>
                {formBody}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[150] bg-black/30 dark:bg-black/45 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 ${
                isBento
                    ? 'bg-white text-black border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl'
            }`}>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className={`absolute top-6 right-6 transition-all z-20 cursor-pointer ${
                            isBento
                                ? 'p-1.5 rounded-lg border-2 border-black bg-white hover:bg-[#fed7aa] text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        aria-label="Close settings"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                {formBody}
            </div>
        </div>
    );
};

export default UserSettings;
