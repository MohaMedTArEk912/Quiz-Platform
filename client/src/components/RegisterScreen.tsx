import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import TransparentLogo from './TransparentLogo.tsx';
import { AmbientBackground } from './AmbientBackground';
import { AnimatedCharacter } from './AnimatedCharacter.tsx';

interface RegisterScreenProps {
    onRegister: (name: string, email: string, password: string) => Promise<void>;
    onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Focus states for the mascot "living" feel
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (name.trim() && email.trim() && password.trim()) {
            setIsLoading(true);
            try {
                await onRegister(name, email, password);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Registration failed';
                setError(message);
                setIsLoading(false);
            }
        } else {
            setError('Please fill in all fields');
        }
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex relative overflow-hidden selection:bg-indigo-500/25">
            {/* Ambient Background */}
            <AmbientBackground />

            {/* Theme Toggle - Floating */}
            <div className="absolute top-6 right-6 z-50 mt-safe mr-safe">
                <ThemeToggle />
            </div>

            {/* Left Column - Mascot & Branding (Hidden on Mobile) */}
            <div className="hidden lg:flex flex-col flex-[1.2] relative z-10 bg-slate-100/40 dark:bg-white/[0.02] backdrop-blur-xl border-r border-slate-200/80 dark:border-white/[0.06] items-center justify-center p-12 login-mascot-col">
                <div className="w-full max-w-lg flex flex-col items-center">
                    {/* Character/Mascot Container */}
                    <div className="w-[340px] sm:w-[380px] h-[340px] sm:h-[380px] flex items-center justify-center mb-6 mascot-card-wrapper transition-all">
                        <AnimatedCharacter 
                            isEmailFocused={isEmailFocused} 
                            isPasswordFocused={isPasswordFocused} 
                            showPassword={showPassword} 
                        />
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Join the <span className="bento-highlight">ranks</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base max-w-sm mx-auto">
                            Create your learner profile and begin climbing the global leaderboard today.
                        </p>
                        {/* Neo-Brutalist Sticker Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 select-none">
                            <span className="bento-badge-tag bg-[#fde047] text-black -rotate-1">"NEW COHORT"</span>
                            <span className="bento-badge-tag bg-[#8b5cf6] text-white rotate-1">"EARN BADGES"</span>
                            <span className="bento-badge-tag bg-[#bef264] text-black -rotate-1">"DUEL LIVE"</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-10 relative z-10 w-full animate-in fade-in duration-500">
                <div className="w-full max-w-md space-y-6">
                    {/* Mobile Logo & Heading (Visible only when Mascot is hidden) */}
                    <div className="lg:hidden text-center mb-4">
                        <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
                            <TransparentLogo src="/icon.png" className="w-full h-full object-contain" threshold={40} />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Create Account
                        </h1>
                    </div>

                    <div className="text-left space-y-1.5 hidden lg:block">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Account</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Sign up to start tracking your quiz mastery.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-shake">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5 group">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4.5 h-4.5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    disabled={isLoading}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4.5 h-4.5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setIsEmailFocused(true)}
                                    onBlur={() => setIsEmailFocused(false)}
                                    placeholder="your@email.com"
                                    disabled={isLoading}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4.5 h-4.5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="w-full pl-11 pr-11 py-3 bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.985] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer mt-2"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span>Create Account</span>
                            )}
                        </button>
                    </form>

                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-white/[0.08]"></div>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 dark:text-slate-400 font-medium text-xs">
                        Already have an account?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1 cursor-pointer"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
