import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Link2,
  Copy,
  Check,
  Search,
  Send,
  Bell,
  Trophy,
  Loader2,
  Megaphone,
  Mail
} from 'lucide-react';
import type { Tournament } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { formatLocalizedTournamentDateTime } from '../../utils/timezoneUtils';

interface SearchUserItem {
  userId: string;
  name: string;
  email?: string;
  totalScore?: number;
  status?: string;
}

interface TournamentInviteModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  currentUserId?: string;
}

export const TournamentInviteModal: React.FC<TournamentInviteModalProps> = ({
  tournament,
  isOpen,
  onClose,
  isAdmin = false,
  currentUserId
}) => {
  const { isBento } = useTheme();
  const { showNotification } = useNotification();

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUserItem[]>([]);
  const [note, setNote] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!tournament) return '';
    return `${window.location.origin}/t/${encodeURIComponent(tournament.tournamentId)}`;
  }, [tournament]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setNote('');
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!isOpen || trimmed.length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.searchUsers(trimmed);
        if (!cancelled && Array.isArray(res)) {
          setSearchResults(res);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isOpen]);

  if (!isOpen || !tournament) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showNotification('success', 'Tournament invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showNotification('error', 'Could not copy automatically. Please copy the link manually.');
    }
  };

  const toggleUserSelection = (user: SearchUserItem) => {
    setSelectedUsers(prev => {
      const exists = prev.some(u => u.userId === user.userId);
      return exists ? prev.filter(u => u.userId !== user.userId) : [...prev, user];
    });
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;
    if (!currentUserId && !isAdmin) {
      showNotification('error', 'Please log in to send notification invites.');
      return;
    }

    setSending(true);
    try {
      const res = await api.inviteToTournament(tournament.tournamentId, {
        targetUserIds: selectedUsers.map(u => u.userId),
        note: note.trim() || undefined,
        sendEmail
      });
      showNotification('success', res.message || 'Tournament invite sent!');
      setSelectedUsers([]);
      setNote('');
      setSendEmail(false);
      onClose();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleBroadcastAll = async () => {
    if (!isAdmin) return;
    setBroadcasting(true);
    try {
      const res = await api.inviteToTournament(tournament.tournamentId, {
        inviteAll: true,
        note: note.trim() || undefined
      });
      showNotification('success', res.message || 'Tournament invite sent to all users!');
      setNote('');
      onClose();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to broadcast invite');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-150 ${
          isBento
            ? 'bg-white text-black border-[3px] border-black shadow-[8px_8px_0px_#000]'
            : 'bg-white dark:bg-[#111827] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isBento
                  ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Invite to Tournament</h3>
              <p className={`text-xs font-bold truncate max-w-[280px] sm:max-w-[340px] ${isBento ? 'text-slate-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {tournament.name} • {formatLocalizedTournamentDateTime(tournament.startsAt, false)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite modal"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isBento
                ? 'bg-white text-black border-2 border-black hover:bg-[#fde047] shadow-[2px_2px_0px_#000]'
                : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Direct Invite Link */}
        <div
          className={`p-4 rounded-2xl space-y-2.5 ${
            isBento
              ? 'bg-slate-50 border-2 border-black'
              : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            <Link2 className="w-4 h-4 text-indigo-500" />
            <span>Direct Invite Link</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono font-semibold truncate outline-none ${
                isBento
                  ? 'bg-white text-black border-2 border-black'
                  : 'bg-white dark:bg-black/30 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10'
              }`}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                copied
                  ? isBento
                    ? 'bg-[#bef264] !text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-emerald-500 text-white'
                  : isBento
                    ? 'bg-[#fde047] !text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Send Notification Invite */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Send Notification Invite</span>
            </div>
            {selectedUsers.length > 0 && (
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {selectedUsers.length} selected
              </span>
            )}
          </div>

          {!currentUserId && !isAdmin ? (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Sign in to search and send in-app notification invites to other players.
            </p>
          ) : (
            <>
              {/* Search Users */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by name or email (min 3 chars)..."
                  className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold outline-none ${
                    isBento
                      ? 'bg-white text-black border-2 border-black placeholder:text-slate-400'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
                  }`}
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Selected User Chips */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.userId}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isBento
                          ? 'bg-[#ddd6fe] text-black border border-black'
                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20'
                      }`}
                    >
                      <span>{u.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleUserSelection(u)}
                        className="hover:opacity-70 cursor-pointer"
                        aria-label={`Remove ${u.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {searchQuery.trim().length >= 3 && (
                <div
                  className={`max-h-40 overflow-y-auto rounded-xl divide-y ${
                    isBento
                      ? 'border-2 border-black divide-black/10 bg-slate-50'
                      : 'border border-gray-200 dark:border-white/10 divide-gray-100 dark:divide-white/5 bg-gray-50/70 dark:bg-black/20'
                  }`}
                >
                  {searchResults.length === 0 && !searching ? (
                    <div className="p-3 text-center text-xs font-semibold text-gray-500">
                      No matching users found.
                    </div>
                  ) : (
                    searchResults.map((u) => {
                      const isSelected = selectedUsers.some(s => s.userId === u.userId);
                      return (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => toggleUserSelection(u)}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? isBento
                                ? 'bg-[#bef264]/40 !text-black'
                                : 'bg-indigo-500/10'
                              : isBento
                                ? 'hover:bg-white !text-black'
                                : 'hover:bg-white dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">{u.name}</div>
                            {u.email && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                {u.email}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                              isSelected
                                ? isBento
                                  ? 'bg-[#bef264] text-black border border-black'
                                  : 'bg-indigo-600 text-white'
                                : isBento
                                  ? 'bg-white text-black border border-black'
                                  : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Optional Note */}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                placeholder="Optional note (e.g. Join this arena before kickoff!)"
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold outline-none ${
                  isBento
                    ? 'bg-white text-black border-2 border-black placeholder:text-slate-400'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
                }`}
              />

              {/* Optional Email Toggle for Selected Users */}
              <label
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all select-none ${
                  sendEmail
                    ? isBento
                      ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-200'
                    : isBento
                      ? 'bg-slate-50 text-black border-2 border-black/40 hover:border-black'
                      : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className={`w-4 h-4 shrink-0 ${sendEmail ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  <div>
                    <div className="text-xs font-black">Also send Email notification</div>
                    <div className="text-[10px] font-semibold opacity-75">
                      Send an invitation email to the selected users' email addresses
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 accent-black rounded cursor-pointer shrink-0"
                />
              </label>

              {/* Send Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={selectedUsers.length === 0 || sending || broadcasting}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    isBento
                      ? 'bg-[#bef264] !text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  }`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>
                    {sending
                      ? 'Sending...'
                      : `Notify Selected (${selectedUsers.length})`}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleBroadcastAll}
                    disabled={broadcasting || sending}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      isBento
                        ? 'bg-[#fde047] !text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-md'
                    }`}
                  >
                    {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                    <span>{broadcasting ? 'Broadcasting...' : 'Notify All Users'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentInviteModal;
