import React from 'react';
import DailyChallenge from '../components/engage/DailyChallenge';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';
const DailyChallengePage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();

    if (!currentUser) return null;

    return (
        <PageLayout title="Daily Challenge">
            <DailyChallenge
                user={currentUser}
                onUserUpdate={(u) => updateUser(u)}
            />
        </PageLayout>
    );
};

export default DailyChallengePage;
