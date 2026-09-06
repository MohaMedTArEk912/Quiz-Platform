import React from 'react';
import SkillTracks from '../components/engage/SkillTracks';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';
import { GUEST_USER } from '../constants/appDefaults';

const SkillTracksPage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();

    return (
        <PageLayout title="Skill Tracks">
            <SkillTracks user={currentUser || GUEST_USER} onUserUpdate={(u) => updateUser(u)} />
        </PageLayout>
    );
};

export default SkillTracksPage;

