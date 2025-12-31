import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';

import TransparentLogo from './TransparentLogo.tsx';

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
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 relative overflow-hidden selection:bg-pink-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-pink-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-700" />
            </div>

            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-32 h-32 mx-auto mb-2 relative flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                        <TransparentLogo src="/icon.png" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" threshold={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                        Create Account
                    </h1>
                    <p className="text-gray-400 font-medium">Join the ranks and start your journey.</p>
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
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors w-5 h-5" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your Name"
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create strong password"
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-12 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    autoComplete="new-password"
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
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-pink-500/25 active:scale-95 border-b-4 border-pink-800 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                        </button>
                    </form>

                    <div className="mt-8 text-center relative z-10">
                        <p className="text-gray-400 font-medium">
                            Already have an account?{' '}
                            <button
                                onClick={onSwitchToLogin}
                                disabled={isLoading}
                                className="text-pink-400 font-bold hover:text-pink-300 transition-colors uppercase tracking-wide hover:underline ml-1 disabled:opacity-50"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
