import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { UserData } from '../lib/api';

interface AuthContextType {
    currentUser: UserData | null;
    isAdmin: boolean;
    isLoading: boolean;
    authError: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    googleLogin: (profile: { email: string; name: string; googleId: string }) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<UserData>) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    // Load session on mount
    useEffect(() => {
        const verifyAndLoadSession = async () => {
            // First check if there's pending Google auth data (from tab-based OAuth flow)
            const googleAuthData = sessionStorage.getItem('googleAuthData');
            if (googleAuthData) {
                try {
                    const { email, name, sub } = JSON.parse(googleAuthData);
                    sessionStorage.removeItem('googleAuthData');
                    console.log('Processing stored Google auth data...');

                    // Call googleLogin which will set the session
                    const { user, token: jwt } = await api.googleLogin({ email, name, googleId: sub });
                    const isAdminUser = user.role === 'admin';
                    setCurrentUser(user);
                    setIsAdmin(isAdminUser);
                    setToken(jwt);
                    setAuthError(null);
                    sessionStorage.setItem('userSession', JSON.stringify({ user, token: jwt, isAdmin: isAdminUser }));
                    setIsLoading(false);
                    return; // Exit early, we've completed auth
                } catch (error: any) {
                    console.error('Error processing stored Google auth:', error);
                    setAuthError(error.message || 'Google authentication failed');
                    sessionStorage.removeItem('googleAuthData');
                    // Continue to check for existing session below
                }
            }

            // Check for existing session
            const savedSession = sessionStorage.getItem('userSession');
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    const sessionToken = session.token as string | undefined;
                    // Verify session with server using JWT
                    const { valid, user } = await api.verifySession(sessionToken);

                    if (valid) {
                        setCurrentUser(user);
                        setIsAdmin(user.role === 'admin');
                        setToken(sessionToken ?? null);
                        setAuthError(null);
                    } else {
                        throw new Error('Invalid session');
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                    sessionStorage.removeItem('userSession');
                    setCurrentUser(null);
                    setIsAdmin(false);
                    setToken(null);
                    // Do not set auth error here as this is just a session restore failure, user might just need to login
                }
            }
            setIsLoading(false);
        };

        verifyAndLoadSession();
    }, []);

    const refreshUser = async () => {
        if (!currentUser) return;
        try {
            const { user } = await api.getUserData(currentUser.userId);
            setCurrentUser(user);
            const isAdminUser = user.role === 'admin';
            setIsAdmin(isAdminUser);
            sessionStorage.setItem('userSession', JSON.stringify({ user, token, isAdmin: isAdminUser }));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const login = async (email: string, password: string) => {
        setAuthError(null);
        const normalizedEmail = email.toLowerCase().trim();
        const { user, token: jwt } = await api.login({ email: normalizedEmail, password });
        const isAdminUser = user.role === 'admin';

        setIsAdmin(isAdminUser);
        setCurrentUser(user);
        setToken(jwt);
        sessionStorage.setItem('userSession', JSON.stringify({ user, token: jwt, isAdmin: isAdminUser }));
    };

    const register = async (name: string, email: string, password: string) => {
        setAuthError(null);
        const normalizedEmail = email.toLowerCase().trim();
        const userId = normalizedEmail.replace(/[^a-z0-9]/g, '_');

        const baseUserData: UserData = {
            userId,
            name: name.trim(),
            email: normalizedEmail,
            totalScore: 0,
            totalAttempts: 0,
            totalTime: 0,
            xp: 0,
            level: 1,
            streak: 0,
            lastLoginDate: new Date().toISOString(),
            badges: []
        };

        const registrationData: Partial<UserData> & { password: string } = { ...baseUserData, password };
        const { user, token: jwt } = await api.register(registrationData);

        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
        setToken(jwt);
        sessionStorage.setItem('userSession', JSON.stringify({ user, token: jwt, isAdmin: user.role === 'admin' }));
    };

    const googleLogin = async (profile: { email: string; name: string; googleId: string }) => {
        setAuthError(null);
        const { user, token: jwt } = await api.googleLogin(profile);
        const isAdminUser = user.role === 'admin';
        setCurrentUser(user);
        setIsAdmin(isAdminUser);
        setToken(jwt);
        sessionStorage.setItem('userSession', JSON.stringify({ user, token: jwt, isAdmin: isAdminUser }));
    };

    const logout = () => {
        setCurrentUser(null);
        setIsAdmin(false);
        setToken(null);
        setAuthError(null);
        sessionStorage.removeItem('userSession');
    };

    const updateUser = (updates: Partial<UserData>) => {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
        if (currentUser) {
            const newState = { ...currentUser, ...updates };
            sessionStorage.setItem('userSession', JSON.stringify({ user: newState, token, isAdmin }));
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, isAdmin, isLoading, authError, login, register, googleLogin, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
