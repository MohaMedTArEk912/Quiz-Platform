import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Link, ExternalLink } from 'lucide-react';
import type { Quiz } from '../../types';

interface ShareQuizModalProps {
    quiz: Quiz | null;
    isOpen: boolean;
    onClose: () => void;
}

const ShareQuizModal: React.FC<ShareQuizModalProps> = ({ quiz, isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    // Build the shareable link using the quiz's id
    const quizId = quiz?.id || quiz?._id || '';
    const shareUrl = quizId
        ? `${window.location.origin}/quiz/${encodeURIComponent(quizId)}`
        : '';

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!isOpen) setCopied(false);
    }, [isOpen]);

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleNativeShare = async () => {
        if (!quiz || !shareUrl) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: quiz.title,
                    text: `Take the "${quiz.title}" quiz! ${quiz.questions?.length || 0} questions.`,
                    url: shareUrl,
                });
            } catch {
                // User cancelled share — no-op
            }
        }
    };

    if (!isOpen || !quiz) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-md bg-white dark:bg-[#16162a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                            <Share2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Share Quiz</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Anyone with the link can take this quiz</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Quiz Info */}
                <div className="px-6 pt-5 pb-2">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{quiz.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {quiz.questions?.length || 0} Questions &bull; {quiz.difficulty || 'Medium'} &bull; {quiz.category || 'General'}
                        </p>
                    </div>

                    {/* Link input */}
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        <Link className="w-3 h-3 inline mr-1.5" />
                        Shareable Link
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none font-mono overflow-hidden text-ellipsis"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-200 ${
                                copied
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-5 pt-3">
                    <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Preview
                    </a>
                    {typeof navigator.share === 'function' && (
                        <button
                            onClick={handleNativeShare}
                            className="flex-1 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            Share via...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareQuizModal;
