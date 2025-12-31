import React from 'react';
import type { AvatarConfig } from '../types';

interface AvatarProps {
    config?: AvatarConfig;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ config, size = 'md', className = '' }) => {
    // Default configuration
    const defaultConfig: AvatarConfig = {
        skinColor: '#F5D0C5',
        hairStyle: 'short',
        hairColor: '#4A3728',
        accessory: 'none',
        backgroundColor: 'bg-indigo-100',
        mood: 'happy'
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Size mapping
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32',
        '2xl': 'w-48 h-48'
    };

    return (
        <div className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className} ${finalConfig.backgroundColor} flex items-center justify-center border-2 border-white dark:border-white/10 shadow-lg`}>
            <svg
                viewBox="0 20 200 200"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Background Gradient */}
                <defs>
                    <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={finalConfig.skinColor} />
                        <stop offset="100%" stopColor={adjustColor(finalConfig.skinColor, -20)} />
                    </linearGradient>
                </defs>

                {/* Body/Neck */}
                <path d="M60,150 Q100,220 140,150 L140,200 L60,200 Z" fill={adjustColor(finalConfig.skinColor, -10)} />

                {/* Stylish Shirt */}
                <path d="M50,185 Q100,215 150,185 L160,220 L40,220 Z" fill="#4F46E5" /> {/* Indigo Shirt */}
                <path d="M50,185 Q100,215 150,185" fill="none" stroke="#4338CA" strokeWidth="2" /> {/* Collar Detail */}

                {/* Head Shadow */}
                <ellipse cx="100" cy="112" rx="40" ry="20" fill="#000000" opacity="0.1" />

                {/* Head */}
                <ellipse cx="100" cy="110" rx="45" ry="55" fill="url(#skinGradient)" />

                {/* Face Shading (Cheeks) */}
                <circle cx="75" cy="120" r="8" fill="#FF8888" opacity="0.1" />
                <circle cx="125" cy="120" r="8" fill="#FF8888" opacity="0.1" />

                {/* Hair Back */}
                {renderHairBack(finalConfig.hairStyle, finalConfig.hairColor)}

                {/* Face Elements */}
                {renderFace(finalConfig.mood)}

                {/* Hair Front */}
                {renderHairFront(finalConfig.hairStyle, finalConfig.hairColor)}

                {/* Accessories */}
                {renderAccessory(finalConfig.accessory)}

            </svg>
        </div>
    );
};

// Helper to darken color for shading
const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

const renderFace = (mood: string) => (
    <g id="face">
        {/* Eyes */}
        <ellipse cx="80" cy="105" rx="4" ry="5" fill="#1F2937" />
        <ellipse cx="120" cy="105" rx="4" ry="5" fill="#1F2937" />

        {/* Eye Shine */}
        <circle cx="81.5" cy="103" r="1.5" fill="white" opacity="0.8" />
        <circle cx="121.5" cy="103" r="1.5" fill="white" opacity="0.8" />

        {/* Eyebrows */}
        {mood === 'excited' ? (
            <>
                <path d="M70,92 Q80,82 90,92" fill="none" stroke="#4A3728" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M110,92 Q120,82 130,92" fill="none" stroke="#4A3728" strokeWidth="2.5" strokeLinecap="round" />
            </>
        ) : (
            <>
                <path d="M73,94 Q83,92 93,94" fill="none" stroke="#4A3728" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M107,94 Q117,92 127,94" fill="none" stroke="#4A3728" strokeWidth="2.5" strokeLinecap="round" />
            </>
        )}

        {/* Nose */}
        <path d="M100,110 Q98,118 102,120" fill="none" stroke="#000000" strokeWidth="1.5" opacity="0.1" strokeLinecap="round" />

        {/* Mouth */}
        {mood === 'happy' && <path d="M85,135 Q100,148 115,135" fill="none" stroke="#9F6861" strokeWidth="3" strokeLinecap="round" />}
        {mood === 'excited' && <path d="M85,135 Q100,155 115,135 Z" fill="#9F6861" stroke="#9F6861" strokeWidth="1" />}
        {mood === 'cool' && <path d="M90,140 Q100,140 110,140" fill="none" stroke="#9F6861" strokeWidth="3" strokeLinecap="round" />}
        {mood === 'neutral' && <path d="M90,140 Q100,140 110,140" fill="none" stroke="#9F6861" strokeWidth="3" strokeLinecap="round" />}
    </g>
);

const renderHairBack = (style: string, color: string) => {
    if (style === 'long') {
        return <path d="M50,110 C35,160 40,195 100,195 C160,195 165,160 150,110 Z" fill={adjustColor(color, -20)} />;
    }
    return null;
};

const renderHairFront = (style: string, color: string) => {
    switch (style) {
        case 'short':
            return <path d="M55,95 C55,70 70,50 100,50 C130,50 145,70 145,95 C145,85 130,70 100,70 C70,70 55,85 55,95 Z" fill={color} />;
        case 'messy':
            return <path d="M52,95 C50,60 70,45 100,45 C130,45 150,60 148,95 C140,75 120,65 100,65 C80,65 60,75 52,95 Z" fill={color} />;
        case 'long':
            return (
                <g>
                    {/* Top part */}
                    <path d="M55,110 C55,60 145,60 145,110 C140,70 100,60 55,110 Z" fill={color} />
                    {/* Side bangs */}
                    <path d="M145,110 Q145,150 135,170 L145,110 Z" fill={color} />
                    <path d="M55,110 Q55,150 65,170 L55,110 Z" fill={color} />
                </g>
            );
        case 'buzz':
            // A semi-circle cap that follows the head shape perfectly
            return <path d="M56,105 C56,65 75,56 100,56 C125,56 144,65 144,105 L144,100 C144,70 125,60 100,60 C75,60 56,70 56,100 Z" fill={color} />;
        default:
            return null;
    }
};

const renderAccessory = (type: string) => {
    switch (type) {
        case 'glasses':
            return (
                <g>
                    <circle cx="80" cy="105" r="14" fill="white" fillOpacity="0.2" stroke="#1F2937" strokeWidth="2.5" />
                    <circle cx="120" cy="105" r="14" fill="white" fillOpacity="0.2" stroke="#1F2937" strokeWidth="2.5" />
                    <line x1="94" y1="105" x2="106" y2="105" stroke="#1F2937" strokeWidth="2.5" />
                </g>
            );
        case 'sunglasses':
            return (
                <g filter="url(#dropShadow)">
                    <defs>
                        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                        </filter>
                    </defs>
                    <path d="M65,100 Q80,118 95,100 L95,98 Q80,98 65,98 Z" fill="#111827" />
                    <path d="M105,100 Q120,118 135,100 L135,98 Q120,98 105,98 Z" fill="#111827" />
                    <path d="M65,99 L95,99 L105,99 L135,99" stroke="#111827" strokeWidth="3" fill="none" />
                </g>
            );
        case 'crown':
            return (
                <g transform="translate(0, -15)">
                    <path d="M60,80 L70,55 L85,75 L100,45 L115,75 L130,55 L140,80 L60,80 Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="70" cy="55" r="3" fill="#EF4444" />
                    <circle cx="100" cy="45" r="3" fill="#3B82F6" />
                    <circle cx="130" cy="55" r="3" fill="#EF4444" />
                </g>
            );
        default:
            return null;
    }
};

export default Avatar;
