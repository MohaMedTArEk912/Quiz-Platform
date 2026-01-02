import React, { useEffect } from 'react';
import LoginScreen from '../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();

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
                    navigate(isAdmin ? '/admin' : '/');
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
        navigate(isAdmin ? '/admin' : '/');
    };

    const handleGoogleSignIn = () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
            alert('Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.');
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
            alert('Pop-up blocked! Please allow pop-ups for this site to use Google Sign-In.');
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
                    navigate(isAdmin ? '/admin' : '/');
                } catch (error) {
                    console.error('Google login error:', error);
                    alert('Failed to sign in with Google. Please try again.');
                } finally {
                    window.removeEventListener('message', handleMessage);
                    googleWindow?.close();
                }
            } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                console.error('Google auth error:', event.data.error);
                alert(`Google Sign-In failed: ${event.data.error}`);
                window.removeEventListener('message', handleMessage);
                googleWindow?.close();
            }
        };

        window.addEventListener('message', handleMessage);

        // Cleanup listener if window is closed manually
        // Use try-catch to handle Cross-Origin-Opener-Policy restrictions
        const checkWindowClosed = setInterval(() => {
            try {
                if (googleWindow && googleWindow.closed) {
                    clearInterval(checkWindowClosed);
                    window.removeEventListener('message', handleMessage);
                }
            } catch (e) {
                // Ignore COOP errors - we'll clean up when we receive a message or timeout
                // This prevents console spam from Cross-Origin-Opener-Policy
            }
        }, 1000);

        // Fallback cleanup after 5 minutes
        setTimeout(() => {
            clearInterval(checkWindowClosed);
            window.removeEventListener('message', handleMessage);
        }, 300000);
    };

    return (
        <LoginScreen
            onLogin={handleLogin}
            onSwitchToRegister={() => navigate('/register')}
            onSwitchToForgotPassword={() => navigate('/forgot-password')}
            onGoogleSignIn={handleGoogleSignIn}
        />
    );
};

export default LoginPage;
