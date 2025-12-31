import React from 'react';
import AnalyticsPanel from '../components/engage/AnalyticsPanel';
import { useAuth } from '../context/AuthContext';

const AnalyticsPage: React.FC = () => {
    const { currentUser } = useAuth();

    if (!currentUser) return null;

    return <AnalyticsPanel user={currentUser} />;
};

export default AnalyticsPage;
