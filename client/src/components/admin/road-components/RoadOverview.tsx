import React from 'react';
import type { Subject } from '../../../types';
import { BookOpen } from 'lucide-react';

interface RoadOverviewProps {
    road: Subject;
}

const RoadOverview: React.FC<RoadOverviewProps> = ({ road }) => {
    return (
        <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm">
            <h3 className="text-2xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <span className="p-2 bg-indigo-500/10 rounded-lg"><BookOpen className="w-6 h-6 text-indigo-500" /></span>
                Road Details
            </h3>
            <div className="space-y-6 max-w-3xl">
                <div className="group">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Title</label>
                    <div className="text-xl font-bold text-gray-900 dark:text-white p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-transparent group-hover:border-indigo-500/20 transition-colors">
                        {road.title}
                    </div>
                </div>
                <div className="group">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Description</label>
                    <div className="text-base leading-relaxed text-gray-700 dark:text-gray-300 p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-transparent group-hover:border-indigo-500/20 transition-colors min-h-[100px]">
                        {road.description || "No description provided."}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoadOverview;
