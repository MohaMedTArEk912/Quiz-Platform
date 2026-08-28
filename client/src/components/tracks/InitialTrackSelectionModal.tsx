import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, BookOpen, Monitor, Cpu, Database, Globe, Atom, FlaskConical, Calculator, Languages, FileText, Brain, Code, Terminal, Layers } from 'lucide-react';
import type { Subject, UserData, Quiz } from '../../types';
import { api } from '../../lib/api';

const ICON_MAP: Record<string, React.ReactNode> = {
    'BookOpen': <BookOpen className="w-7 h-7" />,
    'Monitor': <Monitor className="w-7 h-7" />,
    'Cpu': <Cpu className="w-7 h-7" />,
    'Database': <Database className="w-7 h-7" />,
    'Globe': <Globe className="w-7 h-7" />,
    'Atom': <Atom className="w-7 h-7" />,
    'FlaskConical': <FlaskConical className="w-7 h-7" />,
    'Calculator': <Calculator className="w-7 h-7" />,
    'Languages': <Languages className="w-7 h-7" />,
    'FileText': <FileText className="w-7 h-7" />,
    'Brain': <Brain className="w-7 h-7" />,
    'Code': <Code className="w-7 h-7" />,
    'Terminal': <Terminal className="w-7 h-7" />,
};

const SubjectIcon: React.FC<{ icon: string }> = ({ icon }) => {
    if (ICON_MAP[icon]) {
        return <>{ICON_MAP[icon]}</>;
    }
    return <span className="text-3xl">{icon || '🗺️'}</span>;
};

interface InitialTrackSelectionModalProps {
    subjects: Subject[];
    quizzes: Quiz[];
    currentUser: UserData;
    onSuccess: (updatedUser: Partial<UserData>) => void;
    onNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const InitialTrackSelectionModal: React.FC<InitialTrackSelectionModalProps> = ({
    subjects,
    quizzes,
    currentUser,
    onSuccess,
    onNotification
}) => {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!selectedSubjectId) {
            onNotification('info', 'Please select a learning track to continue');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.selectInitialTrack(selectedSubjectId);
            if (res.success) {
                onNotification('success', res.message || 'Track selected successfully! Welcome aboard!');
                onSuccess({
                    ...currentUser,
                    primaryTrackId: selectedSubjectId,
                    unlockedTracks: [selectedSubjectId]
                });
            }
        } catch (error) {
            console.error('Error confirming track:', error);
            const msg = error instanceof Error ? error.message : 'Failed to select track';
            onNotification('error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-500 overflow-y-auto">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-pink-600/30 rounded-full blur-[140px]" />
            </div>

            <div className="relative w-full max-w-4xl bg-white/95 dark:bg-[#11121d]/95 backdrop-blur-2xl rounded-[3rem] border border-white/40 dark:border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col my-auto max-h-[90vh]">
                {/* Header */}
                <div className="text-center mb-8 shrink-0">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                        <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                        <span>Welcome, {currentUser.name || 'Student'}!</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3">
                        Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Learning Road</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
                        Select which primary track you belong to. Your chosen road will unlock immediately. You can request access to additional roads anytime!
                    </p>
                </div>

                {/* Road Cards Selection Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map((subject) => {
                            const isSelected = selectedSubjectId === subject._id;
                            const subjectQuizzes = quizzes.filter(q => q.subjectId === subject._id);

                            return (
                                <div
                                    key={subject._id}
                                    onClick={() => setSelectedSubjectId(subject._id)}
                                    className={`relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col group overflow-hidden ${
                                        isSelected
                                            ? 'bg-gradient-to-b from-indigo-500/15 to-purple-500/10 border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                            : 'bg-white/60 dark:bg-white/5 border-gray-200/70 dark:border-white/5 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-white/10'
                                    }`}
                                >
                                    {/* Selection badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 scale-110'
                                                : 'bg-indigo-500/10 text-indigo-500 group-hover:scale-105'
                                        }`}>
                                            <SubjectIcon icon={subject.icon} />
                                        </div>

                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'border-2 border-gray-300 dark:border-white/20'
                                        }`}>
                                            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 group-hover:text-indigo-500 transition-colors line-clamp-1">
                                        {subject.title}
                                    </h3>

                                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium line-clamp-2 mb-4 leading-relaxed flex-1">
                                        {subject.description || 'Master key concepts, quizzes, and modules in this learning road.'}
                                    </p>

                                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                            {subjectQuizzes.length} Quizzes
                                        </span>
                                        {isSelected && (
                                            <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider text-[10px]">
                                                Selected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {subjects.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-400">
                                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-bold">No tracks available yet. Please ask an administrator to create learning roads.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center sm:text-left">
                        {selectedSubjectId ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-black">
                                Ready to unlock: {subjects.find(s => s._id === selectedSubjectId)?.title}
                            </span>
                        ) : (
                            <span>Please select your track to begin</span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedSubjectId || isSubmitting}
                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Enroll & Unlock Track</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InitialTrackSelectionModal;
