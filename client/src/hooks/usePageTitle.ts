import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteMetadata {
    title: string;
    description: string;
}

const ROUTE_METADATA: Record<string, RouteMetadata> = {
    '/': {
        title: 'Quiz Platform | Computer Science Quizzes & Learning Roads',
        description: 'Master Computer Science concepts through interactive quizzes, progression roads, and daily challenges.'
    },
    '/leaderboard': {
        title: 'Global Leaderboard | Quiz Platform',
        description: 'Check global player rankings, high scores, streaks, and top scholars across all computer science subjects.'
    },
    '/tracks': {
        title: 'Skill Tracks & Tech Trees | Quiz Platform',
        description: 'Explore comprehensive computer science learning paths from Python basics to advanced system architecture.'
    },
    '/study': {
        title: 'Study Flashcards | Quiz Platform',
        description: 'Review bite-sized concepts, syntax cheatsheets, and flashcards to supercharge your memory retention.'
    },
    '/tournaments': {
        title: 'Live Tournaments & Arenas | Quiz Platform',
        description: 'Compete in scheduled and live multiplayer quiz tournaments to earn prestigious badges and rewards.'
    },
    '/daily': {
        title: 'Daily Code Challenge | Quiz Platform',
        description: 'Solve the daily programming puzzle, maintain your streak, and earn bonus XP.'
    },
    '/shop': {
        title: 'Power-Up & Reward Shop | Quiz Platform',
        description: 'Redeem your earned coins for avatar items, streak freezes, double XP boosters, and profile frames.'
    },
    '/clans': {
        title: 'Clans & Guilds | Quiz Platform',
        description: 'Join forces with other developers, chat in real-time, share decks, and dominate clan leaderboards.'
    },
    '/social': {
        title: 'Social Hub & 1v1 Duels | Quiz Platform',
        description: 'Connect with friends, challenge opponents to live 1v1 quiz battles, and track your rivalries.'
    },
    '/profile': {
        title: 'My Profile & Achievements | Quiz Platform',
        description: 'View your quiz statistics, verified certificates, earned badges, and custom avatar.'
    },
    '/login': {
        title: 'Sign In | Quiz Platform',
        description: 'Sign in to Quiz Platform to save your progress, earn XP, and compete on the global leaderboard.'
    },
    '/register': {
        title: 'Create Account | Quiz Platform',
        description: 'Join Quiz Platform for free and start your computer science learning journey today.'
    },
    '/forgot-password': {
        title: 'Reset Password | Quiz Platform',
        description: 'Reset your Quiz Platform account password securely.'
    },
    '/admin': {
        title: 'Admin Management Console | Quiz Platform',
        description: 'Admin dashboard to manage quizzes, questions, users, tournaments, and analytics.'
    },
    '/game/vs': {
        title: 'Live 1v1 Quiz Duel | Quiz Platform',
        description: 'Real-time head-to-head multiplayer quiz match.'
    },
    '/results': {
        title: 'Quiz Performance & Results | Quiz Platform',
        description: 'Detailed analysis of your quiz attempt, score, accuracy, and earned XP.'
    }
};

export const usePageTitle = () => {
    const location = useLocation();

    useEffect(() => {
        const pathname = location.pathname;

        let meta = ROUTE_METADATA[pathname];

        // Match dynamic routes
        if (!meta) {
            if (pathname.startsWith('/quiz/')) {
                meta = {
                    title: 'Quiz Session | Quiz Platform',
                    description: 'Interactive computer science quiz session. Test your speed and accuracy.'
                };
            } else if (pathname.startsWith('/challenge/')) {
                meta = {
                    title: 'Quiz Challenge Duel | Quiz Platform',
                    description: 'Take on a custom quiz challenge invited by a fellow programmer.'
                };
            } else if (pathname.startsWith('/badge-tree/')) {
                meta = {
                    title: 'Skill Tree Progression | Quiz Platform',
                    description: 'Interactive visual tech tree and skill mastery road.'
                };
            } else {
                meta = {
                    title: 'Quiz Platform - Test Your Knowledge',
                    description: 'Interactive computer science quiz platform with gamified learning tracks and 1v1 duels.'
                };
            }
        }

        // Update document title
        document.title = meta.title;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', meta.description);
        }

        // Update Open Graph tags if present
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', meta.title);
        }

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            ogDescription.setAttribute('content', meta.description);
        }
    }, [location.pathname]);
};

export default usePageTitle;
