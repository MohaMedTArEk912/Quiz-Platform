import React, { useState } from 'react';
import {
    Globe,
    ChevronDown,
    RotateCcw,
    Loader2,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import {
    getLanguageByCode,
    POPULAR_LANGUAGES
} from '../../lib/translationService';
import { LanguageSelectModal } from './LanguageSelectModal';

interface QuestionTranslatorBarProps {
    currentLanguage: string;
    isTranslating: boolean;
    isTranslated: boolean;
    autoTranslate: boolean;
    onSelectLanguage: (langCode: string) => void;
    onToggleOriginal: () => void;
    onToggleAutoTranslate: () => void;
    className?: string;
}

export const QuestionTranslatorBar: React.FC<QuestionTranslatorBarProps> = ({
    currentLanguage,
    isTranslating,
    isTranslated,
    autoTranslate,
    onSelectLanguage,
    onToggleOriginal,
    onToggleAutoTranslate,
    className = ''
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const selectedLangInfo = getLanguageByCode(currentLanguage);

    return (
        <div
            className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 rounded-2xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200/70 dark:border-white/10 shadow-sm transition-all ${className}`}
        >
            {/* Left: Language Selector Button + Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                {/* Main Language Button */}
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                        isTranslated && currentLanguage !== 'original'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:scale-102 active:scale-98'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200'
                    }`}
                    title="Change translation language"
                >
                    {isTranslating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Globe className="w-3.5 h-3.5" />
                    )}

                    <span className="truncate max-w-[100px] sm:max-w-[140px]">
                        {currentLanguage && currentLanguage !== 'original'
                            ? `${selectedLangInfo.flag} ${selectedLangInfo.nativeName}`
                            : 'Translate'}
                    </span>

                    <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {/* Quick Popular Language Chips */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                    {POPULAR_LANGUAGES.slice(0, 4).map((lang) => {
                        const active = isTranslated && currentLanguage === lang.code;
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => onSelectLanguage(lang.code)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    active
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100/80 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                                title={`Translate to ${lang.name}`}
                            >
                                <span className="mr-1">{lang.flag}</span>
                                <span>{lang.nativeName}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: Actions (Original Toggle & Auto-Translate) */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-gray-100 dark:border-white/5">
                {/* View Original / Translated Switch (when a translation is chosen) */}
                {currentLanguage && currentLanguage !== 'original' && (
                    <button
                        type="button"
                        onClick={onToggleOriginal}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            !isTranslated
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                        }`}
                        title={isTranslated ? 'Click to view original text' : 'Click to view translation'}
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isTranslated ? 'Original' : 'Translated'}</span>
                    </button>
                )}

                {/* Auto-Translate Whole Quiz Toggle */}
                <button
                    type="button"
                    onClick={onToggleAutoTranslate}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Automatically translate next questions to this language"
                >
                    {autoTranslate ? (
                        <ToggleRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="hidden sm:inline font-medium">Auto-translate</span>
                </button>
            </div>

            {/* Language Selector Modal */}
            <LanguageSelectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentLanguage={currentLanguage}
                onSelectLanguage={onSelectLanguage}
            />
        </div>
    );
};
