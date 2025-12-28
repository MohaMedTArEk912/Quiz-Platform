import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import type { ReactNode } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface GoogleAuthWrapperProps {
    children: ReactNode;
}

export const GoogleAuthWrapper: React.FC<GoogleAuthWrapperProps> = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) {
        console.warn('Google Client ID not configured');
        return <>{children}</>;
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {children}
        </GoogleOAuthProvider>
    );
};

export const useGoogleAuth = () => {
    return useGoogleLogin;
};
