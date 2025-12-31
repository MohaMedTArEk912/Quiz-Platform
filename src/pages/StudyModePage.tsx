import React from 'react';
import StudyMode from '../components/engage/StudyMode';
import PageLayout from '../layouts/PageLayout';

const StudyModePage: React.FC = () => {
    return (
        <PageLayout title="Study Mode">
            <StudyMode />
        </PageLayout>
    );
};

export default StudyModePage;
