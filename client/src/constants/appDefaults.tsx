import {
    Home,
    ShoppingBag,
    Calendar,
    Trophy,
    Users,
    Shield
} from 'lucide-react';
import type { UserData } from '../types';

export const APP_NAME = "Quiz Platform";

export const NAV_ITEMS = [
    { path: '/', icon: Home, label: 'Home', color: 'from-blue-500 to-cyan-500' },
    { path: '/shop', icon: ShoppingBag, label: 'Shop', color: 'from-purple-500 to-indigo-500' },
    { path: '/daily', icon: Calendar, label: 'Daily', color: 'from-orange-500 to-red-500' },
    { path: '/tournaments', icon: Trophy, label: 'Tournaments', color: 'from-yellow-500 to-orange-500' },
    { path: '/clans', icon: Shield, label: 'Clans', color: 'from-violet-500 to-indigo-500' },
    { path: '/social', icon: Users, label: 'Social', color: 'from-pink-500 to-purple-500' },
];

export const GUEST_USER: UserData = {
    userId: 'guest',
    name: 'Explorer',
    email: '',
    role: 'user',
    totalScore: 0,
    totalTime: 0,
    totalAttempts: 0,
    rank: null,
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: new Date().toISOString(),
    badges: [],
    avatar: {
        skinColor: '#FCD34D',
        hairStyle: 'short',
        hairColor: '#1F2937',
        accessory: 'none',
        backgroundColor: '#6366F1',
        mood: 'happy',
        gender: 'male',
        clothing: 'tshirt',
        frame: 'none'
    },

    unlockedTracks: []
};

