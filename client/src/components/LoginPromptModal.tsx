import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, X, Sparkles, Award, Target, Trophy } from 'lucide-react';

interface LoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    redirectPath?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
    isOpen,
    onClose,
    title = "Let's Log In",
    description = "Create an account or log in to start quiz attempts, track your progress, earn certificates, and climb the leaderboard.",
    redirectPath
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleLogin = () => {
        if (redirectPath) {
            sessionStorage.setItem('redirectAfterLogin', redirectPath);
        }
        onClose();
        navigate('/login');
    };

    const handleRegister = () => {
        if (redirectPath) {
            sessionStorage.setItem('redirectAfterLogin', redirectPath);
        }
        onClose();
        navigate('/register');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal backdrop click */}
            <div className="fixed inset-0 -z-10" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-[#11111a] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 sm:p-8 overflow-hidden">
                {/* Background glow decoration */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:bg-white/5 transition-colors cursor-pointer"
                    title="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                            Unlock Full Experience
                        </p>
                    </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-medium">
                    {description}
                </p>

                {/* Value Props */}
                <div className="space-y-3 mb-6 bg-gray-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Take interactive quizzes &amp; exam simulations</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Solve Question Pools 100% and earn Certificates</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Climb rank tiers &amp; preserve daily streak</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5">
                    <button
                        type="button"
                        onClick={handleLogin}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        <LogIn className="w-4 h-4" />
                        <span>Log In</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleRegister}
                        className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-bold text-sm border border-gray-200 dark:border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4 text-purple-500" />
                        <span>Create Free Account</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-center cursor-pointer"
                    >
                        Continue Browsing as Guest
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPromptModal;
