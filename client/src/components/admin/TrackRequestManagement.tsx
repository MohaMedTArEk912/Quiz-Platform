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
    X
} from 'lucide-react';
import type { UserData, TrackRequest } from '../../types';
import { api } from '../../lib/api';

interface TrackRequestManagementProps {
    currentUser: UserData;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
    onRefresh?: () => void | Promise<void>;
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

    const handleApprove = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            const res = await api.approveTrackRequest(requestId, currentUser.userId);
            if (res.success) {
                onNotification('success', res.message || 'Request approved and track unlocked!');
                await loadRequests();
                if (onRefresh) await Promise.resolve(onRefresh());
            }
        } catch (error) {
            console.error('Error approving request:', error);
            const msg = error instanceof Error ? error.message : 'Failed to approve request';
            onNotification('error', msg);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            const res = await api.rejectTrackRequest(requestId, currentUser.userId);
            if (res.success) {
                onNotification('warning', res.message || 'Request rejected');
                await loadRequests();
                if (onRefresh) await Promise.resolve(onRefresh());
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            const msg = error instanceof Error ? error.message : 'Failed to reject request';
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
            (r.reason || '').toLowerCase().includes(q)
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
                        placeholder="Search by student, email, or track name..."
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

                                <div className="min-w-0 flex-1 space-y-1">
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

                                    {req.reason && (
                                        <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                            <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Note from Student:</span>
                                            "{req.reason}"
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
                                            onClick={() => handleApprove(req.requestId)}
                                            disabled={isProcessing}
                                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>Approve Track</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(req.requestId)}
                                            disabled={isProcessing}
                                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Reject</span>
                                        </button>
                                    </>
                                ) : req.status === 'rejected' ? (
                                    <button
                                        type="button"
                                        onClick={() => handleApprove(req.requestId)}
                                        disabled={isProcessing}
                                        className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Re-Approve</span>
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
        </div>
    );
};

export default TrackRequestManagement;
