import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';

export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, isAdmin, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <PageLoader />;
    if (!currentUser) {
        // Save the path the user was trying to access so we can redirect back after login
        const intendedPath = location.pathname + location.search;
        if (intendedPath !== '/' && intendedPath !== '/login') {
            sessionStorage.setItem('redirectAfterLogin', intendedPath);
        }
        return <Navigate to="/login" replace />;
    }

    // Redirect admins to admin dashboard if they try to access regular routes
    if (isAdmin && window.location.pathname === '/') {
        return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, isAdmin, isLoading } = useAuth();
    if (isLoading) return <PageLoader />;
    if (!currentUser || !isAdmin) return <Navigate to="/" replace />; // Redirect non-admins to dashboard
    return <>{children}</>;
};
