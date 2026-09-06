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
import { useTheme } from '../context/ThemeContext';

interface NotificationCenterProps {
    currentUser?: { userId: string; name?: string; role?: string } | null;
    onNotificationClick?: (notification: AppNotification) => void;
}

type FilterCategory = 'all' | 'unread' | 'quizzes' | 'duels' | 'requests';

const NotificationCenter: React.FC<NotificationCenterProps> = ({
    currentUser,
    onNotificationClick
}) => {
    const { isBento } = useTheme();
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

    // Close on click outside or Escape key
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
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
        if (isBento) {
            switch (type) {
                case 'new_quiz':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <Sparkles className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                case 'request_approved':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                case 'request_rejected':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <XCircle className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                case 're_request':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <RotateCcw className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                case 'challenge':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#fed7aa] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <Swords className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                case 'badge':
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <Users className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
                default:
                    return (
                        <div className="w-9 h-9 rounded-xl bg-[#e2e8f0] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                            <Bell className="w-4.5 h-4.5 stroke-[2.5]" />
                        </div>
                    );
            }
        }

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
            <div className={`px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shrink-0 ${
                isBento
                    ? 'border-b-2.5 border-black bg-[#fef08a]'
                    : 'border-b border-gray-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]'
            }`}>
                <div className="flex items-center gap-2.5">
                    <div className={isBento
                        ? 'w-8 h-8 rounded-xl bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0'
                        : 'p-2 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400'
                    }>
                        <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isBento ? 'stroke-[2.5]' : ''}`} />
                    </div>
                    <div>
                        <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${
                            isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                        }`}>
                            Notifications
                        </h3>
                        <div className={`text-[10px] sm:text-[11px] font-bold ${
                            isBento ? 'text-black/70 font-mono' : 'text-gray-400'
                        }`}>
                            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            disabled={isLoading}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                            }`}
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Mark read</span>
                        </button>
                    )}

                    {/* Close Icon */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-rose-100 active:translate-y-0.5'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                        aria-label="Close notifications"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Tabs - Guaranteed 4-column balanced grid, never clips or scrolls */}
            <div className={`p-2 shrink-0 ${
                isBento
                    ? 'bg-[#f8fafc] border-b-2 border-black'
                    : 'bg-gray-50/70 dark:bg-black/30 border-b border-gray-200/40 dark:border-white/5'
            }`}>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full">
                    {(['all', 'unread', 'quizzes', 'requests'] as FilterCategory[]).map((tab) => {
                        const count = tab === 'all'
                            ? notifications.length
                            : tab === 'unread'
                            ? unreadCount
                            : tab === 'quizzes'
                            ? notifications.filter(n => n.type === 'new_quiz').length
                            : notifications.filter(n => n.type.includes('request')).length;

                        const label = tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : tab === 'quizzes' ? 'Quizzes' : 'Requests';

                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setFilter(tab)}
                                className={`w-full py-1.5 px-1 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-tight transition-all cursor-pointer flex items-center justify-center gap-1 min-w-0 ${
                                    isBento
                                        ? filter === tab
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white text-slate-800 border-2 border-black/30 hover:border-black hover:bg-slate-100'
                                        : filter === tab
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-200/70 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span className="truncate">{label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                                    isBento
                                        ? filter === tab
                                            ? 'bg-black text-white'
                                            : 'bg-black/10 text-black'
                                        : filter === tab
                                        ? 'bg-white/25 text-white'
                                        : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notifications List */}
            <div className={`flex-1 min-h-0 max-h-[calc(100dvh-200px)] sm:max-h-[380px] overflow-y-auto custom-scrollbar ${
                isBento ? 'divide-y-2 divide-black/10' : 'divide-y divide-gray-100 dark:divide-white/5'
            }`}>
                {filteredNotifications.length === 0 ? (
                    <div className="py-8 px-5 text-center">
                        <div className={`w-12 h-12 flex items-center justify-center mx-auto mb-2.5 ${
                            isBento
                                ? 'rounded-2xl bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500'
                        }`}>
                            <Bell className={`w-5 h-5 ${isBento ? 'stroke-[2.5]' : 'opacity-60'}`} />
                        </div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-1 ${
                            isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                        }`}>
                            {filter === 'unread' ? 'All Caught Up!' : 'No Notifications'}
                        </h4>
                        <p className={`text-[11px] leading-relaxed max-w-xs mx-auto ${
                            isBento ? 'text-slate-600 font-medium' : 'text-gray-500 dark:text-gray-400'
                        }`}>
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
                            className={`p-3 sm:p-3.5 transition-all flex items-start gap-3 cursor-pointer group relative ${
                                isBento
                                    ? !notif.isRead
                                        ? 'bg-[#bef264]/15 border-l-4 border-l-black hover:bg-[#bef264]/25'
                                        : 'bg-white hover:bg-slate-50'
                                    : !notif.isRead
                                    ? 'bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-gray-50/80 dark:hover:bg-white/5'
                                    : 'hover:bg-gray-50/80 dark:hover:bg-white/5'
                            }`}
                        >
                            {/* Unread Glow Indicator */}
                            {!notif.isRead && !isBento && (
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                            )}

                            {getIcon(notif.type)}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h4 className={`text-xs font-black truncate ${
                                        isBento
                                            ? 'text-black'
                                            : !notif.isRead
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {notif.title}
                                    </h4>
                                    <span className={`text-[9px] sm:text-[10px] font-bold shrink-0 ${
                                        isBento ? 'text-slate-500 font-mono' : 'text-gray-400'
                                    }`}>
                                        {formatTimeAgo(notif.createdAt)}
                                    </span>
                                </div>

                                <p className={`text-xs line-clamp-2 leading-relaxed ${
                                    isBento ? 'text-slate-700 font-medium' : 'text-gray-600 dark:text-gray-300'
                                }`}>
                                    {notif.message}
                                </p>

                                {/* Styled Note Box */}
                                {notif.note && (
                                    <div className={`mt-2 p-2 rounded-xl text-[11px] font-medium ${
                                        isBento
                                            ? 'bg-[#fed7aa] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-900 dark:text-amber-200'
                                    }`}>
                                        <span className={`font-black uppercase text-[9px] block mb-0.5 ${
                                            isBento ? 'text-black' : 'text-amber-600 dark:text-amber-400'
                                        }`}>
                                            Note:
                                        </span>
                                        "{notif.note}"
                                    </div>
                                )}

                                {/* Action link */}
                                {notif.link && (
                                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider group-hover:translate-x-0.5 transition-transform ${
                                        isBento ? 'text-black underline' : 'text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                        <span>View details</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(notif.notificationId, e)}
                                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                        isBento
                                            ? 'bg-white text-rose-600 border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-rose-100'
                                            : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                    }`}
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
        <div className="relative shrink-0" ref={dropdownRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative h-8 w-8 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isBento
                        ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000]'
                        : 'bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 hover:scale-105 active:scale-95 shadow-sm border border-gray-200/50 dark:border-white/5'
                }`}
                title="Notifications"
                aria-label="View notifications"
            >
                <Bell className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                {unreadCount > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-white rounded-full text-[9px] font-black flex items-center justify-center ${
                        isBento
                            ? 'bg-[#f43f5e] border-2 border-black shadow-[1px_1px_0px_#000]'
                            : 'bg-gradient-to-r from-red-500 to-rose-500 shadow-lg shadow-red-500/30 animate-pulse'
                    }`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Popover (Desktop >= 640px) - Opens DOWNWARD from the bell */}
            {isOpen && (
                <div className={`hidden sm:flex flex-col absolute right-0 sm:-right-4 top-[calc(100%+8px)] w-[400px] max-w-[calc(100vw-24px)] z-[100] overflow-hidden max-h-[min(540px,calc(100vh-100px))] animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ${
                    isBento
                        ? 'bg-white text-black border-2 border-black shadow-[6px_6px_0px_#000] rounded-2xl'
                        : 'bg-white/95 dark:bg-[#12131f]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10'
                }`}>
                    {renderContent()}
                </div>
            )}

            {/* Mobile Top Dropdown & Backdrop (< 640px) - Opens DOWNWARD from the header */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="sm:hidden fixed inset-0 z-[9998] bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Popover Card dropping DOWN from top header */}
                    <div
                        className={`sm:hidden fixed top-[60px] left-3 right-3 max-w-[420px] mx-auto z-[9999] overflow-hidden flex flex-col max-h-[calc(100dvh-75px)] animate-in fade-in slide-in-from-top-3 duration-200 ${
                            isBento
                                ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000] rounded-2xl'
                                : 'bg-white/95 dark:bg-[#12131f]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/80 dark:border-white/10'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {renderContent()}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
