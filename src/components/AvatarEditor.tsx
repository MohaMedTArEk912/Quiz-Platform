import React, { useState } from 'react';
import type { AvatarConfig, UserData } from '../types';
import Avatar from './Avatar';
import { Sparkles, Palette, Smile, User, Save, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface AvatarEditorProps {
    user: UserData;
    onClose: () => void;
    onUpdate: (user: UserData) => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ user, onClose, onUpdate }) => {
    const [config, setConfig] = useState<AvatarConfig>(user.avatar || {
        skinColor: '#F5D0C5',
        hairStyle: 'short',
        hairColor: '#4A3728',
        accessory: 'none',
        backgroundColor: 'bg-indigo-100',
        mood: 'happy'
    });
    const [activeTab, setActiveTab] = useState<'base' | 'hair' | 'style' | 'mood'>('base');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Persist changes to server
            await api.updateUser(user.userId, { avatar: config });

            // Update local state
            const updatedUser = { ...user, avatar: config };
            onUpdate(updatedUser);

            // Simulate delay for feedback
            await new Promise(resolve => setTimeout(resolve, 800));
            onClose();
        } catch (error) {
            console.error('Failed to save avatar', error);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'base', icon: <User className="w-5 h-5" />, label: 'Base' },
        { id: 'hair', icon: <Sparkles className="w-5 h-5" />, label: 'Hair' },
        { id: 'style', icon: <Palette className="w-5 h-5" />, label: 'Style' },
        { id: 'mood', icon: <Smile className="w-5 h-5" />, label: 'Mood' },
    ] as const;

    const options = {
        base: {
            skinColor: ['#F5D0C5', '#E8B4A5', '#D49D8B', '#C68642', '#8D5524', '#5A3921'],
            backgroundColor: ['bg-indigo-100', 'bg-blue-100', 'bg-purple-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-pink-100', 'bg-gray-100']
        },
        hair: {
            styles: ['short', 'long', 'messy', 'buzz'],
            colors: ['#4A3728', '#2C1A0F', '#E6BE8A', '#A52A2A', '#D49D8B', '#000000', '#F59E0B', '#6366F1']
        },
        style: {
            accessories: ['none', 'glasses', 'sunglasses', 'crown']
        },
        mood: {
            moods: ['happy', 'neutral', 'cool', 'excited']
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#13141f] rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in duration-300 border border-gray-200 dark:border-white/10">

                {/* Preview Section */}
                <div className="md:w-1/3 bg-gray-50 dark:bg-black/20 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/10 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">PREVIEW</h2>

                    <div className="relative group perspective-1000">
                        <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <Avatar config={config} size="2xl" className="shadow-2xl transition-transform duration-500 group-hover:scale-105 ring-8 ring-white dark:ring-white/10" />
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() => setConfig({
                                skinColor: options.base.skinColor[Math.floor(Math.random() * options.base.skinColor.length)],
                                hairStyle: options.hair.styles[Math.floor(Math.random() * options.hair.styles.length)],
                                hairColor: options.hair.colors[Math.floor(Math.random() * options.hair.colors.length)],
                                accessory: options.style.accessories[Math.floor(Math.random() * options.style.accessories.length)],
                                backgroundColor: options.base.backgroundColor[Math.floor(Math.random() * options.base.backgroundColor.length)],
                                mood: options.mood.moods[Math.floor(Math.random() * options.mood.moods.length)] as any
                            })}
                            className="p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-indigo-500 transition-colors"
                            title="Randomize"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Customize Avatar</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 md:px-8 gap-4 overflow-x-auto scrollbar-none border-b border-gray-100 dark:border-white/5">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Options Grid */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {activeTab === 'base' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Skin Tone</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {options.base.skinColor.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setConfig({ ...config, skinColor: color })}
                                                className={`w-12 h-12 rounded-full border-4 transition-transform hover:scale-110 ${config.skinColor === color ? 'border-indigo-500 scale-110' : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Background</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {options.base.backgroundColor.map(bg => (
                                            <button
                                                key={bg}
                                                onClick={() => setConfig({ ...config, backgroundColor: bg })}
                                                className={`w-12 h-12 rounded-xl border-4 transition-transform hover:scale-110 ${bg} ${config.backgroundColor === bg ? 'border-indigo-500 scale-110' : 'border-transparent'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'hair' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Hair Style</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {options.hair.styles.map(style => (
                                            <button
                                                key={style}
                                                onClick={() => setConfig({ ...config, hairStyle: style })}
                                                className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${config.hairStyle === style
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                                    : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                    }`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Hair Color</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {options.hair.colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setConfig({ ...config, hairColor: color })}
                                                className={`w-12 h-12 rounded-full border-4 transition-transform hover:scale-110 ${config.hairColor === color ? 'border-indigo-500 scale-110' : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Accessories</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {options.style.accessories.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => setConfig({ ...config, accessory: item })}
                                            className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${config.accessory === item
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'mood' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Expression</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {options.mood.moods.map(mood => (
                                        <button
                                            key={mood}
                                            onClick={() => setConfig({ ...config, mood: mood as any })}
                                            className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${config.mood === mood
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                                                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                }`}
                                        >
                                            {mood}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 md:p-8 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-white/10 flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Look
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarEditor;
