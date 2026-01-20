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
            const googleAuthData = sessionStorage.getItem('googleAuthData');
            if (googleAuthData) {
                try {
                    const { email, name, sub } = JSON.parse(googleAuthData);
                    sessionStorage.removeItem('googleAuthData');
                    await googleLogin({ email, name, googleId: sub });
                    const session = sessionStorage.getItem('userSession');
                    const isAdmin = session ? JSON.parse(session).isAdmin : false;
                    navigate(isAdmin ? '/admin' : '/', { replace: true });
                } catch (error) {
                    console.error('Error processing stored Google auth:', error);
                }
            }
        };
        checkGoogleAuth();
    }, [googleLogin, navigate]);

    const handleLogin = async (email: string, password: string) => {
        await login(email, password);
        const session = sessionStorage.getItem('userSession');
        const isAdmin = session ? JSON.parse(session).isAdmin : false;
        navigate(isAdmin ? '/admin' : '/', { replace: true });
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

        const redirectUri = `${window.location.origin}/auth/google/callback.html`;

        const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'token',
                scope: 'email profile',
                prompt: 'select_account'
            });

        const googleWindow = window.open(
            googleAuthUrl,
            'Google Sign In',
            'width=500,height=600,scrollbars=yes'
        );

        if (!googleWindow) {
            confirm({
                title: 'Pop-up Blocked',
                message: 'Pop-up blocked! Please allow pop-ups for this site to use Google Sign-In.',
                confirmText: 'OK',
                type: 'warning',
                cancelText: 'Close'
            });
            return;
        }

        const handleMessage = async (event: MessageEvent) => {
            // Verify the origin for security
            if (event.origin !== window.location.origin) {
                console.warn('Received message from untrusted origin:', event.origin);
                return;
            }

            if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                try {
                    const { email, name, sub } = event.data.profile;
                    await googleLogin({ email, name, googleId: sub });
                    const session = sessionStorage.getItem('userSession');
                    const isAdmin = session ? JSON.parse(session).isAdmin : false;
                    navigate(isAdmin ? '/admin' : '/', { replace: true });
                } catch (error) {
                    console.error('Google login error:', error);
                    confirm({
                        title: 'Login Failed',
                        message: 'Failed to sign in with Google. Please try again.',
                        confirmText: 'OK',
                        type: 'danger',
                        cancelText: 'Close'
                    });
                } finally {
                    window.removeEventListener('message', handleMessage);
                    googleWindow?.close();
                }
            } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                console.error('Google auth error:', event.data.error);
                confirm({
                    title: 'Login Error',
                    message: `Google Sign-In failed: ${event.data.error}`,
                    confirmText: 'OK',
                    type: 'danger',
                    cancelText: 'Close'
                });
                window.removeEventListener('message', handleMessage);
                googleWindow?.close();
            }
        };

        window.addEventListener('message', handleMessage);

        // Cleanup listener if window is closed manually
        // Use try-catch to handle Cross-Origin-Opener-Policy restrictions
        // Fallback cleanup after 5 minutes
        setTimeout(() => {
            window.removeEventListener('message', handleMessage);
        }, 300000);
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
