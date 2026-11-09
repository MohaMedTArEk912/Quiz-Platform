import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import { PublicUserProfileView } from '../components/profile/PublicUserProfileView';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AmbientBackground } from '../components/AmbientBackground';

const ProfilePage: React.FC = () => {
    const { userId: routeUserId } = useParams<{ userId?: string }>();
    const { currentUser, updateUser } = useAuth();
    const { userWithRank, allAttempts, allUsers } = useData();
    const { isBento } = useTheme();
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    // If viewing another user's profile:
    if (routeUserId && routeUserId !== currentUser?.userId) {
        return (
            <div className={`min-h-screen relative flex flex-col ${isBento ? 'bg-[#fffbeb]' : 'bg-[#090d16]'}`}>
                <AmbientBackground />
                <Navbar user={currentUser} />

                <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full relative z-10 space-y-6">
                    {/* Back Button Bar */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleBack}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                    : 'bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <UserIcon className="w-4 h-4" />
                            <span>Player Public Dossier</span>
                        </div>
                    </div>

                    <PublicUserProfileView
                        userId={routeUserId}
                        isModal={false}
                    />
                </main>

                <Footer />
            </div>
        );
    }

    // Own Profile View
    if (!currentUser) return null;

    return (
        <UserProfile
            user={userWithRank || currentUser}
            attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
            allUsers={allUsers}
            onBack={handleBack}
            onUserUpdate={(u) => updateUser(u)}
        />
    );
};

export default ProfilePage;
