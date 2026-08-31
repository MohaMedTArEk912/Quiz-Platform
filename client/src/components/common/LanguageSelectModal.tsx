import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Globe, Check, Sparkles, Languages } from 'lucide-react';
import {
    ALL_SUPPORTED_LANGUAGES,
    POPULAR_LANGUAGES
} from '../../lib/translationService';

interface LanguageSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: string;
    onSelectLanguage: (langCode: string) => void;
}

const LanguageSelectModalContent: React.FC<Omit<LanguageSelectModalProps, 'isOpen'>> = ({
    onClose,
    currentLanguage,
    onSelectLanguage
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    const filteredLanguages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return ALL_SUPPORTED_LANGUAGES;

        return ALL_SUPPORTED_LANGUAGES.filter(
            (lang) =>
                lang.name.toLowerCase().includes(query) ||
                lang.nativeName.toLowerCase().includes(query) ||
                lang.code.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Card */}
            <div className="relative w-full max-w-xl max-h-[85vh] bg-white dark:bg-[#111322] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Languages className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Choose Question Language
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Translate question, options, and explanations into any language
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar & Reset to Original */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by language (e.g. Arabic, French, Español, 日本語)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all"
                        />
                    </div>

                    {/* Reset to Original Button */}
                    <button
                        onClick={() => {
                            onSelectLanguage('original');
                            onClose();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            currentLanguage === 'original' || !currentLanguage
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className="text-lg">✨</span>
                            <div>
                                <div className="text-xs sm:text-sm font-black">Original Language (English)</div>
                                <div className="text-[10px] text-gray-400">View untranslated original text</div>
                            </div>
                        </div>
                        {(currentLanguage === 'original' || !currentLanguage) && (
                            <Check className="w-4 h-4 text-indigo-500" />
                        )}
                    </button>
                </div>

                {/* Content: Language Lists */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
                    {/* Popular Languages (when not searching) */}
                    {!searchQuery && (
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Popular Languages</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {POPULAR_LANGUAGES.map((lang) => {
                                    const isSelected = currentLanguage === lang.code;
                                    return (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                onSelectLanguage(lang.code);
                                                onClose();
                                            }}
                                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25'
                                                    : 'bg-white dark:bg-white/5 border-gray-200/70 dark:border-white/5 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'
                                            }`}
                                        >
                                            <span className="text-xl shrink-0">{lang.flag}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-black truncate">{lang.name}</div>
                                                <div
                                                    className={`text-[10px] truncate ${
                                                        isSelected ? 'text-white/80' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {lang.nativeName}
                                                </div>
                                            </div>
                                            {lang.rtl && (
                                                <span
                                                    className={`text-[8px] font-black px-1 py-0.5 rounded uppercase shrink-0 ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-indigo-500/10 text-indigo-500'
                                                    }`}
                                                >
                                                    RTL
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* All Languages */}
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-indigo-500" />
                            <span>{searchQuery ? `Matching Languages (${filteredLanguages.length})` : 'All Supported Languages (50+)'}</span>
                        </div>

                        {filteredLanguages.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-xs">
                                No languages found matching "{searchQuery}".
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {filteredLanguages.map((lang) => {
                                    const isSelected = currentLanguage === lang.code;
                                    return (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                onSelectLanguage(lang.code);
                                                onClose();
                                            }}
                                            className={`p-2.5 px-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25'
                                                    : 'bg-white dark:bg-white/5 border-gray-200/50 dark:border-white/5 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-xl shrink-0">{lang.flag}</span>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold truncate">
                                                        {lang.name}
                                                    </div>
                                                    <div
                                                        className={`text-[10px] truncate ${
                                                            isSelected ? 'text-white/80' : 'text-gray-400'
                                                        }`}
                                                    >
                                                        {lang.nativeName}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                {lang.rtl && (
                                                    <span
                                                        className={`text-[8px] font-black px-1 py-0.5 rounded uppercase ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-indigo-500/10 text-indigo-500'
                                                        }`}
                                                    >
                                                        RTL
                                                    </span>
                                                )}
                                                {isSelected && <Check className="w-4 h-4" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-3.5 px-5 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                    <span>⚡ Instant real-time multi-lingual translation</span>
                    <button
                        onClick={onClose}
                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({ isOpen, ...props }) => {
    if (!isOpen) return null;
    return <LanguageSelectModalContent {...props} />;
};
