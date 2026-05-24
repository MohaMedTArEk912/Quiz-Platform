import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AmbientBackground } from '../components/AmbientBackground';

interface PageLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    if (!currentUser) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0b] transition-colors duration-300 relative overflow-hidden">
            <AmbientBackground />
            <Navbar
                user={currentUser}
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={handleLogout}
                title="Quiz Platform"
                showActions={true}
            />
            <div className="min-h-[calc(100vh-64px)] relative z-10">
                {children}
            </div>
        </div>
    );
};

export default PageLayout;
