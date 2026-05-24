import React from 'react';
import StudyCardComponent from '../components/engage/StudyCard';
import PageLayout from '../layouts/PageLayout';

const StudyModePage: React.FC = () => {
    return (
        <PageLayout title="Study Mode">
            <StudyCardComponent />
        </PageLayout>
    );
};

export default StudyModePage;
