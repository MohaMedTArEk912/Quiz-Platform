import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboardPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { allUsers, allAttempts, availableQuizzes, refreshData } = useData();
    const navigate = useNavigate();

    if (!currentUser) return null;

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <AdminDashboard
            users={allUsers}
            attempts={allAttempts}
            quizzes={availableQuizzes}
            currentUser={currentUser}
            onLogout={handleLogout}
            onRefresh={refreshData}
        />
    );
};

export default AdminDashboardPage;
