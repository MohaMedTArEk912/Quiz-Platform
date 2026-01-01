import React from 'react';
import type { AttemptData } from '../../types/index.ts';

interface AttemptsLogProps {
    attempts: AttemptData[];
}

const AttemptsLog: React.FC<AttemptsLogProps> = ({ attempts }) => {
    const sortedAttempts = [...attempts].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-white/5">
                    <tr className="border-b border-gray-200 dark:border-white/5 text-gray-500 text-xs font-bold uppercase tracking-widest">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Quiz</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {sortedAttempts.map(attempt => (
                        <tr key={attempt.attemptId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{attempt.userName}</td>
                            <td className="px-6 py-4 text-gray-400">{attempt.quizTitle}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${attempt.percentage >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {attempt.percentage}%
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-sm">{new Date(attempt.completedAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    {sortedAttempts.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-12 text-gray-500 font-bold">No attempts found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AttemptsLog;
