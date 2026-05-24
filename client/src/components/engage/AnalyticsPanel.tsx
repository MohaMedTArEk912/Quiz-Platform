import React, { useEffect, useState } from 'react';
import type { UserData } from '../../types';
import { api } from '../../lib/api';

interface AnalyticsPanelProps {
  user: UserData;
}

type CategoryStat = { category: string; average: number };
type AnalyticsSummary = {
  totalAttempts?: number;
  avgScore?: number;
  categoryStats?: CategoryStat[];
  global?: { userCount: number };
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ user }) => {
  const [data, setData] = useState<AnalyticsSummary>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setData(await api.getAnalyticsSummary(user.userId));
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [user.userId]);

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Attempts</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalAttempts ?? 0}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Score</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.avgScore ?? 0}%</div>
        </div>
        {data.global && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Users</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.global.userCount}</div>
          </div>
        )}
      </div>
      <div>
        <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Average by Category</div>
        <div className="space-y-2">
          {(data.categoryStats || []).map((c) => (
            <div key={c.category} className="flex items-center gap-2">
              <div className="w-24 text-sm text-gray-600 dark:text-gray-400">{c.category}</div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${c.average}%` }} />
              </div>
              <div className="w-10 text-sm text-gray-700 dark:text-gray-300">{c.average}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
