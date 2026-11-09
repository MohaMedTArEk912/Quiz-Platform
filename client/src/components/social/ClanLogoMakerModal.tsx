import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Sparkles,
    Shuffle,
    Upload,
    Link as LinkIcon,
    Check,
    Palette,
    Layers,
    Image as ImageIcon
} from 'lucide-react';
import type { ClanLogo } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ClanEmblem, CLAN_EMBLEM_ICONS, CLAN_EMBLEM_PRESETS } from './ClanEmblem';

interface ClanLogoMakerModalProps {
    isOpen: boolean;
    onClose: () => void;
    clanName: string;
    clanTag: string;
    initialLogo?: ClanLogo | null;
    onSave: (logo: ClanLogo) => Promise<void> | void;
}

const SHAPES: Array<{ id: NonNullable<ClanLogo['shape']>; label: string; iconShape: string }> = [
    { id: 'rounded', label: 'Rounded', iconShape: 'rounded-xl' },
    { id: 'shield', label: 'Shield', iconShape: 'rounded-b-2xl rounded-t-sm' },
    { id: 'circle', label: 'Circle', iconShape: 'rounded-full' },
    { id: 'hexagon', label: 'Hexagon', iconShape: 'rounded-lg' },
    { id: 'diamond', label: 'Diamond', iconShape: 'rounded-md rotate-45' }
];

const BG_COLORS = [
    { id: '#fde047', label: 'Yellow', value: '#fde047' },
    { id: '#bef264', label: 'Lime', value: '#bef264' },
    { id: '#bae6fd', label: 'Sky', value: '#bae6fd' },
    { id: '#ddd6fe', label: 'Purple', value: '#ddd6fe' },
    { id: '#fed7aa', label: 'Orange', value: '#fed7aa' },
    { id: '#fecdd3', label: 'Rose', value: '#fecdd3' },
    { id: '#a7f3d0', label: 'Emerald', value: '#a7f3d0' },
    { id: '#18181b', label: 'Obsidian', value: '#18181b' },
    { id: '#ffffff', label: 'White', value: '#ffffff' },
    { id: 'linear-gradient(135deg, #f97316, #ec4899)', label: 'Sunset', value: 'linear-gradient(135deg, #f97316, #ec4899)' },
    { id: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', label: 'Cyber', value: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' },
    { id: 'linear-gradient(135deg, #facc15, #f59e0b)', label: 'Gold', value: 'linear-gradient(135deg, #facc15, #f59e0b)' }
];

const ICON_COLORS = [
    { id: '#000000', label: 'Black', value: '#000000' },
    { id: '#ffffff', label: 'White', value: '#ffffff' },
    { id: '#bef264', label: 'Lime', value: '#bef264' },
    { id: '#fde047', label: 'Yellow', value: '#fde047' },
    { id: '#38bdf8', label: 'Sky', value: '#38bdf8' },
    { id: '#ef4444', label: 'Red', value: '#ef4444' }
];

export const ClanLogoMakerModal: React.FC<ClanLogoMakerModalProps> = ({
    isOpen,
    onClose,
    clanName,
    clanTag,
    initialLogo,
    onSave
}) => {
    const { isBento } = useTheme();

    const [activeTab, setActiveTab] = useState<'presets' | 'customizer' | 'upload'>('presets');
    const [logo, setLogo] = useState<ClanLogo>({
        shape: initialLogo?.shape || 'rounded',
        icon: initialLogo?.icon || 'Shield',
        bgColor: initialLogo?.bgColor || '#fde047',
        iconColor: initialLogo?.iconColor || '#000000',
        showTag: initialLogo?.showTag ?? true,
        customUrl: initialLogo?.customUrl || ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Synchronize initialLogo whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setLogo({
                shape: initialLogo?.shape || 'rounded',
                icon: initialLogo?.icon || 'Shield',
                bgColor: initialLogo?.bgColor || '#fde047',
                iconColor: initialLogo?.iconColor || '#000000',
                showTag: initialLogo?.showTag ?? true,
                customUrl: initialLogo?.customUrl || ''
            });
            setUploadError(null);
        }
    }, [isOpen, initialLogo]);

    // Handle Escape key and disable background scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    const availableIcons = Object.keys(CLAN_EMBLEM_ICONS);

    // Randomize emblem
    const handleRandomize = () => {
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)].id;
        const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
        const randomBg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)].value;
        const randomIconColor = ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)].value;

        setLogo({
            shape: randomShape,
            icon: randomIcon,
            bgColor: randomBg,
            iconColor: randomIconColor,
            showTag: true,
            customUrl: ''
        });
    };

    // Apply preset
    const handleApplyPreset = (presetLogo: ClanLogo) => {
        setLogo({
            ...presetLogo,
            customUrl: ''
        });
    };

    // Handle local image file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError('Please choose a valid image file (PNG, JPG, SVG, WebP).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setUploadError('Image size must be smaller than 2MB.');
            return;
        }

        setUploadError(null);
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setLogo(prev => ({
                ...prev,
                customUrl: result
            }));
        };
        reader.readAsDataURL(file);
    };

    // Handle save
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(logo);
            onClose();
        } catch (err) {
            console.error('Failed to save clan logo:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/60 overflow-y-auto animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-3xl rounded-[2.5rem] overflow-hidden transition-all my-auto ${
                    isBento
                        ? 'bg-white text-black border-3 border-black shadow-[8px_8px_0px_#000]'
                        : 'bg-white dark:bg-[#121623] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 shadow-2xl'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-5 sm:p-6 flex items-center justify-between border-b ${
                    isBento ? 'border-b-2.5 border-black bg-[#fde047]' : 'border-gray-200 dark:border-white/10 bg-gradient-to-r from-violet-600/10 to-indigo-600/10'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                            isBento ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-violet-600 text-white shadow-md'
                        }`}>
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                                Clan Emblem Studio
                            </h2>
                            <p className={`text-xs font-bold ${isBento ? 'text-black/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                Design the official identity badge for [{clanTag}] {clanName}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black hover:bg-neutral-100 shadow-[2px_2px_0px_#000]'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                        title="Close Studio"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 sm:p-7 max-h-[calc(85vh-140px)] overflow-y-auto">
                    {/* Live Preview Stage */}
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-6 flex flex-col md:flex-row items-center justify-between gap-6 ${
                        isBento
                            ? 'bg-[#f8fafc] border-2 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-slate-50 dark:bg-black/25 border border-slate-200 dark:border-white/5'
                    }`}>
                        {/* Emblem Highlight */}
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <ClanEmblem
                                    logo={logo}
                                    tag={clanTag}
                                    name={clanName}
                                    size="2xl"
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                        isBento ? 'bg-black text-[#bef264]' : 'bg-violet-500/20 text-violet-600 dark:text-violet-300 font-extrabold'
                                    }`}>
                                        Active Emblem Preview
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight truncate">
                                    [{clanTag}] {clanName}
                                </h3>
                                <p className={`text-xs mt-0.5 font-bold ${isBento ? 'text-black/60 font-mono' : 'text-gray-500'}`}>
                                    {logo.customUrl ? 'Custom Image Logo' : `${logo.shape} Shape • ${logo.icon} Emblem`}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons on stage */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                                type="button"
                                onClick={handleRandomize}
                                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5'
                                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md'
                                }`}
                                title="Generate a random cool emblem"
                            >
                                <Shuffle className="w-4 h-4" />
                                <span>Randomize</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 p-1.5 rounded-2xl mb-6 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                        {[
                            { id: 'presets', label: 'Pre-Made Emblems', icon: Sparkles },
                            { id: 'customizer', label: 'Emblem Builder', icon: Layers },
                            { id: 'upload', label: 'Upload Image / URL', icon: Upload }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isTabActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as 'presets' | 'customizer' | 'upload')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        isTabActive
                                            ? isBento
                                                ? 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#bef264]'
                                                : 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-md'
                                            : isBento
                                                ? 'bg-transparent text-black hover:bg-white/60'
                                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TAB 1: PRESETS */}
                    {activeTab === 'presets' && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Instant Hall-of-Fame Presets ({CLAN_EMBLEM_PRESETS.length})
                                </h4>
                                <span className="text-[11px] font-bold text-gray-400">Click to preview</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {CLAN_EMBLEM_PRESETS.map((preset) => {
                                    const isCurrentPreset =
                                        logo.icon === preset.logo.icon &&
                                        logo.shape === preset.logo.shape &&
                                        logo.bgColor === preset.logo.bgColor &&
                                        !logo.customUrl;

                                    return (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handleApplyPreset(preset.logo as ClanLogo)}
                                            className={`p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                                                isCurrentPreset
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                                                        : 'bg-violet-600/10 border-2 border-violet-500 text-violet-900 dark:text-violet-200'
                                                    : isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-50'
                                                        : 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:border-violet-400'
                                            }`}
                                        >
                                            <ClanEmblem
                                                logo={preset.logo as ClanLogo}
                                                tag={clanTag}
                                                size="sm"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-black truncate">{preset.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold capitalize">
                                                    {preset.logo.shape}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CUSTOMIZER */}
                    {activeTab === 'customizer' && (
                        <div className="space-y-6">
                            {/* Shape Picker */}
                            <div>
                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                    1. Crest Silhouette &amp; Shape
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {SHAPES.map(s => {
                                        const isShapeActive = logo.shape === s.id && !logo.customUrl;
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setLogo(prev => ({ ...prev, shape: s.id, customUrl: '' }))}
                                                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                    isShapeActive
                                                        ? isBento
                                                            ? 'bg-black text-[#bef264] border-2 border-black shadow-[2px_2px_0px_#bef264]'
                                                            : 'bg-violet-600 text-white shadow-md'
                                                        : isBento
                                                            ? 'bg-white text-black border border-black hover:bg-neutral-100'
                                                            : 'bg-slate-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-slate-200'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 border-2 border-current ${s.iconShape}`} />
                                                <span className="text-[11px] font-black">{s.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Emblem Symbol Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`block text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                        2. Emblem Icon Symbol ({availableIcons.length})
                                    </label>
                                    <span className="text-[11px] font-bold text-gray-400">Selected: {logo.icon}</span>
                                </div>
                                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto p-1 border rounded-2xl border-slate-200 dark:border-white/10">
                                    {availableIcons.map(iconKey => {
                                        const IconComp = CLAN_EMBLEM_ICONS[iconKey];
                                        const isIconActive = logo.icon === iconKey && !logo.customUrl;
                                        return (
                                            <button
                                                key={iconKey}
                                                type="button"
                                                onClick={() => setLogo(prev => ({ ...prev, icon: iconKey, customUrl: '' }))}
                                                className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                                    isIconActive
                                                        ? isBento
                                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] scale-110'
                                                            : 'bg-violet-600 text-white shadow-md scale-110'
                                                        : isBento
                                                            ? 'bg-white hover:bg-yellow-50 text-black border border-black/40'
                                                            : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                                }`}
                                                title={iconKey}
                                            >
                                                <IconComp className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Colors: Background & Icon */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Background Colors */}
                                <div>
                                    <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                        3. Crest Color / Gradient
                                    </label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {BG_COLORS.map(c => {
                                            const isBgActive = logo.bgColor === c.value && !logo.customUrl;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setLogo(prev => ({ ...prev, bgColor: c.value, customUrl: '' }))}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer relative ${
                                                        isBgActive ? 'ring-2 ring-black dark:ring-white scale-110 shadow-md' : 'border border-black/20 hover:scale-105'
                                                    }`}
                                                    style={{
                                                        backgroundColor: c.value.startsWith('linear') ? undefined : c.value,
                                                        backgroundImage: c.value.startsWith('linear') ? c.value : undefined
                                                    }}
                                                    title={c.label}
                                                >
                                                    {isBgActive && <Check className="w-4 h-4 stroke-[3] text-black drop-shadow-sm" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Icon Color */}
                                <div>
                                    <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                        4. Symbol Tint
                                    </label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {ICON_COLORS.map(c => {
                                            const isIconColorActive = logo.iconColor === c.value && !logo.customUrl;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setLogo(prev => ({ ...prev, iconColor: c.value, customUrl: '' }))}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer relative ${
                                                        isIconColorActive ? 'ring-2 ring-black dark:ring-white scale-110 shadow-md' : 'border border-black/20 hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: c.value }}
                                                    title={c.label}
                                                >
                                                    {isIconColorActive && (
                                                        <Check className={`w-4 h-4 stroke-[3] ${c.value === '#ffffff' ? 'text-black' : 'text-white'}`} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Tag Banner Toggle */}
                            <div className={`p-4 rounded-2xl flex items-center justify-between ${
                                isBento ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                            }`}>
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider">Stamp Clan Tag</div>
                                    <div className="text-[11px] text-gray-500 font-medium">Display "[{clanTag}]" badge across the bottom of the emblem</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={logo.showTag}
                                    onChange={(e) => setLogo(prev => ({ ...prev, showTag: e.target.checked }))}
                                    className="w-5 h-5 rounded cursor-pointer accent-[#bef264]"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: CUSTOM UPLOAD */}
                    {activeTab === 'upload' && (
                        <div className="space-y-5">
                            {/* Local File Upload Box */}
                            <div>
                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                    Upload Custom Clan Picture (PNG, JPG, SVG, WebP)
                                </label>
                                <label className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                    isBento
                                        ? 'border-black bg-yellow-50 hover:bg-yellow-100'
                                        : 'border-slate-300 dark:border-white/20 bg-slate-50/50 dark:bg-white/[0.02] hover:border-violet-500 hover:bg-violet-500/5'
                                }`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                                        isBento ? 'bg-white text-black border-2 border-black' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                    }`}>
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-black mb-1">Click to browse or drag image here</span>
                                    <span className="text-xs text-gray-400 font-medium">Max file size: 2MB. Square 1:1 ratio recommended.</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                                {uploadError && (
                                    <p className="text-xs text-rose-500 font-bold mt-1.5">{uploadError}</p>
                                )}
                            </div>

                            {/* Direct URL input */}
                            <div>
                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                    Or Paste Image URL
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="url"
                                            value={logo.customUrl || ''}
                                            onChange={(e) => setLogo(prev => ({ ...prev, customUrl: e.target.value }))}
                                            placeholder="https://example.com/clan-emblem.png"
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl font-mono text-xs focus:outline-none transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                    : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-gray-900 dark:text-white'
                                            }`}
                                        />
                                    </div>
                                    {logo.customUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setLogo(prev => ({ ...prev, customUrl: '' }))}
                                            className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className={`p-5 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isBento ? 'border-t-2.5 border-black bg-neutral-50' : 'border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0c101c]'
                }`}>
                    <p className={`text-xs font-bold ${isBento ? 'text-black/60' : 'text-gray-400'}`}>
                        Changes update across Clan Hub, Rankings, and member badges immediately.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-gray-100'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-1 sm:flex-none px-7 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30'
                            }`}
                        >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>{isSaving ? 'Applying Emblem...' : 'Save Clan Emblem'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ClanLogoMakerModal;
