import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Terminal as TerminalIcon, RotateCcw } from 'lucide-react';
import { COMPILER_ALLOWED_LANGUAGES, COMPILER_INITIAL_CODE } from '../../constants/quizDefaults.ts';

interface CompilerQuestionProps {
    language: string;
    allowedLanguages?: string[];
    initialCode?: string;
    onChange: (code: string) => void;
    readOnly?: boolean;
    className?: string;
}

const CompilerQuestion: React.FC<CompilerQuestionProps> = ({ language: defaultLanguage, allowedLanguages = COMPILER_ALLOWED_LANGUAGES, initialCode, onChange, readOnly, className }) => {
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
        // Optional: Reset code template when changing language?
        // For now, let's keep the code buffer but maybe comment out previous code if we wanted to be fancy.
        // Or just let the user handle it.
    };

    const handleEditorChange = (value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);
        onChange(newCode);
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput([]); // Clear previous output

        // Simulate network delay for "compilation"
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            if (language === 'javascript' || language === 'typescript') {
                // Capture console.log
                const logs: string[] = [];
                const originalLog = console.log;
                console.log = (...args: unknown[]) => {
                    logs.push(args.map(a => String(a)).join(' '));
                };

                try {
                    // Safe-ish eval using Function constructor
                    const runnable = new Function(code);
                    runnable();
                    setOutput(logs.length > 0 ? logs : ['> Program finished with no output.']);
                } catch (e: unknown) {
                    const err = e instanceof Error ? e : new Error(String(e));
                    const errorMsg = `Error: ${err.message}`;
                    let suggestion = "";
                    if (err.name === 'ReferenceError') suggestion = "💡 Hint: Check if you defined all your variables.";
                    else if (err.name === 'SyntaxError') suggestion = "💡 Hint: Check for missing brackets, parentheses, or semicolons.";
                    else if (err.name === 'TypeError') suggestion = "💡 Hint: Check if you are using the correct methods for this data type.";

                    setOutput(prev => [...prev, errorMsg, ...(suggestion ? [suggestion] : [])]);
                } finally {
                    console.log = originalLog;
                }
            } else if (language === 'python') {
                // Simple Mock for Python: Check for print statements
                const lines = code.split('\n');
                const mockOutput: string[] = [];
                let hasPrint = false;
                let syntaxError = null;

                for (const line of lines) {
                    // Check for Python 2 style print
                    if (/^\s*print\s+["']/.test(line)) {
                        syntaxError = "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?";
                        break;
                    }

                    const printMatch = line.match(/^\s*print\s*\((["'])(.*?)\1\)/);
                    if (printMatch) {
                        mockOutput.push(printMatch[2]);
                        hasPrint = true;
                    }
                };

                if (syntaxError) {
                    setOutput([syntaxError, "💡 Hint: Python 3 requires parentheses for print function. ex: print('Hello')"]);
                } else if (hasPrint) {
                    setOutput(mockOutput);
                } else {
                    setOutput(['> Executing Python script...', '> Program finished with no output.']);
                }
            } else {
                // Mock execution for other languages
                setOutput(['> Compiling...', '> Executing...', `> Output for ${language} code:`, 'Hello World! (Simulated Output)']);
            }
        } catch {
            setOutput(['Error executing code.']);
        }

        setIsRunning(false);
    };

    return (
        <div className={`flex flex-col border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm ${className || 'h-[600px]'}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    {allowedLanguages.length > 1 ? (
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="text-xs font-bold uppercase text-gray-700 dark:text-gray-200 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {allowedLanguages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
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
                        className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                        title="Reset Code"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    {!readOnly && (
                        <button
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all ${isRunning
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: readOnly,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 16 }
                    }}
                />
            </div>

            {/* Terminal Output */}
            <div className="h-1/3 bg-[#1e1e1e] border-t-4 border-gray-700 flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#252526] text-gray-300 text-xs font-bold border-b border-black/50 select-none">
                    <TerminalIcon className="w-3 h-3" /> CONSOLE
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
