import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Clan, UserData, ClanChatMessage, AvatarConfig } from '../../types';
import Avatar from '../Avatar';
import { 
    MessageCircle, 
    Send, 
    Trash2, 
    Edit2, 
    Shield, 
    Star, 
    Crown, 
    Sparkles,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../ConfirmDialog';
import { useUserProfileModal } from '../../context/UserProfileModalContext';

interface ClanChatSectionProps {
    clan: Clan;
    currentUser: UserData;
    messages: ClanChatMessage[];
    onSendMessage: (content: string) => void;
    onEditMessage: (messageId: string, newContent: string) => void;
    onDeleteMessage: (messageId: string) => void;
    isLeader: boolean;
    isElder: boolean;
    isBento: boolean;
    onMarkAsRead?: () => void;
}

export const ClanChatSection: React.FC<ClanChatSectionProps> = ({
    clan,
    currentUser,
    messages,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    isLeader,
    isElder,
    isBento,
    onMarkAsRead
}) => {
    const { confirm, confirmState, handleCancel } = useConfirm();
    const { openUserProfile } = useUserProfileModal();
    const [inputContent, setInputContent] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const onMarkAsReadRef = useRef(onMarkAsRead);

    // Escape key listener for fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Lock body scroll when fullscreen
    useEffect(() => {
        if (isFullscreen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isFullscreen]);

    useEffect(() => {
        onMarkAsReadRef.current = onMarkAsRead;
    }, [onMarkAsRead]);

    // Map clan members by userId for dynamic avatar/role resolution & badge display
    const memberMap = useMemo(() => {
        const map = new Map<string, { role: 'leader' | 'elder' | 'member'; avatar?: AvatarConfig; name?: string; equippedBadge?: { id: string; name: string; title?: string; icon: string; rarity?: string } | null }>();
        (clan.members || []).forEach(m => {
            map.set(m.userId, {
                role: m.role || 'member',
                avatar: m.avatar,
                name: m.name,
                equippedBadge: m.equippedBadge || null
            });
        });
        return map;
    }, [clan.members]);

    // Auto-scroll strictly within internal container without hijacking window viewport
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
        if (onMarkAsReadRef.current) {
            onMarkAsReadRef.current();
        }
    }, [messages.length]);

    // Quick communication snippets
    const quickSnippets = [
        "GG! 🎮",
        "Quiz time! ⚡",
        "Welcome to the clan! 🛡️",
        "Let's push rankings! 🏆",
        "Well played team! 🔥"
    ];

    const handleSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = inputContent.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setInputContent('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStartEdit = (msg: ClanChatMessage) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleSaveEdit = (messageId: string) => {
        const trimmed = editContent.trim();
        if (!trimmed) return;
        onEditMessage(messageId, trimmed);
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleDelete = async (messageId: string) => {
        const confirmed = await confirm({
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message from the clan chat?',
            confirmText: 'Delete',
            type: 'danger'
        });
        if (confirmed) {
            onDeleteMessage(messageId);
        }
    };

    const formatMessageTime = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (isToday) return timeStr;
        if (isYesterday) return `Yesterday ${timeStr}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    };

    return (
        <section 
            id="clan-chat"
            className={`${
                isFullscreen
                    ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none flex flex-col shadow-2xl'
                    : 'rounded-[2.5rem] overflow-hidden transition-all flex flex-col'
            } ${
                isBento
                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                    : 'bg-white/95 dark:bg-[#13141f]/95 border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl'
            }`}
        >
            {/* Header */}
            <div className={`p-3 sm:p-5 border-b flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap shrink-0 ${
                isBento 
                    ? 'bg-[#ddd6fe] border-b-3 border-black' 
                    : 'bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-transparent border-slate-200 dark:border-white/10'
            }`}>
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                        isBento
                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    }`}>
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white truncate">
                                Clan Tactical Chat
                            </h2>
                            <span className={`hidden xs:inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                isBento 
                                    ? 'bg-black text-white' 
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}>
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Comms
                            </span>
                        </div>
                        <p className={`hidden sm:block text-xs font-semibold ${isBento ? 'text-black/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            Coordinate tournaments, share strategies, and discuss clan quests ({messages.length} messages)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 ${
                        isBento 
                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]' 
                            : 'glass-card border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                    }`}>
                        <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-500 shrink-0" />
                        <span className="truncate">[{clan.tag}] <span className="hidden sm:inline">{clan.name}</span></span>
                    </span>

                    <button
                        type="button"
                        onClick={() => setIsFullscreen(prev => !prev)}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-neutral-100 active:translate-y-0.5'
                                : 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                        }`}
                        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Chat'}
                        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chat'}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Exit Fullscreen</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                ref={messagesContainerRef}
                className={`flex-1 p-4 sm:p-6 overflow-y-auto ${
                    isFullscreen ? 'max-h-none h-full' : 'max-h-[500px] min-h-[340px]'
                } ${
                isBento 
                    ? 'bg-[#fafafa]' 
                    : 'bg-slate-50/50 dark:bg-black/20'
            }`}>
                <div className={`w-full space-y-4 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${
                            isBento
                                ? 'bg-[#fef08a] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-violet-500/10 text-violet-500'
                        }`}>
                            <MessageCircle className="w-8 h-8 opacity-75" />
                        </div>
                        <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white mb-1">
                            Clan Chat is Silent
                        </h3>
                        <p className={`text-xs max-w-sm ${isBento ? 'text-black/70 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                            Break the ice! Be the first member of [{clan.tag}] to post a message or rally the team for the next tournament.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.userId;
                        const memberInfo = memberMap.get(msg.senderId);
                        const role = msg.senderRole || memberInfo?.role || 'member';
                        const avatar = (msg.senderAvatar as AvatarConfig) || (isMe ? currentUser.avatar : memberInfo?.avatar);
                        const senderDisplayName = msg.senderName || memberInfo?.name || (isMe ? currentUser.name : 'Clan Member');
                        const senderBadge = msg.senderBadge || memberInfo?.equippedBadge || (isMe && currentUser.equippedBadgeId ? (currentUser.badges || []).find(b => b.id === currentUser.equippedBadgeId) : null);
                        const isEditingThis = editingMessageId === msg.id;

                        // Moderation permissions:
                        // - Sender can edit/delete own
                        // - Leader and Elder can delete any
                        // - Leader and Elder can edit if needed
                        const canModerate = isLeader || isElder;
                        const canDelete = isMe || canModerate;
                        const canEdit = isMe || canModerate;

                        return (
                            <div 
                                key={msg.id} 
                                className={`flex gap-3 group transition-all ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* Left Avatar for others */}
                                {!isMe && (
                                    <div
                                        onClick={() => openUserProfile(msg.senderId)}
                                        className="shrink-0 mt-1 cursor-pointer transition-transform hover:scale-105"
                                        title={`View ${senderDisplayName}'s profile`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-xs font-black ${
                                            isBento 
                                                ? 'border-2 border-black bg-[#fde047] text-black shadow-[1.5px_1.5px_0px_#000]' 
                                                : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm'
                                        }`}>
                                            {avatar ? (
                                                <Avatar config={avatar} size="sm" className="w-full h-full object-cover" />
                                            ) : (
                                                senderDisplayName.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Message Content Container */}
                                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Sender Meta Header */}
                                    <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap">
                                        <span
                                            onClick={() => !isMe && openUserProfile(msg.senderId)}
                                            className={`text-xs font-black ${
                                                isMe 
                                                    ? (isBento ? 'text-black' : 'text-violet-600 dark:text-violet-400')
                                                    : (isBento ? 'text-black hover:underline cursor-pointer' : 'text-slate-800 dark:text-slate-200 hover:text-indigo-500 cursor-pointer')
                                            }`}
                                            title={!isMe ? `View ${senderDisplayName}'s profile` : undefined}
                                        >
                                            {isMe ? 'You' : senderDisplayName}
                                        </span>

                                        {/* Role Badge */}
                                        {role === 'leader' && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                isBento
                                                    ? 'bg-[#facc15] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                            }`}>
                                                <Crown className="w-2.5 h-2.5 fill-current" />
                                                Leader
                                            </span>
                                        )}
                                        {role === 'elder' && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                isBento
                                                    ? 'bg-[#93c5fd] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                            }`}>
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                Elder
                                            </span>
                                        )}
                                        {role === 'member' && (
                                            <span className={`text-[10px] uppercase font-bold opacity-60 ${
                                                isBento ? 'text-black' : 'text-slate-400'
                                            }`}>
                                                Member
                                            </span>
                                        )}

                                        {/* Equipped Badge Pill */}
                                        {senderBadge && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                isBento
                                                    ? 'bg-[#fef08a] text-black border border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25'
                                            }`} title={senderBadge.name}>
                                                <span>{senderBadge.icon}</span>
                                                <span>{senderBadge.title || senderBadge.name}</span>
                                            </span>
                                        )}

                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium ml-1 font-tabular">
                                            {formatMessageTime(msg.createdAt)}
                                        </span>

                                        {msg.isEdited && (
                                            <span className="text-[9px] text-slate-400 italic font-semibold">
                                                (edited)
                                            </span>
                                        )}
                                    </div>

                                    {/* Message Body / Edit Mode */}
                                    {isEditingThis ? (
                                        <div className={`p-3 rounded-2xl w-full border-2 ${
                                            isBento 
                                                ? 'bg-white border-black shadow-[3px_3px_0px_#000]' 
                                                : 'bg-white dark:bg-[#1a1b26] border-violet-500 shadow-lg'
                                        }`}>
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                rows={2}
                                                className={`w-full text-xs font-medium focus:outline-none resize-none ${
                                                    isBento 
                                                        ? 'text-black bg-transparent' 
                                                        : 'text-slate-900 dark:text-white bg-transparent'
                                                }`}
                                                maxLength={500}
                                            />
                                            <div className="flex items-center justify-end gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                        isBento 
                                                            ? 'bg-slate-200 text-black border border-black hover:bg-slate-300' 
                                                            : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveEdit(msg.id)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                                                        isBento 
                                                            ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000] hover:shadow-[2px_2px_0px_#000]' 
                                                            : 'bg-violet-600 text-white shadow-md'
                                                    }`}
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative group/bubble flex items-center gap-1.5">
                                            {/* Action buttons (if aligned right, buttons are on left) */}
                                            {isMe && (canEdit || canDelete) && (
                                                <div className="opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(msg)}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                isBento 
                                                                    ? 'hover:bg-slate-200 text-black border border-black bg-white shadow-[1px_1px_0px_#000]' 
                                                                    : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                                            }`}
                                                            title="Edit message"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(msg.id)}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                isBento 
                                                                    ? 'hover:bg-red-200 text-red-600 border border-black bg-white shadow-[1px_1px_0px_#000]' 
                                                                    : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                                                            }`}
                                                            title="Delete message"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-semibold leading-relaxed break-words whitespace-pre-wrap ${
                                                isMe
                                                    ? (isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] rounded-tr-none'
                                                        : 'bg-violet-600 text-white shadow-md shadow-violet-600/20 rounded-tr-none')
                                                    : (isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] rounded-tl-none'
                                                        : 'bg-white dark:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm rounded-tl-none')
                                            }`}>
                                                {msg.content}
                                            </div>

                                            {/* Action buttons (if aligned left, buttons are on right) */}
                                            {!isMe && (canEdit || canDelete) && (
                                                <div className="opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(msg)}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                isBento 
                                                                    ? 'hover:bg-slate-200 text-black border border-black bg-white shadow-[1px_1px_0px_#000]' 
                                                                    : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                                            }`}
                                                            title="Moderate: Edit message"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(msg.id)}
                                                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                                isBento 
                                                                    ? 'hover:bg-red-200 text-red-600 border border-black bg-white shadow-[1px_1px_0px_#000]' 
                                                                    : 'hover:bg-red-500/10 text-slate-400 hover:text-red-500'
                                                            }`}
                                                            title="Moderate: Delete message"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Avatar for me */}
                                {isMe && (
                                    <div className="shrink-0 mt-1">
                                        <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-xs font-black ${
                                            isBento 
                                                ? 'border-2 border-black bg-[#bef264] text-black shadow-[1.5px_1.5px_0px_#000]' 
                                                : 'bg-violet-600 text-white shadow-sm'
                                        }`}>
                                            {avatar ? (
                                                <Avatar config={avatar} size="sm" className="w-full h-full object-cover" />
                                            ) : (
                                                currentUser.name.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                </div>
            </div>

            {/* Quick Tactical Snippets Bar */}
            <div className={`px-4 sm:px-6 py-2.5 border-t border-b overflow-x-auto no-scrollbar shrink-0 ${
                isBento 
                    ? 'bg-[#fef9c3] border-t-2 border-b-2 border-black' 
                    : 'bg-slate-100/70 dark:bg-white/[0.02] border-slate-200 dark:border-white/10'
            }`}>
                <div className={`flex items-center gap-2 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Quick Comms:
                    </span>
                    {quickSnippets.map((snippet, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                onSendMessage(snippet);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-[#bef264] active:translate-y-0.5'
                                    : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-violet-500 hover:text-white border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            {snippet}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSend} className={`p-2.5 sm:p-4 shrink-0 ${
                isBento ? 'bg-white' : 'bg-white dark:bg-[#13141f]'
            }`}>
                <div className={`flex items-end gap-2 sm:gap-3 w-full ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={inputContent}
                            onChange={(e) => {
                                setInputContent(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message #${clan.tag}...`}
                            rows={1}
                            maxLength={500}
                            className={`w-full pl-3.5 pr-14 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none transition-all resize-none max-h-32 ${
                                isBento
                                    ? 'bg-white text-black placeholder:text-gray-400 border-2.5 border-black shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000] focus:shadow-[3px_3px_0px_#000]'
                                    : 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-violet-500/30'
                            }`}
                        />
                        <div className="absolute right-2.5 bottom-2.5 sm:right-3 sm:bottom-3 flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-400 font-bold pointer-events-none">
                            <span>{inputContent.length}/500</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!inputContent.trim()}
                        className={`p-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 font-black uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[2.5px_2.5px_0px_#000] sm:shadow-[3.5px_3.5px_0px_#000] hover:shadow-[4.5px_4.5px_0px_#000] active:translate-y-0.5'
                                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30 active:scale-95'
                        }`}
                    >
                        <span className="hidden sm:inline">Send</span>
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                type={confirmState.type}
                onConfirm={confirmState.onConfirm}
                onCancel={handleCancel}
            />
        </section>
    );
};
