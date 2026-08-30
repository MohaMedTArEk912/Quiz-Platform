import React, { useState } from 'react';
import {
    Lock,
    Send,
    Clock,
    Sparkles,
    BookOpen,
    Monitor,
    Cpu,
    Database,
    Globe,
    Atom,
    FlaskConical,
    Calculator,
    Languages,
    FileText,
    Brain,
    Code,
    Terminal,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import Modal from '../common/Modal';
import type { Subject, TrackRequest } from '../../types';
import { api } from '../../lib/api';

const ICON_MAP: Record<string, React.ReactNode> = {
    'BookOpen': <BookOpen className="w-8 h-8" />,
    'Monitor': <Monitor className="w-8 h-8" />,
    'Cpu': <Cpu className="w-8 h-8" />,
    'Database': <Database className="w-8 h-8" />,
    'Globe': <Globe className="w-8 h-8" />,
    'Atom': <Atom className="w-8 h-8" />,
    'FlaskConical': <FlaskConical className="w-8 h-8" />,
    'Calculator': <Calculator className="w-8 h-8" />,
    'Languages': <Languages className="w-8 h-8" />,
    'FileText': <FileText className="w-8 h-8" />,
    'Brain': <Brain className="w-8 h-8" />,
    'Code': <Code className="w-8 h-8" />,
    'Terminal': <Terminal className="w-8 h-8" />,
};

const SubjectIcon: React.FC<{ icon: string }> = ({ icon }) => {
    if (ICON_MAP[icon]) {
        return <>{ICON_MAP[icon]}</>;
    }
    return <span className="text-3xl">{icon || '🗺️'}</span>;
};

interface RequestTrackAccessModalProps {
    subject: Subject;
    existingRequest?: TrackRequest | null;
    onClose: () => void;
    onSuccess: (newRequest: TrackRequest) => void;
    onNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const RequestTrackAccessModal: React.FC<RequestTrackAccessModalProps> = ({
    subject,
    existingRequest,
    onClose,
    onSuccess,
    onNotification
}) => {
    const [reason, setReason] = useState(existingRequest?.reason || '');
    const [reRequestNote, setReRequestNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPending = existingRequest?.status === 'pending';
    const isRejected = existingRequest?.status === 'rejected';

    const handleSendRequest = async () => {
        if (isPending) return;

        setIsSubmitting(true);
        try {
            if (isRejected && existingRequest?.requestId) {
                // Re-request flow
                const res = await api.reRequestTrackAccess(
                    existingRequest.requestId,
                    reason.trim() || 'Re-requesting road access',
                    reRequestNote.trim()
                );
                if (res.success) {
                    onNotification('success', res.message || 'Re-request sent to administrator with your note!');
                    onSuccess(res.request);
                    onClose();
                }
            } else {
                // Initial request flow
                const res = await api.requestTrackAccess(subject._id, reason.trim());
                if (res.success) {
                    onNotification('success', res.message || 'Request sent to administrator!');
                    onSuccess(res.request);
                    onClose();
                }
            }
        } catch (error) {
            console.error('Error requesting track access:', error);
            const msg = error instanceof Error ? error.message : 'Failed to send request';
            onNotification('error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Track Access Required"
            description="Learning Road is currently locked"
            maxWidth="max-w-lg"
            icon={<Lock className="w-6 h-6 text-amber-500" />}
            footer={
                <div className="flex items-center gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
                    >
                        Close
                    </button>
                    {!isPending ? (
                        <button
                            type="button"
                            onClick={handleSendRequest}
                            disabled={isSubmitting}
                            className={`flex-[2] py-3.5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                                isRejected
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-500/30 hover:shadow-purple-500/50'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-500/30 hover:shadow-indigo-500/50'
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isRejected ? (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Re-Submit Access Request</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send Access Request</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex-[2] py-3 px-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 text-center">
                            <Clock className="w-4 h-4 animate-spin-slow" />
                            <span>Request Pending Approval</span>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                {/* Track Card Preview */}
                <div className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-white/5 dark:to-indigo-950/20 border border-gray-200 dark:border-white/10 flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                        <SubjectIcon icon={subject.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked Road
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                            {subject.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium line-clamp-2 mt-1">
                            {subject.description || 'Curated quizzes and lessons for this track.'}
                        </p>
                    </div>
                </div>

                {/* Status Notice */}
                {isPending ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                Access Request Under Review
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1 leading-relaxed">
                                You requested access on {new Date(existingRequest.requestedAt).toLocaleDateString()}. The administrator has been notified and will review your request.
                            </p>
                        </div>
                    </div>
                ) : isRejected ? (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wide">
                                    Previous Request Declined
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1 leading-relaxed">
                                    Your previous request was reviewed by the administrator with feedback. You can address their notes and submit a re-request below.
                                </p>
                            </div>
                        </div>

                        {/* Admin Feedback Note Banner */}
                        {existingRequest?.adminNote && (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
                                <span className="font-black text-amber-600 dark:text-amber-400 uppercase text-[10px] block mb-1">
                                    Admin Feedback Note:
                                </span>
                                "{existingRequest.adminNote}"
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                Request Additional Track Access
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1 leading-relaxed">
                                Send a request to the platform administrator to unlock this track. Once approved, you'll receive an instant notification and all quizzes in this track will unlock.
                            </p>
                        </div>
                    </div>
                )}

                {/* Form Fields if Re-Requesting or Initial Request */}
                {isRejected && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Re-Request Follow-Up Note (Required)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Address the admin's note above (e.g. I have completed the prerequisites / I need this for my upcoming exams)..."
                            value={reRequestNote}
                            onChange={(e) => setReRequestNote(e.target.value)}
                            className="w-full bg-purple-500/5 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-500/30 focus:ring-2 focus:ring-purple-500/50 rounded-2xl p-4 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all resize-none"
                        />
                    </div>
                )}

                {!isPending && !isRejected && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">
                            Note to Administrator (Optional)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="e.g., I have completed my primary track / I am preparing for frontend certifications..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/50 rounded-2xl p-4 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 outline-none transition-all resize-none"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RequestTrackAccessModal;
