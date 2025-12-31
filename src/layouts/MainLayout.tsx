import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';

const MainLayout: React.FC = () => {
    const { socket } = useSocket();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [gameInvite, setGameInvite] = useState<{ fromId: string; fromName: string; quizId: string; roomId: string } | null>(null);

    // Socket Listeners (Global)
    useEffect(() => {
        if (!socket) return;

        const handleInvite = (invite: { fromId: string; fromName: string; quizId: string; roomId: string }) => {
            setGameInvite(invite);
            showNotification('info', `${invite.fromName} challenged you to a quiz!`);
        };

        socket.on('game_invite', handleInvite);

        return () => {
            socket.off('game_invite', handleInvite);
        };
    }, [socket, showNotification]);

    const acceptInvite = () => {
        if (!gameInvite) return;
        // Navigate to VS Game setup? 
        // We need 'quiz' object and 'opponent' details. 
        // App.tsx handled this by looking up quiz from availableQuizzes.
        // But MainLayout doesn't access DataContext yet.
        // We can navigate to a setup route that handles lookup? 
        // Or navigate to /game/vs/:roomId?
        // VsGamePage expects state: { quizId, opponent, roomId }.
        // We have quizId and roomId from invite. Opponent is { id: fromId, name: fromName }.
        // So we can navigate directly!

        navigate('/game/vs', {
            state: {
                quizId: gameInvite.quizId,
                opponent: { id: gameInvite.fromId, name: gameInvite.fromName },
                roomId: gameInvite.roomId
            }
        });
        setGameInvite(null);
    };

    return (
        <>
            <Outlet /> {/* Renders the child route */}

            {/* Global Invite Modal */}
            {gameInvite && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in slide-in-from-top-10">
                        <h3 className="text-xl font-bold mb-2 dark:text-white">⚔️ Challenge!</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            <span className="font-bold">{gameInvite.fromName}</span> challenged you to a duel!
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setGameInvite(null)}
                                className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Decline
                            </button>
                            <button
                                onClick={acceptInvite}
                                className="flex-1 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/25"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MainLayout;
