/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
    Shield,
    Sword,
    Crown,
    Flame,
    Zap,
    Skull,
    Trophy,
    Target,
    Ghost,
    Rocket,
    Diamond,
    Terminal,
    Crosshair,
    Compass,
    Heart,
    Flag,
    Sparkles,
    Eye,
    Cpu,
    Atom,
    Bug,
    Gamepad2,
    BookOpen,
    Feather
, type LucideIcon } from 'lucide-react';
import type { ClanLogo } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export const CLAN_EMBLEM_ICONS: Record<string, LucideIcon> = {
    Shield,
    Sword,
    Crown,
    Flame,
    Zap,
    Skull,
    Trophy,
    Target,
    Ghost,
    Rocket,
    Diamond,
    Terminal,
    Crosshair,
    Compass,
    Heart,
    Flag,
    Sparkles,
    Eye,
    Cpu,
    Atom,
    Bug,
    Gamepad2,
    BookOpen,
    Feather
};

export const CLAN_EMBLEM_PRESETS = [
    {
        name: 'Night Owls',
        logo: { shape: 'rounded', icon: 'Feather', bgColor: '#18181b', iconColor: '#bef264', showTag: true }
    },
    {
        name: 'Apex Predators',
        logo: { shape: 'shield', icon: 'Skull', bgColor: '#ef4444', iconColor: '#ffffff', showTag: true }
    },
    {
        name: 'Cyber Knights',
        logo: { shape: 'hexagon', icon: 'Sword', bgColor: '#06b6d4', iconColor: '#ffffff', showTag: true }
    },
    {
        name: 'Royal Vanguard',
        logo: { shape: 'shield', icon: 'Crown', bgColor: '#fde047', iconColor: '#000000', showTag: true }
    },
    {
        name: 'Code Sorcerers',
        logo: { shape: 'rounded', icon: 'Terminal', bgColor: '#8b5cf6', iconColor: '#bef264', showTag: true }
    },
    {
        name: 'Solar Phoenix',
        logo: { shape: 'circle', icon: 'Flame', bgColor: '#f97316', iconColor: '#ffffff', showTag: true }
    },
    {
        name: 'Lightning Strike',
        logo: { shape: 'diamond', icon: 'Zap', bgColor: '#facc15', iconColor: '#000000', showTag: true }
    },
    {
        name: 'Diamond Syndicate',
        logo: { shape: 'diamond', icon: 'Diamond', bgColor: '#bae6fd', iconColor: '#0369a1', showTag: true }
    },
    {
        name: 'Pixel Raiders',
        logo: { shape: 'rounded', icon: 'Gamepad2', bgColor: '#bef264', iconColor: '#000000', showTag: true }
    },
    {
        name: 'Shadow Ghosts',
        logo: { shape: 'circle', icon: 'Ghost', bgColor: '#3b82f6', iconColor: '#ffffff', showTag: true }
    },
    {
        name: 'Cosmic Pioneers',
        logo: { shape: 'hexagon', icon: 'Rocket', bgColor: '#a855f7', iconColor: '#ffffff', showTag: true }
    },
    {
        name: 'Trophy Hunters',
        logo: { shape: 'shield', icon: 'Trophy', bgColor: '#eab308', iconColor: '#000000', showTag: true }
    }
];

interface ClanEmblemProps {
    logo?: ClanLogo | null;
    tag?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    onClick?: () => void;
    interactive?: boolean;
}

const SIZE_MAP = {
    xs: {
        container: 'w-7 h-7 text-[8px]',
        icon: 'w-3.5 h-3.5',
        tag: 'hidden'
    },
    sm: {
        container: 'w-9 h-9 text-[9px]',
        icon: 'w-4 h-4',
        tag: 'hidden'
    },
    md: {
        container: 'w-12 h-12 text-[10px]',
        icon: 'w-6 h-6',
        tag: 'text-[7px] px-1 -bottom-1'
    },
    lg: {
        container: 'w-16 h-16 text-xs',
        icon: 'w-8 h-8',
        tag: 'text-[8px] px-1.5 -bottom-1.5'
    },
    xl: {
        container: 'w-20 h-20 sm:w-24 sm:h-24 text-sm',
        icon: 'w-10 h-10 sm:w-12 sm:h-12',
        tag: 'text-[9px] sm:text-[10px] px-2 -bottom-2'
    },
    '2xl': {
        container: 'w-28 h-28 sm:w-32 sm:h-32 text-base',
        icon: 'w-14 h-14 sm:w-16 sm:h-16',
        tag: 'text-[11px] px-2.5 -bottom-2.5'
    }
};

export const ClanEmblem: React.FC<ClanEmblemProps> = ({
    logo,
    tag,
    name,
    size = 'md',
    className = '',
    onClick,
    interactive = false
}) => {
    const { isBento } = useTheme();
    const config = SIZE_MAP[size] || SIZE_MAP.md;

    const shape = logo?.shape || 'rounded';
    const iconName = logo?.icon || 'Shield';
    const bgColor = logo?.bgColor || '#fde047';
    const iconColor = logo?.iconColor || '#000000';
    const showTag = logo?.showTag ?? true;
    const customUrl = logo?.customUrl?.trim();

    const IconComponent = CLAN_EMBLEM_ICONS[iconName] || Shield;

    // Determine shape styling
    let shapeClass = 'rounded-2xl';
    let clipStyle: React.CSSProperties = {};

    if (shape === 'circle') {
        shapeClass = 'rounded-full';
    } else if (shape === 'shield') {
        shapeClass = 'rounded-b-3xl rounded-t-lg';
    } else if (shape === 'hexagon') {
        shapeClass = 'rounded-xl';
        clipStyle = {
            clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)'
        };
    } else if (shape === 'diamond') {
        shapeClass = 'rounded-xl rotate-45';
    } else {
        shapeClass = size === 'xs' ? 'rounded-lg' : size === 'sm' ? 'rounded-xl' : 'rounded-2xl';
    }

    return (
        <div
            onClick={onClick}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            className={`relative flex items-center justify-center shrink-0 select-none ${config.container} ${
                interactive ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
            } ${className}`}
            title={name ? `[${tag || ''}] ${name}` : undefined}
        >
            {/* Background & Shape Container */}
            <div
                className={`w-full h-full flex items-center justify-center overflow-hidden transition-all relative ${shapeClass} ${
                    isBento
                        ? 'border-2 sm:border-[2.5px] border-black shadow-[2px_2px_0px_#000]'
                        : 'border border-white/20 shadow-md backdrop-blur-sm'
                }`}
                style={{
                    backgroundColor: customUrl ? '#ffffff' : (bgColor.startsWith('linear') ? undefined : bgColor),
                    backgroundImage: !customUrl && bgColor.startsWith('linear') ? bgColor : undefined,
                    ...clipStyle
                }}
            >
                {customUrl ? (
                    <img
                        src={customUrl}
                        alt={name || 'Clan logo'}
                        className={`w-full h-full object-cover ${shape === 'diamond' ? '-rotate-45 scale-125' : ''}`}
                        onError={(e) => {
                            // Fallback to default emblem on image error
                            (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                    />
                ) : (
                    <div className={`flex items-center justify-center ${shape === 'diamond' ? '-rotate-45' : ''}`}>
                        <IconComponent
                            className={`${config.icon} transition-transform drop-shadow-sm`}
                            style={{ color: iconColor }}
                        />
                    </div>
                )}
            </div>

            {/* Optional Monogram / Tag Badge stamped across bottom */}
            {showTag && tag && config.tag !== 'hidden' && (
                <div
                    className={`absolute left-1/2 -translate-x-1/2 font-black uppercase tracking-wider py-0.5 rounded-md whitespace-nowrap shadow-md z-10 ${config.tag} ${
                        isBento
                            ? 'bg-black text-[#bef264] border border-black'
                            : 'bg-black/85 text-white backdrop-blur-xs border border-white/20'
                    }`}
                >
                    {tag.substring(0, 5)}
                </div>
            )}
        </div>
    );
};

export default ClanEmblem;
