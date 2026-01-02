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
                socket.emit('challenge_user', { to: selectedFriendId, quizId, from: currentUser.userId });
                showNotification('success', `Challenge sent to friend!`);
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

    return (
        <PageLayout title="Social">
            <div className="p-6">
                <div className="max-w-4xl mx-auto">
                    <FriendList
                        currentUser={currentUser}
                        allUsers={allUsers}
                        onRefresh={refreshData}
                        challenges={challenges}
                        onAsyncChallenge={(id) => initiateChallenge(id, 'async')}
                        onStartChallenge={(c) => navigate(`/challenge/${c.token}`)}
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
