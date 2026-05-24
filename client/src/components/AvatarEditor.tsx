import React, { useState, useEffect } from 'react';
import type { AvatarConfig, UserData } from '../types';
import Avatar from './Avatar';
import { Sparkles, Smile, User, Save, RefreshCw, Shirt, Crown, Lock } from 'lucide-react';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_CONFIG } from '../constants/avatarDefaults';
import { api } from '../lib/api';

interface AvatarEditorProps {
    user: UserData;
    onClose: () => void;
    onUpdate: (user: UserData) => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ user, onClose, onUpdate }) => {
    const [config, setConfig] = useState<AvatarConfig>(user.avatar || DEFAULT_AVATAR_CONFIG);

    // Ensure new properties exist if user has old avatar data
    useEffect(() => {
        setConfig(prev => ({
            ...prev,
            gender: prev.gender || 'male',
            clothing: prev.clothing || 'shirt'
        }));
    }, []);

    const [activeTab, setActiveTab] = useState<'base' | 'hair' | 'clothing' | 'style' | 'mood'>('base');
    const [saving, setSaving] = useState(false);

    // Reset incompatible items when gender changes
    const handleGenderChange = (newGender: 'male' | 'female') => {
        let newClothing = config.clothing;

        // If switching to male while wearing a dress, switch to shirt
        if (newGender === 'male' && config.clothing === 'dress') {
            newClothing = 'shirt';
        }

        setConfig({ ...config, gender: newGender, clothing: newClothing });
    };

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
        { id: 'clothing', icon: <Shirt className="w-5 h-5" />, label: 'Clothing' },
        { id: 'style', icon: <Crown className="w-5 h-5" />, label: 'Accessory' },
        { id: 'mood', icon: <Smile className="w-5 h-5" />, label: 'Mood' },
    ] as const;

    // Comprehensive Premium Item Mapping: Option Value -> Shop Item ID
    // Maps avatar attribute values to their corresponding shop item IDs
    const PREMIUM_ITEMS: Record<string, string> = {
        // Accessories
        'sunglasses': 'cool-glasses',
        'crown': 'golden-crown',
        'wizard_hat': 'wizard-hat',
        'pirate': 'pirate-hat',
        'ninja': 'ninja-band',
        'viking': 'viking-helm',
        'astro': 'astro-helm',
        'cat_ears': 'cat-ears',
        'bowtie': 'bowtie',
        'headphones': 'gaming-headset',
        'earrings': 'diamond-earrings',
        'necklace': 'gold-necklace',
        'beret': 'artist-beret',
        // Backgrounds/Themes
        'bg-galaxy': 'galaxy-theme',
        'bg-neon': 'neon-rave',
        'bg-slate-900': 'midnight-theme',
        'bg-emerald-900': 'forest-theme',
        'bg-orange-100': 'sunset-theme',
        // Clothing
        'hoodie': 'street-hoodie',
        'blazer': 'formal-blazer',
        'dress': 'summer-dress',
        // Frames
        'gold': 'gold-frame',
        'diamond': 'diamond-frame',
        'cyberpunk': 'cyber-frame',
    };


    const isLocked = (value: string, attributeType?: string) => {
        // Mark attributeType as used to satisfy strict TS rules
        void attributeType;
        const shopItemId = PREMIUM_ITEMS[value];
        if (!shopItemId) return false;
        return !user.unlockedItems?.includes(shopItemId);
    };

    // Refresh config when user data updates (e.g., after purchasing items)
    useEffect(() => {
        if (user.avatar) {
            setConfig({ ...DEFAULT_AVATAR_CONFIG, ...user.avatar });
        }
    }, [user.avatar, user.unlockedItems]);

    // options definition removed, using AVATAR_OPTIONS from constants

    // Filter clothing based on gender
    const getAvailableClothing = () => {
        if (config.gender === 'male') {
            return AVATAR_OPTIONS.clothing.types.filter(c => c !== 'dress');
        }
        return AVATAR_OPTIONS.clothing.types;
    };

    // Filter hair based on gender
    const getAvailableHairStyles = () => {
        // Common styles available to both
        const common = ['short', 'messy', 'buzz', 'mohawk'];

        if (config.gender === 'male') {
            // Male specific additions
            return [...common, 'fade', 'quiff', 'curly'];
        }

        // Female specific additions
        return [...common, 'long', 'ponytail', 'curly', 'bob', 'wavy', 'bun'];
    };

    // Randomizer logic that respects gender constraints
    const handleRandomize = () => {
        const randomGender = Math.random() > 0.5 ? 'male' : 'female';

        const validClothing = randomGender === 'male'
            ? AVATAR_OPTIONS.clothing.types.filter(c => c !== 'dress')
            : AVATAR_OPTIONS.clothing.types;

        const commonHair = ['short', 'messy', 'buzz', 'mohawk'];
        const validHair = randomGender === 'male'
            ? [...commonHair, 'fade', 'quiff', 'curly']
            : [...commonHair, 'long', 'ponytail', 'curly', 'bob', 'wavy', 'bun'];

        setConfig({
            skinColor: AVATAR_OPTIONS.base.skinColor[Math.floor(Math.random() * AVATAR_OPTIONS.base.skinColor.length)],
            hairStyle: validHair[Math.floor(Math.random() * validHair.length)],
            hairColor: AVATAR_OPTIONS.hair.colors[Math.floor(Math.random() * AVATAR_OPTIONS.hair.colors.length)],
            accessory: AVATAR_OPTIONS.style.accessories[Math.floor(Math.random() * AVATAR_OPTIONS.style.accessories.length)],
            backgroundColor: AVATAR_OPTIONS.base.backgroundColor[Math.floor(Math.random() * AVATAR_OPTIONS.base.backgroundColor.length)],
            mood: AVATAR_OPTIONS.mood.moods[Math.floor(Math.random() * AVATAR_OPTIONS.mood.moods.length)] as any,
            gender: randomGender as any,
            clothing: validClothing[Math.floor(Math.random() * validClothing.length)] as any
        });
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
                            onClick={handleRandomize}
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
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Identity</h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleGenderChange('male')}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${config.gender === 'male'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'border-gray-200 dark:border-white/10 text-gray-500'
                                                }`}
                                        >
                                            Male
                                        </button>
                                        <button
                                            onClick={() => handleGenderChange('female')}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${config.gender === 'female'
                                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                                                : 'border-gray-200 dark:border-white/10 text-gray-500'
                                                }`}
                                        >
                                            Female
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Skin Tone</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {AVATAR_OPTIONS.base.skinColor.map(color => (
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
                                        {AVATAR_OPTIONS.base.backgroundColor.map(bg => {
                                            const locked = isLocked(bg, 'backgroundColor');
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[bg] || '');
                                            return (
                                                <button
                                                    key={bg}
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, backgroundColor: bg })}
                                                    className={`w-12 h-12 rounded-xl border-4 transition-transform hover:scale-110 relative ${bg} ${config.backgroundColor === bg ? 'border-indigo-500 scale-110 ring-2 ring-indigo-300' : 'border-transparent'} ${locked ? 'opacity-50 cursor-not-allowed' : ''} ${isOwned ? 'ring-1 ring-yellow-400' : ''}
                                                    `}
                                                    title={locked ? 'Locked - Purchase in Shop' : isOwned ? 'Owned' : ''}
                                                >
                                                    {locked && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                                                            <Lock className="w-4 h-4 text-white/80" />
                                                        </div>
                                                    )}
                                                    {isOwned && !locked && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-800" title="Owned" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'hair' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Hair Style ({config.gender})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {getAvailableHairStyles().map(style => (
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
                                        {AVATAR_OPTIONS.hair.colors.map(color => (
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

                        {activeTab === 'clothing' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                    Outfit {config.gender === 'male' && <span className="text-xs font-normal lowercase opacity-75">(male options)</span>}
                                    {config.gender === 'female' && <span className="text-xs font-normal lowercase opacity-75">(female options)</span>}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {getAvailableClothing().map(item => {
                                        const locked = isLocked(item, 'clothing');
                                        const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[item] || '');
                                        return (
                                            <button
                                                key={item}
                                                disabled={locked}
                                                onClick={() => setConfig({ ...config, clothing: item as any })}
                                                className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all relative ${config.clothing === item
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300'
                                                    : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                    } ${locked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5' : ''} ${isOwned ? 'ring-1 ring-yellow-400' : ''}`}
                                                title={locked ? 'Locked - Purchase in Shop' : isOwned ? 'Owned' : ''}
                                            >
                                                {item}
                                                {locked && (
                                                    <div className="absolute top-2 right-2">
                                                        <Lock className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                )}
                                                {isOwned && !locked && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-800" title="Owned" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Accessories</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {AVATAR_OPTIONS.style.accessories.map(item => {
                                            const locked = isLocked(item, 'accessory');
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[item] || '');
                                            return (
                                                <button
                                                    key={item}
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, accessory: item })}
                                                    className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all relative ${config.accessory === item
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300'
                                                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                        } ${locked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5' : ''} ${isOwned ? 'ring-1 ring-yellow-400' : ''}`}
                                                    title={locked ? 'Locked - Purchase in Shop' : isOwned ? 'Owned' : ''}
                                                >
                                                    {item.replace(/_/g, ' ')}
                                                    {locked && (
                                                        <div className="absolute top-2 right-2">
                                                            <Lock className="w-3 h-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                    {isOwned && !locked && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-800" title="Owned" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                
                                {/* Frame/Border Selection */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Frame Style</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['none', 'gold', 'diamond', 'cyberpunk'].map(frame => {
                                            const locked = isLocked(frame, 'frame');
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[frame] || '');
                                            return (
                                                <button
                                                    key={frame}
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, frame: frame as any })}
                                                    className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all relative ${(config.frame || 'none') === frame
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300'
                                                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                                                        } ${locked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5' : ''} ${isOwned ? 'ring-1 ring-yellow-400' : ''}`}
                                                    title={locked ? 'Locked - Purchase in Shop' : isOwned ? 'Owned' : ''}
                                                >
                                                    {frame === 'none' ? 'No Frame' : frame.replace(/_/g, ' ')}
                                                    {locked && (
                                                        <div className="absolute top-2 right-2">
                                                            <Lock className="w-3 h-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                    {isOwned && !locked && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-gray-800" title="Owned" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mood' && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Expression</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {AVATAR_OPTIONS.mood.moods.map(mood => (
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
