import React, { useState, useEffect } from 'react';
import type { AvatarConfig, UserData } from '../types';
import Avatar from './Avatar';
import {
    Sparkles, Smile, User, Save, RefreshCw, Shirt, Crown, Lock,
    Check, RotateCcw, X, Palette
} from 'lucide-react';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_CONFIG } from '../constants/avatarDefaults';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface AvatarEditorProps {
    user: UserData;
    onClose: () => void;
    onUpdate: (user: UserData) => void;
}

const SKIN_LABELS: Record<string, string> = {
    '#F5D0C5': 'Porcelain',
    '#E8B4A5': 'Warm Ivory',
    '#D49D8B': 'Sand',
    '#C68642': 'Honey Bronze',
    '#8D5524': 'Caramel',
    '#5A3921': 'Espresso',
    '#3C2E28': 'Deep Cocoa'
};

const MOOD_META: Record<string, { emoji: string; desc: string }> = {
    happy: { emoji: '😊', desc: 'Warm & friendly smile' },
    excited: { emoji: '🤩', desc: 'High-energy grin' },
    cool: { emoji: '😎', desc: 'Confident & relaxed' },
    neutral: { emoji: '😌', desc: 'Calm & focused' }
};

const AvatarEditor: React.FC<AvatarEditorProps> = ({ user, onClose, onUpdate }) => {
    const { isBento } = useTheme();
    const [config, setConfig] = useState<AvatarConfig>(() => ({
        ...DEFAULT_AVATAR_CONFIG,
        ...(user.avatar || {}),
        gender: user.avatar?.gender || 'male',
        clothing: user.avatar?.clothing || 'shirt',
        frame: user.avatar?.frame || 'none'
    }));

    const [activeTab, setActiveTab] = useState<'base' | 'hair' | 'clothing' | 'style' | 'mood'>('base');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user.avatar) {
            setConfig({
                ...DEFAULT_AVATAR_CONFIG,
                ...user.avatar,
                gender: user.avatar.gender || 'male',
                clothing: user.avatar.clothing || 'shirt',
                frame: user.avatar.frame || 'none'
            });
        }
    }, [user.avatar, user.unlockedItems]);

    const handleGenderChange = (newGender: 'male' | 'female') => {
        let newClothing = config.clothing;
        if (newGender === 'male' && config.clothing === 'dress') {
            newClothing = 'shirt';
        }
        setConfig({ ...config, gender: newGender, clothing: newClothing });
    };

    const handleReset = () => {
        setConfig({
            ...DEFAULT_AVATAR_CONFIG,
            ...(user.avatar || {}),
            gender: user.avatar?.gender || 'male',
            clothing: user.avatar?.clothing || 'shirt',
            frame: user.avatar?.frame || 'none'
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateUser(user.userId, { avatar: config });
            const updatedUser = { ...user, avatar: config };
            onUpdate(updatedUser);
            await new Promise(resolve => setTimeout(resolve, 400));
            onClose();
        } catch (error) {
            console.error('Failed to save avatar', error);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'base', icon: <User className="w-4 h-4 shrink-0" />, label: 'Base' },
        { id: 'hair', icon: <Sparkles className="w-4 h-4 shrink-0" />, label: 'Hair' },
        { id: 'clothing', icon: <Shirt className="w-4 h-4 shrink-0" />, label: 'Clothing' },
        { id: 'style', icon: <Crown className="w-4 h-4 shrink-0" />, label: 'Accessory' },
        { id: 'mood', icon: <Smile className="w-4 h-4 shrink-0" />, label: 'Mood' },
    ] as const;

    const PREMIUM_ITEMS: Record<string, string> = {
        sunglasses: 'cool-glasses',
        crown: 'golden-crown',
        wizard_hat: 'wizard-hat',
        pirate: 'pirate-hat',
        ninja: 'ninja-band',
        viking: 'viking-helm',
        astro: 'astro-helm',
        cat_ears: 'cat-ears',
        bowtie: 'bowtie',
        headphones: 'gaming-headset',
        earrings: 'diamond-earrings',
        necklace: 'gold-necklace',
        beret: 'artist-beret',
        'bg-galaxy': 'galaxy-theme',
        'bg-neon': 'neon-rave',
        'bg-slate-900': 'midnight-theme',
        'bg-emerald-900': 'forest-theme',
        'bg-orange-100': 'sunset-theme',
        hoodie: 'street-hoodie',
        blazer: 'formal-blazer',
        dress: 'summer-dress',
        gold: 'gold-frame',
        diamond: 'diamond-frame',
        cyberpunk: 'cyber-frame',
    };

    const isLocked = (value: string) => {
        const shopItemId = PREMIUM_ITEMS[value];
        if (!shopItemId) return false;
        return !user.unlockedItems?.includes(shopItemId);
    };

    const getAvailableClothing = () => {
        if (config.gender === 'male') {
            return AVATAR_OPTIONS.clothing.types.filter(c => c !== 'dress');
        }
        return AVATAR_OPTIONS.clothing.types;
    };

    const getAvailableHairStyles = () => {
        const common = ['short', 'messy', 'buzz', 'mohawk'];
        if (config.gender === 'male') {
            return [...common, 'fade', 'quiff', 'curly', 'spiky', 'afro'];
        }
        return [...common, 'long', 'ponytail', 'curly', 'bob', 'wavy', 'bun', 'braids', 'pixie'];
    };

    const handleRandomize = () => {
        const randomGender = Math.random() > 0.5 ? 'male' : 'female';
        const validClothing = (randomGender === 'male'
            ? AVATAR_OPTIONS.clothing.types.filter(c => c !== 'dress')
            : AVATAR_OPTIONS.clothing.types
        ).filter(c => !isLocked(c));

        const commonHair = ['short', 'messy', 'buzz', 'mohawk'];
        const validHair = randomGender === 'male'
            ? [...commonHair, 'fade', 'quiff', 'curly', 'spiky', 'afro']
            : [...commonHair, 'long', 'ponytail', 'curly', 'bob', 'wavy', 'bun', 'braids', 'pixie'];

        const unlockedAccessories = AVATAR_OPTIONS.style.accessories.filter(a => !isLocked(a));
        const unlockedBgs = AVATAR_OPTIONS.base.backgroundColor.filter(b => !isLocked(b));

        setConfig(prev => ({
            ...prev,
            skinColor: AVATAR_OPTIONS.base.skinColor[Math.floor(Math.random() * AVATAR_OPTIONS.base.skinColor.length)],
            hairStyle: validHair[Math.floor(Math.random() * validHair.length)],
            hairColor: AVATAR_OPTIONS.hair.colors[Math.floor(Math.random() * AVATAR_OPTIONS.hair.colors.length)],
            accessory: unlockedAccessories[Math.floor(Math.random() * unlockedAccessories.length)],
            backgroundColor: unlockedBgs[Math.floor(Math.random() * unlockedBgs.length)],
            mood: AVATAR_OPTIONS.mood.moods[Math.floor(Math.random() * AVATAR_OPTIONS.mood.moods.length)] as AvatarConfig['mood'],
            gender: randomGender as AvatarConfig['gender'],
            clothing: validClothing[Math.floor(Math.random() * validClothing.length)] as AvatarConfig['clothing']
        }));
    };

    const formatLabel = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row transition-all ${
                    isBento
                        ? 'bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] rounded-3xl'
                        : 'bg-white dark:bg-[#131624] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10'
                }`}
            >
                {/* LEFT COLUMN: LIVE PREVIEW STAGE */}
                <div
                    className={`md:w-[300px] lg:w-[320px] shrink-0 p-4 sm:p-6 flex flex-col items-center justify-between relative ${
                        isBento
                            ? 'bg-[#f5f3ec] border-b-[2.5px] md:border-b-0 md:border-r-[2.5px] border-black'
                            : 'bg-slate-50/90 dark:bg-black/25 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10'
                    }`}
                    style={
                        isBento
                            ? {
                                  backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)',
                                  backgroundSize: '18px 18px'
                              }
                            : undefined
                    }
                >
                    {/* Stage Header Pill */}
                    <div className="w-full flex items-center justify-center">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20'
                            }`}
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>Live Preview</span>
                        </span>
                    </div>

                    {/* Avatar Pedestal */}
                    <div className="my-2.5 sm:my-5 flex flex-col items-center">
                        <div
                            className={`p-2 rounded-full transition-transform duration-300 ${
                                isBento
                                    ? 'bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] sm:shadow-[5px_5px_0px_#000]'
                                    : 'bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-white/10'
                            }`}
                        >
                            <Avatar config={config} size="xl" className="sm:hidden" />
                            <Avatar config={config} size="2xl" className="hidden sm:block" />
                        </div>

                        {/* Equipped Summary Pills (shown on sm+) */}
                        <div className="hidden sm:flex mt-4 flex-wrap items-center justify-center gap-1.5 max-w-[240px]">
                            {[
                                formatLabel(config.gender || 'male'),
                                formatLabel(config.hairStyle || 'short'),
                                formatLabel(config.clothing || 'shirt'),
                                config.accessory && config.accessory !== 'none' ? formatLabel(config.accessory) : null
                            ]
                                .filter(Boolean)
                                .map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                                            isBento
                                                ? 'bg-white text-black border-[1.5px] border-black shadow-[1.5px_1.5px_0px_#000]'
                                                : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                                        }`}
                                    >
                                        {tag}
                                    </span>
                                ))}
                        </div>
                    </div>

                    {/* Stage Action Buttons (Randomize + Reset) */}
                    <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5">
                        <button
                            type="button"
                            onClick={handleRandomize}
                            className={`btn-unstyled h-9 sm:h-10 px-2 sm:px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            }`}
                        >
                            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                            <span>Randomize</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className={`btn-unstyled h-9 sm:h-10 px-2 sm:px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-50'
                                    : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: CONTROLS */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#131624]">
                    {/* Modal Header */}
                    <div
                        className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 ${
                            isBento
                                ? 'border-b-[2.5px] border-black bg-white'
                                : 'border-b border-slate-100 dark:border-white/10'
                        }`}
                    >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isBento
                                        ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                }`}
                            >
                                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                                    Customize Avatar
                                </h2>
                                <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                                    Personalize your identity, outfit, and unlocked accessories
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                    : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500'
                            }`}
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Segmented Pill Tabs - Horizontal scroll on mobile, Grid on sm+ */}
                    <div
                        className={`px-3 sm:px-6 py-2 sm:py-3 shrink-0 ${
                            isBento
                                ? 'bg-[#faf8f2] border-b-[2.5px] border-black'
                                : 'bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10'
                        }`}
                    >
                        <div
                            className={`flex sm:grid sm:grid-cols-5 gap-1 sm:gap-1.5 p-1 rounded-2xl overflow-x-auto scrollbar-none ${
                                isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-slate-200/70 dark:bg-black/40'
                            }`}
                        >
                            {tabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`btn-unstyled h-8 sm:h-9 px-3 sm:px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 sm:shrink ${
                                            isActive
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                                                : isBento
                                                ? 'text-slate-700 hover:bg-slate-100 border-2 border-transparent'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Options Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
                        {activeTab === 'base' && (
                            <div className="space-y-5">
                                {/* Identity */}
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                            Identity
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['male', 'female'] as const).map(g => {
                                            const selected = config.gender === g;
                                            return (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => handleGenderChange(g)}
                                                    className={`btn-unstyled h-11 px-4 rounded-xl font-black text-sm capitalize flex items-center justify-between transition-all cursor-pointer ${
                                                        selected
                                                            ? isBento
                                                                ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                                : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                            : isBento
                                                            ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                            : 'border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span>{g === 'male' ? '♂' : '♀'}</span>
                                                        <span>{g === 'male' ? 'Male' : 'Female'}</span>
                                                    </span>
                                                    {selected && (
                                                        <span
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                                                isBento
                                                                    ? 'bg-black text-white'
                                                                    : 'bg-indigo-600 text-white'
                                                            }`}
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Skin Tone */}
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                            Skin Tone
                                        </h3>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {SKIN_LABELS[config.skinColor] || 'Custom'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {AVATAR_OPTIONS.base.skinColor.map(color => {
                                            const selected = config.skinColor === color;
                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, skinColor: color })}
                                                    title={SKIN_LABELS[color] || color}
                                                    className={`btn-unstyled w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                                        selected
                                                            ? isBento
                                                                ? 'border-[3px] border-black shadow-[3px_3px_0px_#000] scale-105 ring-2 ring-[#bef264]'
                                                                : 'border-2 border-indigo-600 ring-2 ring-indigo-400 scale-105'
                                                            : isBento
                                                            ? 'border-2 border-black hover:scale-105'
                                                            : 'border-2 border-slate-300 dark:border-white/20 hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {selected && (
                                                        <span className="w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center shadow-sm pointer-events-none">
                                                            <Check className="w-3 h-3 text-black" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Background */}
                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                            Backdrop Theme
                                        </h3>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            {AVATAR_OPTIONS.base.backgroundColor.length} styles
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2.5">
                                        {AVATAR_OPTIONS.base.backgroundColor.map(bg => {
                                            const locked = isLocked(bg);
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[bg] || '');
                                            const selected = config.backgroundColor === bg;
                                            const isDarkBg =
                                                bg.includes('800') ||
                                                bg.includes('900') ||
                                                bg.includes('galaxy') ||
                                                bg.includes('neon');

                                            return (
                                                <button
                                                    key={bg}
                                                    type="button"
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, backgroundColor: bg })}
                                                    title={
                                                        locked
                                                            ? 'Locked — Purchase in Reward Shop'
                                                            : isOwned
                                                            ? 'Unlocked Shop Backdrop'
                                                            : bg.replace('bg-', '').replace('-', ' ')
                                                    }
                                                    className={`btn-unstyled h-10 w-full rounded-xl relative flex items-center justify-center transition-all ${bg} ${
                                                        selected
                                                            ? isBento
                                                                ? 'border-[2.5px] border-black shadow-[2.5px_2.5px_0px_#000] scale-105'
                                                                : 'border-2 border-indigo-600 ring-2 ring-indigo-400 scale-105'
                                                            : isBento
                                                            ? 'border-2 border-black/80 hover:scale-105'
                                                            : 'border border-slate-300 dark:border-white/20 hover:scale-105'
                                                    } ${locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    {selected && !locked && (
                                                        <Check
                                                            className={`w-4 h-4 ${
                                                                isDarkBg ? 'text-white' : 'text-slate-900'
                                                            }`}
                                                        />
                                                    )}
                                                    {locked && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[10px]">
                                                            <Lock className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}
                                                    {isOwned && !locked && (
                                                        <span
                                                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-black"
                                                            title="Shop Item Owned"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'hair' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                        Hair Style ({config.gender})
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {getAvailableHairStyles().map(style => {
                                            const selected = config.hairStyle === style;
                                            return (
                                                <button
                                                    key={style}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, hairStyle: style })}
                                                    className={`btn-unstyled h-11 px-3 rounded-xl text-xs font-black capitalize flex items-center justify-between transition-all cursor-pointer ${
                                                        selected
                                                            ? isBento
                                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                                : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                            : isBento
                                                            ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                            : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    <span>{formatLabel(style)}</span>
                                                    {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                        Hair Color
                                    </h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {AVATAR_OPTIONS.hair.colors.map(color => {
                                            const selected = config.hairColor === color;
                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setConfig({ ...config, hairColor: color })}
                                                    className={`btn-unstyled w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                                        selected
                                                            ? isBento
                                                                ? 'border-[3px] border-black shadow-[2.5px_2.5px_0px_#000] scale-110 ring-2 ring-[#bef264]'
                                                                : 'border-2 border-indigo-600 ring-2 ring-indigo-400 scale-110'
                                                            : isBento
                                                            ? 'border-2 border-black hover:scale-105'
                                                            : 'border-2 border-slate-300 dark:border-white/20 hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {selected && (
                                                        <span className="w-5 h-5 rounded-full bg-white border border-black flex items-center justify-center shadow-sm pointer-events-none">
                                                            <Check className="w-3 h-3 text-black" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'clothing' && (
                            <div>
                                <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                    Outfit Selection ({config.gender})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {getAvailableClothing().map(item => {
                                        const locked = isLocked(item);
                                        const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[item] || '');
                                        const selected = config.clothing === item;
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                disabled={locked}
                                                onClick={() =>
                                                    setConfig({ ...config, clothing: item as AvatarConfig['clothing'] })
                                                }
                                                title={locked ? 'Locked — Purchase in Reward Shop' : isOwned ? 'Owned' : ''}
                                                className={`btn-unstyled h-12 px-3.5 rounded-xl text-xs font-black capitalize flex items-center justify-between relative transition-all ${
                                                    selected
                                                        ? isBento
                                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                            : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                        : isBento
                                                        ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                        : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                                } ${locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <span>{formatLabel(item)}</span>
                                                {locked ? (
                                                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                ) : selected ? (
                                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                                ) : null}
                                                {isOwned && !locked && (
                                                    <span
                                                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-black"
                                                        title="Shop Item Owned"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                        Headwear & Accessories
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {AVATAR_OPTIONS.style.accessories.map(item => {
                                            const locked = isLocked(item);
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[item] || '');
                                            const selected = config.accessory === item;
                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, accessory: item })}
                                                    title={locked ? 'Locked — Purchase in Reward Shop' : isOwned ? 'Owned' : ''}
                                                    className={`btn-unstyled h-11 px-3 rounded-xl text-xs font-black capitalize flex items-center justify-between relative transition-all ${
                                                        selected
                                                            ? isBento
                                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                                : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                            : isBento
                                                            ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                            : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                                    } ${locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <span className="truncate">{formatLabel(item)}</span>
                                                    {locked ? (
                                                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    ) : selected ? (
                                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                                    ) : null}
                                                    {isOwned && !locked && (
                                                        <span
                                                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-black"
                                                            title="Shop Item Owned"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                        Avatar Frame
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {(['none', 'gold', 'diamond', 'cyberpunk'] as const).map(frame => {
                                            const locked = isLocked(frame);
                                            const isOwned = user.unlockedItems?.includes(PREMIUM_ITEMS[frame] || '');
                                            const selected = (config.frame || 'none') === frame;
                                            return (
                                                <button
                                                    key={frame}
                                                    type="button"
                                                    disabled={locked}
                                                    onClick={() => setConfig({ ...config, frame })}
                                                    title={locked ? 'Locked — Purchase in Reward Shop' : isOwned ? 'Owned' : ''}
                                                    className={`btn-unstyled h-11 px-3 rounded-xl text-xs font-black capitalize flex items-center justify-between relative transition-all ${
                                                        selected
                                                            ? isBento
                                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                                : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                            : isBento
                                                            ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                            : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                                    } ${locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <span>{frame === 'none' ? 'No Frame' : formatLabel(frame)}</span>
                                                    {locked ? (
                                                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    ) : selected ? (
                                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                                    ) : null}
                                                    {isOwned && !locked && (
                                                        <span
                                                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-black"
                                                            title="Shop Item Owned"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mood' && (
                            <div>
                                <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                    Facial Expression
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {AVATAR_OPTIONS.mood.moods.map(mood => {
                                        const selected = config.mood === mood;
                                        const meta = MOOD_META[mood] || { emoji: '🙂', desc: 'Classic look' };
                                        return (
                                            <button
                                                key={mood}
                                                type="button"
                                                onClick={() =>
                                                    setConfig({ ...config, mood: mood as AvatarConfig['mood'] })
                                                }
                                                className={`btn-unstyled p-4 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                                                    selected
                                                        ? isBento
                                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                            : 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                        : isBento
                                                        ? 'bg-white text-slate-800 border-2 border-black hover:bg-slate-50'
                                                        : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{meta.emoji}</span>
                                                    <div>
                                                        <div className="text-sm font-black capitalize">{mood}</div>
                                                        <div className="text-xs font-medium opacity-75">{meta.desc}</div>
                                                    </div>
                                                </div>
                                                {selected && (
                                                    <span
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                            isBento
                                                                ? 'bg-black text-white'
                                                                : 'bg-indigo-600 text-white'
                                                        }`}
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div
                        className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 ${
                            isBento
                                ? 'bg-[#faf8f2] border-t-[2.5px] border-black'
                                : 'bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className={`btn-unstyled h-10 sm:h-11 px-4 sm:px-6 rounded-xl font-black text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] hover:bg-slate-100'
                                    : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            <span>Cancel</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className={`btn-unstyled h-10 sm:h-11 px-5 sm:px-7 rounded-xl font-black text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isBento
                                    ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 shrink-0" />
                                    <span>Save Look</span>
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
