import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import TransparentLogo from './TransparentLogo.tsx';
import { AmbientBackground } from './AmbientBackground';
import { AnimatedCharacter } from './AnimatedCharacter.tsx';

interface LoginScreenProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
    onGoogleSignIn: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSwitchToRegister, onSwitchToForgotPassword, onGoogleSignIn }) => {
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
        if (email.trim() && password.trim()) {
            setIsLoading(true);
            try {
                await onLogin(email, password);
            } catch (err: any) {
                setError(err.message || 'Login failed');
                setIsLoading(false);
            }
        } else {
            setError('Please fill in all fields');
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0b] flex relative overflow-hidden selection:bg-purple-500/30">
            {/* Ambient Background - Shared across screens */}
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
                            Welcome back
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                            Jump back into the arena and show them what you've got!
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
                            <TransparentLogo src="/icon.png" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" threshold={40} />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                            Welcome Back
                        </h1>
                    </div>

                    <div className="text-left space-y-3 hidden lg:block">
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Sign In</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                            Ready to conquer another quiz today?
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
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 ml-1 transition-colors group-focus-within:text-purple-600">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-all w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setIsEmailFocused(true)}
                                    onBlur={() => setIsEmailFocused(false)}
                                    placeholder="your@email.com"
                                    disabled={isLoading}
                                    className="w-full pl-14 pr-4 py-4.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-[1.25rem] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold disabled:opacity-50 shadow-sm"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 ml-1 transition-colors group-focus-within:text-purple-600">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-all w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="w-full pl-14 pr-14 py-4.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-[1.25rem] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold disabled:opacity-50 shadow-sm"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-1"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                <div className="relative w-5 h-5">
                                    <input type="checkbox" className="peer sr-only" />
                                    <div className="w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-white/5 peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all" />
                                    <svg className="absolute inset-0 w-5 h-5 text-white scale-0 peer-checked:scale-100 transition-transform p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Keep me signed in</span>
                            </label>
                            <button
                                type="button"
                                onClick={onSwitchToForgotPassword}
                                disabled={isLoading}
                                className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 dark:bg-purple-600 hover:bg-black dark:hover:bg-purple-500 text-white py-5 rounded-[1.25rem] font-black text-lg transition-all shadow-xl shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 group/btn relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isLoading ? (
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <span>Sign into Account</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 opacity-0 group-hover:opacity-100 transition-all" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100 dark:border-white/5"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={onGoogleSignIn}
                            className="flex items-center justify-center gap-3 bg-white dark:bg-white/5 border-2 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white py-4 rounded-[1.25rem] font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all active:scale-95 group/social"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="hidden sm:inline">Google</span>
                        </button>
                        <button
                            type="button"
                            className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-white/5 border-2 border-transparent text-gray-400 dark:text-gray-500 py-4 rounded-[1.25rem] font-bold cursor-not-allowed opacity-50 transition-all"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span className="hidden sm:inline">GitHub</span>
                        </button>
                    </div>

                    <p className="text-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                        Don't have an account yet?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-500 hover:underline transition-all ml-1"
                        >
                            Sign up for Free
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
