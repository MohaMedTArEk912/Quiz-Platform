import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const AdminDashboardPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { allUsers, allAttempts, availableQuizzes, refreshData } = useData();

    if (!currentUser) return null;

    return (
        <AdminDashboard
            users={allUsers}
            attempts={allAttempts}
            quizzes={availableQuizzes}
            currentUser={currentUser}
            onLogout={logout}
            onRefresh={refreshData}
        />
    );
};

export default AdminDashboardPage;
