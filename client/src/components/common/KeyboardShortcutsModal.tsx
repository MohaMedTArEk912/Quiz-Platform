import React from 'react';
import { Keyboard, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { useTheme } from '../../context/ThemeContext';

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
    const { isBento } = useTheme();

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keyboard Shortcuts & Accessibility"
            description="Speed up your quiz taking experience with keyboard hotkeys"
            maxWidth="max-w-xl"
            icon={<Keyboard className={`w-6 h-6 ${isBento ? 'text-black' : 'text-indigo-500'}`} />}
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        isBento
                            ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-95 shadow-md shadow-indigo-500/25'
                    }`}
                >
                    Got It, Continue Quiz
                </button>
            }
        >
            <div className="space-y-5">
                {SHORTCUT_GROUPS.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-2.5">
                        <h4 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isBento ? 'text-black' : 'text-indigo-600 dark:text-indigo-400'
                        }`}>
                            <Sparkles className={`w-3.5 h-3.5 ${isBento ? 'text-black' : 'text-indigo-500'}`} />
                            {group.title}
                        </h4>
                        <div className={`space-y-1.5 p-3 rounded-2xl ${
                            isBento
                                ? 'bg-[#f5f3ec] border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-50 dark:bg-black/20 border border-gray-200/60 dark:border-white/5'
                        }`}>
                            {group.shortcuts.map((item, sIdx) => (
                                <div
                                    key={sIdx}
                                    className={`flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded-xl transition-colors ${
                                        isBento
                                            ? 'hover:bg-white/80 text-black'
                                            : 'hover:bg-white/60 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className={isBento ? 'font-bold text-black' : 'text-gray-700 dark:text-gray-300 font-medium'}>
                                        {item.description}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {item.keys.map((k, kIdx) => (
                                            <kbd
                                                key={kIdx}
                                                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black shadow-sm ${
                                                    isBento
                                                        ? 'bg-[#fde047] border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000]'
                                                        : 'bg-white dark:bg-[#1a1b26] border border-gray-300 dark:border-white/15 text-gray-900 dark:text-white'
                                                }`}
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
