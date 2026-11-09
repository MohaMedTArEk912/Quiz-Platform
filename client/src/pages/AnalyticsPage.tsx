import React from 'react';
import AnalyticsPanel from '../components/engage/AnalyticsPanel';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';

const AnalyticsPage: React.FC = () => {
    const { currentUser } = useAuth();

    if (!currentUser) return null;

    return (
        <PageLayout title="Performance Analytics">
            <AnalyticsPanel user={currentUser} />
        </PageLayout>
    );
};

export default AnalyticsPage;
