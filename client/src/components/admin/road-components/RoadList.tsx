import React from 'react';
import type { Subject } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import {
    BookOpen, GraduationCap, Brain, Code, Atom, Calculator, Globe,
    Music, Palette, Microscope, FlaskConical, Landmark, Scale,
    Heart, Languages, History, Cpu, Database, Sparkles, Layout,
    Eye, EyeOff, Download, Edit, Trash2, ChevronRight, type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen, GraduationCap, Brain, Code, Atom, Calculator, Globe,
    Music, Palette, Microscope, FlaskConical, Landmark, Scale,
    Heart, Languages, History, Cpu, Database, Sparkles, Layout
};

export const RoadIcon: React.FC<{ iconName?: string; className?: string }> = ({
    iconName,
    className = 'w-7 h-7 text-indigo-600 dark:text-indigo-400'
}) => {
    if (!iconName || !ICON_MAP[iconName]) {
        return <BookOpen className={className} />;
    }
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent className={className} />;
};

interface RoadListProps {
    isLoading: boolean;
    roads: Subject[];
    quizCounts?: Record<string, number>;
    onSelectRoad: (road: Subject) => void;
    onEditRoad?: (road: Subject, e: React.MouseEvent) => void;
    onDeleteRoad?: (road: Subject, e: React.MouseEvent) => void;
    onExportRoad?: (road: Subject, e: React.MouseEvent) => void;
}

const BENTO_ACCENTS = [
    { bg: 'bg-[#bae6fd]', text: 'text-black' }, // Sky Blue
    { bg: 'bg-[#bef264]', text: 'text-black' }, // Lime Green
    { bg: 'bg-[#fef08a]', text: 'text-black' }, // Light Yellow
    { bg: 'bg-[#ddd6fe]', text: 'text-black' }, // Lavender Purple
    { bg: 'bg-[#fed7aa]', text: 'text-black' }, // Soft Peach
    { bg: 'bg-[#fbcfe8]', text: 'text-black' }, // Bubblegum Pink
];

const RoadList: React.FC<RoadListProps> = ({
    isLoading,
    roads,
    quizCounts,
    onSelectRoad,
    onEditRoad,
    onDeleteRoad,
    onExportRoad
}) => {
    const { isBento } = useTheme();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={
                            isBento
                                ? 'bg-white p-6 rounded-[28px] border-[2.5px] border-black shadow-[4px_4px_0px_#000] animate-pulse flex flex-col justify-between min-h-[300px]'
                                : 'bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 animate-pulse min-h-[300px]'
                        }
                    >
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-14 h-14 rounded-2xl ${isBento ? 'bg-gray-200 border-2 border-black/20' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                <div className={`h-6 w-20 rounded-full ${isBento ? 'bg-gray-200 border-2 border-black/20' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            </div>
                            <div className={`h-6 rounded-lg w-3/4 mb-3 ${isBento ? 'bg-gray-200' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <div className={`h-4 rounded-lg w-full mb-1.5 ${isBento ? 'bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <div className={`h-4 rounded-lg w-2/3 mb-4 ${isBento ? 'bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <div className="flex gap-2 mb-4">
                                <div className={`h-6 w-20 rounded-xl ${isBento ? 'bg-gray-200 border border-black/10' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                <div className={`h-6 w-24 rounded-xl ${isBento ? 'bg-gray-200 border border-black/10' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            </div>
                        </div>
                        <div className={`h-10 rounded-xl w-full ${isBento ? 'bg-gray-200 border-2 border-black/20' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roads.map((road, index) => {
                const accent = BENTO_ACCENTS[index % BENTO_ACCENTS.length];
                const quizCount = quizCounts?.[road._id] ?? 0;
                const materialsCount = road.materials?.length ?? 0;

                if (isBento) {
                    return (
                        <div
                            key={road._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectRoad(road)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectRoad(road);
                                }
                            }}
                            className="group relative bg-white text-black p-6 rounded-[28px] border-[2.5px] border-black shadow-[4px_4px_0px_#000] hover:shadow-[7px_7px_0px_#000] hover:-translate-y-1 hover:-translate-x-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                            <div>
                                {/* Header Row: Icon + Visibility Badge */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000] ${accent.bg} ${accent.text} group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-200 shrink-0`}
                                    >
                                        <RoadIcon iconName={road.icon} className="w-7 h-7 text-black stroke-[2.2]" />
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1 text-[10.5px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] ${
                                                road.isVisible === false
                                                    ? 'bg-[#fecdd3] text-black'
                                                    : 'bg-[#bef264] text-black'
                                            }`}
                                            title={road.isVisible === false ? 'Hidden from students' : 'Visible to students'}
                                        >
                                            {road.isVisible === false ? (
                                                <EyeOff className="h-3.5 w-3.5 stroke-[2.5]" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                                            )}
                                            <span>{road.isVisible === false ? 'Hidden' : 'Visible'}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-xl font-black text-black mb-1.5 tracking-tight group-hover:text-purple-700 transition-colors line-clamp-1">
                                    {road.title}
                                </h3>
                                <p className="text-neutral-600 text-xs sm:text-sm font-medium line-clamp-2 leading-relaxed mb-4 min-h-[38px]">
                                    {road.description || "Comprehensive learning roadmap covering key milestones, quizzes, and curriculum modules."}
                                </p>

                                {/* Metrics Chips Row */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-[#fef08a] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                                        title={`${quizCount} Quizzes Assigned`}
                                    >
                                        <GraduationCap className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>{quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}</span>
                                    </span>

                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-[#bae6fd] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                                        title={`${materialsCount} Learning Resources`}
                                    >
                                        <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>{materialsCount} {materialsCount === 1 ? 'Resource' : 'Resources'}</span>
                                    </span>

                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-[#f3e8ff] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                                        title="Interactive visual roadmap"
                                    >
                                        <Brain className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>Roadmap</span>
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Actions Row with Divider */}
                            <div>
                                <div className="w-full h-[2px] bg-black/10 mb-4" />
                                <div className="flex items-center justify-between gap-2">
                                    {/* Primary CTA Button */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectRoad(road);
                                        }}
                                        className="px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Open Road</span>
                                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                    </button>

                                    {/* Action Icon Buttons */}
                                    <div className="flex items-center gap-1.5">
                                        {onEditRoad && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditRoad(road, e);
                                                }}
                                                className="p-2 rounded-xl bg-white hover:bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                                                title="Edit Road Info"
                                            >
                                                <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                        )}
                                        {onExportRoad && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onExportRoad(road, e);
                                                }}
                                                className="p-2 rounded-xl bg-white hover:bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                                                title="Download Road as ZIP (Roadmap + Quizzes)"
                                            >
                                                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                        )}
                                        {onDeleteRoad && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteRoad(road, e);
                                                }}
                                                className="p-2 rounded-xl bg-white hover:bg-[#fecdd3] text-black hover:text-rose-700 border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                                                title="Delete Road"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                // Non-Bento (Standard / Glass / Dark) Mode
                return (
                    <div
                        key={road._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectRoad(road)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectRoad(road);
                            }
                        }}
                        className="group relative bg-white/70 dark:bg-[#1e1e2d]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        <div>
                            {/* Header: Icon + Visibility Badge */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-200/50 dark:border-white/10 group-hover:scale-105 transition-transform shrink-0">
                                    <RoadIcon iconName={road.icon} className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                                </div>

                                <div
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-black uppercase tracking-wider ${
                                        road.isVisible === false
                                            ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-500/10 dark:text-red-300'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-300'
                                    }`}
                                    title={road.isVisible === false ? 'Hidden from students' : 'Visible to students'}
                                >
                                    {road.isVisible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    <span>{road.isVisible === false ? 'Hidden' : 'Visible'}</span>
                                </div>
                            </div>

                            {/* Title & Description */}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {road.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4 min-h-[38px]">
                                {road.description || "Comprehensive learning roadmap covering key milestones, quizzes, and curriculum modules."}
                            </p>

                            {/* Metrics Chips Row */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/40"
                                    title={`${quizCount} Quizzes Assigned`}
                                >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>{quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}</span>
                                </span>

                                <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/40"
                                    title={`${materialsCount} Learning Resources`}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>{materialsCount} {materialsCount === 1 ? 'Resource' : 'Resources'}</span>
                                </span>

                                <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                                    title="Interactive visual roadmap"
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    <span>Roadmap</span>
                                </span>
                            </div>
                        </div>

                        {/* Bottom Actions Row with Divider */}
                        <div>
                            <div className="w-full h-px bg-gray-200/80 dark:bg-white/10 mb-4" />
                            <div className="flex items-center justify-between gap-2">
                                {/* Primary Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectRoad(road);
                                    }}
                                    className="px-3.5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-sm hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span>Open Road</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                {/* Action Icon Buttons */}
                                <div className="flex items-center gap-1.5">
                                    {onEditRoad && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditRoad(road, e);
                                            }}
                                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all cursor-pointer"
                                            title="Edit Road Info"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {onExportRoad && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onExportRoad(road, e);
                                            }}
                                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-all cursor-pointer"
                                            title="Download Road as ZIP (Roadmap + Quizzes)"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {onDeleteRoad && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteRoad(road, e);
                                            }}
                                            className="p-2 rounded-xl bg-gray-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/20 text-gray-600 dark:text-gray-300 hover:text-rose-600 transition-all cursor-pointer"
                                            title="Delete Road"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {roads.length === 0 && (
                <div
                    className={
                        isBento
                            ? 'col-span-full py-16 text-center border-[2.5px] border-dashed border-black rounded-[28px] bg-white shadow-[4px_4px_0px_#000]'
                            : 'col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-white/5'
                    }
                >
                    <div
                        className={
                            isBento
                                ? 'w-20 h-20 bg-[#fef08a] border-2 border-black shadow-[2px_2px_0px_#000] rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl'
                                : 'w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50'
                        }
                    >
                        🗺️
                    </div>
                    <p className={`font-black text-xl ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                        No Learning Roads Found
                    </p>
                    <p className={`text-sm mt-1 ${isBento ? 'text-neutral-600 font-medium' : 'text-gray-400'}`}>
                        Create your first learning journey using the "+ New Road" button above.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RoadList;
