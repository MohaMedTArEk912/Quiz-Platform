import React, { useState } from 'react';
import {
    Check, X, Layout, Video, GraduationCap, Target, Play
} from 'lucide-react';
import type { SkillModule, Quiz, AttemptData } from '../types';

interface UserRoadmapViewProps {
    modules: SkillModule[];
    quizzes?: Quiz[];
    attempts?: AttemptData[];
    userProgress?: {
        completedModules: string[];
        unlockedModules: string[];
        completedSubModules?: string[]; // Format: "moduleId:subModuleId"
    };
    onSubModuleComplete?: (moduleId: string, subModuleId: string) => Promise<void>;
    onStartQuiz?: (quiz: Quiz) => void;
}

const UserRoadmapView: React.FC<UserRoadmapViewProps> = ({
    modules,
    quizzes = [],
    attempts = [],
    userProgress,
    onSubModuleComplete,
    onStartQuiz
}) => {
    const [selectedModule, setSelectedModule] = useState<SkillModule | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [completingSubModule, setCompletingSubModule] = useState<string | null>(null);

    // Sort modules by level/index to ensure correct order
    const sortedModules = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0));

    const computeStatus = (module: SkillModule) => {
        // Default to locked
        let status = 'locked';
        let isLocked = true;
        let isCompleted = false;

        // Progress Calculation
        const moduleQuizzes = quizzes.filter(q => module.quizIds?.includes(q.id || q._id || ''));
        const subModules = module.subModules || [];
        const totalItems = moduleQuizzes.length + subModules.length;

        let completedItems = 0;

        // Count completed sub-modules
        subModules.forEach(sub => {
            const subKey = `${module.moduleId}:${sub.id}`;
            if (userProgress?.completedSubModules?.includes(subKey)) {
                completedItems++;
            }
        });

        // Count completed quizzes
        moduleQuizzes.forEach(q => {
            const qId = q.id || q._id;
            const hasPassed = attempts.some(a => a.quizId === qId && a.percentage >= (q.passingScore || 60));
            if (hasPassed) completedItems++;
        });

        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Determine main status
        if (userProgress) {
            if (userProgress.completedModules?.includes(module.moduleId)) {
                status = 'completed';
                isLocked = false;
                isCompleted = true;
            } else if (userProgress.unlockedModules?.includes(module.moduleId)) {
                status = 'available';
                isLocked = false;
            } else if (modules[0].moduleId === module.moduleId && (!userProgress.completedModules?.length && !userProgress.unlockedModules?.length)) {
                // If nothing is started, first module is available
                status = 'available';
                isLocked = false;
            }
        } else {
            // Fallback if no user progress
            if (sortedModules[0]?.moduleId === module.moduleId) {
                status = 'available';
                isLocked = false;
            }
        }

        return { status, isLocked, isCompleted, progressPercent, totalItems, completedItems };
    };

    const handleModuleClick = (module: SkillModule) => {
        const { isLocked } = computeStatus(module);
        if (isLocked) return;
        setSelectedModule(module);
        setIsDetailsOpen(true);
    };

    const handleToggleSubModule = async (subModuleId: string) => {
        if (!onSubModuleComplete || !selectedModule) return;

        // Check if already completed
        const subModuleKey = `${selectedModule.moduleId}:${subModuleId}`;
        const isCompleted = userProgress?.completedSubModules?.includes(subModuleKey);

        if (isCompleted) return; // One-way completion for now

        setCompletingSubModule(subModuleId);
        try {
            await onSubModuleComplete(selectedModule.moduleId, subModuleId);
        } catch (error) {
            console.error("Failed to complete sub-module", error);
        } finally {
            setCompletingSubModule(null);
        }
    };

    // Chunk modules into rows of 2
    const chunkedModules = [];
    for (let i = 0; i < sortedModules.length; i += 2) {
        chunkedModules.push(sortedModules.slice(i, i + 2));
    }

    // Helper for modal details
    const getModuleDetails = (module: SkillModule) => {
        const { progressPercent, completedItems, totalItems } = computeStatus(module);
        const moduleQuizzes = quizzes.filter(q => module.quizIds?.includes(q.id || q._id || ''));
        return { progressPercent, completedItems, totalItems, moduleQuizzes };
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto px-4">
            <div className="flex flex-col gap-12 md:gap-24 relative pb-20">
                {/* Vertical Spine Line for Mobile */}
                <div className="absolute left-6 top-8 bottom-20 w-1 bg-indigo-500/20 md:hidden rounded-full" />

                {chunkedModules.map((rowModules, rowIndex) => {
                    // Determine if this is a reversed row (for snake pattern: Right->Left)
                    const isReversed = rowIndex % 2 === 1; // Rows 1, 3, 5... are reversed

                    // Prepare modules for display
                    // If reversed, we swap them visually in the grid (but keep logical order for flex mobile)
                    const displayModules = isReversed ? [...rowModules].reverse() : rowModules;

                    return (
                        <div
                            key={rowIndex}
                            className={`relative flex ${isReversed ? 'flex-col-reverse' : 'flex-col'} md:grid md:grid-cols-2 gap-8 md:gap-32`}
                        >
                            {/* Desktop Connectors */}
                            {/* Horizontal Line Pattern */}
                            {displayModules.length === 2 && (
                                <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-indigo-500/20 -z-10 mx-auto w-[calc(100%-4rem)] rounded-full" />
                            )}

                            {/* Vertical turn connectors */}
                            {rowIndex < chunkedModules.length - 1 && (
                                <div className={`hidden md:block absolute top-1/2 h-[calc(100%+6rem)] w-[calc(50%+2px)] border-4 border-indigo-500/20 rounded-[3rem] -z-10 
                                    ${isReversed
                                        ? 'left-0 border-r-0 rounded-r-none border-b-0 rounded-bl-none' // Coming from Left, turning Down-Right
                                        : 'right-0 border-l-0 rounded-l-none border-b-0 rounded-br-none' // Coming from Right, turning Down-Left
                                    }`}
                                />
                            )}

                            {displayModules.map((module) => {
                                const { isLocked, isCompleted, progressPercent } = computeStatus(module);
                                const moduleNumber = (module.level ?? 0) + 1;

                                // Specific Styles
                                const containerClasses = isLocked
                                    ? 'bg-[#1e1e2d] border-white/5 opacity-80 grayscale-[0.5]'
                                    : isCompleted
                                        ? 'bg-[#1e1e2d] border-emerald-500/30'
                                        : 'bg-[#1e1e2d] border-indigo-500/30';

                                const shadowClasses = !isLocked
                                    ? isCompleted
                                        ? 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)] hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.2)]'
                                        : 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.1)] hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.2)]'
                                    : '';

                                return (
                                    <div
                                        key={module.moduleId}
                                        onClick={() => handleModuleClick(module)}
                                        className={`
                                            relative rounded-[2rem] p-8 border-2 transition-all duration-300 group z-10
                                            ${containerClasses}
                                            ${shadowClasses}
                                            ${!isLocked && 'cursor-pointer hover:-translate-y-2'}
                                            ${!isLocked && !isCompleted && 'ring-1 ring-indigo-500/50'}
                                        `}
                                    >
                                        {/* Mobile Connector Dot */}
                                        <div className={`md:hidden absolute left-[-2rem] top-8 w-4 h-4 rounded-full border-4 border-[#0a0a0b] ${isCompleted ? 'bg-emerald-500' : isLocked ? 'bg-gray-700' : 'bg-indigo-500'
                                            }`} />

                                        {/* Status & Progress Circle */}
                                        <div className="flex items-center justify-between mb-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isLocked
                                                    ? 'bg-white/5 text-gray-500 border-transparent'
                                                    : isCompleted
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse'
                                                }`}>
                                                {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Available'}
                                            </span>

                                            {/* Circular Progress */}
                                            <div className="relative flex items-center justify-center w-16 h-16">
                                                {/* Background Circle */}
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle
                                                        cx="32"
                                                        cy="32"
                                                        r="28"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        className={isLocked ? "text-gray-800" : "text-gray-800 dark:text-white/5"}
                                                    />
                                                    {/* Progress Circle */}
                                                    {!isLocked && (
                                                        <circle
                                                            cx="32"
                                                            cy="32"
                                                            r="28"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                            fill="transparent"
                                                            strokeDasharray={2 * Math.PI * 28}
                                                            strokeDashoffset={2 * Math.PI * 28 - (progressPercent / 100) * (2 * Math.PI * 28)}
                                                            strokeLinecap="round"
                                                            className={`transition-all duration-1000 ease-out ${isCompleted ? "text-emerald-500" : "text-indigo-500"
                                                                }`}
                                                        />
                                                    )}
                                                </svg>
                                                {/* Module Number Centered */}
                                                <span className={`absolute text-xl font-black ${isCompleted ? 'text-emerald-500' : isLocked ? 'text-gray-600' : 'text-indigo-500'
                                                    }`}>
                                                    {String(moduleNumber).padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className={`text-xl md:text-2xl font-black mb-3 ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                                            {module.title}
                                        </h3>

                                        <p className={`text-sm font-medium leading-relaxed line-clamp-2 md:line-clamp-3 ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {module.description || (isLocked ? "Complete previous modules to unlock." : "Master this topic to progress.")}
                                        </p>

                                        {/* Mini Progress Bar in Card (if active) */}
                                        {!isLocked && !isCompleted && progressPercent > 0 && (
                                            <div className="mt-4 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        )}

                                        {!isLocked && (
                                            <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500 group-hover:gap-3 transition-all">
                                                View Details <Layout className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Module Details Modal */}
            {isDetailsOpen && selectedModule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl bg-[#1e1e2d] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {(() => {
                            const { progressPercent, completedItems, totalItems, moduleQuizzes } = getModuleDetails(selectedModule);
                            const { isCompleted } = computeStatus(selectedModule);

                            return (
                                <>
                                    {/* Header */}
                                    <div className="p-8 border-b border-white/10 bg-white/5 relative overflow-hidden flex-shrink-0">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />

                                        <div className="flex items-start justify-between relative z-10 mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="px-2 py-1 bg-indigo-500/10 rounded-lg text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                        Module {(selectedModule.level ?? 0) + 1}
                                                    </div>
                                                    {isCompleted && (
                                                        <div className="px-2 py-1 bg-emerald-500/10 rounded-lg text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                            Completed
                                                        </div>
                                                    )}
                                                </div>
                                                <h2 className="text-2xl font-black text-white mb-2">{selectedModule.title}</h2>
                                                <p className="text-gray-400 font-medium">{selectedModule.description}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsDetailsOpen(false)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Progress Loader */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                                <span>Progress</span>
                                                <span>{completedItems}/{totalItems} Steps</span>
                                            </div>
                                            <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Scroll Area */}
                                    <div className="flex-1 overflow-y-auto p-8 space-y-8">

                                        {/* Learning Steps (Sub-modules) */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Layout className="w-4 h-4" /> Learning Steps
                                            </h3>

                                            {selectedModule.subModules?.map((sub) => {
                                                const subKey = `${selectedModule.moduleId}:${sub.id}`;
                                                const isSubCompleted = userProgress?.completedSubModules?.includes(subKey);
                                                const isProcessing = completingSubModule === sub.id;

                                                return (
                                                    <div
                                                        key={sub.id}
                                                        className={`
                                                            group flex items-start gap-4 p-4 rounded-2xl border transition-all
                                                            ${isSubCompleted
                                                                ? 'bg-emerald-500/5 border-emerald-500/10'
                                                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                                                        `}
                                                    >
                                                        <button
                                                            onClick={() => handleToggleSubModule(sub.id)}
                                                            disabled={isSubCompleted || isProcessing}
                                                            className={`
                                                                mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0
                                                                ${isSubCompleted
                                                                    ? 'bg-emerald-500 border-emerald-500'
                                                                    : 'border-gray-500 hover:border-indigo-500 hover:bg-indigo-500/20'}
                                                            `}
                                                        >
                                                            {isSubCompleted && <Check className="w-3.5 h-3.5 text-white" />}
                                                        </button>

                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className={`font-bold ${isSubCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                                                                    {sub.title}
                                                                </h4>
                                                                <div className="flex items-center gap-2">
                                                                    {sub.xp && (
                                                                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                                                            {sub.xp} XP
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                                                {sub.videoUrl && (
                                                                    <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                                        <Video className="w-3 h-3" /> Watch Video
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {(!selectedModule.subModules || selectedModule.subModules.length === 0) && (
                                                <p className="text-gray-500 text-sm italic py-2">No learning steps needed for this module.</p>
                                            )}
                                        </div>

                                        {/* Quizzes Section */}
                                        {moduleQuizzes.length > 0 && (
                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <GraduationCap className="w-4 h-4" /> Module Quizzes
                                                </h3>

                                                {moduleQuizzes.map(quiz => {
                                                    const qId = quiz.id || quiz._id || '';
                                                    const bestAttempt = attempts.filter(a => a.quizId === qId).sort((a, b) => b.percentage - a.percentage)[0];
                                                    const isPassed = bestAttempt && bestAttempt.percentage >= (quiz.passingScore || 60);

                                                    return (
                                                        <div
                                                            key={qId}
                                                            className={`
                                                                flex items-center gap-4 p-4 rounded-2xl border transition-all
                                                                ${isPassed
                                                                    ? 'bg-emerald-500/5 border-emerald-500/10'
                                                                    : 'bg-indigo-500/5 border-indigo-500/20'}
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                                                                ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}
                                                            `}>
                                                                {isPassed ? <Target className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                                                            </div>

                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-white mb-0.5">{quiz.title}</h4>
                                                                <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                                                                    <span>{quiz.questions?.length} Questions</span>
                                                                    {bestAttempt && (
                                                                        <span className={isPassed ? 'text-emerald-500' : 'text-orange-500'}>
                                                                            Best: {bestAttempt.percentage}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => onStartQuiz && onStartQuiz(quiz)}
                                                                className={`
                                                                    px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                                    ${isPassed
                                                                        ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'}
                                                                `}
                                                            >
                                                                {isPassed ? 'Retake' : <><Play className="w-3 h-3 fill-current" /> Start</>}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end flex-shrink-0">
                                        <button
                                            onClick={() => setIsDetailsOpen(false)}
                                            className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Close View
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserRoadmapView;
