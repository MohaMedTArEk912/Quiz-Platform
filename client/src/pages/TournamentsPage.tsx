import React from 'react';
import Tournaments from '../components/engage/Tournaments';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';

const TournamentsPage: React.FC = () => {
    const { currentUser } = useAuth();

    if (!currentUser) return null;

    return (
        <PageLayout title="Tournaments">
            <Tournaments userId={currentUser.userId} />
        </PageLayout>
    );
};

export default TournamentsPage;
