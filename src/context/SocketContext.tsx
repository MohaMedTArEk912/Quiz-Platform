/* eslint-disable react-hooks/refs */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        // Optional: return null or throw. Logic in App.tsx seemed to allow socket to be null.
        return { socket: null, connected: false };
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
    const url = envUrl ?? (isLocal ? 'http://localhost:8000' : defaultProdUrl);

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

    const socketConfig = useMemo(() => resolveSocketConfig(), []);

    const userId = currentUser?.userId ?? null;

    useEffect(() => {
        if (!socketConfig.enabled) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            return;
        }

        if (!userId) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
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

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
                setConnected(false);
            };
        } catch (error) {
            if (import.meta.env.DEV) console.error('Socket initialization failed:', error);
            return;
        }
    }, [userId, socketConfig]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
