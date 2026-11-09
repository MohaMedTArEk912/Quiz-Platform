import React, { useMemo, useState } from 'react';
import { Flame, Clock, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DayActivity {
    count: number;
    avgPercentage: number;
    totalScore: number;
}

interface GitHubActivityHeatmapProps {
    activityMap: Record<string, DayActivity>;
    totalYearAttempts: number;
    currentStreak: number;
    totalTimeSeconds?: number;
    userName: string;
}

export const GitHubActivityHeatmap: React.FC<GitHubActivityHeatmapProps> = ({
    activityMap,
    totalYearAttempts,
    currentStreak,
    totalTimeSeconds = 0,
    userName
}) => {
    const { isBento } = useTheme();
    const [hoveredDay, setHoveredDay] = useState<{
        dateStr: string;
        formattedDate: string;
        count: number;
        avgPercentage: number;
        x: number;
        y: number;
    } | null>(null);

    // Build 52-week calendar grid ending on current week
    const { calendarWeeks, monthLabels } = useMemo(() => {
        const weeks: Array<Array<{ date: Date; dateStr: string; activity: DayActivity }>> = [];
        const months: Array<{ label: string; weekIndex: number }> = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // End at the upcoming Saturday of current week
        const endDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + (6 - endDayOfWeek));

        // Start 52 weeks (364 days) before endDate
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (52 * 7 - 1));

        const currentDate = new Date(startDate);
        let currentMonth = -1;

        for (let w = 0; w < 52; w++) {
            const currentWeek: Array<{ date: Date; dateStr: string; activity: DayActivity }> = [];

            for (let d = 0; d < 7; d++) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const activity = activityMap[dateStr] || { count: 0, avgPercentage: 0, totalScore: 0 };

                currentWeek.push({
                    date: new Date(currentDate),
                    dateStr,
                    activity
                });

                // Detect month transitions for column labels
                if (d === 0 && currentDate.getMonth() !== currentMonth) {
                    currentMonth = currentDate.getMonth();
                    months.push({
                        label: currentDate.toLocaleDateString(undefined, { month: 'short' }),
                        weekIndex: w
                    });
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            weeks.push(currentWeek);
        }

        return { calendarWeeks: weeks, monthLabels: months };
    }, [activityMap]);

    // Format total study hours
    const totalHours = Math.round((totalTimeSeconds / 3600) * 10) / 10;

    // Intensity color mapping
    const getCellColor = (count: number) => {
        if (count === 0) {
            return isBento
                ? 'bg-slate-100 border border-black/15'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5';
        }
        if (count <= 1) {
            return isBento
                ? 'bg-[#d9f99d] border border-black'
                : 'bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-black';
        }
        if (count <= 2) {
            return isBento
                ? 'bg-[#bef264] border border-black'
                : 'bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600';
        }
        if (count <= 4) {
            return isBento
                ? 'bg-[#84cc16] border border-black'
                : 'bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 dark:border-emerald-400';
        }
        return isBento
            ? 'bg-[#4d7c0f] border border-black shadow-[1px_1px_0px_#000]'
            : 'bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300';
    };

    return (
        <div className={`p-5 rounded-3xl transition-all ${
            isBento
                ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                : 'bg-white dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-lg'
        }`}>
            {/* Header with Title and Streak Quick-Counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl shrink-0 ${
                        isBento
                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`text-base font-black uppercase tracking-tight flex items-center gap-2 ${
                            isBento ? 'text-black' : 'text-slate-900 dark:text-white'
                        }`}>
                            Activity & Study Heatmap
                        </h3>
                        <p className={`text-xs ${isBento ? 'text-black/70 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {totalYearAttempts.toLocaleString()} quiz attempts in the last year
                        </p>
                    </div>
                </div>

                {/* Quick stats badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                        isBento
                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{currentStreak} Day Streak</span>
                    </div>

                    {totalHours > 0 && (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                            isBento
                                ? 'bg-sky-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                        }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{totalHours}h Study Time</span>
                        </div>
                    )}
                </div>
            </div>

            {/* GitHub Grid Container with horizontal scroll */}
            <div className="relative overflow-x-auto pb-2 custom-scrollbar">
                <div className="inline-block min-w-[720px] select-none">
                    {/* Month Labels Bar */}
                    <div className="flex ml-7 mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {monthLabels.map((m, idx) => (
                            <span
                                key={idx}
                                style={{
                                    minWidth: '2.8rem',
                                    textAlign: 'left'
                                }}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    {/* Day Rows + Weeks Columns */}
                    <div className="flex gap-1.5 items-start">
                        {/* Day labels (Mon, Wed, Fri) */}
                        <div className="flex flex-col gap-1 text-[9px] font-black text-slate-400 dark:text-slate-500 mr-1 pt-0.5">
                            <span className="h-3 leading-3">Sun</span>
                            <span className="h-3 leading-3">Mon</span>
                            <span className="h-3 leading-3">Tue</span>
                            <span className="h-3 leading-3">Wed</span>
                            <span className="h-3 leading-3">Thu</span>
                            <span className="h-3 leading-3">Fri</span>
                            <span className="h-3 leading-3">Sat</span>
                        </div>

                        {/* 52 Columns */}
                        <div className="flex gap-[3px]">
                            {calendarWeeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dIdx) => {
                                        const count = day.activity.count;
                                        return (
                                            <div
                                                key={dIdx}
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoveredDay({
                                                        dateStr: day.dateStr,
                                                        formattedDate: day.date.toLocaleDateString(undefined, {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        }),
                                                        count,
                                                        avgPercentage: day.activity.avgPercentage,
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top
                                                    });
                                                }}
                                                onMouseLeave={() => setHoveredDay(null)}
                                                className={`w-3 h-3 rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10 ${getCellColor(count)}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating Tooltip */}
                {hoveredDay && (
                    <div
                        className={`fixed z-[200] -translate-x-1/2 -translate-y-full mb-2 pointer-events-none px-3 py-1.5 rounded-xl text-xs font-black shadow-2xl transition-all ${
                            isBento
                                ? 'bg-black text-white border-2 border-white'
                                : 'bg-slate-900 text-white border border-white/20'
                        }`}
                        style={{
                            left: `${hoveredDay.x}px`,
                            top: `${hoveredDay.y - 8}px`
                        }}
                    >
                        <div className="text-[11px]">
                            {hoveredDay.count === 0 ? (
                                <span className="text-gray-300">No quizzes on {hoveredDay.formattedDate}</span>
                            ) : (
                                <span>
                                    <strong className="text-emerald-400">{hoveredDay.count} quiz{hoveredDay.count > 1 ? 'zes' : ''}</strong> on {hoveredDay.formattedDate}
                                    {hoveredDay.avgPercentage > 0 && ` • Avg ${hoveredDay.avgPercentage}%`}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-between text-[11px] pt-3 mt-2 border-t border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 font-bold">
                <span>{userName}'s year of quizzes</span>
                <div className="flex items-center gap-1.5">
                    <span>Less</span>
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${isBento ? 'bg-slate-100 border border-black/20' : 'bg-slate-200 dark:bg-white/5'}`} />
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${isBento ? 'bg-[#d9f99d] border border-black' : 'bg-emerald-200 dark:bg-emerald-950/80'}`} />
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${isBento ? 'bg-[#bef264] border border-black' : 'bg-emerald-400 dark:bg-emerald-700'}`} />
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${isBento ? 'bg-[#84cc16] border border-black' : 'bg-emerald-500'}`} />
                    <span className={`w-2.5 h-2.5 rounded-[2px] ${isBento ? 'bg-[#4d7c0f] border border-black' : 'bg-emerald-600 dark:bg-emerald-400'}`} />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};
