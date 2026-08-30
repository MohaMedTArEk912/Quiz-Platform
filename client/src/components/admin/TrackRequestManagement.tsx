import React, { useState, useEffect, useCallback } from 'react';
import {
    Inbox,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    Mail,
    Route,
    Check,
    X,
    RotateCcw,
    AlertCircle
} from 'lucide-react';
import Modal from '../common/Modal';
import type { UserData, TrackRequest } from '../../types';
import { api } from '../../lib/api';

interface TrackRequestManagementProps {
    currentUser: UserData;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
    onRefresh?: () => void | Promise<void>;
}

interface ActionModalState {
    type: 'approve' | 'reject';
    request: TrackRequest;
}

const TrackRequestManagement: React.FC<TrackRequestManagementProps> = ({
    currentUser,
    onNotification,
    onRefresh
}) => {
    const [requests, setRequests] = useState<TrackRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
    const [adminNoteInput, setAdminNoteInput] = useState('');

    const loadRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.getTrackRequests(undefined, currentUser.userId);
            setRequests(Array.isArray(res.requests) ? res.requests : []);
        } catch (error) {
            console.error('Error loading track requests:', error);
            onNotification('error', 'Failed to load track requests');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.userId, onNotification]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const openActionModal = (type: 'approve' | 'reject', request: TrackRequest) => {
        setActionModal({ type, request });
        setAdminNoteInput(
            type === 'approve'
                ? 'Your request has been approved! Enjoy learning.'
                : 'Please complete prerequisite tracks and quizzes before requesting this road.'
        );
    };

    const confirmAction = async () => {
        if (!actionModal) return;
        const { type, request } = actionModal;
        setProcessingId(request.requestId);

        try {
            if (type === 'approve') {
                const res = await api.approveTrackRequest(request.requestId, currentUser.userId, adminNoteInput);
                if (res.success) {
                    onNotification('success', res.message || 'Request approved and track unlocked!');
                }
            } else {
                const res = await api.rejectTrackRequest(request.requestId, currentUser.userId, adminNoteInput);
                if (res.success) {
                    onNotification('warning', res.message || 'Request rejected with feedback note');
                }
            }
            setActionModal(null);
            await loadRequests();
            if (onRefresh) await Promise.resolve(onRefresh());
        } catch (error) {
            console.error(`Error processing track request:`, error);
            const msg = error instanceof Error ? error.message : 'Action failed';
            onNotification('error', msg);
        } finally {
            setProcessingId(null);
        }
    };

    // Calculate stats
    const totalRequests = requests.length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    // Filter requests
    const filteredRequests = requests.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            (r.userName || '').toLowerCase().includes(q) ||
            (r.userEmail || '').toLowerCase().includes(q) ||
            (r.subjectTitle || '').toLowerCase().includes(q) ||
            (r.reason || '').toLowerCase().includes(q) ||
            (r.adminNote || '').toLowerCase().includes(q) ||
            (r.reRequestNote || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                            <Clock className="w-5 h-5" />
                        </div>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white animate-pulse">
                                Active
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Pending Requests
                    </div>
                    <div className="text-3xl font-black text-amber-500">
                        {pendingCount}
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Approved
                    </div>
                    <div className="text-3xl font-black text-emerald-500">
                        {approvedCount}
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Rejected
                    </div>
                    <div className="text-3xl font-black text-rose-500">
                        {rejectedCount}
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <Inbox className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Total Requests
                    </div>
                    <div className="text-3xl font-black text-indigo-500">
                        {totalRequests}
                    </div>
                </div>
            </div>

            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                {/* Search */}
                <div className="flex-1 bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-3 px-5 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm flex items-center gap-4 group focus-within:border-indigo-500/50">
                    <Search className="w-5 h-5 text-indigo-500 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search by student, email, notes, or track..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder:text-gray-500 font-bold text-xs uppercase tracking-tight outline-none"
                    />
                </div>

                {/* Status Filter Tabs & Refresh */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                statusFilter === status
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/40 dark:bg-white/5 text-gray-500 hover:bg-white/80 dark:hover:bg-white/10'
                            }`}
                        >
                            {status === 'all' ? 'All' : status}
                            {status === 'pending' && pendingCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white text-indigo-600 text-[10px]">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}

                    <button
                        onClick={loadRequests}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-indigo-500/10 text-indigo-500 border border-white/20 dark:border-white/5 transition-all cursor-pointer"
                        title="Refresh requests"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Requests List */}
            <div className="space-y-3">
                {filteredRequests.map((req) => {
                    const isProcessing = processingId === req.requestId;
                    const dateFormatted = new Date(req.requestedAt).toLocaleString();

                    return (
                        <div
                            key={req.requestId}
                            className="p-5 sm:p-6 bg-white/60 dark:bg-[#13141f]/60 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 hover:border-indigo-500/30 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                        >
                            {/* Left: User & Track details */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-md shrink-0">
                                    <div className="w-full h-full bg-white dark:bg-[#1e1e2d] rounded-[14px] flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-lg uppercase">
                                        {(req.userName || req.userId || 'U').charAt(0)}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-base truncate">
                                            {req.userName || req.userId}
                                        </h4>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                            req.status === 'pending'
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                : req.status === 'approved'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        }`}>
                                            {req.status === 'pending' ? <Clock className="w-3 h-3" /> : req.status === 'approved' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {req.status}
                                        </span>

                                        {req.reRequestCount && req.reRequestCount > 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                <RotateCcw className="w-2.5 h-2.5" /> Re-Request ({req.reRequestCount})
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {req.userEmail}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1 text-indigo-500 font-bold">
                                            <Route className="w-3.5 h-3.5" />
                                            Road: {req.subjectTitle}
                                        </span>
                                        <span>•</span>
                                        <span className="text-[11px] opacity-75">{dateFormatted}</span>
                                    </div>

                                    {/* Student Note */}
                                    {req.reason && (
                                        <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                            <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Student Reason:</span>
                                            "{req.reason}"
                                        </div>
                                    )}

                                    {/* Student Re-Request Note */}
                                    {req.reRequestNote && (
                                        <div className="mt-2 p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 font-medium">
                                            <span className="font-black text-purple-600 dark:text-purple-400 uppercase text-[10px] block mb-0.5">
                                                Student Re-Request Follow-Up Note:
                                            </span>
                                            "{req.reRequestNote}"
                                        </div>
                                    )}

                                    {/* Admin Note if present */}
                                    {req.adminNote && (
                                        <div className="mt-2 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 font-medium">
                                            <span className="font-black text-amber-600 dark:text-amber-400 uppercase text-[10px] block mb-0.5">
                                                Admin Feedback / Decision Note:
                                            </span>
                                            "{req.adminNote}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {req.status === 'pending' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => openActionModal('approve', req)}
                                            disabled={isProcessing}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>Approve...</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openActionModal('reject', req)}
                                            disabled={isProcessing}
                                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Reject...</span>
                                        </button>
                                    </>
                                ) : req.status === 'rejected' ? (
                                    <button
                                        type="button"
                                        onClick={() => openActionModal('approve', req)}
                                        disabled={isProcessing}
                                        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Re-Approve...</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Unlocked for User</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredRequests.length === 0 && !isLoading && (
                    <div className="py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                        <Inbox className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                        <h4 className="text-lg font-black text-gray-400 uppercase tracking-tight">No track requests found</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            {statusFilter !== 'all' ? `No ${statusFilter} requests match your filter` : 'When students request additional roads, they will appear here.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Decision Confirmation Modal with Admin Note input */}
            {actionModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setActionModal(null)}
                    title={actionModal.type === 'approve' ? 'Approve Track Access' : 'Reject Track Access'}
                    description={`Review request for ${actionModal.request.userName} on ${actionModal.request.subjectTitle}`}
                    maxWidth="max-w-lg"
                    icon={actionModal.type === 'approve' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-rose-500" />}
                    footer={
                        <div className="flex items-center gap-3 w-full">
                            <button
                                type="button"
                                onClick={() => setActionModal(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmAction}
                                disabled={processingId !== null}
                                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                                    actionModal.type === 'approve'
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/25'
                                }`}
                            >
                                {processingId ? 'Processing...' : actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 space-y-1 text-xs">
                            <div className="font-bold text-gray-900 dark:text-white">
                                Student: <span className="font-normal">{actionModal.request.userName} ({actionModal.request.userEmail})</span>
                            </div>
                            <div className="font-bold text-gray-900 dark:text-white">
                                Requested Road: <span className="font-normal text-indigo-500">{actionModal.request.subjectTitle}</span>
                            </div>
                            {actionModal.request.reason && (
                                <div className="font-bold text-gray-900 dark:text-white pt-1">
                                    Student Note: <span className="font-normal italic">"{actionModal.request.reason}"</span>
                                </div>
                            )}
                            {actionModal.request.reRequestNote && (
                                <div className="font-bold text-purple-600 dark:text-purple-400 pt-1">
                                    Re-Request Note: <span className="font-normal italic">"{actionModal.request.reRequestNote}"</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                                Feedback / Decision Note for Student:
                            </label>
                            <textarea
                                rows={3}
                                value={adminNoteInput}
                                onChange={(e) => setAdminNoteInput(e.target.value)}
                                placeholder="Write a guidance note explaining approval or reasons for rejection..."
                                className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                This note will be sent directly to the student in their in-app Notification Center and displayed in their road access modal.
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TrackRequestManagement;
