import React, { useEffect } from 'react';
import LoginScreen from '../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';

const LoginPage: React.FC = () => {
    const { login, googleLogin, currentUser, isLoading, authError } = useAuth();
    const navigate = useNavigate();
    const { confirm, confirmState, handleCancel } = useConfirm();

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && currentUser) {
            const redirectUrl = (currentUser as any).role === 'admin' ? '/admin' : '/';
            console.log('[LoginPage] User already logged in, redirecting to:', redirectUrl);
            navigate(redirectUrl, { replace: true });
        }
    }, [currentUser, isLoading, navigate]);

    // Show auth errors (like from automatic Google login)
    useEffect(() => {
        if (authError) {
            confirm({
                title: 'Authentication Error',
                message: authError,
                confirmText: 'OK',
                type: 'danger',
                cancelText: 'Close'
            });
        }
    }, [authError, confirm]);

    // Show loading spinner while checking auth state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    const handleLogin = async (email: string, password: string) => {
        try {
            await login(email, password);
            const session = sessionStorage.getItem('userSession');
            const isAdmin = session ? JSON.parse(session).isAdmin : false;
            const redirectUrl = isAdmin ? '/admin' : '/';
            navigate(redirectUrl, { replace: true });
        } catch (error) {
            console.error('Login failed:', error);
            // Error handling is done in LoginScreen component
        }
    };

    const handleGoogleSignIn = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
            confirm({
                title: 'Configuration Error',
                message: 'Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.',
                confirmText: 'OK',
                type: 'warning',
                cancelText: 'Close'
            });
            console.error('VITE_GOOGLE_CLIENT_ID is not set');
            return;
        }

        // Always use the current window origin to work on both dev (5173) and production (7860)
        // This ensures the OAuth redirect URI matches the actual browser URL
        const appUrl = window.location.origin;
        const redirectUri = `${appUrl}/auth/google/callback.html`;

        console.log('[Google OAuth] Current origin:', window.location.origin);
        console.log('[Google OAuth] Redirect URI:', redirectUri);


        const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'token',
                scope: 'email profile',
                prompt: 'select_account'
            });

        // SAME-TAB REDIRECT: Navigate the current window to Google OAuth
        console.log('%c[Google OAuth] Starting same-tab redirect flow', 'color: #4285F4; font-weight: bold');
        console.log('[Google OAuth] Redirect URI:', redirectUri);
        console.log('[Google OAuth] Redirecting to Google...');
        window.location.href = googleAuthUrl;
    };

    return (
        <>
            <LoginScreen
                onLogin={handleLogin}
                onSwitchToRegister={() => navigate('/register')}
                onSwitchToForgotPassword={() => navigate('/forgot-password')}
                onGoogleSignIn={handleGoogleSignIn}
            />
            <ConfirmDialog
                {...confirmState}
                onCancel={handleCancel}
            // Hide cancel button if it's just an alert-style message
            // The customization relies on confirmState defaults or specific calls
            />
        </>
    );
};

export default LoginPage;
