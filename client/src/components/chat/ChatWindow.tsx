import React, { useRef, useEffect, useState } from 'react';
import { Send, X, MessageCircle, MoreVertical, Pencil, Trash2, Swords, Trophy, Clock, Maximize2, Minimize2 } from 'lucide-react';
import type { DirectChatMessage, ClanChatMessage, UserData } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfileModal } from '../../context/UserProfileModalContext';

export type ChatMessage = (DirectChatMessage | ClanChatMessage) & {
    type?: 'text' | 'challenge';
    challengeData?: {
        quizId?: string;
        quizTitle?: string;
        roomId?: string;
        status?: 'pending' | 'in_progress' | 'completed';
        result?: {
            winnerId?: string | null;
            isDraw?: boolean;
            myScore?: number;
            opponentScore?: number;
        };
    };
    isRead?: boolean;
};

export interface ChallengeAcceptData {
    quizId: string;
    quizTitle: string;
    roomId: string;
    senderId: string;
    senderName: string;
}

interface ChatWindowProps {
    title?: string;
    currentUser: UserData;
    messages: ChatMessage[];
    onSendMessage: (content: string, type: 'text' | 'challenge', extra?: Record<string, unknown>) => void;
    onClose: () => void;

    // Challenge acceptance handler
    onAcceptChallenge?: (data: ChallengeAcceptData) => void;

    // Optional props for advanced features (Clan Chat)
    onEditMessage?: (id: string, content: string) => void;
    onDeleteMessage?: (id: string) => void;
    canEditMessage?: (msg: ChatMessage) => boolean;
    canDeleteMessage?: (msg: ChatMessage) => boolean;

    // Custom header content (e.g. Friend Avatar + Name)
    headerContent?: React.ReactNode;

    // Custom action button in input area (e.g. Challenge button)
    inputActions?: React.ReactNode;

    placeholder?: string;
    loading?: boolean;

    // Fullscreen support
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

const TimeAgo: React.FC<{ date: string | number | Date }> = ({ date }) => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const getTimeAgo = (dateStr: string | number | Date) => {
        const now = new Date();
        const past = new Date(dateStr);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return past.toLocaleDateString();
    };

    return <span>{getTimeAgo(date)}</span>;
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
    title,
    currentUser,
    messages,
    onSendMessage,
    onClose,
    onAcceptChallenge,
    onEditMessage,
    onDeleteMessage,
    headerContent,
    inputActions,
    placeholder = "Type a message...",
    loading = false,
    isFullscreen = false,
    onToggleFullscreen
}) => {
    const { isBento } = useTheme();
    const { openUserProfile } = useUserProfileModal();
    const [input, setInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, loading]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input, 'text');
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-full w-full ${isFullscreen ? 'max-w-none rounded-none' : 'max-w-md mx-auto rounded-2xl'} overflow-hidden animate-in fade-in duration-200 ${
            isBento
                ? (isFullscreen ? 'bg-white text-black' : 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]')
                : (isFullscreen ? 'bg-white dark:bg-[#11131f] text-gray-900 dark:text-gray-100' : 'bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100')
        }`}>
            {/* Header */}
            <div className={`p-3 sm:p-4 flex items-center justify-between shrink-0 ${
                isBento
                    ? 'bg-[#fde047] text-black border-b-2 border-black font-mono'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
            }`}>
                <div className={`flex items-center gap-2 sm:gap-3 ${isBento ? 'text-black' : 'text-white'} font-bold min-w-0`}>
                    {headerContent ? headerContent : (
                        <>
                            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                            <span className="font-bold text-base sm:text-lg truncate">{title || 'Chat'}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {onToggleFullscreen && (
                        <button
                            type="button"
                            onClick={onToggleFullscreen}
                            className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                                isBento ? 'text-black hover:bg-black/10 border border-black' : 'text-white hover:bg-white/10'
                            }`}
                            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Mode'}
                            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                            isBento ? 'text-black hover:bg-black/10 border border-black' : 'text-white hover:bg-white/10'
                        }`}
                        title="Close Chat"
                        aria-label="Close Chat"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0f111a] custom-scrollbar">
                <div className={`w-full ${isFullscreen ? 'max-w-4xl mx-auto' : ''} space-y-4`}>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500 text-sm">No messages yet.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.userId;
                        const isChallenge = msg.type === 'challenge';

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/message relative`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 relative shadow-sm transition-all ${isMe
                                    ? 'bg-violet-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                    }`}>

                                    {!isMe && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <p
                                                onClick={() => openUserProfile(msg.senderId)}
                                                className="text-[10px] font-bold opacity-70 hover:opacity-100 hover:underline cursor-pointer"
                                                title={`View ${msg.senderName}'s profile`}
                                            >
                                                {msg.senderName}
                                            </p>
                                        </div>
                                    )}

                                    {/* Edit Mode */}
                                    {editingId === msg.id ? (
                                        <div className="min-w-[200px]">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full bg-black/10 dark:bg-black/20 rounded p-2 text-sm focus:outline-none mb-2 text-white"
                                                rows={2}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-2 py-1 text-xs opacity-70 hover:opacity-100"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onEditMessage?.(msg.id, editContent);
                                                        setEditingId(null);
                                                    }}
                                                    className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30 font-bold"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : isChallenge && msg.challengeData ? (
                                        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 rounded-xl p-4 border border-yellow-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                                                    <Swords className="w-4 h-4 text-yellow-400" />
                                                </div>
                                                <span className="font-bold text-sm uppercase tracking-wider text-yellow-400">Duel Challenge</span>
                                            </div>
                                            <p className="text-sm font-bold mb-3">{msg.challengeData.quizTitle || 'Quiz Challenge'}</p>

                                            {/* Show result if completed */}
                                            {msg.challengeData.status === 'completed' && msg.challengeData.result ? (
                                                <div className="bg-black/10 dark:bg-black/20 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Trophy className="w-4 h-4 text-yellow-400" />
                                                        <span className="text-xs font-bold uppercase">
                                                            {msg.challengeData.result.isDraw
                                                                ? "It's a Draw!"
                                                                : msg.challengeData.result.winnerId === currentUser.userId
                                                                    ? 'You Won! 🎉'
                                                                    : 'You Lost'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span>Your Score: <strong>{msg.challengeData.result.myScore ?? '-'}</strong></span>
                                                        <span>Opponent: <strong>{msg.challengeData.result.opponentScore ?? '-'}</strong></span>
                                                    </div>
                                                </div>
                                            ) : msg.challengeData.status === 'in_progress' ? (
                                                <div className="flex items-center gap-2 text-xs text-yellow-400">
                                                    <Clock className="w-3 h-3 animate-pulse" />
                                                    <span>Game in progress...</span>
                                                </div>
                                            ) : (
                                                /* Pending state - show accept button or waiting message */
                                                !isMe && onAcceptChallenge && msg.challengeData.roomId && msg.challengeData.roomId !== 'pending' ? (
                                                    <button
                                                        onClick={() => onAcceptChallenge({
                                                            quizId: msg.challengeData!.quizId || '',
                                                            quizTitle: msg.challengeData!.quizTitle || 'Quiz',
                                                            roomId: msg.challengeData!.roomId || '',
                                                            senderId: msg.senderId,
                                                            senderName: msg.senderName
                                                        })}
                                                        className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold rounded-lg text-sm transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 active:scale-[0.98]"
                                                    >
                                                        ⚔️ Accept Duel
                                                    </button>
                                                ) : !isMe && (!msg.challengeData.roomId || msg.challengeData.roomId === 'pending') ? (
                                                    <p className="text-xs opacity-70 italic flex items-center gap-1">
                                                        <Clock className="w-3 h-3 animate-spin" />
                                                        Setting up game room...
                                                    </p>
                                                ) : isMe ? (
                                                    <p className="text-xs opacity-70 italic">Waiting for opponent to accept...</p>
                                                ) : null
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                                    )}

                                    <div className={`text-[9px] mt-1 flex items-center justify-end gap-1 select-none font-medium ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                        <TimeAgo date={msg.createdAt} />
                                    </div>

                                    {/* Context Menu Trigger */}
                                    {isMe && !editingId && (onEditMessage || onDeleteMessage) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                                            }}
                                            className={`absolute -top-2 -left-2 p-1 rounded-full bg-white dark:bg-gray-700 shadow-md opacity-0 group-hover/message:opacity-100 transition-opacity z-10`}
                                        >
                                            <MoreVertical className="w-3 h-3 text-gray-500" />
                                        </button>
                                    )}

                                    {/* Context Menu */}
                                    {activeMenuId === msg.id && (
                                        <div className="absolute top-0 right-full mr-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-20 w-32 overflow-hidden animate-in fade-in zoom-in-95">
                                            {onEditMessage && (
                                                <button
                                                    onClick={() => {
                                                        setEditingId(msg.id);
                                                        setEditContent(msg.content);
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                                >
                                                    <Pencil className="w-3 h-3" /> Edit
                                                </button>
                                            )}
                                            {onDeleteMessage && (
                                                <button
                                                    onClick={() => {
                                                        onDeleteMessage(msg.id);
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-2.5 sm:p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <div className={`flex items-end gap-1.5 sm:gap-2 w-full ${isFullscreen ? 'max-w-4xl mx-auto' : ''}`}>
                    {inputActions}

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 bg-gray-100 dark:bg-gray-900 border-0 rounded-xl p-2.5 sm:p-3 max-h-28 sm:max-h-32 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100 resize-none custom-scrollbar"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20'
                        }`}
                    >
                        <Send className={`w-4 h-4 sm:w-5 sm:h-5 ${isBento ? 'text-black' : 'text-white'}`} />
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.3);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 92, 246, 0.5);
                }
            `}} />
        </div>
    );
};
