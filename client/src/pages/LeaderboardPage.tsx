import React from 'react';
import Leaderboard from '../components/Leaderboard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const LeaderboardPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { allUsers, userWithRank } = useData();
    const navigate = useNavigate();

    if (!currentUser) return null;

    return (
        <Leaderboard
            users={allUsers}
            currentUser={userWithRank || currentUser}
            onBack={() => navigate('/')}
        />
    );
};

export default LeaderboardPage;
