import React from 'react';
import type { Subject } from '../../../types';
import {
    BookOpen, GraduationCap, Brain, Code, Atom, Calculator, Globe,
    Music, Palette, Microscope, FlaskConical, Landmark, Scale,
    Heart, Languages, History, Cpu, Database, Sparkles, Layout, type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen, GraduationCap, Brain, Code, Atom, Calculator, Globe,
    Music, Palette, Microscope, FlaskConical, Landmark, Scale,
    Heart, Languages, History, Cpu, Database, Sparkles, Layout
};

const RoadIcon: React.FC<{ iconName?: string; className?: string }> = ({ iconName, className = 'w-7 h-7 text-indigo-600 dark:text-indigo-400' }) => {
    if (!iconName || !ICON_MAP[iconName]) {
        return <BookOpen className={className} />;
    }
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent className={className} />;
};

interface RoadListProps {
    isLoading: boolean;
    roads: Subject[];
    onSelectRoad: (road: Subject) => void;
}

const RoadList: React.FC<RoadListProps> = ({ isLoading, roads, onSelectRoad }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 animate-pulse">
                        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-1" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roads.map(road => (
                <div
                    key={road._id}
                    onClick={() => onSelectRoad(road)}
                    className="group relative overflow-hidden bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />

                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10 group-hover:scale-110 transition-transform duration-300">
                            <RoadIcon iconName={road.icon} />
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 relative z-10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {road.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-6 relative z-10 h-10">
                        {road.description || "No description provided."}
                    </p>

                    <div className="mt-auto flex gap-2 relative z-10">
                        <span className="text-xs bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 font-bold border border-gray-100 dark:border-white/5 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">
                            {road.materials?.length || 0} Resources
                        </span>
                    </div>
                </div>
            ))}

            {roads.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-white/5">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50">
                        📚
                    </div>
                    <p className="text-gray-500 font-bold text-lg">No roads found.</p>
                    <p className="text-gray-400 text-sm mt-1">Create your first learning journey above.</p>
                </div>
            )}
        </div>
    );
};

export default RoadList;
