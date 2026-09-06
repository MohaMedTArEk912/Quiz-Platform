import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AmbientBackground } from '../components/AmbientBackground';
import { useTheme } from '../context/ThemeContext';

interface PageLayoutProps {
    children: React.ReactNode;
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, showBack, onBack }) => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const { isBento } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };


    return (
        <div className={`min-h-dvh transition-colors duration-200 relative selection:bg-indigo-500/25 ${
            isBento
                ? 'bg-transparent text-black'
                : 'bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100'
        }`}>
            <AmbientBackground />
            <Navbar
                user={currentUser}
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={handleLogout}
                title={title || "Quiz Platform"}
                showBack={showBack}
                onBack={onBack}
                showActions={true}
            />
            <main className="min-h-[calc(100dvh-64px)] relative z-10">
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
