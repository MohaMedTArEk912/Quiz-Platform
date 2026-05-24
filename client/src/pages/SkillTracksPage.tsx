import React from 'react';
import SkillTracks from '../components/engage/SkillTracks';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';

const SkillTracksPage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();

    if (!currentUser) return null;

    return (
        <PageLayout title="Skill Tracks">
            <SkillTracks user={currentUser} onUserUpdate={(u) => updateUser(u)} />
        </PageLayout>
    );
};

export default SkillTracksPage;
