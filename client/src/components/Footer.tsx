import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail,
    Phone,
    Github,
    Twitter,
    Send,
    Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import Modal from './common/Modal';

const Footer: React.FC = () => {
    const navigate = useNavigate();
    const { isBento } = useTheme();
    const { showNotification } = useNotification();

    const [emailInput, setEmailInput] = useState('');
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'faq' | null>(null);

    const currentYear = new Date().getFullYear();

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput || !emailInput.includes('@')) {
            showNotification('error', 'Please enter a valid email address.');
            return;
        }
        showNotification('success', '🎉 Subscribed! You will receive new quiz releases and challenge updates.');
        setEmailInput('');
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
                            {/* Clickable Logo */}
                            <button
                                type="button"
                                onClick={() => navigate('/')}
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

                            {/* Contact Links: Clickable Phone & Email */}
                            <div className="space-y-2 pt-1">
                                <a
                                    href="tel:+18005550199"
                                    className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors hover:text-indigo-400 ${
                                        isBento ? 'text-black hover:text-indigo-600 font-bold' : 'text-slate-300'
                                    }`}
                                    title="Call Support Directly"
                                >
                                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>+1 (800) 555-0199</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">24/7 Support</span>
                                </a>

                                <br />

                                <a
                                    href="mailto:support@quizplatform.com"
                                    className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors hover:text-indigo-400 ${
                                        isBento ? 'text-black hover:text-indigo-600 font-bold' : 'text-slate-300'
                                    }`}
                                    title="Email Support"
                                >
                                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>support@quizplatform.com</span>
                                </a>
                            </div>

                            {/* Social Icons */}
                            <div className="flex items-center gap-2.5 pt-2">
                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2 rounded-xl border transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
                                    }`}
                                    aria-label="GitHub Repository"
                                >
                                    <Github className="w-4 h-4" />
                                </a>
                                <a
                                    href="https://x.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2 rounded-xl border transition-all ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
                                    }`}
                                    aria-label="Twitter / X"
                                >
                                    <Twitter className="w-4 h-4" />
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
                                        onClick={() => navigate('/')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Home Dashboard
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/tracks')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Skill Tracks
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/study')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Study Flashcards
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/tournaments')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Tournaments
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/daily')}
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
                                        onClick={() => navigate('/leaderboard')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Global Rankings
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/clans')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        Clans & Guilds
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/social')}
                                        className="hover:text-indigo-400 transition-colors text-left cursor-pointer"
                                    >
                                        1v1 Live Duels
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/shop')}
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
                        {/* Dynamic Copyright Year */}
                        <div className="flex items-center gap-1">
                            <span>&copy; {currentYear} Quiz Platform. All rights reserved.</span>
                        </div>

                        {/* Legal & Help Modal Triggers */}
                        <div className="flex items-center gap-4 sm:gap-6 font-medium">
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
                                onClick={() => setActiveModal('faq')}
                                className="hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                                FAQ & Help
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
                maxWidth="lg"
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
                maxWidth="lg"
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

            {/* FAQ Modal */}
            <Modal
                isOpen={activeModal === 'faq'}
                onClose={() => setActiveModal(null)}
                title="Frequently Asked Questions"
                maxWidth="lg"
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
                            Email us at <a href="mailto:support@quizplatform.com" className="text-indigo-500 underline font-semibold">support@quizplatform.com</a> or call our toll-free line <a href="tel:+18005550199" className="text-indigo-500 underline font-semibold">+1 (800) 555-0199</a>.
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Footer;
