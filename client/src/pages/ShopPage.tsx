import React from 'react';
import Shop from '../components/engage/Shop';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';

const ShopPage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();

    if (!currentUser) return null;

    return (
        <PageLayout title="Power-Up Shop">
            <Shop
                user={currentUser}
                onUserUpdate={(u) => updateUser(u)}
            />
        </PageLayout>
    );
};

export default ShopPage;
