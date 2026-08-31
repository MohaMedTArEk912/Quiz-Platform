import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bell,
    CheckCheck,
    Sparkles,
    CheckCircle2,
    XCircle,
    RotateCcw,
    ExternalLink,
    Trash2,
    X,
    Swords,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../types';
import { api } from '../lib/api';

interface NotificationCenterProps {
    currentUser?: { userId: string; name?: string; role?: string } | null;
    onNotificationClick?: (notification: AppNotification) => void;
}

type FilterCategory = 'all' | 'unread' | 'quizzes' | 'duels' | 'requests';

const NotificationCenter: React.FC<NotificationCenterProps> = ({
    currentUser,
    onNotificationClick
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [filter, setFilter] = useState<FilterCategory>('all');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.userId) return;
        try {
            const [notifRes, countRes] = await Promise.all([
                api.getNotifications(50).catch(() => ({ success: true, notifications: [] })),
                api.getUnreadNotificationCount().catch(() => ({ success: true, count: 0 }))
            ]);

            if (notifRes.success && Array.isArray(notifRes.notifications)) {
                setNotifications(notifRes.notifications);
            }
            if (countRes.success && typeof countRes.count === 'number') {
                setUnreadCount(countRes.count);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    }, [currentUser?.userId]);

    useEffect(() => {
        fetchNotifications();

        // Polling interval every 25s as fallback
        const interval = setInterval(fetchNotifications, 25000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on click outside (for desktop dropdown)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Lock body scroll on mobile bottom-sheet open
    useEffect(() => {
        if (isOpen && window.innerWidth < 640) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await api.markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setIsLoading(true);
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.deleteNotification(notificationId);
            setNotifications(prev => {
                const target = prev.find(n => n.notificationId === notificationId);
                if (target && !target.isRead) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.filter(n => n.notificationId !== notificationId);
            });
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const handleItemClick = (notification: AppNotification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.notificationId);
        }

        if (onNotificationClick) {
            onNotificationClick(notification);
        }

        if (notification.link) {
            setIsOpen(false);
            navigate(notification.link);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            return date.toLocaleDateString();
        } catch {
            return 'Recent';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'new_quiz':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                        <Sparkles className="w-4.5 h-4.5" />
                    </div>
                );
            case 'request_approved':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                        <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                );
            case 'request_rejected':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
                        <XCircle className="w-4.5 h-4.5" />
                    </div>
                );
            case 're_request':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0 shadow-inner">
                        <RotateCcw className="w-4.5 h-4.5" />
                    </div>
                );
            case 'challenge':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                        <Swords className="w-4.5 h-4.5" />
                    </div>
                );
            case 'badge':
                return (
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0 shadow-inner">
                        <Users className="w-4.5 h-4.5" />
                    </div>
                );
            default:
                return (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                        <Bell className="w-4.5 h-4.5" />
                    </div>
                );
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'quizzes') return n.type === 'new_quiz';
        if (filter === 'duels') return n.type === 'challenge';
        if (filter === 'requests') return n.type.includes('request');
        return true;
    });

    const renderContent = () => (
        <>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            Notifications
                        </h3>
                        <div className="text-[11px] font-bold text-gray-400">
                            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Mark all read</span>
                        </button>
                    )}

                    {/* Mobile Close Icon */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="sm:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close notifications"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-gray-50/70 dark:bg-black/30 border-b border-gray-200/40 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'unread', 'quizzes', 'requests'] as FilterCategory[]).map((tab) => {
                    const count = tab === 'all'
                        ? notifications.length
                        : tab === 'unread'
                        ? unreadCount
                        : tab === 'quizzes'
                        ? notifications.filter(n => n.type === 'new_quiz').length
                        : notifications.filter(n => n.type.includes('request')).length;

                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setFilter(tab)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                filter === tab
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="capitalize">{tab}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                filter === tab ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Notifications List */}
            <div className="flex-1 max-h-[60vh] sm:max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                {filteredNotifications.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                        <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-500">
                            <Bell className="w-6 h-6 opacity-60" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
                            {filter === 'unread' ? 'All Caught Up!' : 'No Notifications'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                            {filter === 'unread' 
                                ? 'You have read all your alerts. New challenges and quiz updates will appear here.'
                                : 'When you receive quiz invites, review feedback, or track approvals, they will show up here.'}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notif) => (
                        <div
                            key={notif.notificationId}
                            onClick={() => handleItemClick(notif)}
                            className={`p-3.5 sm:p-4 transition-all flex items-start gap-3 cursor-pointer group hover:bg-gray-50/80 dark:hover:bg-white/5 relative ${
                                !notif.isRead ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''
                            }`}
                        >
                            {/* Unread Glow Indicator */}
                            {!notif.isRead && (
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                            )}

                            {getIcon(notif.type)}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h4 className={`text-xs font-black truncate ${
                                        !notif.isRead
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {notif.title}
                                    </h4>
                                    <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                        {formatTimeAgo(notif.createdAt)}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                </p>

                                {/* Styled Note Box */}
                                {notif.note && (
                                    <div className="mt-2 p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                                        <span className="font-black uppercase text-[9px] text-amber-600 dark:text-amber-400 block mb-0.5">
                                            Note:
                                        </span>
                                        "{notif.note}"
                                    </div>
                                )}

                                {/* Action link */}
                                {notif.link && (
                                    <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                                        <span>View details</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons - Always visible with nice opacity on mobile */}
                            <div className="flex flex-col items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(notif.notificationId, e)}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                                    title="Delete notification"
                                    aria-label="Delete notification"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 sm:p-2.5 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/10 dark:hover:bg-white/20 rounded-2xl text-gray-700 dark:text-gray-200 transition-all hover:scale-105 active:scale-95 shadow-sm border border-gray-200/50 dark:border-white/5 cursor-pointer flex items-center justify-center"
                title="Notifications"
                aria-label="View notifications"
            >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Popover (Desktop >= 640px) */}
            {isOpen && (
                <div className="hidden sm:block absolute right-0 mt-3 w-96 max-w-[90vw] bg-white/95 dark:bg-[#12131f]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {renderContent()}
                </div>
            )}

            {/* Mobile Bottom Sheet Overlay (< 640px) */}
            {isOpen && (
                <div
                    className="sm:hidden fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-[#12131f] border-t border-gray-200 dark:border-white/10 rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 pb-safe"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Pull Bar Indicator */}
                        <div className="pt-3 pb-1 flex justify-center">
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full" />
                        </div>
                        {renderContent()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
