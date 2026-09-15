import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Terminal as TerminalIcon, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { COMPILER_ALLOWED_LANGUAGES, COMPILER_INITIAL_CODE } from '../../constants/quizDefaults.ts';

import { useTheme } from '../../context/ThemeContext';

interface CompilerQuestionProps {
    language: string;
    allowedLanguages?: string[];
    initialCode?: string;
    onChange: (code: string) => void;
    readOnly?: boolean;
    className?: string;
}

const CompilerQuestion: React.FC<CompilerQuestionProps> = ({ language: defaultLanguage, allowedLanguages = COMPILER_ALLOWED_LANGUAGES, initialCode, onChange, readOnly, className }) => {
    const { isBento } = useTheme();
    const [language, setLanguage] = useState(defaultLanguage);
    const [code, setCode] = useState(initialCode || COMPILER_INITIAL_CODE[defaultLanguage] || `// Write your ${defaultLanguage} code here\n`);

    // Sync state if prop changes (important for Admin UI switching questions)
    React.useEffect(() => {
        if (initialCode !== undefined) {
            setCode(initialCode);
        }
    }, [initialCode]);

    React.useEffect(() => {
        setLanguage(defaultLanguage);
    }, [defaultLanguage]);
    const [output, setOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
    };

    const handleEditorChange = (value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);
        onChange(newCode);
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput([]); // Clear previous output

        try {
            const result = await api.compileCode(code, language);

            if (result.output) {
                setOutput(result.output.split('\n'));
            } else {
                setOutput(['> Program finished with no output.']);
            }

            if (result.isError) {
                // Optional: Visual cue for error could be added here
            }

        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            setOutput(['Error executing code:', message, 'Make sure the backend is running and Judge0 API key is set.']);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className={`flex flex-col rounded-xl overflow-hidden shadow-sm ${className || 'h-[600px]'} ${
            isBento
                ? 'border-[2.5px] border-black bg-white shadow-[6px_6px_0px_#000]'
                : 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
        }`}>
            {/* Toolbar */}
            <div className={`flex items-center justify-between p-2.5 border-b ${
                isBento
                    ? 'bg-[#f5f3ec] border-b-[2.5px] border-black'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
                <div className="flex items-center gap-2">
                    {allowedLanguages.length > 1 ? (
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className={`text-xs font-bold uppercase px-3 py-1 rounded-md border focus:outline-none ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                    : 'text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                            }`}
                        >
                            {allowedLanguages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`text-xs uppercase px-3 py-1 rounded-md border ${
                            isBento
                                ? 'bg-[#fde047] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                        }`}>
                            {language}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const reset = initialCode || '';
                            setCode(reset);
                            onChange(reset);
                        }}
                        className={`p-2 transition-all ${
                            isBento
                                ? 'border-2 border-black bg-white rounded-lg text-black hover:bg-[#fde047] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                        title="Reset Code"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    {!readOnly && (
                        <button
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all ${
                                isRunning
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : isBento
                                        ? 'bg-[#bef264] hover:bg-[#a3e635] text-black font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]'
                                        : 'font-bold text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                        >
                            {isRunning ? (
                                <>
                                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isBento ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
                                    Running...
                                </>
                            ) : (
                                <><Play className="w-4 h-4 fill-current" /> Run Code</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 min-h-0 relative">
                <Editor
                    height="100%"
                    defaultLanguage={language === 'javascript' ? 'javascript' : 'python'}
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    onMount={(_, monaco) => {
                        // Enable semantic validation for better IntelliSense
                        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: false,
                            noSyntaxValidation: false
                        });

                        // Set strict compiler options for better suggestion accuracy
                        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                            target: monaco.languages.typescript.ScriptTarget.ES2020,
                            allowNonTsExtensions: true,
                            checkJs: true,
                            allowJs: true
                        });
                    }}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: readOnly,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 16 },
                        // IntelliSense & Autocomplete Configuration
                        quickSuggestions: { other: true, comments: true, strings: true },
                        suggestOnTriggerCharacters: true,
                        snippetSuggestions: 'inline',
                        tabCompletion: 'on',
                        wordBasedSuggestions: 'allDocuments',
                        parameterHints: { enabled: true },
                        suggest: {
                            showWords: true,
                            showSnippets: true,
                            showClasses: true,
                            showFunctions: true,
                            showVariables: true
                        }
                    }}
                />
            </div>

            {/* Terminal Output */}
            <div className={`h-1/3 flex flex-col ${
                isBento
                    ? 'bg-[#18181b] border-t-[2.5px] border-black'
                    : 'bg-[#1e1e1e] border-t-4 border-gray-700'
            }`}>
                <div className={`flex items-center gap-2 px-4 py-2 text-xs font-black select-none border-b ${
                    isBento
                        ? 'bg-black text-[#bef264] border-black tracking-wider'
                        : 'bg-[#252526] text-gray-300 font-bold border-black/50'
                }`}>
                    <TerminalIcon className="w-3.5 h-3.5" /> CONSOLE
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto text-gray-300 font-medium">
                    {output.length === 0 ? (
                        <div className="text-gray-600 italic">Run your code to see output...</div>
                    ) : (
                        output.map((line, i) => (
                            <div key={i} className="mb-0.5 whitespace-pre-wrap break-all">{line}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompilerQuestion;
