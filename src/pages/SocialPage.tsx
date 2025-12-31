import React from 'react';
import FriendList from '../components/social/FriendList';
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

    if (!currentUser) return null;

    const handleChallenge = (friendId: string) => {
        if (availableQuizzes.length > 0) {
            const quiz = availableQuizzes[0];
            const quizId = quiz.id || quiz._id;
            if (socket && connected) {
                socket.emit('challenge_user', { to: friendId, quizId, from: currentUser.userId });
                showNotification('success', `Challenge sent to friend!`);
            } else {
                showNotification('error', 'Socket not connected. Cannot send challenge.');
            }
        } else {
            showNotification('info', 'No available quizzes to challenge with.');
        }
    };

    const handleAsyncChallenge = async (friendId: string) => {
        if (!currentUser || availableQuizzes.length === 0) return;
        const quiz = availableQuizzes[0];
        const quizId = (quiz.id || quiz._id) as string;
        try {
            const challenge = await api.createChallenge(friendId, quizId, currentUser.userId);
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
                        onAsyncChallenge={handleAsyncChallenge}
                        onStartChallenge={(c) => navigate(`/challenge/${c.token}`)}
                        onChallenge={handleChallenge}
                    />
                </div>
            </div>
        </PageLayout>
    );
};

export default SocialPage;
