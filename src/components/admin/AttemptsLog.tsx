import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { AttemptData } from '../../types/index.ts';

interface AttemptsLogProps {
    attempts: AttemptData[];
}

const AttemptsLog: React.FC<AttemptsLogProps> = ({ attempts }) => {
    const sortedAttempts = [...attempts].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl">
                        <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Attempts History</h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global user performance log</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Total: {sortedAttempts.length} Records</span>
                </div>
            </div>

            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="px-8 py-5">User Profile</th>
                                <th className="px-8 py-5">Assessment</th>
                                <th className="px-8 py-5 text-center">Score</th>
                                <th className="px-8 py-5 text-right">Completion Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedAttempts.map(attempt => (
                                <tr key={attempt.attemptId} className="group hover:bg-white/40 dark:hover:bg-white/5 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm border border-white/10 group-hover:scale-105 transition-transform">
                                                {attempt.userName.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight group-hover:text-indigo-500 transition-colors">
                                                {attempt.userName}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                            {attempt.quizTitle}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${attempt.percentage >= 60
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                            }`}>
                                            {attempt.percentage}%
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                            {new Date(attempt.completedAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAttempts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-24">
                                        <BarChart3 className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4 animate-pulse" />
                                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No records found in the archive</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttemptsLog;
