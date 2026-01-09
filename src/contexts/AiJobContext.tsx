import React, { createContext, useContext, useState } from 'react';
// import { api } from '../lib/api';

// Types
export interface AiJob {
    id: string;
    type: 'upload' | 'process' | 'generate';
    status: 'pending' | 'processing' | 'success' | 'error';
    message: string;
    metadata?: any;
    result?: any;
    progress?: number;
    createdAt: number;
}

interface AiJobContextType {
    jobs: AiJob[];
    addJob: (type: AiJob['type'], message: string, metadata?: any) => string;
    updateJob: (id: string, updates: Partial<AiJob>) => void;
    removeJob: (id: string) => void;
    currentJob: AiJob | null; // Most recent active job
}

const AiJobContext = createContext<AiJobContextType | undefined>(undefined);

export const AiJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [jobs, setJobs] = useState<AiJob[]>([]);

    const addJob = (type: AiJob['type'], message: string, metadata?: any) => {
        const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newJob: AiJob = {
            id,
            type,
            status: 'pending',
            message,
            metadata,
            progress: 0,
            createdAt: Date.now()
        };
        setJobs(prev => [newJob, ...prev]);
        return id;
    };

    const updateJob = (id: string, updates: Partial<AiJob>) => {
        setJobs(prev => prev.map(job =>
            job.id === id ? { ...job, ...updates } : job
        ));
    };

    const removeJob = (id: string) => {
        setJobs(prev => prev.filter(job => job.id !== id));
    };

    // Derived state for the "active" job (e.g., to show in a progress bar)
    const currentJob = jobs.find(j => j.status === 'processing' || j.status === 'pending') || null;

    return (
        <AiJobContext.Provider value={{ jobs, addJob, updateJob, removeJob, currentJob }}>
            {children}

            {/* TOASTER / FLOATING STATUS BAR */}
            {currentJob && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom duration-300">
                    <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px] max-w-md">
                        {currentJob.status === 'processing' ? (
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10" />
                        )}
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{currentJob.message}</h4>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentJob.status}...</div>
                        </div>
                        {currentJob.status === 'processing' && (
                            <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                                {currentJob.progress ? `${currentJob.progress}%` : 'Working'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AiJobContext.Provider>
    );
};

export const useAiJobs = () => {
    const context = useContext(AiJobContext);
    if (!context) {
        throw new Error('useAiJobs must be used within an AiJobProvider');
    }
    return context;
};
