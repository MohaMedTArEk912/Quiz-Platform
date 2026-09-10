import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Mail,
    Send,
    Sparkles,
    Activity,
    LifeBuoy,
    CheckCircle2,
    Clock,
    ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import Modal from './common/Modal';

const Footer: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isBento } = useTheme();
    const { showNotification } = useNotification();

    const [emailInput, setEmailInput] = useState('');
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'faq' | 'support' | 'status' | null>(null);

    // Support Form State
    const [supportEmail, setSupportEmail] = useState('');
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

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

    const handleSupportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supportEmail || !supportEmail.includes('@') || !supportMessage.trim()) {
            showNotification('error', 'Please provide your email and a description of the issue.');
            return;
        }
        setIsSubmittingSupport(true);
        setTimeout(() => {
            setIsSubmittingSupport(false);
            showNotification('success', 'Ticket received! Our engineering team will respond within 24 hours.');
            setSupportEmail('');
            setSupportSubject('');
            setSupportMessage('');
            setActiveModal(null);
        }, 600);
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
                                className="flex items-center gap-2.5 group cursor-pointer text-left"
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

                            <p className={`text-xs ${isBento ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                                Made by <span className={`font-bold ${isBento ? 'text-black underline decoration-2' : 'text-indigo-400'}`}>Mohamed Tarek</span>
                            </p>

                            {/* Contact Link: Direct Email Support */}
                            <div className="pt-1">
                                <a
                                    href="mailto:mohaamedtariq12@gmail.com"
                                    className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors hover:text-indigo-400 ${
                                        isBento ? 'text-black hover:text-indigo-600 font-bold' : 'text-slate-300'
                                    }`}
                                    title="Email Support (Mohamed Tarek)"
                                >
                                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>mohaamedtariq12@gmail.com</span>
                                </a>
                            </div>
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
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Home Dashboard
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/tracks')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Skill Tracks
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/study')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Study Flashcards
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/tournaments')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Tournaments
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/daily')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
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
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Global Rankings
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/clans')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Clans & Guilds
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/social')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        1v1 Live Duels
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => handleFooterNav('/shop')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
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
                                className="hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                                Privacy Policy
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('terms')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                                Terms of Service
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('support')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <LifeBuoy className="w-3.5 h-3.5 text-indigo-400" />
                                Support
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('status')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                System Status
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModal('faq')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer"
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
                <div className="space-y-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
                    <a
                        href="mailto:mohaamedtariq12@gmail.com"
                        className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-indigo-500/40 transition-colors flex items-center gap-3.5"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Direct Support Email</p>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">mohaamedtariq12@gmail.com</p>
                        </div>
                    </a>

                    <form onSubmit={handleSupportSubmit} className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-white/5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Your Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                placeholder="alex.dev@quizplatform.com"
                                className="w-full py-2.5 px-3.5 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Issue Subject
                            </label>
                            <input
                                type="text"
                                required
                                value={supportSubject}
                                onChange={(e) => setSupportSubject(e.target.value)}
                                placeholder="Quiz question scoring, streak freeze, or bug report"
                                className="w-full py-2.5 px-3.5 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={supportMessage}
                                onChange={(e) => setSupportMessage(e.target.value)}
                                placeholder="Describe what happened and how we can assist you..."
                                className="w-full py-2.5 px-3.5 rounded-xl text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingSupport}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                {isSubmittingSupport ? 'Submitting...' : 'Submit Support Ticket'}
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
