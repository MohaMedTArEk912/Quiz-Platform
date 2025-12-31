import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';

import TransparentLogo from './TransparentLogo.tsx';

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
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 relative overflow-hidden selection:bg-purple-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-700" />
            </div>

            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="w-32 h-32 mx-auto mb-2 relative flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                        <TransparentLogo src="/icon.png" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" threshold={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 font-medium">Enter your credentials to access the arena.</p>
                </div>

                <div className="bg-[#13141f] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    {/* Top Shine */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 relative z-10">
                            <span className="font-bold text-sm tracking-wide">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-12 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="text-right mt-3">
                                <button
                                    type="button"
                                    onClick={onSwitchToForgotPassword}
                                    disabled={isLoading}
                                    className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wide hover:underline disabled:opacity-50"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-purple-500/25 active:scale-95 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                    </form>

                    <div className="mt-8 mb-6 relative z-10">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                                <span className="px-4 bg-[#13141f] text-gray-500">Or continue with</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="relative z-10 w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="mt-8 text-center relative z-10">
                        <p className="text-gray-400 font-medium">
                            Don't have an account?{' '}
                            <button
                                onClick={onSwitchToRegister}
                                className="text-purple-400 font-bold hover:text-purple-300 transition-colors uppercase tracking-wide hover:underline ml-1"
                            >
                                Join Now
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
