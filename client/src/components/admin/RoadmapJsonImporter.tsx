
import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Upload, FileJson, AlertCircle, Check, Code } from 'lucide-react';
import Modal from '../common/Modal';
import type { SkillTrack, SkillModule } from '../../types';

interface RoadmapJsonImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { track?: Partial<SkillTrack>, modules: SkillModule[] }) => Promise<void> | void;
}

const SAMPLE_JSON = {
    title: "Full-Stack Web Development Track",
    description: "Comprehensive pathway covering modern web engineering, algorithms, and cloud deployment",
    icon: "🚀",
    modules: [
        {
            moduleId: "mod_internet_fundamentals",
            title: "Web & Internet Fundamentals",
            description: "Understand HTTP/HTTPS, DNS, browsers, and the client-server model",
            level: 0,
            type: "core",
            status: "available",
            xpReward: 120,
            icon: "🌐",
            coordinates: { x: 100, y: 150 },
            resources: [
                {
                    id: "res_http_guide",
                    title: "MDN: How the Web Works",
                    url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works",
                    type: "article"
                },
                {
                    id: "res_dns_video",
                    title: "Crash Course: DNS Explained",
                    url: "https://www.youtube.com/watch?v=72snZ46Tx30",
                    type: "video"
                }
            ],
            subModules: [
                { id: "sub_http", title: "HTTP Methods & Status Codes", state: "available", xp: 30, quizId: "quiz_http_basics", videoUrl: "https://www.youtube.com/watch?v=iYM2zFP3Zn0" },
                { id: "sub_dns", title: "Domain Names & IP Addressing", state: "locked", xp: 30 },
                { id: "sub_client_server", title: "Client-Server Architecture", state: "locked", xp: 30 },
                { id: "sub_browser_engine", title: "Browser Rendering Pipeline", state: "locked", xp: 30 }
            ]
        },
        {
            moduleId: "mod_modern_javascript",
            title: "Modern JavaScript (ES6+)",
            description: "Deep dive into async/await, closures, prototypes, and functional array methods",
            level: 1,
            type: "core",
            status: "locked",
            xpReward: 160,
            icon: "⚡",
            coordinates: { x: 300, y: 150 },
            prerequisites: ["mod_internet_fundamentals"],
            unlockRule: {
                type: "ALL",
                nodes: ["mod_internet_fundamentals"]
            },
            quizIds: ["quiz_js_core"],
            resources: [
                {
                    id: "res_js_info",
                    title: "JavaScript.info Deep Dive",
                    url: "https://javascript.info",
                    type: "article"
                }
            ],
            subModules: [
                { id: "sub_js_vars", title: "Scope, Hoisting & Closures", state: "locked", xp: 40 },
                { id: "sub_js_async", title: "Promises & Async/Await", state: "locked", xp: 40, quizId: "quiz_js_async" },
                { id: "sub_js_arrays", title: "Higher Order Functions (map, filter, reduce)", state: "locked", xp: 40 },
                { id: "sub_js_modules", title: "ES Modules & Bundling", state: "locked", xp: 40 }
            ]
        },
        {
            moduleId: "mod_react_ecosystem",
            title: "React & Component Architecture",
            description: "Hooks, state management, memoization, and custom hooks",
            level: 2,
            type: "core",
            status: "locked",
            xpReward: 200,
            icon: "⚛️",
            coordinates: { x: 500, y: 100 },
            prerequisites: ["mod_modern_javascript"],
            unlockRule: {
                type: "ALL",
                nodes: ["mod_modern_javascript"]
            },
            quizIds: ["quiz_react_essentials"],
            subModules: [
                { id: "sub_hooks", title: "useState, useEffect, useMemo", state: "locked", xp: 50 },
                { id: "sub_custom_hooks", title: "Designing Resilient Custom Hooks", state: "locked", xp: 50 },
                { id: "sub_context", title: "Context API & State Trees", state: "locked", xp: 50 }
            ]
        },
        {
            moduleId: "mod_typescript_adv",
            title: "TypeScript Mastery",
            description: "Generics, conditional types, utility types, and strict type safety",
            level: 2,
            type: "optional",
            status: "locked",
            xpReward: 150,
            icon: "🔷",
            coordinates: { x: 500, y: 250 },
            prerequisites: ["mod_modern_javascript"],
            resources: [
                {
                    id: "res_ts_handbook",
                    title: "TypeScript Official Handbook",
                    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
                    type: "article"
                }
            ],
            subModules: [
                { id: "sub_ts_generics", title: "Type Constraints & Generics", state: "locked", xp: 50 },
                { id: "sub_ts_narrowing", title: "Discriminated Unions & Type Guards", state: "locked", xp: 50 }
            ]
        },
        {
            moduleId: "mod_capstone_project",
            title: "Interactive Web Platform Project",
            description: "Build a production-grade responsive web application with real-time state and testing",
            level: 3,
            type: "project",
            status: "locked",
            xpReward: 350,
            icon: "🛠️",
            coordinates: { x: 700, y: 150 },
            prerequisites: ["mod_react_ecosystem"],
            subModules: [
                { id: "sub_proj_setup", title: "Project Architecture & CI Setup", state: "locked", xp: 100 },
                { id: "sub_proj_impl", title: "Full Feature Implementation", state: "locked", xp: 150 },
                { id: "sub_proj_tests", title: "Unit & Integration Testing Suite", state: "locked", xp: 100 }
            ]
        },
        {
            moduleId: "mod_fullstack_exam",
            title: "Full-Stack Certification Exam",
            description: "Comprehensive proctored assessment testing full curriculum competencies",
            level: 4,
            type: "exam",
            status: "locked",
            xpReward: 500,
            icon: "🎓",
            coordinates: { x: 900, y: 150 },
            prerequisites: ["mod_capstone_project"],
            quizIds: ["exam_fullstack_cert"],
            badgeId: "badge_fullstack_architect",
            unlockRule: {
                type: "ALL",
                nodes: ["mod_capstone_project"]
            }
        },
        {
            moduleId: "mod_milestone_graduate",
            title: "Mastery Milestone Achieved!",
            description: "Congratulations! You have completed the Full-Stack Web Development roadmap.",
            level: 5,
            type: "achievement",
            status: "locked",
            xpReward: 1000,
            icon: "🏆",
            coordinates: { x: 1100, y: 150 },
            prerequisites: ["mod_fullstack_exam"],
            badgeId: "badge_fullstack_master"
        }
    ]
};

export const RoadmapJsonImporter: React.FC<RoadmapJsonImporterProps> = ({ isOpen, onClose, onImport }) => {
    const [mode, setMode] = useState<'upload' | 'editor'>('upload');
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setJsonInput('');
            setError(null);
            setSuccessMsg(null);
            setImporting(false);
            setMode('upload');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && mode === 'editor') {

            requestAnimationFrame(() => {
                textareaRef.current?.focus();
            });
        }
    }, [isOpen, mode]);

    // --- Actions ---

    const handleDownloadSample = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(SAMPLE_JSON, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "roadmap_sample.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                // Validate generic JSON parsing first
                JSON.parse(content);
                setJsonInput(content);
                setMode('editor'); // Switch to editor to show content
                setSuccessMsg(`Loaded ${file.name} successfully!`);
                setTimeout(() => setSuccessMsg(null), 3000);
            } catch {
                setError('Failed to parse JSON file. Please check the syntax.');
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const processImport = async () => {
        try {
            if (!jsonInput.trim()) {
                setError('Please provide JSON content either by uploading a file or writing code.');
                return;
            }

            const parsed = JSON.parse(jsonInput);

            // Validation
            if (!parsed.modules || !Array.isArray(parsed.modules)) {
                throw new Error('JSON structure invalid: Root must contain a "modules" array.');
            }

            if (parsed.modules.length > 0) {
                const sample = parsed.modules[0];
                if (!sample.moduleId || !sample.title) {
                    throw new Error('Invalid Module: Each module must have "moduleId" and "title".');
                }
            }

            setError(null);
            setImporting(true);

            await Promise.resolve(onImport({
                track: {
                    title: parsed.title,
                    description: parsed.description,
                    icon: parsed.icon
                },
                modules: parsed.modules
            }));

            onClose();

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid JSON format';
            setError(message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Roadmap Configuration"
            description="Create or update your learning path structure instantly"
            icon={<FileJson className="w-6 h-6 text-indigo-400" />}
            maxWidth="max-w-6xl"
            bodyClassName="flex flex-row overflow-hidden p-0 bg-[#05070a]"
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadSample}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-indigo-300 border border-white/5 transition-all hover:scale-105 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Sample JSON
                        </button>
                        <button
                            onClick={() => {
                                setJsonInput(JSON.stringify(SAMPLE_JSON, null, 2));
                                setMode('editor');
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-all"
                        >
                            <Code className="w-4 h-4" />
                            Load to Editor
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={processImport}
                            className="px-8 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={importing || (!jsonInput && mode === 'editor')}
                        >
                            {importing ? 'Importing...' : 'Import Changes'}
                        </button>
                    </div>
                </div>
            }
        >
            {/* Sidebar / Tabs */}
            <div className="w-64 bg-[#131320] border-r border-white/5 flex flex-col p-4 gap-2 h-full">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Import Source</div>

                <button
                    onClick={() => setMode('upload')}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 border ${mode === 'upload'
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 custom-shadow'
                        : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                >
                    <Upload className="w-5 h-5" />
                    <div>
                        <div className="font-bold">Upload File</div>
                        <div className="text-xs opacity-60 font-normal">From your computer</div>
                    </div>
                </button>

                <button
                    onClick={() => setMode('editor')}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 border ${mode === 'editor'
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 custom-shadow'
                        : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                >
                    <Code className="w-5 h-5" />
                    <div>
                        <div className="font-bold">Text Editor</div>
                        <div className="text-xs opacity-60 font-normal">Write or paste code</div>
                    </div>
                </button>

                <div className="mt-auto p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <h4 className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-2">
                        <AlertCircle className="w-3 h-3" /> Note
                    </h4>
                    <p className="text-[10px] text-blue-200/60 leading-relaxed">
                        Ensure your JSON follows the schema. Download the sample for a reference structure.
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#05070a] h-full overflow-hidden">

                {/* Error/Success Messages */}
                {(error || successMsg) && (
                    <div className={`absolute top-4 left-4 right-4 z-20 px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-md shadow-lg animate-in slide-in-from-top-2 border ${error ? 'bg-red-950/90 border-red-500/30 text-red-200' : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                        }`}>
                        {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Check className="w-5 h-5 shrink-0" />}
                        <div className="flex-1 text-sm font-medium">
                            {error || successMsg}
                        </div>
                        <button onClick={() => { setError(null); setSuccessMsg(null); }} className="p-1 hover:bg-white/10 rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {mode === 'upload' && (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="group w-full max-w-lg aspect-video border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <div className="w-20 h-20 bg-gray-800 group-hover:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300">
                                <Upload className="w-10 h-10 text-gray-500 group-hover:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-300 group-hover:text-white transition-colors">Click to upload JSON</h3>
                            <p className="text-gray-500 mt-2">or drag and drop file here</p>
                        </div>
                        <p className="mt-8 text-gray-600 text-sm">Supported formats: .json</p>
                    </div>
                )}

                {mode === 'editor' && (
                    <div className="h-full flex flex-col animate-in fade-in duration-300">
                        <textarea
                            ref={textareaRef}
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder='{&#10;  "title": "My Roadmap",&#10;  "modules": [...]&#10;}'
                            className="flex-1 w-full min-h-0 bg-[#0b0e17] p-6 font-mono text-sm leading-6 text-slate-100 outline-none resize-none selection:bg-indigo-500/30 placeholder:text-slate-500/50 focus:ring-2 focus:ring-inset focus:ring-indigo-500/30"
                            spellCheck={false}
                            rows={18}
                        />
                        <div className="px-6 py-2 bg-[#0B0E1A] border-t border-white/5 text-xs text-gray-600 font-mono flex justify-between">
                            <span>JSON Editor</span>
                            <span>{jsonInput.length} chars</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
