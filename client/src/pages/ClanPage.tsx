import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ClanHub } from '../components/social/ClanHub';
import Navbar from '../components/Navbar';
import { AmbientBackground } from '../components/AmbientBackground';

const ClanPage: React.FC = () => {
    const { currentUser, refreshUser, logout, isLoading } = useAuth();
    const navigate = useNavigate();

    if (isLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0b]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0b] text-gray-900 dark:text-white selection:bg-violet-500/30">
            <AmbientBackground />
            <Navbar
                user={currentUser}
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
                showActions={true}
            />
            <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                <ClanHub user={currentUser} onUpdateUser={refreshUser} />
            </main>
        </div>
    );
};

export default ClanPage;
