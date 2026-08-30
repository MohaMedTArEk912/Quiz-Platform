import { api } from './api';
import type { Question } from '../types';

export interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    rtl?: boolean;
}

export const POPULAR_LANGUAGES: LanguageOption[] = [
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

export const ALL_SUPPORTED_LANGUAGES: LanguageOption[] = [
    ...POPULAR_LANGUAGES,
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
    { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
    { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲' },
    { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
    { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
    { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸' },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
    { code: 'fa', name: 'Persian (Farsi)', nativeName: 'فارسی', flag: '🇮🇷', rtl: true },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
    { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
    { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪' },
    { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿' },
    { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
    { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
    { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳' },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
    { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
    { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },
    { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', flag: '🇺🇿' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
];

export interface TranslatedQuestionData {
    question: string;
    options?: string[];
    explanation?: string;
    orderingItems?: string[];
    matchingPairs?: { left: string; right: string }[];
    lang: string;
    isRtl: boolean;
}

// In-memory LRU cache
const memoryCache = new Map<string, string>();

/**
 * Get language details by code
 */
export function getLanguageByCode(code: string): LanguageOption {
    const found = ALL_SUPPORTED_LANGUAGES.find(
        (l) => l.code.toLowerCase() === code.toLowerCase()
    );
    if (found) return found;
    return {
        code,
        name: code.toUpperCase(),
        nativeName: code.toUpperCase(),
        flag: '🌐',
        rtl: ['ar', 'he', 'fa', 'ur'].includes(code.toLowerCase())
    };
}

/**
 * Check if a language code is right-to-left
 */
export function isRTL(langCode: string): boolean {
    const lang = getLanguageByCode(langCode);
    return Boolean(lang.rtl);
}

/**
 * Protect LaTeX math expressions and code tags before translating
 */
function protectMathAndCode(text: string): { protectedText: string; tokens: Map<string, string> } {
    const tokens = new Map<string, string>();
    let tokenIndex = 0;

    // 1. Math formulas ($$...$$, $...$, \\[...\\])
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\(.+?\\\)|\\[a-zA-Z]+(?:\{[^\}]*\})*)/g;
    let protectedText = text.replace(mathRegex, (match) => {
        const key = `__MTKN_${tokenIndex++}__`;
        tokens.set(key, match);
        return key;
    });

    // 2. Code blocks (```...``` and `...`)
    const codeRegex = /(```[\s\S]*?```|`[^`\n]+?`)/g;
    protectedText = protectedText.replace(codeRegex, (match) => {
        const key = `__MTKN_${tokenIndex++}__`;
        tokens.set(key, match);
        return key;
    });

    return { protectedText, tokens };
}

/**
 * Restore protected tokens back into translated text
 */
function restoreMathAndCode(translatedText: string, tokens: Map<string, string>): string {
    let result = translatedText;
    for (const [key, original] of tokens.entries()) {
        // Handle potential space insertions by translation engines e.g. "__ MTKN _ 0 __"
        const flexibleKeyRegex = new RegExp(
            key.replace(/_/g, '[_\\s]*').replace(/([A-Z0-9])/g, '$1[\\s]*'),
            'g'
        );
        result = result.replace(flexibleKeyRegex, original);
        result = result.replace(key, original);
    }
    return result;
}

/**
 * Translate a single plain text string into target language
 */
export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string = 'auto'
): Promise<string> {
    if (!text || !text.trim() || targetLang === 'en' || targetLang === 'original') {
        return text;
    }

    const trimmed = text.trim();
    const cacheKey = `${sourceLang}_${targetLang}_${trimmed}`;

    if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey)!;
    }

    // Try LocalStorage cache
    try {
        const stored = localStorage.getItem(`q_trans_${cacheKey}`);
        if (stored) {
            memoryCache.set(cacheKey, stored);
            return stored;
        }
    } catch {
        // Ignore localStorage quota/security errors
    }

    const { protectedText, tokens } = protectMathAndCode(trimmed);

    let rawTranslated = '';

    // Primary Client Engine: Google Translate Free Client API
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${encodeURIComponent(
            targetLang
        )}&dt=t&q=${encodeURIComponent(protectedText)}`;
        const res = await fetch(gUrl);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                rawTranslated = data[0].map((seg: any) => seg[0]).join('');
            }
        }
    } catch (gErr) {
        console.warn('[Translation] Google direct failed, attempting backend fallback:', gErr);
    }

    // Fallback 1: Backend Server / AI translation
    if (!rawTranslated) {
        try {
            const targetInfo = getLanguageByCode(targetLang);
            const res = await api.translateQuestionContent({
                question: protectedText,
                targetLang,
                targetLangName: targetInfo.name
            });
            if (res.success && res.data?.question) {
                rawTranslated = res.data.question;
            }
        } catch (apiErr) {
            console.warn('[Translation] Backend AI translate failed, trying MyMemory:', apiErr);
        }
    }

    // Fallback 2: MyMemory API
    if (!rawTranslated) {
        try {
            const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
                protectedText
            )}&langpair=${sourceLang}|${encodeURIComponent(targetLang)}`;
            const res = await fetch(mUrl);
            if (res.ok) {
                const data = await res.json();
                if (data?.responseData?.translatedText) {
                    rawTranslated = data.responseData.translatedText;
                }
            }
        } catch (mErr) {
            console.warn('[Translation] MyMemory fallback failed:', mErr);
        }
    }

    // If all fail, return original
    if (!rawTranslated) {
        rawTranslated = protectedText;
    }

    const finalResult = restoreMathAndCode(rawTranslated, tokens);

    // Save to cache
    memoryCache.set(cacheKey, finalResult);
    try {
        localStorage.setItem(`q_trans_${cacheKey}`, finalResult);
    } catch {
        // storage quota
    }

    return finalResult;
}

/**
 * Translate an entire quiz Question object (question prompt, options, explanation, ordering, pairs)
 */
export async function translateQuestion(
    question: Question,
    targetLang: string
): Promise<TranslatedQuestionData> {
    const isTargetRtl = isRTL(targetLang);

    if (!targetLang || targetLang === 'original') {
        return {
            question: question.question,
            options: question.options,
            explanation: question.explanation,
            orderingItems: question.orderingItems,
            matchingPairs: question.matchingPairs,
            lang: 'original',
            isRtl: false
        };
    }

    // Translate question text
    const translatedPromptPromise = translateText(question.question, targetLang);

    // Translate options if present
    const translatedOptionsPromise = question.options
        ? Promise.all(question.options.map((opt) => translateText(opt, targetLang)))
        : Promise.resolve(undefined);

    // Translate explanation if present
    const translatedExplanationPromise = question.explanation
        ? translateText(question.explanation, targetLang)
        : Promise.resolve(undefined);

    // Translate ordering items if present
    const translatedOrderingPromise = question.orderingItems
        ? Promise.all(question.orderingItems.map((item) => translateText(item, targetLang)))
        : Promise.resolve(undefined);

    // Translate matching pairs if present
    const translatedMatchingPromise = question.matchingPairs
        ? Promise.all(
              question.matchingPairs.map(async (pair) => ({
                  left: await translateText(pair.left, targetLang),
                  right: await translateText(pair.right, targetLang)
              }))
          )
        : Promise.resolve(undefined);

    const [translatedQuestion, translatedOptions, translatedExplanation, orderingItems, matchingPairs] =
        await Promise.all([
            translatedPromptPromise,
            translatedOptionsPromise,
            translatedExplanationPromise,
            translatedOrderingPromise,
            translatedMatchingPromise
        ]);

    return {
        question: translatedQuestion,
        options: translatedOptions,
        explanation: translatedExplanation,
        orderingItems,
        matchingPairs,
        lang: targetLang,
        isRtl: isTargetRtl
    };
}
