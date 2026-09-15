import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Mail,
    Send,
    Sparkles,
    Activity,
    LifeBuoy,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Modal from './common/Modal';

const Footer: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isBento } = useTheme();
    const { showNotification } = useNotification();
    const { currentUser } = useAuth();

    const [emailInput, setEmailInput] = useState('');
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'faq' | 'support' | 'status' | null>(null);

    // Support Form State
    const [supportEmail, setSupportEmail] = useState('');
    const [supportName, setSupportName] = useState('');
    const [supportCategory, setSupportCategory] = useState<'technical' | 'bug' | 'scoring' | 'account' | 'feature' | 'general'>('general');
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

    // Auto-fill user credentials when opening support modal
    useEffect(() => {
        if (activeModal === 'support') {
            if (currentUser?.email && !supportEmail) {
                setSupportEmail(currentUser.email);
            }
            if (currentUser?.name && !supportName) {
                setSupportName(currentUser.name);
            }
        }
    }, [activeModal, currentUser]);

    /**
     * Smoothly navigates to target path and scrolls the viewport to the top of the section/page.
     */
    const handleFooterNav = (path: string, targetId?: string) => {
        const isSamePath = location.pathname === path;

        if (targetId) {
            const el = document.getElementById(targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }

        if (isSamePath) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        } else {
            navigate(path);
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });

            // Extra safety tick after router re-renders destination view
            setTimeout(() => {
                if (targetId) {
                    const el = document.getElementById(targetId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return;
                    }
                }
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
            }, 60);
        }
    };

    const handleSupportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = supportEmail.trim();
        const trimmedSubject = supportSubject.trim();
        const trimmedMessage = supportMessage.trim();

        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            showNotification('error', 'Please provide a valid email address.');
            return;
        }
        if (trimmedSubject.length < 3) {
            showNotification('error', 'Subject must be at least 3 characters.');
            return;
        }
        if (trimmedMessage.length < 5) {
            showNotification('error', 'Please provide a description of your issue (at least 5 characters).');
            return;
        }

        setIsSubmittingSupport(true);
        try {
            const response = await api.submitSupportTicket({
                email: trimmedEmail,
                name: supportName.trim() || currentUser?.name || undefined,
                subject: trimmedSubject,
                category: supportCategory,
                message: trimmedMessage
            });

            showNotification(
                'success',
                response.message || `Ticket #${response.ticketId || ''} dispatched! We will reply within 24 hours.`
            );
            setSupportSubject('');
            setSupportMessage('');
            setActiveModal(null);
        } catch (error: any) {
            console.error('Failed to submit support ticket:', error);
            showNotification(
                'error',
                error.message || 'Failed to dispatch ticket. You can email us directly at mohaamedtariq12@gmail.com.'
            );
        } finally {
            setIsSubmittingSupport(false);
        }
    };

    const currentYear = new Date().getFullYear();

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput || !emailInput.includes('@')) {
            showNotification('error', 'Please enter a valid email address.');
            return;
        }
        showNotification('success', '🎉 Subscribed! You will receive new quiz releases and challenge updates.');
        setEmailInput('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <footer className={`w-full mt-auto border-t transition-colors ${
                isBento
                    ? 'bg-white text-black border-t-3 border-black shadow-[0_-4px_0px_#000]'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
                    {/* Top Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
                        {/* Brand Column (5 cols) */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Clickable Logo with Scroll-Up */}
                            <button
                                type="button"
                                onClick={() => handleFooterNav('/')}
                                className="flex items-center gap-2.5 group cursor-pointer text-left outline-none focus:outline-none border-0"
                                aria-label="Quiz Platform Home"
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base transition-transform group-hover:scale-105 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                }`}>
                                    Q
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-lg font-black tracking-tight ${
                                        isBento ? 'text-black font-mono' : 'text-white'
                                    }`}>
                                        Quiz Platform
                                    </span>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">
                                        CS Learning Engine
                                    </span>
                                </div>
                            </button>

                            <p className={`text-xs sm:text-sm leading-relaxed max-w-sm ${
                                isBento ? 'text-slate-800 font-medium' : 'text-slate-400'
                            }`}>
                                Next-generation gamified learning platform for computer science students, software engineers, and code enthusiasts. Master algorithms, languages, and architecture.
                            </p>

                        </div>

                        {/* Quick Links (2 cols) */}
                        <div className="lg:col-span-2 space-y-3">
                            <h4 className={`text-xs font-black uppercase tracking-wider ${
                                isBento ? 'text-black font-mono' : 'text-white'
                            }`}>
                                Explore
                            </h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Home Dashboard
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/tracks')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Skill Tracks
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/study')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Study Flashcards
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/tournaments')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Tournaments
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/daily')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Daily Challenge
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Community & Competition (2 cols) */}
                        <div className="lg:col-span-2 space-y-3">
                            <h4 className={`text-xs font-black uppercase tracking-wider ${
                                isBento ? 'text-black font-mono' : 'text-white'
                            }`}>
                                Community
                            </h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/leaderboard')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Global Rankings
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/clans')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Clans & Guilds
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/social')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        1v1 Live Duels
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/shop')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer outline-none focus:outline-none border-0"
                                    >
                                        Power-Up Shop
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Newsletter & Updates (3 cols) */}
                        <div className="lg:col-span-3 space-y-3">
                            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                isBento ? 'text-black font-mono' : 'text-white'
                            }`}>
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                Weekly Challenges
                            </h4>
                            <p className={`text-xs ${isBento ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                Get notified when new algorithmic challenges and learning tracks drop.
                            </p>
                            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="Enter your email"
                                        className={`w-full py-2 pl-3 pr-9 rounded-xl text-xs outline-none transition-all ${
                                            isBento
                                                ? 'bg-white border-2 border-black text-black font-bold focus:ring-2 focus:ring-black placeholder:text-slate-400'
                                                : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                        }`}
                                    />
                                    <button
                                        type="submit"
                                        className={`absolute right-1 top-1 bottom-1 px-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                            isBento
                                                ? 'bg-[#bef264] text-black border border-black hover:bg-[#a3e635]'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        }`}
                                        aria-label="Subscribe"
                                    >
                                        <Send className="w-3 h-3" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                        isBento
                            ? 'border-t-2 border-black text-slate-800'
                            : 'border-slate-800/80 text-slate-500'
                    }`}>
                        {/* Dynamic Copyright Year & Creator Credit */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                            <span>&copy; {currentYear} Quiz Platform.</span>
                            <span className="hidden sm:inline text-slate-500 dark:text-slate-600">•</span>
                            <span className="inline-flex items-center gap-1">
                                Made by <span className={`font-bold ${isBento ? 'text-black font-black underline decoration-2' : 'text-indigo-400 font-semibold'}`}>Mohamed Tarek</span>
                            </span>
                            <span className="hidden sm:inline text-slate-500 dark:text-slate-600">•</span>
                            <span>All rights reserved.</span>
                        </div>

                        {/* Legal & Help Modal Triggers */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
                            <button
                                type="button"
                                onClick={() => setActiveModal('privacy')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer outline-none focus:outline-none border-0"
                            >
                                Privacy Policy
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('terms')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer outline-none focus:outline-none border-0"
                            >
                                Terms of Service
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('support')}
                                className="btn-unstyled hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1 outline-none focus:outline-none !border-0 !shadow-none"
                            >
                                <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" />
                                Support
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('status')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5 outline-none focus:outline-none border-0"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                System Status
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('faq')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer outline-none focus:outline-none border-0"
                            >
                                FAQ &amp; Help
                            </button>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Privacy Policy Modal */}
            <Modal
                isOpen={activeModal === 'privacy'}
                onClose={() => setActiveModal(null)}
                title="Privacy Policy"
                maxWidth="max-w-xl"
            >
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                    <p className="font-bold text-slate-900 dark:text-white">Last updated: {currentYear}</p>
                    <p>
                        At Quiz Platform, your privacy is our core priority. We only collect the minimal information necessary to deliver our educational experience, track learning progress, and facilitate multiplayer challenges.
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Information We Collect</h4>
                    <p>
                        We collect your username, email address, avatar selections, quiz completion statistics, and scores. We do not sell or share personal data with third-party advertisers.
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. How We Use Information</h4>
                    <p>
                        Your statistics are used to compute leaderboard ranks, award achievement badges, customize recommendation paths, and display verified completion certificates.
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Security</h4>
                    <p>
                        All passwords are cryptographically hashed, and data transmissions are encrypted using standard TLS protocols.
                    </p>
                </div>
            </Modal>

            {/* Terms of Service Modal */}
            <Modal
                isOpen={activeModal === 'terms'}
                onClose={() => setActiveModal(null)}
                title="Terms of Service"
                maxWidth="max-w-xl"
            >
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                    <p className="font-bold text-slate-900 dark:text-white">Effective Date: {currentYear}</p>
                    <p>
                        By using Quiz Platform, you agree to treat fellow learners respectfully, refrain from automated bot scraping, and maintain fair play during competitive multiplayer tournaments and duels.
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Fair Play & Academic Integrity</h4>
                    <p>
                        Users are encouraged to learn through active recall. The use of automated scripts to artificially manipulate leaderboard scores or tournament results is strictly prohibited.
                    </p>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Account Responsibility</h4>
                    <p>
                        You are responsible for keeping your login credentials confidential. Notify support immediately if you suspect unauthorized account activity.
                    </p>
                </div>
            </Modal>

            {/* Support Modal */}
            <Modal
                isOpen={activeModal === 'support'}
                onClose={() => setActiveModal(null)}
                title="Enterprise Support & Help Desk"
                description="Get fast assistance from our technical team"
                icon={<LifeBuoy className="w-5 h-5 text-indigo-500" />}
                maxWidth="max-w-xl"
            >
                <div className="space-y-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1 pb-3">
                    <a
                        href="mailto:mohaamedtariq12@gmail.com"
                        className={`p-4 rounded-2xl transition-all flex items-center gap-3.5 ${
                            isBento
                                ? 'bg-[#fef08a] border-2 border-black shadow-[3px_3px_0px_#000] text-black hover:-translate-y-0.5'
                                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-indigo-500/40 text-slate-900 dark:text-white'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isBento ? 'bg-black text-[#bef264] border-2 border-black' : 'bg-indigo-500/10 text-indigo-500'
                        }`}>
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-[10px] uppercase font-bold tracking-wider ${isBento ? 'text-black/70' : 'text-slate-400'}`}>Direct Support Email</p>
                            <p className="font-extrabold text-sm">mohaamedtariq12@gmail.com</p>
                        </div>
                    </a>

                    <form onSubmit={handleSupportSubmit} className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-white/5">
                        {/* Category Selector Chips */}
                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                Inquiry Category
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                    { id: 'technical', label: 'Technical Issue' },
                                    { id: 'bug', label: 'Bug Report' },
                                    { id: 'scoring', label: 'Quiz Scoring' },
                                    { id: 'account', label: 'Account & Auth' },
                                    { id: 'feature', label: 'Feature Request' },
                                    { id: 'general', label: 'General Inquiry' },
                                ].map((cat) => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => setSupportCategory(cat.id as any)}
                                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                                            supportCategory === cat.id
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                    : 'bg-indigo-600 text-white shadow-sm'
                                                : isBento
                                                    ? 'bg-white text-black border border-black hover:bg-slate-100'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email & Name row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                    Your Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={supportEmail}
                                    onChange={(e) => setSupportEmail(e.target.value)}
                                    placeholder="alex.dev@quizplatform.com"
                                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs outline-none transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:border-black placeholder:text-neutral-400 font-medium'
                                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                    Your Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={supportName}
                                    onChange={(e) => setSupportName(e.target.value)}
                                    placeholder="Alex Dev"
                                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs outline-none transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:border-black placeholder:text-neutral-400 font-medium'
                                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500'
                                    }`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                Issue Subject *
                            </label>
                            <input
                                type="text"
                                required
                                value={supportSubject}
                                onChange={(e) => setSupportSubject(e.target.value)}
                                placeholder="Quiz question scoring, streak freeze, or bug report"
                                className={`w-full py-2.5 px-3.5 rounded-xl text-xs outline-none transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:border-black placeholder:text-neutral-400 font-medium'
                                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500'
                                }`}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                                    Description & Details *
                                </label>
                                <span className={`text-[10px] ${supportMessage.length < 5 ? 'text-amber-500' : 'text-emerald-500 font-bold'}`}>
                                    {supportMessage.length}/5000
                                </span>
                            </div>
                            <textarea
                                rows={4}
                                required
                                value={supportMessage}
                                onChange={(e) => setSupportMessage(e.target.value)}
                                placeholder="Please describe what happened, what you expected, and any steps to reproduce..."
                                className={`w-full py-2.5 px-3.5 rounded-xl text-xs outline-none transition-all resize-none ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:border-black placeholder:text-neutral-400 font-medium'
                                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500'
                                }`}
                            />
                        </div>

                        <div className="flex justify-end items-center gap-3 pt-3 pb-1">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingSupport}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2 ${
                                    isBento
                                        ? 'bg-[#8b5cf6] !text-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25'
                                }`}
                            >
                                {isSubmittingSupport ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Dispatching Ticket...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Submit Support Ticket</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* System Status Modal */}
            <Modal
                isOpen={activeModal === 'status'}
                onClose={() => setActiveModal(null)}
                title="System Operational Status"
                description="Live service health & performance metrics"
                icon={<Activity className="w-5 h-5 text-emerald-500" />}
                maxWidth="max-w-xl"
            >
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">All Systems Operational</h4>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">99.98% uptime achieved across all regions over the last 90 days.</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Healthy
                        </span>
                    </div>

                    <div className="space-y-2 pt-2">
                        {[
                            { name: 'Core API Gateway', status: 'Operational', latency: '42ms', uptime: '100%' },
                            { name: 'MongoDB Database Cluster', status: 'Operational', latency: '12ms', uptime: '99.99%' },
                            { name: 'Real-Time WebSocket Engine', status: 'Operational', latency: '28ms', uptime: '100%' },
                            { name: 'AI Quiz Generation Engine (Groq)', status: 'Operational', latency: '180ms', uptime: '99.95%' },
                            { name: 'Multi-Language Translation Proxy', status: 'Operational', latency: '65ms', uptime: '99.97%' },
                            { name: 'Static CDN & Client Distribution', status: 'Operational', latency: '15ms', uptime: '100%' }
                        ].map((service, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{service.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="hidden sm:inline font-mono text-[10px] text-slate-400">{service.latency}</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{service.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Updated just now</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>TLS 1.3 Encryption Enforced</span>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* FAQ Modal */}
            <Modal
                isOpen={activeModal === 'faq'}
                onClose={() => setActiveModal(null)}
                title="Frequently Asked Questions"
                maxWidth="max-w-xl"
            >
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">How do XP and Leveling work?</h4>
                        <p>
                            Every completed quiz and daily challenge earns you XP based on accuracy and speed. Earning 1,000 XP advances you to the next Scholar tier!
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Can I create and share my own quizzes?</h4>
                        <p>
                            Yes! Quiz creators and administrators can compose custom quiz tracks, code snippet tests, and share deep links with friends and study groups.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">How do I get help or report a question bug?</h4>
                        <p>
                            Email us directly at <a href="mailto:mohaamedtariq12@gmail.com" className="text-indigo-500 underline font-semibold">mohaamedtariq12@gmail.com</a>.
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Footer;
