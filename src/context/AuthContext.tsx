import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { UserData } from '../lib/api';

interface AuthContextType {
    currentUser: UserData | null;
    isAdmin: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    googleLogin: (profile: { email: string; name: string; googleId: string }) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<UserData>) => void;
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

    // Load session on mount
    useEffect(() => {
        const verifyAndLoadSession = async () => {
            const savedSession = sessionStorage.getItem('userSession');
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    // Verify session with server
                    const { valid, user } = await api.verifySession(session.user.userId);

                    if (valid) {
                        setCurrentUser(user);
                        setIsAdmin(user.role === 'admin');
                    } else {
                        throw new Error('Invalid session');
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                    sessionStorage.removeItem('userSession');
                    setCurrentUser(null);
                    setIsAdmin(false);
                }
            }
            setIsLoading(false);
        };

        verifyAndLoadSession();
    }, []);

    const login = async (email: string, password: string) => {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await api.login({ email: normalizedEmail, password });
        const isAdminUser = user.role === 'admin';

        setIsAdmin(isAdminUser);
        setCurrentUser(user);
        sessionStorage.setItem('userSession', JSON.stringify({ user, isAdmin: isAdminUser }));
    };

    const register = async (name: string, email: string, password: string) => {
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
        await api.register(registrationData);

        setCurrentUser(baseUserData);
        setIsAdmin(false);
        sessionStorage.setItem('userSession', JSON.stringify({ user: baseUserData, isAdmin: false }));
    };

    const googleLogin = async (profile: { email: string; name: string; googleId: string }) => {
        const user = await api.googleLogin(profile);
        const isAdminUser = user.role === 'admin';
        setCurrentUser(user);
        setIsAdmin(isAdminUser);
        sessionStorage.setItem('userSession', JSON.stringify({ user, isAdmin: isAdminUser }));
    };

    const logout = () => {
        setCurrentUser(null);
        setIsAdmin(false);
        sessionStorage.removeItem('userSession');
    };

    const updateUser = (updates: Partial<UserData>) => {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
        // Also update session storage to persist local changes? 
        // Usually session storage holds the initial session, but if we refresh, we want latest.
        // Ideally session storage just holds ID/Token and we fetch fresh.
        // But keeping it consistent:
        if (currentUser) {
            const newState = { ...currentUser, ...updates };
            sessionStorage.setItem('userSession', JSON.stringify({ user: newState, isAdmin }));
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, isAdmin, isLoading, login, register, googleLogin, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
