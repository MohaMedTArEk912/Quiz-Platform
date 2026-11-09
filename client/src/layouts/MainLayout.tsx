import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import InstallPWA from '../components/InstallPWA';
import PwaUpdatePrompt from '../components/PwaUpdatePrompt';
import { GlobalChatDrawer } from '../components/chat/GlobalChatDrawer';
import { NavbarCustomizerModal } from '../components/nav/NavbarCustomizerModal';

const MainLayout: React.FC = () => {
    const { socket } = useSocket();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const [gameInvite, setGameInvite] = useState<{ fromId: string; fromName: string; quizId: string; roomId: string } | null>(null);

    const isQuizOrGame = location.pathname.startsWith('/quiz') || location.pathname.startsWith('/game');

    // Socket Listeners (Global)
    useEffect(() => {
        if (!socket) return;

        const handleInvite = (invite: { fromId: string; fromName: string; quizId: string; roomId: string }) => {
            setGameInvite(invite);
            showNotification('info', `${invite.fromName} challenged you to a quiz!`, {
                title: '⚔️ Quiz Challenge',
                action: {
                    label: 'Accept Duel',
                    onClick: () => {
                        navigate('/game/vs', {
                            state: {
                                quizId: invite.quizId,
                                opponent: { id: invite.fromId, name: invite.fromName },
                                roomId: invite.roomId
                            }
                        });
                    }
                }
            });
        };

        const handleClassroomInvite = (invite: { fromUser?: { name: string }; pin: string; quizTitle?: string }) => {
            const senderName = invite.fromUser?.name || 'A classmate';
            showNotification('info', `${senderName} invited you to join Classroom Duel: ${invite.quizTitle || 'Live Arena'}!`, {
                title: '🎓 Classroom Invite',
                action: {
                    label: 'Join Duel',
                    onClick: () => {
                        navigate(`/classroom?pin=${invite.pin}`);
                    }
                }
            });
        };

        socket.on('game_invite', handleInvite);
        socket.on('classroom_invite_received', handleClassroomInvite);

        return () => {
            socket.off('game_invite', handleInvite);
            socket.off('classroom_invite_received', handleClassroomInvite);
        };
    }, [socket, showNotification, navigate]);

    const acceptInvite = () => {
        if (!gameInvite) return;
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
            <InstallPWA /> {/* Global PWA install prompt */}
            <PwaUpdatePrompt /> {/* Global PWA auto-update prompt */}
            <NavbarCustomizerModal /> {/* Global Nav Customizer */}
            {!isQuizOrGame && (
                <GlobalChatDrawer />
            )}

            {/* Global Invite Modal */}
            {gameInvite && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 dark:bg-black/45 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-orange-500/25">
                            ⚔️
                        </div>
                        <h3 className="text-lg font-black tracking-tight mb-1 text-gray-900 dark:text-white uppercase">
                            Quiz Challenge!
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-medium">
                            <span className="font-black text-orange-500 dark:text-orange-400">{gameInvite.fromName}</span> challenged you to a live 1v1 duel!
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setGameInvite(null)}
                                className="flex-1 py-2.5 px-3 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-colors cursor-pointer border border-gray-200 dark:border-white/5"
                            >
                                Decline
                            </button>
                            <button
                                type="button"
                                onClick={acceptInvite}
                                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                            >
                                Accept Duel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MainLayout;
