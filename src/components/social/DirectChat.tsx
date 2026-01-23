import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import type { UserData, DirectChatMessage } from '../../types';
import { Swords, Clock } from 'lucide-react';
import Avatar from '../Avatar';
import { ChatWindow, type ChallengeAcceptData } from '../chat/ChatWindow';

interface DirectChatProps {
    currentUser: UserData;
    friend: UserData;
    onClose: () => void;
    /** Called when user clicks challenge button. Pass a callback to receive quiz selection result. */
    onStartChallenge: (onQuizSelected: (quizId: string, quizTitle: string) => void) => void;
    onStartAsyncChallenge?: (onQuizSelected: (quizId: string, quizTitle: string) => void) => void;
}

interface ChallengeMessage extends DirectChatMessage {
    challengeData?: {
        quizId?: string;
        quizTitle?: string;
        roomId?: string;
        status?: 'pending' | 'in_progress' | 'completed';
        result?: {
            winnerId?: string | null;
            isDraw?: boolean;
            myScore?: number;
            opponentScore?: number;
        };
    };
}

export const DirectChat: React.FC<DirectChatProps> = ({ currentUser, friend, onClose, onStartChallenge, onStartAsyncChallenge }) => {
    const { socket, isUserOnline, checkUserOnline } = useSocket();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChallengeMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [friendOnline, setFriendOnline] = useState(false);
    const [pendingChallengeMessageId, setPendingChallengeMessageId] = useState<string | null>(null);

    // Check friend's online status on mount and when isUserOnline cache changes
    useEffect(() => {
        const cachedStatus = isUserOnline(friend.userId);
        setFriendOnline(cachedStatus);
        checkUserOnline(friend.userId).then(status => {
            setFriendOnline(status);
        });
    }, [friend.userId, isUserOnline, checkUserOnline]);

    // Subscribe to real-time presence updates
    useEffect(() => {
        if (!socket) return;

        const handleUserOnline = ({ userId }: { userId: string }) => {
            if (userId === friend.userId) setFriendOnline(true);
        };

        const handleUserOffline = ({ userId }: { userId: string }) => {
            if (userId === friend.userId) setFriendOnline(false);
        };

        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);

        return () => {
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
        };
    }, [socket, friend.userId]);

    useEffect(() => {
        setLoading(false);
    }, [friend.userId]);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg: ChallengeMessage) => {
            const isRelevant = (msg.senderId === currentUser.userId && msg.receiverId === friend.userId) ||
                (msg.senderId === friend.userId && msg.receiverId === currentUser.userId);
            if (isRelevant) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        socket.on('new_direct_message', handleNewMessage);
        return () => {
            socket.off('new_direct_message', handleNewMessage);
        };
    }, [socket, friend.userId, currentUser.userId]);

    // Listen for challenge_created to update roomId on pending challenge message
    useEffect(() => {
        if (!socket) return;

        const handleChallengeCreated = ({ roomId }: { roomId: string }) => {
            if (pendingChallengeMessageId) {
                setMessages(prev => prev.map(msg =>
                    msg.id === pendingChallengeMessageId
                        ? {
                            ...msg,
                            challengeData: {
                                ...msg.challengeData,
                                roomId
                            }
                        }
                        : msg
                ));
                setPendingChallengeMessageId(null);
            }
        };

        socket.on('challenge_created', handleChallengeCreated);
        return () => {
            socket.off('challenge_created', handleChallengeCreated);
        };
    }, [socket, pendingChallengeMessageId]);

    // Listen for game_over to update challenge result in messages
    useEffect(() => {
        if (!socket) return;

        const handleGameOver = ({ winnerId, isDraw, results }: {
            winnerId: string | null;
            isDraw: boolean;
            results: Record<string, { score: number }>
        }) => {
            // Find the challenge message for this game and update with results
            setMessages(prev => prev.map(msg => {
                if (msg.type === 'challenge' && msg.challengeData?.status !== 'completed') {
                    const myScore = results[currentUser.userId]?.score ?? 0;
                    const opponentScore = results[friend.userId]?.score ?? 0;
                    return {
                        ...msg,
                        challengeData: {
                            ...msg.challengeData,
                            status: 'completed' as const,
                            result: {
                                winnerId,
                                isDraw,
                                myScore,
                                opponentScore
                            }
                        }
                    };
                }
                return msg;
            }));
        };

        socket.on('game_over', handleGameOver);
        return () => {
            socket.off('game_over', handleGameOver);
        };
    }, [socket, currentUser.userId, friend.userId]);

    const handleSendMessage = useCallback((content: string, type: 'text' | 'challenge', extra?: { quizId?: string; quizTitle?: string; roomId?: string }) => {
        if (!socket) return;

        const messageId = crypto.randomUUID();
        const newMessage: ChallengeMessage = {
            id: messageId,
            senderId: currentUser.userId,
            senderName: currentUser.name,
            receiverId: friend.userId,
            content: content.trim(),
            type,
            challengeData: extra ? {
                ...extra,
                status: 'pending'
            } : undefined,
            createdAt: new Date().toISOString(),
            isRead: false
        };

        // Track pending challenge to update roomId when we receive it
        if (type === 'challenge' && extra?.roomId === 'pending') {
            setPendingChallengeMessageId(messageId);
        }

        setMessages(prev => [...prev, newMessage]);
        socket.emit('send_direct_message', newMessage);
    }, [socket, currentUser.userId, currentUser.name, friend.userId]);

    /** Called when a quiz is selected for a challenge */
    const handleChallengeQuizSelected = useCallback((quizId: string, quizTitle: string, isAsync: boolean = false) => {
        handleSendMessage(
            isAsync ? `I challenged you to "${quizTitle}"! Play when you're ready.` : `I challenged you to a duel on "${quizTitle}"!`,
            'challenge',
            { quizId, quizTitle, roomId: isAsync ? undefined : 'pending' }
        );

        // Emit socket event to create the game room
        if (!isAsync && socket) {
            socket.emit('invite_friend', {
                fromId: currentUser.userId,
                toId: friend.userId,
                fromName: currentUser.name,
                quizId
            });
        }
    }, [handleSendMessage, socket, currentUser.userId, currentUser.name, friend.userId]);

    /** Handle accepting a challenge - navigate to VS game */
    const handleAcceptChallenge = useCallback((data: ChallengeAcceptData) => {
        // Mark challenge as in-progress
        setMessages(prev => prev.map(msg => {
            if (msg.type === 'challenge' && msg.challengeData?.roomId === data.roomId) {
                return {
                    ...msg,
                    challengeData: {
                        ...msg.challengeData,
                        status: 'in_progress' as const
                    }
                };
            }
            return msg;
        }));

        // Navigate to VS game page with proper state
        navigate('/game/vs', {
            state: {
                quizId: data.quizId,
                opponent: {
                    id: data.senderId,
                    name: data.senderName,
                    avatar: friend.avatar
                },
                roomId: data.roomId
            }
        });
    }, [navigate, friend.avatar]);

    const statusDisplay = useMemo(() => {
        if (friendOnline) {
            return {
                text: 'Online',
                dotClass: 'bg-emerald-400 shadow-emerald-400/50 shadow-lg',
                textClass: 'text-emerald-300',
                animate: true
            };
        }
        return {
            text: 'Offline',
            dotClass: 'bg-gray-400',
            textClass: 'text-white/50',
            animate: false
        };
    }, [friendOnline]);

    const headerContent = (
        <div className="flex items-center gap-3">
            <div className={`relative p-0.5 rounded-full ${friendOnline
                ? 'bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 shadow-lg shadow-emerald-500/30'
                : 'bg-white/20'}`}>
                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-0.5 rounded-full">
                    {friend.avatar ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10">
                            <Avatar config={friend.avatar} size="sm" className="w-full h-full" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white/90 text-violet-600 rounded-full flex items-center justify-center font-bold text-lg ring-2 ring-white/10">
                            {friend.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-violet-600 ${statusDisplay.dotClass} ${statusDisplay.animate ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex flex-col">
                <h3 className="text-white font-bold text-lg leading-tight drop-shadow-sm">{friend.name}</h3>
                <div className="flex items-center gap-1.5">
                    {!friendOnline && <Clock className="w-3 h-3 text-white/40" />}
                    <span className={`text-xs font-medium ${statusDisplay.textClass}`}>
                        {statusDisplay.text}
                    </span>
                </div>
            </div>
        </div>
    );

    const inputActions = (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onStartChallenge((quizId, quizTitle) => handleChallengeQuizSelected(quizId, quizTitle, false))}
                className="p-2.5 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Live Challenge"
                aria-label="Start Live Challenge"
            >
                <Swords className="w-5 h-5" />
            </button>
            {onStartAsyncChallenge && (
                <button
                    onClick={() => onStartAsyncChallenge((quizId, quizTitle) => handleChallengeQuizSelected(quizId, quizTitle, true))}
                    className="p-2.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Async Challenge"
                    aria-label="Start Async Challenge"
                >
                    <Clock className="w-5 h-5" />
                </button>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-md h-[75vh] min-h-[450px] max-h-[650px] animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
                <ChatWindow
                    currentUser={currentUser}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClose={onClose}
                    onAcceptChallenge={handleAcceptChallenge}
                    headerContent={headerContent}
                    inputActions={inputActions}
                    loading={loading}
                />
            </div>
        </div>
    );
};
