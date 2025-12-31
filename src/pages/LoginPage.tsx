import React from 'react';
import LoginScreen from '../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (email: string, password: string) => {
        await login(email, password);
        const session = sessionStorage.getItem('userSession');
        const isAdmin = session ? JSON.parse(session).isAdmin : false;
        navigate(isAdmin ? '/admin' : '/'); // Redirect based on role
    };

    const handleGoogleSignIn = () => {
        const redirectUri = `${window.location.origin}/auth/google/callback`;

        const googleWindow = window.open(
            'https://accounts.google.com/o/oauth2/v2/auth?' +
            new URLSearchParams({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                redirect_uri: redirectUri,
                response_type: 'token',
                scope: 'email profile',
            }),
            'Google Sign In',
            'width=500,height=600'
        );

        const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                const { email, name, sub } = event.data.profile;
                await googleLogin({ email, name, googleId: sub });
                const session = sessionStorage.getItem('userSession');
                const isAdmin = session ? JSON.parse(session).isAdmin : false;
                navigate(isAdmin ? '/admin' : '/');

                window.removeEventListener('message', handleMessage);
                googleWindow?.close();
            }
        };

        window.addEventListener('message', handleMessage);
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
