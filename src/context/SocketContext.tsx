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

        // Netlify Functions do not support true WebSockets. Use polling in prod and point to the function path.
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        const socketUrl = isDevelopment ? 'http://localhost:5000' : window.location.origin;
        const socketPath = isDevelopment ? '/socket.io/' : '/.netlify/functions/api/socket.io/';
        const transports = isDevelopment ? ['websocket', 'polling'] : ['polling'];

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
                console.log('✅ WebSocket connected successfully');
                setConnected(true);
                newSocket.emit('join_user', userId);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('❌ WebSocket disconnected:', reason);
                setConnected(false);
            });

            newSocket.on('connect_error', (error) => {
                console.log('⚠️ Socket connection error:', error.message);
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
