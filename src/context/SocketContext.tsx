/* eslint-disable react-hooks/refs */
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    const userId = currentUser?.userId ?? null;

    useEffect(() => {
        if (!userId) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setConnected(false);
            return;
        }

        if (socketRef.current) return;

        // Only attempt socket connection in development or when explicitly configured
        // Vercel and other serverless platforms don't support WebSockets
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const socketUrl = import.meta.env.VITE_API_URL;

        // Skip socket connection if we're in production without explicit socket URL
        if (!isDevelopment && !socketUrl) {
            console.log('WebSocket connections not available in this environment');
            return;
        }

        const finalSocketUrl = socketUrl || 'http://localhost:5000';

        try {
            const newSocket = io(finalSocketUrl, {
                transports: ['websocket', 'polling'],
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000,
                timeout: 5000
            });
            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                setConnected(true);
                newSocket.emit('join_user', userId);
            });

            newSocket.on('disconnect', () => {
                setConnected(false);
            });

            newSocket.on('connect_error', (error) => {
                console.log('Socket connection not available:', error.message);
                setConnected(false);
            });

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
                setConnected(false);
            };
        } catch (error) {
            console.log('Socket initialization failed:', error);
            return;
        }
    }, [userId]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
