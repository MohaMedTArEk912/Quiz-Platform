import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext.tsx';

interface AnimatedCharacterProps {
    isEmailFocused: boolean;
    isPasswordFocused: boolean;
    showPassword?: boolean;
    className?: string;
}

export const AnimatedCharacter: React.FC<AnimatedCharacterProps> = ({
    isEmailFocused,
    isPasswordFocused,
    showPassword = false,
    className = "",
}) => {
    const { isBento } = useTheme();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number>(0);

    // Smoothed mouse tracking with requestAnimationFrame for fluid eye movement
    const updateMousePos = useCallback(() => {
        setMousePos(prev => {
            const lerp = 0.15; // Smooth interpolation factor
            const newX = prev.x + (mousePosRef.current.x - prev.x) * lerp;
            const newY = prev.y + (mousePosRef.current.y - prev.y) * lerp;
            // Stop updating when close enough
            if (Math.abs(newX - prev.x) < 0.01 && Math.abs(newY - prev.y) < 0.01) {
                return mousePosRef.current;
            }
            rafRef.current = requestAnimationFrame(updateMousePos);
            return { x: newX, y: newY };
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || isPasswordFocused) return;
            const rect = containerRef.current.getBoundingClientRect();
            
            // Calculate center of the character
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calculate distance and angle from center
            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            
            // Calculate distance for dynamic responsiveness
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxRadius = 10; // Increased max pupil movement for better tracking
            
            // More responsive tracking with eased distance mapping
            let px = dx;
            let py = dy;
            
            if (distance > 0) {
                // Use easeOutCubic for natural feeling pupil movement
                const normalizedDist = Math.min(distance / 200, 1); // Normalize to screen distance
                const easedDist = 1 - Math.pow(1 - normalizedDist, 3); // easeOutCubic
                px = (dx / distance) * easedDist * maxRadius;
                py = (dy / distance) * easedDist * maxRadius;
            }

            mousePosRef.current = { x: px, y: py };
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updateMousePos);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafRef.current);
        };
    }, [isPasswordFocused, updateMousePos]);

    // Random blinking interval
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            if (!isPasswordFocused && Math.random() > 0.3) {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 200);
            }
        }, 4000);
        return () => clearInterval(blinkInterval);
    }, [isPasswordFocused]);

    // Derived animation states
    const earsLookDown = isEmailFocused && !isPasswordFocused;
    const hideEyes = showPassword;
    const peekEyes = isPasswordFocused && !showPassword;

    return (
        <div ref={containerRef} className={`relative flex items-center justify-center w-full h-full pb-8 ${className}`}>
            
            {/* Ambient shadow glow behind character (hidden in bento) */}
            {!isBento && (
                <div className="absolute w-[200px] h-[200px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
            )}

            {/* Neo-Brutalist Interactive Speech Bubble */}
            {isBento && (
                <div className="absolute -top-4 sm:-top-5 z-30 transition-all duration-300 transform -translate-y-1 select-none pointer-events-none">
                    <div className={`px-3.5 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_#000] flex items-center gap-1.5 transition-colors ${
                        isPasswordFocused
                            ? (showPassword ? 'bg-[#38bdf8] text-black' : 'bg-[#8b5cf6] text-white')
                            : (isEmailFocused ? 'bg-[#fde047] text-black' : 'bg-[#bef264] text-black')
                    }`}>
                        <span>
                            {isPasswordFocused
                                ? (showPassword ? "I SEE IT! 👀" : "NO PEEKING! 🙈")
                                : (isEmailFocused ? "TYPE YOUR EMAIL! ✍️" : "READY TO QUIZ? ⚡")}
                        </span>
                    </div>
                    {/* Speech Bubble Comic Tail */}
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black mx-auto mt-[-0.5px]" />
                </div>
            )}

            {/* Breathing Animation Wrapper */}
            <div className={`relative w-64 h-64 animate-[breathe_4s_ease-in-out_infinite] z-10 ${
                isBento ? 'filter drop-shadow-[5px_5px_0px_#000000]' : ''
            }`}>
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full ${isBento ? '' : 'drop-shadow-xl'}`}>
                    
                    {/* --- EARS --- */}
                    <g className="transition-transform duration-500 ease-in-out origin-bottom" 
                       style={{ transform: earsLookDown ? 'translateY(4px) scaleY(0.95)' : 'translateY(0)' }}>
                        {/* Left Ear */}
                        <path 
                            d="M50 80C30 80 20 40 40 20C60 0 80 40 80 60" 
                            fill={isBento ? "#FFFFFF" : "#E2E8F0"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "4" : undefined}
                            strokeLinejoin={isBento ? "round" : undefined}
                            className={isBento ? "" : "dark:fill-[#1e293b] transition-colors"} 
                        />
                        <path 
                            d="M55 70C45 70 35 45 45 35C55 25 65 45 70 55" 
                            fill={isBento ? "#FDE047" : "#FBCFE8"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "2.5" : undefined}
                            className={isBento ? "" : "dark:fill-[#831843] transition-colors"} 
                        />
                        
                        {/* Right Ear */}
                        <path 
                            d="M150 80C170 80 180 40 160 20C140 0 120 40 120 60" 
                            fill={isBento ? "#FFFFFF" : "#E2E8F0"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "4" : undefined}
                            strokeLinejoin={isBento ? "round" : undefined}
                            className={isBento ? "" : "dark:fill-[#1e293b] transition-colors"} 
                        />
                        <path 
                            d="M145 70C155 70 165 45 155 35C145 25 135 45 130 55" 
                            fill={isBento ? "#FDE047" : "#FBCFE8"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "2.5" : undefined}
                            className={isBento ? "" : "dark:fill-[#831843] transition-colors"} 
                        />
                    </g>

                    {/* --- HEAD BASE --- */}
                    <circle 
                        cx="100" 
                        cy="110" 
                        r="70" 
                        fill={isBento ? "#FFFFFF" : "#F8FAFC"} 
                        stroke={isBento ? "#000000" : undefined}
                        strokeWidth={isBento ? "4.5" : "4"}
                        className={isBento ? "" : "dark:fill-[#0f172a] transition-colors stroke-gray-200 dark:stroke-slate-800"} 
                    />
                    
                    {/* Head fluff / Cheeks */}
                    <ellipse 
                        cx="60" 
                        cy="130" 
                        rx="20" 
                        ry="15" 
                        fill={isBento ? "#FFFFFF" : "#F8FAFC"} 
                        stroke={isBento ? "#000000" : undefined}
                        strokeWidth={isBento ? "4" : undefined}
                        className={isBento ? "" : "dark:fill-[#0f172a] transition-colors"}
                    />
                    <ellipse 
                        cx="140" 
                        cy="130" 
                        rx="20" 
                        ry="15" 
                        fill={isBento ? "#FFFFFF" : "#F8FAFC"} 
                        stroke={isBento ? "#000000" : undefined}
                        strokeWidth={isBento ? "4" : undefined}
                        className={isBento ? "" : "dark:fill-[#0f172a] transition-colors"}
                    />

                    {/* --- EYES --- */}
                    <g className="transition-opacity duration-200" style={{ opacity: isBlinking || hideEyes ? 0 : 1 }}>
                        {/* Eyeballs */}
                        <circle 
                            cx="75" 
                            cy="100" 
                            r="16" 
                            fill="white" 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "3" : undefined}
                        />
                        <circle 
                            cx="125" 
                            cy="100" 
                            r="16" 
                            fill="white" 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "3" : undefined}
                        />
                        
                        {/* Pupils - Animated by smooth mouse tracking */}
                        <g style={{ 
                            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, 
                            transition: 'none' // Using RAF lerp instead
                        }}>
                            <circle cx="75" cy="100" r={isBento ? "9" : "8"} fill="#000000" />
                            <circle cx="125" cy="100" r={isBento ? "9" : "8"} fill="#000000" />
                            {/* Eye catchlights */}
                            <circle cx="72" cy="97" r="3.5" fill="white" />
                            <circle cx="122" cy="97" r="3.5" fill="white" />
                        </g>

                        {/* Peeking State logic */}
                        <g className="transition-opacity duration-300" style={{ opacity: peekEyes ? 1 : 0 }}>
                            <path d="M115 90 Q125 80 135 90" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                        </g>
                    </g>

                    {/* Closed/Blinking Eyes */}
                    <g className="transition-opacity duration-200" style={{ opacity: isBlinking || hideEyes ? 1 : 0 }}>
                        <path d="M60 100 Q75 110 90 100" stroke="#000000" strokeWidth={isBento ? "5" : "4"} strokeLinecap="round" fill="none" />
                        <path d="M110 100 Q125 110 140 100" stroke="#000000" strokeWidth={isBento ? "5" : "4"} strokeLinecap="round" fill="none" />
                    </g>

                    {/* Blush */}
                    <ellipse 
                        cx="55" 
                        cy="120" 
                        rx="12" 
                        ry="6" 
                        fill="#F472B6" 
                        opacity={isBento ? 0.85 : 0.3} 
                        stroke={isBento ? "#000000" : undefined}
                        strokeWidth={isBento ? "1.5" : undefined}
                        className="transition-opacity duration-500"
                    />
                    <ellipse 
                        cx="145" 
                        cy="120" 
                        rx="12" 
                        ry="6" 
                        fill="#F472B6" 
                        opacity={isBento ? 0.85 : 0.3} 
                        stroke={isBento ? "#000000" : undefined}
                        strokeWidth={isBento ? "1.5" : undefined}
                        className="transition-opacity duration-500"
                    />

                    {/* --- NOSE & MOUTH --- */}
                    <g className="transition-transform duration-500" style={{ transform: earsLookDown ? 'translateY(4px)' : 'translateY(0)' }}>
                        <polygon points="100,125 90,115 110,115" fill="#000000" stroke="#000000" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M90 125 Q100 135 110 125" stroke="#000000" strokeWidth={isBento ? "4" : "3"} strokeLinecap="round" fill="none" />
                        {/* Tongue when happy/default */}
                        <path 
                            d="M96 128 Q100 136 104 128" 
                            fill="#F472B6" 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "2" : undefined}
                            style={{ opacity: (isPasswordFocused || isEmailFocused) ? 0 : 1 }} 
                            className="transition-opacity duration-300"
                        />
                    </g>

                    {/* --- PAWS (ARMS) --- */}
                    {/* Left Paw */}
                    <g className="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[30px_160px]"
                       style={{ 
                           transform: (hideEyes || peekEyes) 
                               ? 'translate(25px, -65px) rotate(45deg) scale(1.1)' 
                               : 'translate(0px, 0px) rotate(0deg) scale(1)' 
                       }}>
                        <ellipse 
                            cx="40" 
                            cy="170" 
                            rx="20" 
                            ry="25" 
                            fill={isBento ? "#FFFFFF" : "#E2E8F0"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "4" : "3"}
                            className={isBento ? "" : "dark:fill-[#1e293b] transition-colors stroke-gray-200 dark:stroke-slate-800"} 
                        />
                        <path 
                            d="M35 150 L35 160 M45 150 L45 160" 
                            stroke={isBento ? "#000000" : "#CBD5E1"} 
                            strokeWidth={isBento ? "3" : "2"} 
                            strokeLinecap="round"
                            className={isBento ? "" : "dark:stroke-slate-700"} 
                        />
                    </g>

                    {/* Right Paw */}
                    <g className="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[170px_160px]"
                       style={{ 
                           transform: (hideEyes || peekEyes)
                               ? `translate(-25px, ${peekEyes ? '-45px' : '-65px'}) rotate(-45deg) scale(1.1)` 
                               : 'translate(0px, 0px) rotate(0deg) scale(1)' 
                       }}>
                        <ellipse 
                            cx="160" 
                            cy="170" 
                            rx="20" 
                            ry="25" 
                            fill={isBento ? "#FFFFFF" : "#E2E8F0"} 
                            stroke={isBento ? "#000000" : undefined}
                            strokeWidth={isBento ? "4" : "3"}
                            className={isBento ? "" : "dark:fill-[#1e293b] transition-colors stroke-gray-200 dark:stroke-slate-800"} 
                        />
                        <path 
                            d="M155 150 L155 160 M165 150 L165 160" 
                            stroke={isBento ? "#000000" : "#CBD5E1"} 
                            strokeWidth={isBento ? "3" : "2"} 
                            strokeLinecap="round"
                            className={isBento ? "" : "dark:stroke-slate-700"} 
                        />
                    </g>

                </svg>
            </div>
            
            <style>{`
                @keyframes breathe {
                    0%, 100% { transform: translateY(0) scaleY(1); }
                    50% { transform: translateY(-4px) scaleY(1.02); }
                }
            `}</style>
        </div>
    );
};
