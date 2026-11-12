import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    ChevronDown,
    ChevronUp,
    Sliders,
    Zap,
    Check,
    HelpCircle,
    CalendarDays
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FlexibleDateTimePickerProps {
    label: string;
    value: string; // ISO string
    onChange: (iso: string) => void;
    isEndTime?: boolean;
    referenceStartTime?: string;
    durationMinutes?: number;
}

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const formatToReadableDateTime = (isoString?: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const y = d.getFullYear();
    let h = d.getHours();
    const min = pad2(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${m}/${day}/${y} ${pad2(h)}:${min} ${ampm}`;
};

export const parseFlexibleDateTime = (text: string): Date | null => {
    if (!text || !text.trim()) return null;
    const str = text.trim();

    // 1. Pattern: MM/DD/YYYY hh:mm AM/PM (e.g. 11/12/2026 04:12 PM)
    const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (usMatch) {
        const [, m, day, y, h, min, , ampm] = usMatch;
        let hour = parseInt(h, 10);
        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
            if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        }
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10), hour, parseInt(min, 10));
        if (!isNaN(d.getTime())) return d;
    }

    // 2. Pattern: YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm
    const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/i);
    if (isoMatch) {
        const [, y, m, day, h, min] = isoMatch;
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10), parseInt(h, 10), parseInt(min, 10));
        if (!isNaN(d.getTime())) return d;
    }

    // 3. Fallback: new Date(str)
    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
};

const FlexibleDateTimePicker: React.FC<FlexibleDateTimePickerProps> = ({
    label,
    value,
    onChange,
    isEndTime = false,
    referenceStartTime,
    durationMinutes = 45
}) => {
    const { isBento } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [rawText, setRawText] = useState(() => formatToReadableDateTime(value));
    const [isTyping, setIsTyping] = useState(false);
    const [isValidText, setIsValidText] = useState(true);

    // Keep rawText synced with value when value changes externally (e.g. presets)
    useEffect(() => {
        if (!isTyping) {
            setRawText(formatToReadableDateTime(value));
            setIsValidText(true);
        }
    }, [value, isTyping]);

    const currentDate = parseFlexibleDateTime(value) || new Date();
    const year = currentDate.getFullYear();
    const month = pad2(currentDate.getMonth() + 1);
    const day = pad2(currentDate.getDate());
    const dateInputVal = `${year}-${month}-${day}`;
    const hours24 = currentDate.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = currentDate.getMinutes();
    const ampm: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';

    // Handle user typing directly into the text box
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRawText(val);
        setIsTyping(true);

        const parsed = parseFlexibleDateTime(val);
        if (parsed) {
            setIsValidText(true);
            onChange(parsed.toISOString());
        } else {
            setIsValidText(false);
        }
    };

    const handleTextBlur = () => {
        setIsTyping(false);
        const parsed = parseFlexibleDateTime(rawText);
        if (parsed) {
            setRawText(formatToReadableDateTime(parsed.toISOString()));
            onChange(parsed.toISOString());
            setIsValidText(true);
        } else {
            // Restore last known valid value
            setRawText(formatToReadableDateTime(value));
            setIsValidText(true);
        }
    };

    // Date change via native input
    const handleDateChange = (newDateStr: string) => {
        if (!newDateStr) return;
        const [y, m, d] = newDateStr.split('-').map(Number);
        const updated = new Date(currentDate);
        updated.setFullYear(y, m - 1, d);
        onChange(updated.toISOString());
    };

    // Quick Date Presets
    const handleSetToday = () => {
        const now = new Date();
        const updated = new Date(currentDate);
        updated.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        onChange(updated.toISOString());
    };

    const handleSetTomorrow = () => {
        const now = new Date();
        now.setDate(now.getDate() + 1);
        const updated = new Date(currentDate);
        updated.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        onChange(updated.toISOString());
    };

    const handleSetIn2Days = () => {
        const now = new Date();
        now.setDate(now.getDate() + 2);
        const updated = new Date(currentDate);
        updated.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        onChange(updated.toISOString());
    };

    const handleSetNextMonday = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        now.setDate(now.getDate() + daysToAdd);
        const updated = new Date(currentDate);
        updated.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        onChange(updated.toISOString());
    };

    // Time Pickers
    const handleHourChange = (newHour12: number) => {
        const updated = new Date(currentDate);
        let h24 = newHour12 % 12;
        if (ampm === 'PM') h24 += 12;
        updated.setHours(h24);
        onChange(updated.toISOString());
    };

    const handleMinuteChange = (newMinute: number) => {
        const updated = new Date(currentDate);
        updated.setMinutes(Math.max(0, Math.min(59, newMinute)));
        onChange(updated.toISOString());
    };

    const handleAmPmToggle = (newAmPm: 'AM' | 'PM') => {
        const updated = new Date(currentDate);
        let h24 = hours12 % 12;
        if (newAmPm === 'PM') h24 += 12;
        updated.setHours(h24);
        onChange(updated.toISOString());
    };

    // Quick Stepper Nudges
    const shiftMinutes = (delta: number) => {
        const updated = new Date(currentDate.getTime() + delta * 60000);
        onChange(updated.toISOString());
    };

    // Friendly Human Preview
    const fullPreview = (() => {
        const d = parseFlexibleDateTime(value);
        if (!d) return 'Invalid date';
        return d.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    })();

    return (
        <div className="space-y-1.5">
            {/* Header / Label */}
            <div className="flex items-center justify-between">
                <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                    {label}
                </label>
                <span className={`text-[10px] font-bold ${isBento ? 'text-black' : 'text-gray-400 dark:text-gray-500'}`}>
                    {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'}
                </span>
            </div>

            {/* Direct Text Box & Options Trigger */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={rawText}
                        onChange={handleTextChange}
                        onBlur={handleTextBlur}
                        placeholder="MM/DD/YYYY hh:mm AM/PM or YYYY-MM-DD HH:mm"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-2xl text-xs font-bold outline-none transition-all shadow-xs ${
                            isBento
                                ? isValidText
                                    ? 'bg-slate-100 text-black border-2 border-black focus:shadow-[2px_2px_0px_#000]'
                                    : 'bg-amber-50 text-black border-2 border-amber-600 focus:shadow-[2px_2px_0px_#000]'
                                : isValidText
                                    ? 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                    : 'border-amber-400 dark:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-gray-900 dark:text-white'
                        }`}
                    />
                    <Calendar className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isBento ? 'text-black' : 'text-gray-400'}`} />
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`px-3 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        isBento
                            ? isOpen
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                            : isOpen
                                ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-500/20'
                                : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Open Options & Pickers Freely"
                >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Options</span>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Sub-label live validation & human readable preview */}
            <div className="flex items-center justify-between text-[10px] font-bold px-1">
                <span className={isValidText ? (isBento ? 'text-black flex items-center gap-1 truncate font-black' : 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate') : 'text-amber-500 flex items-center gap-1 truncate'}>
                    {isValidText ? (
                        <>
                            <Check className={`w-3 h-3 flex-shrink-0 ${isBento ? 'text-black font-black' : 'text-emerald-500'}`} />
                            <span className="truncate">{fullPreview}</span>
                        </>
                    ) : (
                        <>
                            <HelpCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span>Type e.g. 11/12/2026 04:12 PM or pick in Options</span>
                        </>
                    )}
                </span>
            </div>

            {/* Expandable Options Drawer */}
            {isOpen && (
                <div className={`mt-2 p-4 rounded-2xl space-y-3.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
                    isBento
                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                        : 'bg-gray-50/90 dark:bg-[#13141f]/90 backdrop-blur-md border border-gray-200 dark:border-white/10'
                }`}>
                    {/* Quick Date Chips */}
                    <div className="space-y-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Quick Date Presets</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { label: 'Today', action: handleSetToday },
                                { label: 'Tomorrow', action: handleSetTomorrow },
                                { label: '+2 Days', action: handleSetIn2Days },
                                { label: 'Next Monday', action: handleSetNextMonday }
                            ].map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={preset.action}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                                        isBento
                                            ? 'bg-slate-100 text-black border border-black hover:bg-[#bef264] hover:shadow-[1px_1px_0px_#000]'
                                            : 'bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interactive Dropdowns & Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                        {/* Date Picker */}
                        <div className="sm:col-span-4 space-y-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Date</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateInputVal}
                                    onChange={e => handleDateChange(e.target.value)}
                                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                        isBento
                                            ? 'bg-slate-100 text-black border-2 border-black'
                                            : 'bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Hour Selector */}
                        <div className="sm:col-span-3 space-y-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Hour</span>
                            <select
                                value={hours12}
                                onChange={e => handleHourChange(parseInt(e.target.value, 10))}
                                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                    isBento
                                        ? 'bg-slate-100 text-black border-2 border-black'
                                        : 'bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                                    <option key={h} value={h}>
                                        {pad2(h)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Minute Selector & Custom Input */}
                        <div className="sm:col-span-3 space-y-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Minute</span>
                            <select
                                value={minutes}
                                onChange={e => handleMinuteChange(parseInt(e.target.value, 10))}
                                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                    isBento
                                        ? 'bg-slate-100 text-black border-2 border-black'
                                        : 'bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`}
                            >
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                                    <option key={m} value={m}>
                                        {pad2(m)} min
                                    </option>
                                ))}
                                {![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(minutes) && (
                                    <option value={minutes}>{pad2(minutes)} min</option>
                                )}
                            </select>
                        </div>

                        {/* AM / PM Selector */}
                        <div className="sm:col-span-2 space-y-1">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Period</span>
                            <div className={`flex p-1 rounded-xl ${
                                isBento ? 'bg-slate-200 border-2 border-black' : 'bg-gray-200 dark:bg-black/40'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => handleAmPmToggle('AM')}
                                    className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        ampm === 'AM'
                                            ? isBento
                                                ? 'bg-[#fde047] text-black border border-black shadow-xs'
                                                : 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-xs'
                                            : 'text-gray-500 hover:text-black'
                                    }`}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAmPmToggle('PM')}
                                    className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                        ampm === 'PM'
                                            ? isBento
                                                ? 'bg-[#fde047] text-black border border-black shadow-xs'
                                                : 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-xs'
                                            : 'text-gray-500 hover:text-black'
                                    }`}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Relative Time Shift Buttons */}
                    <div className="space-y-1.5 pt-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Quick Time Steppers</span>
                        <div className="flex flex-wrap gap-1.5">
                            {[-15, 15, 30, 60, 120, 1440].map(delta => (
                                <button
                                    key={delta}
                                    type="button"
                                    onClick={() => shiftMinutes(delta)}
                                    className={`px-2 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                                        isBento
                                            ? 'bg-slate-100 text-black border border-black hover:bg-[#bef264] hover:shadow-[1px_1px_0px_#000]'
                                            : 'bg-white dark:bg-white/5 hover:bg-blue-500/10 text-gray-700 dark:text-gray-300 hover:text-blue-600 border border-gray-200 dark:border-white/5'
                                    }`}
                                >
                                    {delta > 0 ? `+${delta >= 1440 ? '1 Day' : delta >= 60 ? `${delta / 60}h` : `${delta}m`}` : `${delta}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* End Datetime Specific Helpers */}
                    {isEndTime && referenceStartTime && (
                        <div className={`space-y-1.5 pt-2 border-t ${isBento ? 'border-black/20' : 'border-gray-200/60 dark:border-white/5'}`}>
                            <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${isBento ? 'text-black' : 'text-blue-500'}`}>
                                <Zap className="w-3 h-3" /> Quick Arena Window Presets
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {durationMinutes > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const start = new Date(referenceStartTime);
                                            const end = new Date(start.getTime() + durationMinutes * 60000);
                                            onChange(end.toISOString());
                                        }}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                            isBento
                                                ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000] hover:bg-yellow-400'
                                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                        Match Attempt Limit (+{durationMinutes}m)
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const start = new Date(referenceStartTime);
                                        const end = new Date(start.getTime() + 2 * 3600000);
                                        onChange(end.toISOString());
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                        isBento
                                            ? 'bg-[#67e8f9] text-black border border-black shadow-[1px_1px_0px_#000] hover:bg-cyan-400'
                                            : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                    }`}
                                >
                                    <Clock className="w-3 h-3" /> Start + 2 Hours Window
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const start = new Date(referenceStartTime);
                                        const end = new Date(start.getTime() + 4 * 3600000);
                                        onChange(end.toISOString());
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                        isBento
                                            ? 'bg-[#f472b6] text-black border border-black shadow-[1px_1px_0px_#000] hover:bg-pink-400'
                                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                    }`}
                                >
                                    <Clock className="w-3 h-3" /> Start + 4 Hours Window
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const start = new Date(referenceStartTime);
                                        const end = new Date(start.getTime() + 24 * 3600000);
                                        onChange(end.toISOString());
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000] hover:bg-lime-400'
                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    }`}
                                >
                                    <CalendarDays className="w-3 h-3" /> Full Day Window (24h)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FlexibleDateTimePicker;
