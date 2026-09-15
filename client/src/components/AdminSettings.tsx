import { useState } from 'react';
import { Lock, Eye, EyeOff, X, Check, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface AdminSettingsProps {
    adminEmail: string;
    onClose: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ adminEmail, onClose }) => {
    const { isBento } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await api.changePassword(adminEmail, currentPassword, newPassword);
            setSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[150] p-4 ${
            isBento ? 'bg-black/60' : 'bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm'
        }`}>
            <div className={`w-full max-w-md p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar ${
                isBento
                    ? 'bg-white text-black border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl'
            }`}>
                <button
                    onClick={onClose}
                    className={`absolute top-5 right-5 sm:top-6 sm:right-6 transition-all cursor-pointer ${
                        isBento
                            ? 'p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#fed7aa] text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                            : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="mb-8">
                    <h2 className={`text-2xl font-black mb-1 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>Admin Settings</h2>
                    <p className={`text-sm ${isBento ? 'text-gray-700 font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'}`}>Change your admin password</p>
                </div>

                {error && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        isBento
                            ? 'bg-[#fee2e2] border-2 border-black text-black font-bold shadow-[3px_3px_0px_#000]'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                )}

                {success && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                        isBento
                            ? 'bg-[#dcfce7] border-2 border-black text-black font-bold shadow-[3px_3px_0px_#000]'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    }`}>
                        <Check className="w-5 h-5" />
                        <span className="font-bold text-sm">{success}</span>
                    </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className={`block text-xs uppercase tracking-wider mb-2 ${isBento ? 'font-black text-black' : 'font-bold text-gray-500'}`}>
                            Current Password
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={`w-full pl-12 pr-12 py-3 rounded-xl transition-all font-medium ${
                                    isBento
                                        ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                        : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                }`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs uppercase tracking-wider mb-2 ${isBento ? 'font-black text-black' : 'font-bold text-gray-500'}`}>
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={`w-full pl-12 pr-12 py-3 rounded-xl transition-all font-medium ${
                                    isBento
                                        ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                        : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                }`}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs uppercase tracking-wider mb-2 ${isBento ? 'font-black text-black' : 'font-bold text-gray-500'}`}>
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full pl-12 pr-12 py-3 rounded-xl transition-all font-medium ${
                                    isBento
                                        ? 'border-2 border-black bg-white text-black placeholder-gray-500 shadow-[2px_2px_0px_#000] focus:outline-none'
                                        : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600'
                                }`}
                                required
                                minLength={6}
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

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 px-4 py-3 rounded-xl font-black transition-all ${
                                isBento
                                    ? 'bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 px-4 py-3 rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                isBento
                                    ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-purple-500/20'
                            }`}
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSettings;
