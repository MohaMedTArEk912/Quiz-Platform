/* eslint-disable react-hooks/refs */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    onlineUsers: Set<string>;
    isUserOnline: (userId: string) => boolean;
    checkUserOnline: (userId: string) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        // Optional: return null or throw. Logic in App.tsx seemed to allow socket to be null.
        return {
            socket: null,
            connected: false,
            onlineUsers: new Set<string>(),
            isUserOnline: () => false,
            checkUserOnline: async () => false
        };
    }
    return context;
};

const resolveSocketConfig = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    const envUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
    const envPath = import.meta.env.VITE_SOCKET_PATH as string | undefined;
    const envEnabled = import.meta.env.VITE_ENABLE_SOCKET as string | undefined;

    // Default to enabled in production/local unless explicitly disabled
    const enabled = envEnabled !== 'false';
    if (!enabled) {
        return { enabled: false } as const;
    }

    // Default backend URL (Koyeb)
    const defaultProdUrl = 'https://profitable-starr-mohamedtarek-27df73a5.koyeb.app';

    // Use environment variable, then fallback to local (if local) or production default
    let url = envUrl ?? (isLocal ? 'http://localhost:5000' : defaultProdUrl);

    // If on Koyeb, use the same host for sockets
    if (!isLocal && hostname.includes('koyeb.app')) {
        url = window.location.origin;
    }

    // Default path is /socket.io/ (standard for most Node deployments)
    const path = envPath ?? '/socket.io/';

    // Always prefer websocket for performance, fallback to polling
    const transports = ['websocket', 'polling'];

    return { enabled: true, url, path, transports } as const;
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const socketConfig = useMemo(() => resolveSocketConfig(), []);

    const userId = currentUser?.userId ?? null;

    // Helper to check if a user is online (from local cache)
    const isUserOnline = useCallback((targetUserId: string): boolean => {
        return onlineUsers.has(targetUserId);
    }, [onlineUsers]);

    // Helper to check user online status via socket (server query)
    const checkUserOnline = useCallback((targetUserId: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                resolve(false);
                return;
            }
            socket.emit('check_user_online', targetUserId, (response: { userId: string; isOnline: boolean }) => {
                if (response.isOnline) {
                    setOnlineUsers(prev => new Set(prev).add(response.userId));
                }
                resolve(response.isOnline);
            });
        });
    }, []);

    useEffect(() => {
        if (!socketConfig.enabled) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            setOnlineUsers(new Set());
            return;
        }

        if (!userId) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            setOnlineUsers(new Set());
            return;
        }

        if (socketRef.current) return;

        // Netlify Functions cannot hold WebSockets; allow production sockets only when explicitly enabled.
        const { url: socketUrl, path: socketPath, transports } = socketConfig;

        try {
            const newSocket = io(socketUrl, {
                transports,
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                path: socketPath
            });
            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                if (import.meta.env.DEV) console.log('✅ WebSocket connected successfully');
                setConnected(true);
                newSocket.emit('join_user', userId);
            });

            newSocket.on('disconnect', (reason) => {
                if (import.meta.env.DEV) console.log('❌ WebSocket disconnected:', reason);
                setConnected(false);
            });

            newSocket.on('connect_error', (error) => {
                if (import.meta.env.DEV) console.log('⚠️ Socket connection error:', error.message);
                setConnected(false);
            });

            // Listen for presence updates
            newSocket.on('user_online', ({ userId: onlineUserId }: { userId: string }) => {
                setOnlineUsers(prev => {
                    const updated = new Set(prev);
                    updated.add(onlineUserId);
                    return updated;
                });
            });

            newSocket.on('user_offline', ({ userId: offlineUserId }: { userId: string }) => {
                setOnlineUsers(prev => {
                    const updated = new Set(prev);
                    updated.delete(offlineUserId);
                    return updated;
                });
            });

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
                setConnected(false);
                setOnlineUsers(new Set());
            };
        } catch (error) {
            if (import.meta.env.DEV) console.error('Socket initialization failed:', error);
            return;
        }
    }, [userId, socketConfig]);

    const contextValue = useMemo(() => ({
        socket: socketRef.current,
        connected,
        onlineUsers,
        isUserOnline,
        checkUserOnline
    }), [connected, onlineUsers, isUserOnline, checkUserOnline]);

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};
