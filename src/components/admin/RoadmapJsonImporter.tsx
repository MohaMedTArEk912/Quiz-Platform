
import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Upload, FileJson, AlertCircle, Check, Code } from 'lucide-react';
import Modal from '../common/Modal';
import type { SkillTrack, SkillModule } from '../../types';

interface RoadmapJsonImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { track?: Partial<SkillTrack>, modules: SkillModule[] }) => void;
}

const SAMPLE_JSON = {
    title: "Python Fundamentals",
    description: "Master Python programming from basics to advanced concepts",
    icon: "🐍",
    modules: [
        {
            moduleId: "mod_intro",
            title: "Introduction to Python",
            description: "Get started with Python programming",
            level: 0,
            type: "core",
            status: "available",
            xpReward: 100,
            subModules: [
                { id: "sub_1", title: "What is Python?", state: "available", xp: 20 },
                { id: "sub_2", title: "Installing Python", state: "locked", xp: 20 },
                { id: "sub_3", title: "Your First Program", state: "locked", xp: 30 },
                { id: "sub_4", title: "Python IDE Setup", state: "locked", xp: 30 }
            ]
        },
        {
            moduleId: "mod_variables",
            title: "Variables & Data Types",
            description: "Learn about variables, strings, numbers, and booleans",
            level: 1,
            type: "core",
            status: "locked",
            xpReward: 120,
            prerequisites: ["mod_intro"],
            subModules: [
                { id: "sub_5", title: "Creating Variables", state: "locked", xp: 25 },
                { id: "sub_6", title: "Strings & Text", state: "locked", xp: 25 },
                { id: "sub_7", title: "Numbers & Math", state: "locked", xp: 25 },
                { id: "sub_8", title: "Booleans", state: "locked", xp: 25 }
            ]
        },
        {
            moduleId: "mod_operators",
            title: "Operators & Expressions",
            description: "Arithmetic, comparison, and logical operators",
            level: 2,
            type: "core",
            status: "locked",
            xpReward: 100,
            prerequisites: ["mod_variables"],
            subModules: [
                { id: "sub_9", title: "Arithmetic Operators", state: "locked", xp: 30 },
                { id: "sub_10", title: "Comparison Operators", state: "locked", xp: 35 },
                { id: "sub_11", title: "Logical Operators", state: "locked", xp: 35 }
            ]
        },
        {
            moduleId: "mod_control",
            title: "Control Flow",
            description: "If statements, loops, and program flow",
            level: 3,
            type: "core",
            status: "locked",
            xpReward: 150,
            prerequisites: ["mod_operators"],
            subModules: [
                { id: "sub_12", title: "If/Else Statements", state: "locked", xp: 40 },
                { id: "sub_13", title: "For Loops", state: "locked", xp: 40 },
                { id: "sub_14", title: "While Loops", state: "locked", xp: 35 },
                { id: "sub_15", title: "Break & Continue", state: "locked", xp: 35 }
            ]
        },
        {
            moduleId: "mod_functions",
            title: "Functions",
            description: "Create reusable code with functions",
            level: 4,
            type: "core",
            status: "locked",
            xpReward: 180,
            prerequisites: ["mod_control"],
            subModules: [
                { id: "sub_16", title: "Defining Functions", state: "locked", xp: 40 },
                { id: "sub_17", title: "Parameters & Arguments", state: "locked", xp: 40 },
                { id: "sub_18", title: "Return Values", state: "locked", xp: 40 },
                { id: "sub_19", title: "Scope & Variables", state: "locked", xp: 40 }
            ]
        },
        {
            moduleId: "mod_milestone1",
            title: "Python Basics Complete!",
            description: "Congratulations on mastering Python basics",
            level: 5,
            type: "achievement",
            status: "locked",
            xpReward: 500,
            prerequisites: ["mod_functions"]
        }
    ]
};

export const RoadmapJsonImporter: React.FC<RoadmapJsonImporterProps> = ({ isOpen, onClose, onImport }) => {
    const [mode, setMode] = useState<'upload' | 'editor'>('upload');
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setJsonInput('');
            setError(null);
            setSuccessMsg(null);
            setMode('upload');
        }
    }, [isOpen]);

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
            } catch (err) {
                setError('Failed to parse JSON file. Please check the syntax.');
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const processImport = () => {
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

            onImport({
                track: {
                    title: parsed.title,
                    description: parsed.description,
                    icon: parsed.icon
                },
                modules: parsed.modules
            });

            onClose();

        } catch (err: any) {
            setError(err.message || 'Invalid JSON format');
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
                            onClick={() => { setJsonInput(JSON.stringify(SAMPLE_JSON, null, 2)); setMode('editor'); }}
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
                            disabled={!jsonInput && mode === 'editor'}
                        >
                            Import Changes
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
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder='{&#10;  "title": "My Roadmap",&#10;  "modules": [...]&#10;}'
                            className="flex-1 w-full bg-[#05070a] p-6 font-mono text-sm leading-relaxed text-gray-300 outline-none resize-none selection:bg-indigo-500/30 placeholder-gray-800"
                            spellCheck={false}
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
