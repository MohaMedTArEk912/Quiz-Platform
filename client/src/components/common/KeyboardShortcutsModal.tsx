import React from 'react';
import { Keyboard, Sparkles } from 'lucide-react';
import Modal from './Modal';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUT_GROUPS = [
    {
        title: 'Option Selection',
        shortcuts: [
            { keys: ['1', '2', '3', '4'], description: 'Select option by number index (Option 1 to 4)' },
            { keys: ['A', 'B', 'C', 'D'], description: 'Select option by letter (Option A to D)' }
        ]
    },
    {
        title: 'Quiz Navigation & Actions',
        shortcuts: [
            { keys: ['Enter'], description: 'Submit choice in Review Mode or advance to Next Question' },
            { keys: ['→'], description: 'Skip or advance to Next Question' },
            { keys: ['←'], description: 'Return to Previous Question' }
        ]
    },
    {
        title: 'General & Accessibility',
        shortcuts: [
            { keys: ['?'], description: 'Open this Keyboard Shortcuts Guide' },
            { keys: ['Tab'], description: 'Cycle visual focus through interactive elements' },
            { keys: ['Esc'], description: 'Close active modals or menus' }
        ]
    }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keyboard Shortcuts & Accessibility"
            description="Speed up your quiz taking experience with keyboard hotkeys"
            maxWidth="max-w-xl"
            icon={<Keyboard className="w-6 h-6 text-indigo-500" />}
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md shadow-indigo-500/25"
                >
                    Got It, Continue Quiz
                </button>
            }
        >
            <div className="space-y-5">
                {SHORTCUT_GROUPS.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2.5">
                        <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            {group.title}
                        </h4>
                        <div className="space-y-1.5 bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-200/60 dark:border-white/5">
                            {group.shortcuts.map((item, sIdx) => (
                                <div
                                    key={sIdx}
                                    className="flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
                                >
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                        {item.description}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {item.keys.map((k, kIdx) => (
                                            <kbd
                                                key={kIdx}
                                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a1b26] border border-gray-300 dark:border-white/15 text-gray-900 dark:text-white font-mono text-xs font-black shadow-sm"
                                            >
                                                {k}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default KeyboardShortcutsModal;
