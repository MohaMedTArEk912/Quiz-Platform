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
            } catch (err: any) {
                setError(err.message || 'Registration failed');
                setIsLoading(false);
            }
        } else {
            setError('Please fill in all fields');
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0b] flex relative overflow-hidden selection:bg-pink-500/30">
            {/* Ambient Background */}
            <AmbientBackground />

            {/* Theme Toggle - Floating */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Left Column - Mascot & Branding (Hidden on Mobile) */}
            <div className="hidden lg:flex flex-col flex-[1.2] relative z-10 bg-gray-50/50 dark:bg-white/[0.02] backdrop-blur-xl border-r border-gray-200/50 dark:border-white/10 items-center justify-center p-12">
                <div className="w-full max-w-lg flex flex-col items-center">
                    {/* Character/Mascot Container */}
                    <div className="w-[400px] h-[400px] flex items-center justify-center mb-4">
                        <AnimatedCharacter 
                            isEmailFocused={isEmailFocused} 
                            isPasswordFocused={isPasswordFocused} 
                            showPassword={showPassword} 
                        />
                    </div>
                    
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white transform tracking-tighter">
                            Join the ranks
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                            Create your account and start your journey to the top of the leaderboard!
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Column - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8 relative z-10 w-full animate-in fade-in duration-700">
                <div className="w-full max-w-lg space-y-6">
                    {/* Mobile Logo & Heading (Visible only when Mascot is hidden) */}
                    <div className="lg:hidden text-center mb-6">
                        <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center animate-bounce-slow">
                            <TransparentLogo src="/icon.png" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]" threshold={40} />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                            Create Account
                        </h1>
                    </div>

                    <div className="text-left space-y-3 hidden lg:block">
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Register</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg text-balance">
                            Welcome! Let's get you set up and ready to play.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-shake">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="font-bold text-sm tracking-wide">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2 group">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 ml-1 transition-colors group-focus-within:text-pink-600">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-all w-5 h-5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    disabled={isLoading}
                                    className="w-full pl-14 pr-4 py-4.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-[1.25rem] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all font-semibold disabled:opacity-50 shadow-sm"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 ml-1 transition-colors group-focus-within:text-pink-600">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-all w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setIsEmailFocused(true)}
                                    onBlur={() => setIsEmailFocused(false)}
                                    placeholder="your@email.com"
                                    disabled={isLoading}
                                    className="w-full pl-14 pr-4 py-4.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-[1.25rem] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all font-semibold disabled:opacity-50 shadow-sm"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 ml-1 transition-colors group-focus-within:text-pink-600">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-all w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="w-full pl-14 pr-14 py-4.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-[1.25rem] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all font-semibold disabled:opacity-50 shadow-sm"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors p-1"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 dark:bg-pink-600 hover:bg-black dark:hover:bg-pink-500 text-white py-5 rounded-[1.25rem] font-black text-lg transition-all shadow-xl shadow-pink-500/20 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 group/btn relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isLoading ? (
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400 opacity-0 group-hover:opacity-100 transition-all" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100 dark:border-white/5"></div>
                        </div>
                    </div>

                    <p className="text-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                        Back to{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-pink-600 dark:text-pink-400 hover:text-pink-500 hover:underline transition-all font-black uppercase tracking-wider ml-1"
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
