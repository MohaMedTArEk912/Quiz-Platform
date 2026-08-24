import React from 'react';
import UserProfile from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();
    const { userWithRank, allAttempts, allUsers } = useData();
    const navigate = useNavigate();

    if (!currentUser) return null;

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <UserProfile
            user={userWithRank || currentUser}
            attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
            allUsers={allUsers}
            onBack={handleBack}
            onUserUpdate={(u) => updateUser(u)}
        />
    );
};

export default ProfilePage;
