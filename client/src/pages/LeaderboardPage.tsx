import React from 'react';
import Leaderboard from '../components/Leaderboard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { GUEST_USER } from '../constants/appDefaults';

const LeaderboardPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { allUsers, userWithRank } = useData();
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <Leaderboard
            users={allUsers}
            currentUser={userWithRank || currentUser || GUEST_USER}
            onBack={handleBack}
        />
    );
};


export default LeaderboardPage;
