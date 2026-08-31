import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bell,
    CheckCheck,
    Sparkles,
    CheckCircle2,
    XCircle,
    RotateCcw,
    ExternalLink,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../types';
import { api } from '../lib/api';

interface NotificationCenterProps {
    currentUser?: { userId: string; name?: string; role?: string } | null;
    onNotificationClick?: (notification: AppNotification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
    currentUser,
    onNotificationClick
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.userId) return;
        try {
            const [notifRes, countRes] = await Promise.all([
                api.getNotifications(40).catch(() => ({ success: true, notifications: [] })),
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

        // Polling interval every 20s as fallback
        const interval = setInterval(fetchNotifications, 20000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on click outside
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
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                );
            case 'request_approved':
                return (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                );
            case 'request_rejected':
                return (
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                        <XCircle className="w-4 h-4" />
                    </div>
                );
            case 're_request':
                return (
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4" />
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                    </div>
                );
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/10 dark:hover:bg-white/20 rounded-2xl text-gray-700 dark:text-gray-200 transition-all hover:scale-105 active:scale-95 shadow-sm border border-gray-200/50 dark:border-white/5 cursor-pointer flex items-center justify-center"
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

            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden animate-in fade-in duration-150"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Notification Popover Dropdown */}
            {isOpen && (
                <div className="fixed sm:absolute inset-x-3.5 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-3 sm:w-96 max-h-[80vh] sm:max-h-[520px] bg-white/95 dark:bg-[#13141f]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Notifications
                                </h4>
                                <div className="text-[10px] font-bold text-gray-400">
                                    {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                disabled={isLoading}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Mark all read</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="px-4 py-2 bg-gray-50/50 dark:bg-black/20 border-b border-gray-200/40 dark:border-white/5 flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filter === 'all'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filter === 'unread'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                        {filteredNotifications.length === 0 ? (
                            <div className="py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 text-gray-400">
                                    <Bell className="w-5 h-5 opacity-40" />
                                </div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((notif) => (
                                <div
                                    key={notif.notificationId}
                                    onClick={() => handleItemClick(notif)}
                                    className={`p-4 transition-all flex items-start gap-3 cursor-pointer group hover:bg-gray-50 dark:hover:bg-white/5 ${
                                        !notif.isRead ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''
                                    }`}
                                >
                                    {getIcon(notif.type)}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <h5 className={`text-xs font-black truncate flex-1 min-w-0 ${
                                                !notif.isRead
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-600 dark:text-gray-300'
                                            }`}>
                                                {notif.title}
                                            </h5>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[9px] font-bold text-gray-400">
                                                    {formatTimeAgo(notif.createdAt)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(notif.notificationId, e)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                                    title="Delete notification"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>

                                        {/* Styled Note Box if note exists */}
                                        {notif.note && (
                                            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                                                <span className="font-black uppercase text-[9px] text-amber-600 dark:text-amber-400 block mb-0.5">
                                                    Note:
                                                </span>
                                                "{notif.note}"
                                            </div>
                                        )}

                                        {/* Action link hint */}
                                        {notif.link && (
                                            <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                                                <span>View details</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
