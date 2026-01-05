import React from 'react';
import type { AvatarConfig } from '../types';

interface AvatarProps {
    config?: AvatarConfig;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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
        mood: 'happy',
        gender: 'male',
        clothing: 'shirt'
    };

    const finalConfig = { ...defaultConfig, ...config };
    const { gender, skinColor, hairColor, hairStyle, clothing, mood, accessory } = finalConfig;

    // Size mapping
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32',
        '2xl': 'w-48 h-48',
        '3xl': 'w-64 h-64'
    };

    // Color helpers
    const darken = (hex: string, percent: number) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    const skinShadow = darken(skinColor, 20);

    return (
        <div className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className} ${finalConfig.backgroundColor} flex items-center justify-center border-4 border-white dark:border-white/10 shadow-xl`}>
            <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={skinColor} />
                        <stop offset="100%" stopColor={skinShadow} />
                    </linearGradient>
                    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                </defs>

                {/* --- 1. BACK HAIR --- */}
                {renderHairBack(hairStyle, hairColor)}

                {/* --- 2. BODY & SHOULDERS --- */}
                <g transform="translate(0, 10)">
                    {gender === 'male' ? (
                        <path d="M70,140 Q100,145 130,140 L130,220 L70,220 Z" fill={skinColor} />
                    ) : (
                        <path d="M80,140 Q100,145 120,140 L125,220 L75,220 Z" fill={skinColor} />
                    )}
                </g>

                {/* --- 3. CLOTHING --- */}
                {renderClothing(clothing, gender, skinColor)}

                {/* --- 4. NECK --- */}
                <g transform="translate(0, 0)">
                    {gender === 'male' ? (
                        <path d="M75,120 L75,150 Q100,155 125,150 L125,120 Z" fill={skinColor} />
                    ) : (
                        <path d="M82,125 L82,150 Q100,155 118,150 L118,125 Z" fill={skinColor} />
                    )}
                    <path d={gender === 'male' ? "M75,120 Q100,140 125,120" : "M82,125 Q100,140 118,125"} fill={skinShadow} opacity="0.2" />
                </g>


                {/* --- 5. HEAD --- */}
                <g filter="url(#softShadow)">
                    {gender === 'male' ? (
                        <path d="M55,85 C55,40 145,40 145,85 C145,125 125,145 100,145 C75,145 55,125 55,85 Z" fill={skinColor} />
                    ) : (
                        <path d="M58,80 C58,35 142,35 142,80 C142,120 120,142 100,142 C80,142 58,120 58,80 Z" fill={skinColor} />
                    )}
                </g>

                {/* --- 6. FACE FEATURES --- */}
                <g opacity={gender === 'female' ? 0.4 : 0.2}>
                    <circle cx="70" cy={105} r={8} fill="#FF9999" />
                    <circle cx="130" cy={105} r={8} fill="#FF9999" />
                </g>

                {renderFace(mood, gender)}

                <path d={gender === 'female' ? "M98,105 Q100,108 102,105" : "M98,105 Q100,110 102,108"}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1.5"
                    opacity="0.15"
                    strokeLinecap="round" />

                {/* --- 7. FRONT HAIR --- */}
                {renderHairFront(hairStyle, hairColor, gender)}

                {/* --- 8. ACCESSORIES --- */}
                {renderAccessory(accessory)}

            </svg>
        </div>
    );
};

// --- RENDER HELPERS ---

const renderFace = (mood: string, gender: string) => {
    const eyeY = 95;
    const eyeRx = gender === 'female' ? 6 : 4.5;
    const eyeRy = gender === 'female' ? 7 : 5.5;

    return (
        <g>
            <g fill="#2D3748">
                <ellipse cx="75" cy={eyeY} rx={eyeRx} ry={eyeRy} />
                <ellipse cx="125" cy={eyeY} rx={eyeRx} ry={eyeRy} />
            </g>

            <g fill="white" opacity="0.8">
                <circle cx="77" cy={eyeY - 2} r="2" />
                <circle cx="127" cy={eyeY - 2} r="2" />
            </g>

            {gender === 'female' && (
                <g stroke="#2D3748" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M69,92 Q66,88 64,85" />
                    <path d="M131,92 Q134,88 136,85" />
                </g>
            )}

            <g stroke="#4A3728" strokeWidth={gender === 'female' ? 2 : 3} strokeLinecap="round" fill="none">
                {mood === 'excited' ? (
                    <>
                        <path d="M65,82 Q75,72 85,82" />
                        <path d="M115,82 Q125,72 135,82" />
                    </>
                ) : (
                    <>
                        <path d="M65,85 Q75,82 85,85" />
                        <path d="M115,85 Q125,82 135,85" />
                    </>
                )}
            </g>

            <g transform="translate(0, 5)">
                {renderMouth(mood, gender)}
            </g>
        </g>
    );
};

const renderMouth = (mood: string, gender: string) => {
    const strokeWidth = gender === 'female' ? 2 : 2.5;
    const color = "#9F6861";

    switch (mood) {
        case 'happy':
            return <path d="M85,120 Q100,132 115,120" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
        case 'excited':
            return <path d="M85,120 Q100,140 115,120 Z" fill={color} stroke={color} strokeWidth={1} />;
        case 'cool':
            return <path d="M90,125 Q100,125 110,125" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
        case 'neutral':
        default:
            return <path d="M90,122 Q100,122 110,122" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
    }
};

const renderClothing = (type: string, gender: string, skinColor: string) => {
    const shoulderY = 145;
    const shoulderWidth = gender === 'male' ? 140 : 110;
    const startX = 100 - (shoulderWidth / 2);
    const endX = 100 + (shoulderWidth / 2);

    const commonBase = (fill: string) => (
        <path d={`M${startX},${shoulderY} Q100,${shoulderY - 10} ${endX},${shoulderY} L${endX + 10},210 L${startX - 10},210 Z`} fill={fill} />
    );

    switch (type) {
        case 'hoodie':
            return (
                <g>
                    <path d={`M${startX - 5},${shoulderY - 5} Q100,${shoulderY - 20} ${endX + 5},${shoulderY - 5} L${endX + 15},210 L${startX - 15},210 Z`} fill="#6366F1" />
                    <line x1="92" y1="160" x2="92" y2="190" stroke="white" strokeWidth="2" />
                    <line x1="108" y1="160" x2="108" y2="190" stroke="white" strokeWidth="2" />
                </g>
            );
        case 'tshirt':
            return (
                <g>
                    {commonBase('#10B981')}
                    <path d={`M${startX + 10},${shoulderY} Q100,${shoulderY + 25} ${endX - 10},${shoulderY}`} fill={skinColor} />
                    <path d={`M${startX + 10},${shoulderY} Q100,${shoulderY + 25} ${endX - 10},${shoulderY}`} fill="none" stroke="#059669" strokeWidth="2" />
                </g>
            );
        case 'blazer':
            return (
                <g>
                    {commonBase('#1F2937')}
                    <path d={`M${startX + 20},${shoulderY} L100,180 L${endX - 20},${shoulderY} Z`} fill="white" />
                    <path d={`M${startX + 20},${shoulderY} L100,180 L80,180 Z`} fill="#374151" />
                    <path d={`M${endX - 20},${shoulderY} L100,180 L120,180 Z`} fill="#374151" />
                </g>
            );
        case 'dress':
            return (
                <g>
                    <path d={`M${startX},${shoulderY + 10} Q100,${shoulderY + 10} ${endX},${shoulderY + 10} L${endX + 15},210 L${startX - 15},210 Z`} fill="#EC4899" />
                    <path d={`M${startX + 10},${shoulderY + 10} L${startX + 15},${shoulderY - 20}`} stroke="#EC4899" strokeWidth="6" />
                    <path d={`M${endX - 10},${shoulderY + 10} L${endX - 15},${shoulderY - 20}`} stroke="#EC4899" strokeWidth="6" />
                </g>
            );
        case 'shirt':
        default:
            return (
                <g>
                    {commonBase('#4F46E5')}
                    <path d={`M${startX + 15},${shoulderY} L100,165 L${endX - 15},${shoulderY}`} fill="none" stroke="#312E81" strokeWidth="2" />
                    <circle cx="100" cy="180" r="2" fill="rgba(0,0,0,0.2)" />
                    <circle cx="100" cy="200" r="2" fill="rgba(0,0,0,0.2)" />
                </g>
            );
    }
};

const renderHairBack = (style: string, color: string) => {
    switch (style) {
        case 'long':
        case 'wavy':
        case 'ponytail':
            return <path d="M50,90 C30,150 40,190 100,190 C160,190 170,150 150,90" fill={color} stroke={color} strokeWidth="10" strokeLinejoin="round" />;
        case 'bob':
            return <path d="M55,90 C55,140 60,150 100,150 C140,150 145,140 145,90" fill={color} stroke={color} strokeWidth="20" strokeLinejoin="round" />;
        case 'bun':
            // Bun sits on top but we need some volume behind usually
            return <circle cx="100" cy="40" r="25" fill={color} />;
        default:
            return null;
    }
};

const renderHairFront = (style: string, color: string, gender: string) => {
    switch (style) {
        case 'buzz':
            return <path d="M55,90 C55,50 145,50 145,90 L145,80 C145,45 125,35 100,35 C75,35 55,45 55,80 Z" fill={color} opacity="0.9" />;

        case 'fade':
            // Sharp fade
            return <path d="M55,85 C55,40 145,40 145,85 L145,60 C145,30 145,30 100,30 C55,30 55,30 55,60 Z" fill={color} />;

        case 'quiff':
            // Tall on top
            return <path d="M55,85 C55,50 145,50 145,85 L145,60 Q145,20 100,15 Q55,20 55,60 Z" fill={color} />;

        case 'mohawk':
            return <path d="M90,90 L90,20 Q100,10 110,20 L110,90" fill={color} />;

        case 'long':
            if (gender === 'female') {
                return (
                    <g filter="url(#softShadow)">
                        <path d="M50,180 L50,80 C50,20 150,20 150,80 L150,180 L130,180 Q135,120 135,100 Q135,40 100,40 Q65,40 65,100 Q65,120 70,180 Z" fill={color} />
                    </g>
                );
            }
            return <path d="M55,160 L55,85 C55,30 145,30 145,85 L145,160 L130,160 C130,100 130,50 100,50 C70,50 70,100 70,160 Z" fill={color} />;

        case 'wavy':
            return (
                <g filter="url(#softShadow)">
                    <path d="M45,180 L45,80 C45,15 155,15 155,80 L155,180 L135,180 Q145,120 135,100 Q140,40 100,35 Q60,40 65,100 Q55,120 65,180 Z" fill={color} />
                </g>
            );

        case 'bob':
            return <path d="M55,140 L55,80 C55,25 145,25 145,80 L145,140 L125,140 Q130,100 130,90 Q130,45 100,45 Q70,45 70,90 Q70,100 75,140 Z" fill={color} />;

        case 'bun':
            return <path d="M55,90 C55,35 145,35 145,90 C145,80 145,60 100,60 C55,60 55,80 55,90 Z" fill={color} />;

        case 'messy':
            return <path d="M52,85 C50,40 70,25 100,25 C130,25 150,40 148,85 Q100,75 52,85 Z" fill={color} />;

        case 'short':
        default:
            if (gender === 'female') {
                return <path d="M60,90 C60,40 80,30 100,30 C120,30 140,40 140,90 C140,80 130,50 100,50 C70,50 60,80 60,90 Z" fill={color} />;
            }
            return <path d="M55,85 C55,50 70,35 100,35 C130,35 145,50 145,85 Q100,70 55,85 Z" fill={color} />;

        case 'ponytail':
            if (gender === 'female') {
                return (
                    <g>
                        <path d="M58,95 C58,35 142,35 142,95 C142,85 145,65 140,55 C120,35 80,35 60,55 C55,65 58,85 58,95 Z" fill={color} />
                    </g>
                );
            }
            return <path d="M58,90 C58,50 142,50 142,90 C135,60 100,55 58,90 Z" fill={color} />;

        case 'curly':
            return (
                <path d="M50,90 Q40,30 100,25 Q160,30 150,90 Q150,55 100,55 Q50,55 50,90" fill={color} />
            );
    }
};

const renderAccessory = (type: string) => {
    switch (type) {
        case 'glasses':
            return (
                <g fill="none" stroke="#1F2937" strokeWidth="2">
                    <circle cx="75" cy="95" r="10" fill="rgba(255,255,255,0.2)" />
                    <circle cx="125" cy="95" r="10" fill="rgba(255,255,255,0.2)" />
                    <line x1="85" y1="95" x2="115" y2="95" />
                    <line x1="65" y1="95" x2="55" y2="90" />
                    <line x1="135" y1="95" x2="145" y2="90" />
                </g>
            );
        case 'sunglasses':
            return (
                <g>
                    <path d="M60,90 Q75,105 90,90 L90,88 Q75,88 60,88 Z" fill="#111827" />
                    <path d="M110,90 Q125,105 140,90 L140,88 Q125,88 110,88 Z" fill="#111827" />
                    <line x1="90" y1="90" x2="110" y2="90" stroke="#111827" strokeWidth="2" />
                </g>
            );
        case 'headphones':
            return (
                <g>
                    <path d="M50,95 C50,30 150,30 150,95" fill="none" stroke="#1F2937" strokeWidth="8" />
                    <rect x="42" y="85" width="16" height="30" rx="4" fill="#374151" />
                    <rect x="142" y="85" width="16" height="30" rx="4" fill="#374151" />
                </g>
            );
        case 'crown':
            return (
                <g transform="translate(0, -35)">
                    <path d="M60,80 L70,55 L85,75 L100,45 L115,75 L130,55 L140,80 L60,80 Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="70" cy="55" r="3" fill="#EF4444" />
                    <circle cx="100" cy="45" r="3" fill="#3B82F6" />
                    <circle cx="130" cy="55" r="3" fill="#EF4444" />
                </g>
            );
        case 'cap':
            return (
                <g transform="translate(0, -15)">
                    <path d="M55,85 C55,40 145,40 145,85" fill="#EF4444" />
                    <path d="M50,85 L150,85 Q100,110 50,85 Z" fill="#DC2626" />
                </g>
            );
        case 'beret':
            return (
                <g transform="translate(10, -15)">
                    <path d="M40,80 C30,30 160,30 150,80 Q100,90 40,80 Z" fill="#1F2937" />
                    <path d="M95,35 L100,25" stroke="#1F2937" strokeWidth="3" />
                </g>
            );
        case 'mask':
            return (
                <g>
                    {/* Mask Body: Higher top curve to sit on nose, cleaner bottom curve for chin */}
                    <path d="M58,105 Q100,95 142,105 L142,128 Q100,150 58,128 Z" fill="#374151" />
                    {/* Straps: Curved to look like they go behind ears */}
                    <path d="M58,110 C48,110 45,100 48,95" fill="none" stroke="#374151" strokeWidth="2" />
                    <path d="M142,110 C152,110 155,100 152,95" fill="none" stroke="#374151" strokeWidth="2" />
                </g>
            );
        case 'necklace':
            return (
                <path d="M75,150 Q100,190 125,150" fill="none" stroke="#F59E0B" strokeWidth="3" />
            );
        case 'earrings':
            return (
                <g fill="#F59E0B">
                    <circle cx="53" cy="115" r="3" />
                    <circle cx="147" cy="115" r="3" />
                </g>
            );
        // New Accessories
        case 'wizard_hat':
            return (
                <g transform="translate(0, -35)">
                    <ellipse cx="100" cy="85" rx="65" ry="10" fill="#3B0764" />
                    <path d="M50,85 L150,85 L100,5" fill="#4B0082" />
                    <path d="M50,85 Q100,95 150,85" fill="#4B0082" />
                    <circle cx="100" cy="40" r="1.5" fill="yellow" />
                    <circle cx="120" cy="70" r="1.5" fill="yellow" />
                    <circle cx="80" cy="60" r="1.5" fill="yellow" />
                </g>
            );
        case 'pirate':
            return (
                <g transform="translate(0, -35)">
                    <path d="M20,70 Q100,40 180,70 L160,50 Q100,20 40,50 Z" fill="#1F2937" />
                    <path d="M50,55 Q100,35 150,55" fill="none" stroke="#FCD34D" strokeWidth="2" />
                    <circle cx="100" cy="55" r="5" fill="white" />
                    <circle cx="98" cy="55" r="1" fill="black" />
                    <circle cx="102" cy="55" r="1" fill="black" />
                </g>
            );
        case 'ninja':
            return (
                <g transform="translate(0, -20)">
                    <rect x="50" y="45" width="100" height="20" rx="2" fill="#374151" />
                    <rect x="80" y="48" width="40" height="14" rx="1" fill="#D1D5DB" />
                    <circle cx="100" cy="55" r="3" fill="#374151" />
                </g>
            );
        case 'viking':
            return (
                <g transform="translate(0, -35)">
                    <path d="M55,85 C55,40 145,40 145,85" fill="#9CA3AF" />
                    <path d="M50,85 L150,85 Q100,110 50,85 Z" fill="#6B7280" />
                    <path d="M55,60 Q30,40 40,20" fill="none" stroke="#F3F4F6" strokeWidth="6" strokeLinecap="round" />
                    <path d="M145,60 Q170,40 160,20" fill="none" stroke="#F3F4F6" strokeWidth="6" strokeLinecap="round" />
                </g>
            );
        case 'astro':
            return (
                <g>
                    <circle cx="100" cy="95" r="55" fill="rgba(147, 197, 253, 0.3)" stroke="#60A5FA" strokeWidth="2" />
                    <path d="M100,40 Q145,45 145,95" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
                </g>
            );
        case 'cat_ears':
            return (
                <g transform="translate(0, -5)">
                    <path d="M60,40 L75,70 L45,70 Z" fill="#1F2937" />
                    <path d="M140,40 L155,70 L125,70 Z" fill="#1F2937" />
                    <path d="M63,48 L70,65 L50,65 Z" fill="#F9A8D4" />
                    <path d="M137,48 L144,65 L124,65 Z" fill="#F9A8D4" />
                    <path d="M50,70 Q100,60 150,70" fill="none" stroke="#1F2937" strokeWidth="4" />
                </g>
            );
        case 'bowtie':
            return (
                <g transform="translate(0, 50)">
                    <path d="M85,100 L70,90 L70,110 Z" fill="#EF4444" />
                    <path d="M115,100 L130,90 L130,110 Z" fill="#EF4444" />
                    <circle cx="100" cy="100" r="5" fill="#B91C1C" />
                </g>
            );
        default: return null;
    }
};

export default Avatar;
