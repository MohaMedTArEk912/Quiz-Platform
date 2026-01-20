import React from 'react';
import FriendList from '../components/social/FriendList';
import QuizSelectionModal from '../components/social/QuizSelectionModal';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

const SocialPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { allUsers, refreshData, challenges, availableQuizzes } = useData();
    const navigate = useNavigate();
    const { socket, connected } = useSocket();
    const { showNotification } = useNotification();

    const [showQuizModal, setShowQuizModal] = React.useState(false);
    const [selectedFriendId, setSelectedFriendId] = React.useState<string | null>(null);
    const [challengeType, setChallengeType] = React.useState<'live' | 'async' | null>(null);

    if (!currentUser) return null;

    const initiateChallenge = (friendId: string, type: 'live' | 'async') => {
        setSelectedFriendId(friendId);
        setChallengeType(type);
        setShowQuizModal(true);
    };

    const handleQuizSelected = async (quizId: string) => {
        setShowQuizModal(false);
        if (!selectedFriendId || !currentUser) return;

        if (challengeType === 'live') {
            if (socket && connected) {
                // Listen for the room creation confirmation to join immediately (optional, or just navigate)
                // Actually, the server now emits 'challenge_created' to sender. 
                // We should assume we go to the game page in "waiting" mode.

                const handleChallengeCreated = ({ roomId }: { roomId: string }) => {
                    socket.off('challenge_created', handleChallengeCreated);
                    // Navigate to VS Page in waiting mode
                    // We need to resolve opponent name/data for the VS page
                    const opponent = allUsers.find(u => u.userId === selectedFriendId);

                    navigate('/vs-game', {
                        state: {
                            quizId,
                            opponent: {
                                id: selectedFriendId,
                                name: opponent?.name || 'Opponent',
                                avatar: opponent?.avatar
                            },
                            roomId
                        }
                    });
                };

                socket.on('challenge_created', handleChallengeCreated);

                socket.emit('invite_friend', {
                    fromId: currentUser.userId,
                    toId: selectedFriendId,
                    fromName: currentUser.name,
                    quizId
                });

                showNotification('success', `Challenge sent! Waiting for opponent...`);
            } else {
                showNotification('error', 'Socket not connected. Cannot send challenge.');
            }
        } else if (challengeType === 'async') {
            try {
                const challenge = await api.createChallenge(selectedFriendId, quizId, currentUser.userId);
                refreshData();
                const link = `${window.location.origin}/challenge/${challenge.token}`;
                showNotification('success', `Link generated! Copy sent to clipboard.`);
                try {
                    await navigator.clipboard.writeText(link);
                    showNotification('success', 'Challenge link copied to clipboard!');
                } catch {
                    showNotification('info', `Share this link: ${link}`);
                }
            } catch (error) {
                console.error(error);
                showNotification('error', 'Failed to create challenge link.');
            }
        }

        // Reset state
        setSelectedFriendId(null);
        setChallengeType(null);
    };

    const [liveChallenges, setLiveChallenges] = React.useState<any[]>([]);

    // Listen for live invites
    React.useEffect(() => {
        if (!socket) return;

        const handleInvite = (data: { fromId: string, fromName: string, quizId: string, roomId: string }) => {
            const newChallenge = {
                token: data.roomId, // Use roomId as token for live games
                fromId: data.fromId,
                fromName: data.fromName, // Store sender name for UI
                toId: currentUser.userId,
                quizId: data.quizId,
                status: 'pending',
                type: 'live', // user-defined discriminator
                timestamp: Date.now(),
                roomId: data.roomId
            };
            setLiveChallenges(prev => [...prev, newChallenge]);
            showNotification('success', `Live challenge received from ${data.fromName}!`);
        };

        socket.on('game_invite', handleInvite);
        return () => {
            socket.off('game_invite', handleInvite);
        };
    }, [socket, currentUser.userId, showNotification]);

    const combinedChallenges = [...liveChallenges, ...challenges];

    return (
        <PageLayout title="Social">
            <div className="p-6">
                <div className="max-w-4xl mx-auto">
                    <FriendList
                        currentUser={currentUser}
                        allUsers={allUsers}
                        onRefresh={refreshData}
                        challenges={combinedChallenges}
                        onAsyncChallenge={(id) => initiateChallenge(id, 'async')}
                        onStartChallenge={(c) => {
                            if ((c as any).type === 'live') {
                                // Join Live Game
                                const opponent = allUsers.find(u => u.userId === c.fromId);
                                navigate('/vs-game', {
                                    state: {
                                        quizId: c.quizId,
                                        opponent: {
                                            id: c.fromId,
                                            name: opponent?.name || (c as any).fromName || 'Challenger',
                                            avatar: opponent?.avatar
                                        },
                                        roomId: (c as any).roomId
                                    }
                                });
                            } else {
                                navigate(`/challenge/${c.token}`);
                            }
                        }}
                        onChallenge={(id) => initiateChallenge(id, 'live')}
                    />
                </div>
            </div>

            <QuizSelectionModal
                isOpen={showQuizModal}
                onClose={() => setShowQuizModal(false)}
                onSelect={handleQuizSelected}
                quizzes={availableQuizzes}
            />
        </PageLayout>
    );
};

export default SocialPage;
