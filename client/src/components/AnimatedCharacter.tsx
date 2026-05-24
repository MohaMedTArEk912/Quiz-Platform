import React, { useEffect, useState, useRef } from 'react';

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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mouse tracking logic for eyes
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
            
            // Limit the maximum eye movement using a radius
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxRadius = 8; // Max pixels pupils can move
            
            // Calculate precise pupil positions
            let px = dx;
            let py = dy;
            
            if (distance > 0) {
                // Normalize and apply radius
                px = (dx / distance) * Math.min(distance * 0.05, maxRadius);
                py = (dy / distance) * Math.min(distance * 0.05, maxRadius);
            }

            setMousePos({ x: px, y: py });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isPasswordFocused]);

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
            
            {/* Ambient shadow glow behind character */}
            <div className="absolute w-[200px] h-[200px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

            {/* Breathing Animation Wrapper */}
            <div className="relative w-64 h-64 animate-[breathe_4s_ease-in-out_infinite] z-10">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
                    
                    {/* --- EARS --- */}
                    <g className="transition-transform duration-500 ease-in-out origin-bottom" 
                       style={{ transform: earsLookDown ? 'translateY(4px) scaleY(0.95)' : 'translateY(0)' }}>
                        {/* Left Ear */}
                        <path d="M50 80C30 80 20 40 40 20C60 0 80 40 80 60" fill="#E2E8F0" className="dark:fill-[#1e293b] transition-colors" />
                        <path d="M55 70C45 70 35 45 45 35C55 25 65 45 70 55" fill="#FBCFE8" className="dark:fill-[#831843] transition-colors" />
                        
                        {/* Right Ear */}
                        <path d="M150 80C170 80 180 40 160 20C140 0 120 40 120 60" fill="#E2E8F0" className="dark:fill-[#1e293b] transition-colors" />
                        <path d="M145 70C155 70 165 45 155 35C145 25 135 45 130 55" fill="#FBCFE8" className="dark:fill-[#831843] transition-colors" />
                    </g>

                    {/* --- HEAD BASE --- */}
                    <circle cx="100" cy="110" r="70" fill="#F8FAFC" className="dark:fill-[#0f172a] transition-colors stroke-gray-200 dark:stroke-slate-800" strokeWidth="4"/>
                    
                    {/* Head fluff / Cheeks */}
                    <ellipse cx="60" cy="130" rx="20" ry="15" fill="#F8FAFC" className="dark:fill-[#0f172a] transition-colors"/>
                    <ellipse cx="140" cy="130" rx="20" ry="15" fill="#F8FAFC" className="dark:fill-[#0f172a] transition-colors"/>

                    {/* --- EYES --- */}
                    <g className="transition-opacity duration-200" style={{ opacity: isBlinking || hideEyes ? 0 : 1 }}>
                        {/* Eyeballs */}
                        <circle cx="75" cy="100" r="16" fill="white" />
                        <circle cx="125" cy="100" r="16" fill="white" />
                        
                        {/* Pupils - Animated by Mouse tracking */}
                        <g style={{ 
                            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, 
                            transition: isEmailFocused ? 'transform 0.4s ease-out' : 'transform 0.1s linear' // Smoother tracking when scanning form
                        }}>
                            <circle cx="75" cy="100" r="8" fill="#1E293B" />
                            <circle cx="125" cy="100" r="8" fill="#1E293B" />
                            {/* Eye catchlights */}
                            <circle cx="72" cy="97" r="3" fill="white" />
                            <circle cx="122" cy="97" r="3" fill="white" />
                        </g>

                        {/* Peeking State logic (if showPassword is on and it's focused) */}
                        <g className="transition-opacity duration-300" style={{ opacity: peekEyes ? 1 : 0 }}>
                            <path d="M115 90 Q125 80 135 90" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
                        </g>
                    </g>

                    {/* Closed/Blinking Eyes (shown when blinking or hiding eyes completely) */}
                    <g className="transition-opacity duration-200" style={{ opacity: isBlinking || hideEyes ? 1 : 0 }}>
                        <path d="M60 100 Q75 110 90 100" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
                        <path d="M110 100 Q125 110 140 100" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none" />
                    </g>

                    {/* Blush */}
                    <ellipse cx="55" cy="120" rx="12" ry="6" fill="#F472B6" opacity="0.3" className="transition-opacity duration-500"/>
                    <ellipse cx="145" cy="120" rx="12" ry="6" fill="#F472B6" opacity="0.3" className="transition-opacity duration-500"/>

                    {/* --- NOSE & MOUTH --- */}
                    <g className="transition-transform duration-500" style={{ transform: earsLookDown ? 'translateY(4px)' : 'translateY(0)' }}>
                        <polygon points="100,125 90,115 110,115" fill="#334155" stroke="#334155" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M90 125 Q100 135 110 125" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
                        {/* Tongue when happy/default */}
                        <path d="M96 128 Q100 136 104 128" fill="#F472B6" style={{ opacity: (isPasswordFocused || isEmailFocused) ? 0 : 1 }} className="transition-opacity duration-300"/>
                    </g>

                    {/* --- PAWS (ARMS) --- */}
                    {/* Left Paw */}
                    <g className="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[30px_160px]"
                       style={{ 
                           transform: (hideEyes || peekEyes) 
                               ? 'translate(25px, -65px) rotate(45deg) scale(1.1)' 
                               : 'translate(0px, 0px) rotate(0deg) scale(1)' 
                       }}>
                        <ellipse cx="40" cy="170" rx="20" ry="25" fill="#E2E8F0" className="dark:fill-[#1e293b] transition-colors stroke-gray-200 dark:stroke-slate-800" strokeWidth="3"/>
                        <path d="M35 150 L35 160 M45 150 L45 160" stroke="#CBD5E1" className="dark:stroke-slate-700" strokeWidth="2" strokeLinecap="round"/>
                    </g>

                    {/* Right Paw */}
                    <g className="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[170px_160px]"
                       style={{ 
                           transform: (hideEyes || peekEyes)
                               ? `translate(-25px, ${peekEyes ? '-45px' : '-65px'}) rotate(-45deg) scale(1.1)` 
                               : 'translate(0px, 0px) rotate(0deg) scale(1)' 
                       }}>
                        <ellipse cx="160" cy="170" rx="20" ry="25" fill="#E2E8F0" className="dark:fill-[#1e293b] transition-colors stroke-gray-200 dark:stroke-slate-800" strokeWidth="3"/>
                        <path d="M155 150 L155 160 M165 150 L165 160" stroke="#CBD5E1" className="dark:stroke-slate-700" strokeWidth="2" strokeLinecap="round"/>
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
