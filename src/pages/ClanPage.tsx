import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ClanHub } from '../components/social/ClanHub';
import Navbar from '../components/Navbar';

const ClanPage: React.FC = () => {
    const { currentUser, refreshUser, logout, isLoading } = useAuth();
    const navigate = useNavigate();

    if (isLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Navbar
                user={currentUser}
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
                showActions={true}
            />
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
                <ClanHub user={currentUser} onUpdateUser={refreshUser} />
            </div>
        </>
    );
};

export default ClanPage;
