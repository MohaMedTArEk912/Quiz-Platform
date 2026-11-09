import React, { useId } from 'react';
import type { AvatarConfig } from '../types';

interface AvatarProps {
    config?: AvatarConfig;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
}

// Color manipulation helpers
const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));

const adjustColor = (hex: string, amount: number) => {
    const clean = (hex || '#F5D0C5').replace('#', '');
    if (clean.length !== 6) return hex;
    const num = parseInt(clean, 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00ff) + amount);
    const b = clamp((num & 0x0000ff) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const Avatar: React.FC<AvatarProps> = ({ config, size = 'md', className = '' }) => {
    const uid = useId().replace(/:/g, '');

    const defaultConfig: AvatarConfig = {
        skinColor: '#F5D0C5',
        hairStyle: 'short',
        hairColor: '#4A3728',
        accessory: 'none',
        backgroundColor: 'bg-indigo-100',
        mood: 'happy',
        gender: 'male',
        clothing: 'shirt',
        frame: 'none'
    };

    const finalConfig = { ...defaultConfig, ...config };
    const {
        gender = 'male',
        skinColor = '#F5D0C5',
        hairColor = '#4A3728',
        hairStyle = 'short',
        clothing = 'shirt',
        mood = 'happy',
        accessory = 'none',
        frame = 'none'
    } = finalConfig;

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32',
        '2xl': 'w-44 h-44',
        '3xl': 'w-60 h-60'
    };

    const skinShadow = adjustColor(skinColor, -26);
    const skinDeepShadow = adjustColor(skinColor, -45);
    const hairShadow = adjustColor(hairColor, -28);
    const hairHighlight = adjustColor(hairColor, 38);

    const getFrameStyle = () => {
        switch (frame) {
            case 'gold':
                return 'border-4 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.55)] ring-2 ring-amber-300/60';
            case 'diamond':
                return 'border-4 border-cyan-300 shadow-[0_0_26px_rgba(103,232,249,0.65)] ring-4 ring-cyan-200/40';
            case 'cyberpunk':
                return 'border-4 border-fuchsia-500 shadow-[0_0_24px_rgba(217,70,239,0.65)] ring-2 ring-indigo-500/60';
            default:
                return 'border-2 border-slate-900/15 dark:border-white/15';
        }
    };

    const bodyGradId = `bodyGrad-${uid}`;
    const headGradId = `headGrad-${uid}`;
    const hairGradId = `hairGrad-${uid}`;
    const softShadowId = `softShadow-${uid}`;

    return (
        <div
            className={`avatar-root relative rounded-full overflow-hidden select-none shrink-0 ${sizeClasses[size]} ${finalConfig.backgroundColor} flex items-center justify-center ${getFrameStyle()} ${className}`}
        >
            <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                className="avatar-svg w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={skinColor} />
                        <stop offset="100%" stopColor={skinShadow} />
                    </linearGradient>
                    <linearGradient id={headGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={adjustColor(skinColor, 8)} />
                        <stop offset="85%" stopColor={skinColor} />
                        <stop offset="100%" stopColor={skinShadow} />
                    </linearGradient>
                    <linearGradient id={hairGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={hairHighlight} />
                        <stop offset="50%" stopColor={hairColor} />
                        <stop offset="100%" stopColor={hairShadow} />
                    </linearGradient>
                    <filter id={softShadowId} x="-15%" y="-15%" width="130%" height="130%">
                        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.16" />
                    </filter>
                </defs>

                {/* Subtle ambient halo behind character */}
                <circle cx="100" cy="105" r="72" fill="rgba(255,255,255,0.18)" stroke="none" />

                {/* 1. BACK HAIR */}
                {renderHairBack(hairStyle, hairColor, hairShadow)}

                {/* 2. NECK & SHOULDERS BASE */}
                <g filter={`url(#${softShadowId})`} stroke="none">
                    {gender === 'male' ? (
                        <path d="M40,198 C42,162 68,148 100,148 C132,148 158,162 160,198 L165,215 L35,215 Z" fill={`url(#${bodyGradId})`} />
                    ) : (
                        <path d="M48,198 C50,165 72,150 100,150 C128,150 150,165 152,198 L156,215 L44,215 Z" fill={`url(#${bodyGradId})`} />
                    )}
                    {/* Neck column */}
                    {gender === 'male' ? (
                        <rect x="81" y="122" width="38" height="36" rx="14" fill={`url(#${bodyGradId})`} />
                    ) : (
                        <rect x="85" y="124" width="30" height="34" rx="12" fill={`url(#${bodyGradId})`} />
                    )}
                    {/* Under-chin cast shadow */}
                    <path
                        d={gender === 'male' ? 'M81,130 Q100,147 119,130 L119,142 Q100,154 81,142 Z' : 'M85,131 Q100,145 115,131 L115,141 Q100,151 85,141 Z'}
                        fill={skinDeepShadow}
                        opacity="0.32"
                    />
                </g>

                {/* 3. CLOTHING */}
                {renderClothing(clothing, gender, skinColor)}

                {/* 4. EARS */}
                <g stroke="none">
                    <ellipse cx={gender === 'male' ? 53 : 56} cy="97" rx="9" ry="13" fill={skinShadow} />
                    <ellipse cx={gender === 'male' ? 54 : 57} cy="97" rx="5" ry="8" fill={skinDeepShadow} opacity="0.35" />
                    <ellipse cx={gender === 'male' ? 147 : 144} cy="97" rx="9" ry="13" fill={skinShadow} />
                    <ellipse cx={gender === 'male' ? 146 : 143} cy="97" rx="5" ry="8" fill={skinDeepShadow} opacity="0.35" />
                </g>

                {/* 5. HEAD */}
                <g filter={`url(#${softShadowId})`} stroke="none">
                    {gender === 'male' ? (
                        <path
                            d="M55,84 C55,44 74,36 100,36 C126,36 145,44 145,84 C145,118 126,142 100,142 C74,142 55,118 55,84 Z"
                            fill={`url(#${headGradId})`}
                        />
                    ) : (
                        <path
                            d="M58,84 C58,45 76,37 100,37 C124,37 142,45 142,84 C142,116 122,140 100,140 C78,140 58,116 58,84 Z"
                            fill={`url(#${headGradId})`}
                        />
                    )}
                </g>

                {/* 6. CHEEK BLUSH (Explicit stroke="none" so CSS never outlines them) */}
                <g stroke="none" opacity={gender === 'female' ? 0.38 : 0.24}>
                    <ellipse cx="70" cy="106" rx="9" ry="5.5" fill="#fb7185" />
                    <ellipse cx="130" cy="106" rx="9" ry="5.5" fill="#fb7185" />
                </g>

                {/* 7. FACIAL FEATURES */}
                {renderFace(mood, gender, hairColor, skinDeepShadow)}

                {/* 8. FRONT HAIR (Hidden or adapted when full hat covers top) */}
                {renderHairFront(hairStyle, `url(#${hairGradId})`, hairColor, hairHighlight, gender, accessory)}

                {/* 9. ACCESSORIES */}
                {renderAccessory(accessory)}
            </svg>
        </div>
    );
};

// --- RENDER HELPERS ---

const renderFace = (mood: string, gender: string, hairColor: string, noseShadow: string) => {
    const eyeY = 93;
    const eyeRx = gender === 'female' ? 5.8 : 5;
    const eyeRy = gender === 'female' ? 6.6 : 5.6;
    const browColor = adjustColor(hairColor, -20);

    return (
        <g>
            {/* Sclera / Eye base */}
            <g stroke="none">
                <ellipse cx="77" cy={eyeY} rx={eyeRx + 1.5} ry={eyeRy + 1} fill="#ffffff" opacity="0.92" />
                <ellipse cx="123" cy={eyeY} rx={eyeRx + 1.5} ry={eyeRy + 1} fill="#ffffff" opacity="0.92" />
                {/* Iris & Pupil */}
                <ellipse cx="77" cy={eyeY} rx={eyeRx} ry={eyeRy} fill="#1e293b" />
                <ellipse cx="123" cy={eyeY} rx={eyeRx} ry={eyeRy} fill="#1e293b" />
                {/* Primary & secondary catchlights */}
                <circle cx="79" cy={eyeY - 2.2} r="2.1" fill="#ffffff" />
                <circle cx="125" cy={eyeY - 2.2} r="2.1" fill="#ffffff" />
                <circle cx="75.2" cy={eyeY + 2} r="1" fill="#ffffff" opacity="0.7" />
                <circle cx="121.2" cy={eyeY + 2} r="1" fill="#ffffff" opacity="0.7" />
            </g>

            {/* Upper eyelid line & lashes */}
            <g fill="none" stroke="#0f172a" strokeWidth={gender === 'female' ? 2.2 : 1.8} strokeLinecap="round">
                <path d="M70,90 Q77,85 84,90" />
                <path d="M116,90 Q123,85 130,90" />
                {gender === 'female' && (
                    <>
                        <path d="M70,90 L66,86" strokeWidth="1.8" />
                        <path d="M130,90 L134,86" strokeWidth="1.8" />
                    </>
                )}
            </g>

            {/* Eyebrows */}
            <g stroke={browColor} strokeWidth={gender === 'female' ? 2.6 : 3.4} strokeLinecap="round" fill="none">
                {mood === 'excited' ? (
                    <>
                        <path d="M67,79 Q77,73 86,79" />
                        <path d="M114,79 Q123,73 133,79" />
                    </>
                ) : mood === 'cool' ? (
                    <>
                        <path d="M67,82 Q77,79 86,82" />
                        <path d="M114,79 Q123,74 133,80" />
                    </>
                ) : (
                    <>
                        <path d="M67,82 Q77,77 86,81" />
                        <path d="M114,81 Q123,77 133,82" />
                    </>
                )}
            </g>

            {/* Nose */}
            <path
                d="M99,96 L97,106 Q100,109 103,106"
                fill="none"
                stroke={noseShadow}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.55"
            />

            {/* Mouth */}
            <g transform="translate(0, 3)">
                {renderMouth(mood)}
            </g>
        </g>
    );
};

const renderMouth = (mood: string) => {
    switch (mood) {
        case 'happy':
            return (
                <g>
                    <path
                        d="M86,115 Q100,127 114,115"
                        fill="none"
                        stroke="#7c2d12"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </g>
            );
        case 'excited':
            return (
                <g stroke="none">
                    <path d="M85,113 Q100,116 115,113 C115,127 85,127 85,113 Z" fill="#7f1d1d" />
                    <path d="M88,114 Q100,116 112,114 L111,118 L89,118 Z" fill="#ffffff" />
                    <ellipse cx="100" cy="122" rx="7" ry="3.5" fill="#fb7185" />
                </g>
            );
        case 'cool':
            return (
                <path
                    d="M89,117 Q102,120 113,113"
                    fill="none"
                    stroke="#7c2d12"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />
            );
        case 'neutral':
        default:
            return (
                <path
                    d="M91,117 Q100,119 109,117"
                    fill="none"
                    stroke="#7c2d12"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />
            );
    }
};

const renderClothing = (type: string, gender: string, skinColor: string) => {
    const isMale = gender === 'male';
    const leftX = isMale ? 36 : 44;
    const rightX = isMale ? 164 : 156;
    const shoulderY = 152;

    const torsoShape = (fill: string) => (
        <path
            d={`M${leftX},210 C${leftX + 4},168 68,${shoulderY} 100,${shoulderY} C132,${shoulderY} ${rightX - 4},168 ${rightX},210 Z`}
            fill={fill}
            stroke="none"
        />
    );

    switch (type) {
        case 'hoodie':
            return (
                <g stroke="none">
                    {torsoShape('#4f46e5')}
                    {/* Hood rim around neck */}
                    <path d="M68,154 Q100,174 132,154 Q124,144 100,146 Q76,144 68,154 Z" fill="#4338ca" />
                    <path d="M78,150 Q100,166 122,150 Z" fill={skinColor} />
                    {/* Drawstrings */}
                    <line x1="91" y1="162" x2="91" y2="192" stroke="#e0e7ff" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="109" y1="162" x2="109" y2="192" stroke="#e0e7ff" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="91" cy="193" r="2.2" fill="#e0e7ff" />
                    <circle cx="109" cy="193" r="2.2" fill="#e0e7ff" />
                </g>
            );
        case 'jacket':
            return (
                <g stroke="none">
                    {torsoShape('#1e293b')}
                    {/* Inner tee */}
                    <path d="M80,152 L100,195 L120,152 Z" fill="#f8fafc" />
                    {/* Lapels */}
                    <path d="M74,152 L96,195 L82,195 L66,160 Z" fill="#0f172a" />
                    <path d="M126,152 L104,195 L118,195 L134,160 Z" fill="#0f172a" />
                    <line x1="100" y1="185" x2="100" y2="210" stroke="#94a3b8" strokeWidth="2" />
                </g>
            );
        case 'sweater':
            return (
                <g stroke="none">
                    {torsoShape('#7c3aed')}
                    <path d="M76,152 Q100,172 124,152 Z" fill={skinColor} />
                    <path d="M75,153 Q100,174 125,153" fill="none" stroke="#5b21b6" strokeWidth="4" strokeLinecap="round" />
                </g>
            );
        case 'tank':
            return (
                <g stroke="none">
                    <path d="M66,154 L78,152 L82,210 L58,210 Z" fill="#f59e0b" />
                    <path d="M134,154 L122,152 L118,210 L142,210 Z" fill="#f59e0b" />
                    <path d="M68,168 Q100,182 132,168 L138,210 L62,210 Z" fill="#f59e0b" />
                </g>
            );
        case 'tshirt':
            return (
                <g stroke="none">
                    {torsoShape('#10b981')}
                    <path d="M78,151 Q100,170 122,151 Z" fill={skinColor} />
                    <path d="M77,152 Q100,171 123,152" fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
                </g>
            );
        case 'blazer':
            return (
                <g stroke="none">
                    {torsoShape('#0f172a')}
                    <path d="M78,152 L100,194 L122,152 Z" fill="#ffffff" />
                    {/* Tie */}
                    <path d="M97,158 L103,158 L105,188 L100,194 L95,188 Z" fill="#dc2626" />
                    {/* Lapels */}
                    <path d="M74,152 L97,192 L84,185 Z" fill="#1e293b" />
                    <path d="M126,152 L103,192 L116,185 Z" fill="#1e293b" />
                </g>
            );
        case 'dress':
            return (
                <g stroke="none">
                    <path d="M62,165 Q100,176 138,165 L152,210 L48,210 Z" fill="#ec4899" />
                    <path d="M72,168 L78,150" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
                    <path d="M128,168 L122,150" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
                </g>
            );
        case 'shirt':
        default:
            return (
                <g stroke="none">
                    {torsoShape('#3b82f6')}
                    <path d="M78,151 L100,172 L122,151 Z" fill={skinColor} />
                    {/* Crisp polo collar */}
                    <path d="M75,150 L96,172 L83,177 L69,156 Z" fill="#1d4ed8" />
                    <path d="M125,150 L104,172 L117,177 L131,156 Z" fill="#1d4ed8" />
                    <circle cx="100" cy="182" r="2.2" fill="#eff6ff" />
                    <circle cx="100" cy="195" r="2.2" fill="#eff6ff" />
                </g>
            );
    }
};

const renderHairBack = (style: string, color: string, shadowColor: string) => {
    switch (style) {
        case 'long':
        case 'wavy':
            return (
                <g stroke="none">
                    <path d="M46,84 C36,130 42,178 58,195 L142,195 C158,178 164,130 154,84 Z" fill={shadowColor} />
                </g>
            );
        case 'ponytail':
            return (
                <g stroke="none">
                    <path d="M132,74 C158,78 166,115 152,148 C142,135 138,110 130,90 Z" fill={shadowColor} />
                </g>
            );
        case 'braids':
            return (
                <g stroke="none" fill={shadowColor}>
                    <rect x="48" y="95" width="14" height="82" rx="7" />
                    <rect x="138" y="95" width="14" height="82" rx="7" />
                </g>
            );
        case 'bob':
            return (
                <path d="M48,84 C44,126 52,150 72,154 L128,154 C148,150 156,126 152,84 Z" fill={shadowColor} stroke="none" />
            );
        case 'bun':
            return (
                <g stroke="none">
                    <circle cx="100" cy="26" r="22" fill={shadowColor} />
                    <circle cx="100" cy="24" r="18" fill={color} />
                </g>
            );
        case 'afro':
            return <circle cx="100" cy="74" r="56" fill={shadowColor} stroke="none" />;
        default:
            return null;
    }
};

const renderHairFront = (
    style: string,
    gradFill: string,
    solidColor: string,
    highlightColor: string,
    gender: string,
    accessory: string
) => {
    // If wearing a full-coverage hat, keep sideburns/lower hair but avoid clipping above the hat
    const hasFullHat = ['cap', 'wizard_hat', 'pirate', 'viking', 'beret'].includes(accessory);

    if (hasFullHat && ['short', 'buzz', 'fade', 'quiff', 'mohawk', 'spiky', 'messy', 'bun'].includes(style)) {
        return (
            <path
                d="M54,84 C54,68 62,58 100,58 C138,58 146,68 146,84 L141,84 C138,70 124,65 100,65 C76,65 62,70 59,84 Z"
                fill={solidColor}
                stroke="none"
            />
        );
    }

    switch (style) {
        case 'buzz':
            return (
                <path
                    d="M55,82 C55,44 74,34 100,34 C126,34 145,44 145,82 C140,60 124,52 100,52 C76,52 60,60 55,82 Z"
                    fill={solidColor}
                    opacity="0.9"
                    stroke="none"
                />
            );
        case 'fade':
            return (
                <g stroke="none">
                    <path d="M56,78 C56,40 72,28 100,28 C128,28 144,40 144,78 C138,56 122,48 100,48 C78,48 62,56 56,78 Z" fill={gradFill} />
                </g>
            );
        case 'quiff':
            return (
                <g stroke="none">
                    <path
                        d="M54,82 C52,44 68,22 104,18 C134,15 148,38 146,82 C140,56 120,46 94,50 C72,53 60,64 54,82 Z"
                        fill={gradFill}
                    />
                    <path d="M75,32 Q102,22 124,34" fill="none" stroke={highlightColor} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
                </g>
            );
        case 'mohawk':
            return (
                <path d="M88,58 C86,28 94,12 100,10 C106,12 114,28 112,58 Q100,52 88,58 Z" fill={gradFill} stroke="none" />
            );
        case 'spiky':
            return (
                <path
                    d="M54,82 C54,56 62,42 68,26 L78,40 L88,18 L98,36 L108,16 L116,38 L128,24 L134,44 C142,54 146,68 146,82 C136,60 118,52 100,52 C82,52 64,60 54,82 Z"
                    fill={gradFill}
                    stroke="none"
                />
            );
        case 'afro':
            return (
                <g stroke="none" fill={gradFill}>
                    <circle cx="100" cy="52" r="34" />
                    <circle cx="68" cy="64" r="24" />
                    <circle cx="132" cy="64" r="24" />
                    <circle cx="82" cy="42" r="22" />
                    <circle cx="118" cy="42" r="22" />
                </g>
            );
        case 'curly':
            return (
                <g stroke="none" fill={gradFill}>
                    <circle cx="64" cy="64" r="16" />
                    <circle cx="82" cy="48" r="18" />
                    <circle cx="102" cy="44" r="19" />
                    <circle cx="122" cy="48" r="18" />
                    <circle cx="136" cy="64" r="16" />
                    <circle cx="56" cy="80" r="12" />
                    <circle cx="144" cy="80" r="12" />
                </g>
            );
        case 'long':
        case 'wavy':
        case 'bob':
            return (
                <g stroke="none">
                    <path
                        d="M50,92 C48,42 70,28 100,28 C130,28 152,42 150,92 C144,64 128,50 102,48 C76,50 56,64 50,92 Z"
                        fill={gradFill}
                    />
                </g>
            );
        case 'ponytail':
        case 'bun':
        case 'braids':
        case 'pixie':
            return (
                <path
                    d="M55,86 C54,42 74,30 100,30 C126,30 146,42 145,86 C138,60 122,48 100,48 C78,48 62,60 55,86 Z"
                    fill={gradFill}
                    stroke="none"
                />
            );
        case 'messy':
            return (
                <g stroke="none">
                    <path
                        d="M52,84 C50,42 70,24 100,24 C130,24 150,42 148,84 C140,62 128,52 114,56 L108,46 L94,56 L84,48 C68,54 58,64 52,84 Z"
                        fill={gradFill}
                    />
                </g>
            );
        case 'short':
        default:
            return (
                <g stroke="none">
                    <path
                        d={
                            gender === 'female'
                                ? 'M55,86 C55,42 74,30 100,30 C126,30 145,42 145,86 C138,60 120,48 100,48 C80,48 62,60 55,86 Z'
                                : 'M54,82 C54,42 72,28 100,28 C128,28 146,42 146,82 C138,58 122,48 100,48 C78,48 62,58 54,82 Z'
                        }
                        fill={gradFill}
                    />
                    <path d="M74,40 Q100,32 126,40" fill="none" stroke={highlightColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                </g>
            );
    }
};

const renderAccessory = (type: string) => {
    switch (type) {
        case 'glasses':
            return (
                <g fill="none" stroke="#1e293b" strokeWidth="2.8">
                    <rect x="61" y="82" width="30" height="22" rx="7" fill="rgba(255,255,255,0.22)" />
                    <rect x="109" y="82" width="30" height="22" rx="7" fill="rgba(255,255,255,0.22)" />
                    <path d="M91,92 Q100,89 109,92" />
                    <line x1="54" y1="89" x2="61" y2="90" />
                    <line x1="139" y1="90" x2="146" y2="89" />
                </g>
            );
        case 'sunglasses':
            return (
                <g stroke="none">
                    <rect x="59" y="82" width="33" height="22" rx="6" fill="#0f172a" />
                    <rect x="108" y="82" width="33" height="22" rx="6" fill="#0f172a" />
                    <rect x="90" y="87" width="20" height="4" rx="2" fill="#0f172a" />
                    <line x1="65" y1="87" x2="75" y2="98" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
                    <line x1="114" y1="87" x2="124" y2="98" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
                </g>
            );
        case 'headphones':
            return (
                <g stroke="none">
                    <path d="M48,96 C48,26 152,26 152,96" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    <rect x="38" y="78" width="16" height="34" rx="8" fill="#4f46e5" />
                    <rect x="146" y="78" width="16" height="34" rx="8" fill="#4f46e5" />
                </g>
            );
        case 'crown':
            return (
                <g transform="translate(0, -34)" stroke="none">
                    <path
                        d="M62,76 L68,46 L86,64 L100,38 L114,64 L132,46 L138,76 Z"
                        fill="#fbbf24"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />
                    <circle cx="68" cy="45" r="3.5" fill="#ef4444" />
                    <circle cx="100" cy="37" r="4" fill="#3b82f6" />
                    <circle cx="132" cy="45" r="3.5" fill="#ef4444" />
                </g>
            );
        case 'cap':
            return (
                <g stroke="none">
                    {/* Cap dome sitting cleanly on forehead */}
                    <path d="M52,66 C52,30 74,22 100,22 C126,22 148,30 148,66 Z" fill="#ef4444" />
                    {/* Top button */}
                    <ellipse cx="100" cy="21" rx="5" ry="2.5" fill="#b91c1c" />
                    {/* Curved visor */}
                    <path d="M46,65 Q100,54 154,65 Q132,76 100,74 Q68,76 46,65 Z" fill="#dc2626" />
                    <path d="M52,65 Q100,58 148,65" fill="none" stroke="#991b1b" strokeWidth="2" />
                </g>
            );
        case 'beret':
            return (
                <g stroke="none">
                    <path d="M46,64 C38,30 98,18 148,42 C156,48 152,62 142,64 Q96,56 46,64 Z" fill="#1e293b" />
                    <path d="M98,27 L104,19" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                </g>
            );
        case 'mask':
            return (
                <g stroke="none">
                    <path d="M62,102 Q100,92 138,102 L134,128 Q100,144 66,128 Z" fill="#1e293b" />
                    <path d="M62,105 L53,96" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <path d="M138,105 L147,96" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                </g>
            );
        case 'necklace':
            return (
                <g fill="none">
                    <path d="M77,150 Q100,178 123,150" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="100" cy="168" r="4" fill="#f59e0b" stroke="none" />
                </g>
            );
        case 'earrings':
            return (
                <g stroke="none" fill="#fbbf24">
                    <circle cx="52" cy="109" r="3.8" />
                    <circle cx="148" cy="109" r="3.8" />
                </g>
            );
        case 'wizard_hat':
            return (
                <g transform="translate(0, -30)" stroke="none">
                    <ellipse cx="100" cy="84" rx="62" ry="10" fill="#3b0764" />
                    <path d="M56,84 L144,84 L104,6 Z" fill="#581c87" />
                    <circle cx="98" cy="44" r="2.5" fill="#fde047" />
                    <circle cx="114" cy="66" r="2" fill="#fde047" />
                    <circle cx="84" cy="64" r="2" fill="#fde047" />
                </g>
            );
        case 'pirate':
            return (
                <g transform="translate(0, -28)" stroke="none">
                    <path d="M32,76 Q100,46 168,76 L152,48 Q100,24 48,48 Z" fill="#0f172a" />
                    <path d="M48,66 Q100,46 152,66" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                    <circle cx="100" cy="54" r="6" fill="#ffffff" />
                </g>
            );
        case 'ninja':
            return (
                <g stroke="none">
                    <rect x="53" y="54" width="94" height="16" rx="4" fill="#1e293b" />
                    <rect x="82" y="57" width="36" height="10" rx="2" fill="#cbd5e1" />
                    <circle cx="100" cy="62" r="2.5" fill="#334155" />
                </g>
            );
        case 'viking':
            return (
                <g transform="translate(0, -24)" stroke="none">
                    <path d="M54,82 C54,42 146,42 146,82 Z" fill="#64748b" />
                    <path d="M56,64 Q32,46 42,24" fill="none" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
                    <path d="M144,64 Q168,46 158,24" fill="none" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
                </g>
            );
        case 'astro':
            return (
                <g>
                    <circle cx="100" cy="92" r="58" fill="rgba(186, 230, 253, 0.22)" stroke="#38bdf8" strokeWidth="3" />
                    <path d="M72,50 Q100,38 128,50" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
                </g>
            );
        case 'cat_ears':
            return (
                <g stroke="none">
                    <path d="M56,30 L78,56 L48,60 Z" fill="#1e293b" />
                    <path d="M144,30 L152,60 L122,56 Z" fill="#1e293b" />
                    <path d="M59,37 L73,53 L53,56 Z" fill="#f472b6" />
                    <path d="M141,37 L147,56 L127,53 Z" fill="#f472b6" />
                </g>
            );
        case 'bowtie':
            return (
                <g transform="translate(0, 56)" stroke="none">
                    <path d="M100,100 L82,90 L82,110 Z" fill="#ef4444" />
                    <path d="M100,100 L118,90 L118,110 Z" fill="#ef4444" />
                    <circle cx="100" cy="100" r="4.5" fill="#b91c1c" />
                </g>
            );
        default:
            return null;
    }
};

export default Avatar;
