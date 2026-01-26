import React, { useEffect } from 'react';
import LoginScreen from '../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';

const LoginPage: React.FC = () => {
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const { confirm, confirmState, handleCancel } = useConfirm();

    // Check for Google auth data in session storage (in case popup closed)
    useEffect(() => {
        const checkGoogleAuth = async () => {
            console.log('%c[LoginPage] Checking for stored Google auth data...', 'color: #9C27B0; font-weight: bold');
            const googleAuthData = sessionStorage.getItem('googleAuthData');
            console.log('[LoginPage] googleAuthData found:', !!googleAuthData);

            // VISIBLE ALERT FOR DEBUGGING
            if (googleAuthData) {
                alert(`🔍 Found Google auth data! Will attempt auto-login.\n\nData: ${googleAuthData.substring(0, 50)}...`);
            } else {
                console.log('[LoginPage] No stored Google auth data found');
            }

            if (googleAuthData) {
                try {
                    const { email, name, sub } = JSON.parse(googleAuthData);
                    console.log('[LoginPage] Parsed auth data:', { email, name, hasSubId: !!sub });
                    console.log('[LoginPage] Removing googleAuthData from sessionStorage');
                    sessionStorage.removeItem('googleAuthData');

                    console.log('[LoginPage] Calling googleLogin...');
                    await googleLogin({ email, name, googleId: sub });
                    console.log('[LoginPage] googleLogin completed successfully');

                    // Give React a moment to update state
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const session = sessionStorage.getItem('userSession');
                    const isAdmin = session ? JSON.parse(session).isAdmin : false;
                    const redirectUrl = isAdmin ? '/admin' : '/';

                    console.log('[LoginPage] Session after login:', session);
                    console.log('[LoginPage] Redirecting to:', redirectUrl);

                    // Show success message
                    alert(`✅ Login successful!\n\nRedirecting to ${redirectUrl}...`);

                    // Use replace() for more forceful navigation
                    window.location.replace(redirectUrl);
                } catch (error: any) {
                    console.error('%c[LoginPage] ERROR processing stored Google auth:', 'color: #f44336; font-weight: bold', error);
                    alert(`❌ Auto-login failed!\n\n${error?.message || error}\n\nPlease try logging in manually.`);
                }
            }
        };
        checkGoogleAuth();
    }, [googleLogin]);

    const handleLogin = async (email: string, password: string) => {
        await login(email, password);
        const session = sessionStorage.getItem('userSession');
        const isAdmin = session ? JSON.parse(session).isAdmin : false;
        window.location.href = isAdmin ? '/admin' : '/';
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

        // Use VITE_APP_URL if set, otherwise fall back to window.location.origin
        // This allows proper OAuth redirect in both dev (localhost:5173) and Docker (localhost:7860)
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectUri = `${appUrl}/auth/google/callback.html`;

        console.log('OAuth Redirect URI:', redirectUri); // Debug log


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
