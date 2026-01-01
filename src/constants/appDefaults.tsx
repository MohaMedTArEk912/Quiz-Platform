import {
    Home,
    ShoppingBag,
    Calendar,
    BookOpen,
    Trophy,
    TrendingUp,
    Users,
    Shield
} from 'lucide-react';

export const APP_NAME = "Quiz Platform";

export const NAV_ITEMS = [
    { path: '/', icon: Home, label: 'Home', color: 'from-blue-500 to-cyan-500' },
    { path: '/shop', icon: ShoppingBag, label: 'Shop', color: 'from-purple-500 to-indigo-500' },
    { path: '/daily', icon: Calendar, label: 'Daily', color: 'from-orange-500 to-red-500' },
    { path: '/study', icon: BookOpen, label: 'Study', color: 'from-indigo-500 to-purple-500' },
    { path: '/tournaments', icon: Trophy, label: 'Tournaments', color: 'from-yellow-500 to-orange-500' },
    { path: '/clans', icon: Shield, label: 'Clans', color: 'from-violet-500 to-indigo-500' },
    { path: '/tracks', icon: TrendingUp, label: 'Tracks', color: 'from-blue-500 to-purple-500' },
    { path: '/social', icon: Users, label: 'Social', color: 'from-pink-500 to-purple-500' },
];
