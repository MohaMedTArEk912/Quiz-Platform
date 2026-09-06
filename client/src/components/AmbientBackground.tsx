import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const AmbientBackground: React.FC = React.memo(() => {
    const { isBento } = useTheme();

    return (
        <div 
            className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none"
            style={{ 
                contain: 'strict',
                willChange: 'transform',
                transform: 'translateZ(0)'
            }}
            aria-hidden="true"
        >
            {isBento ? (
                /* Bento Mode: Floating geometric shapes + subtle colored corner washes */
                <>
                    {/* Soft colored corner washes for depth */}
                    <div 
                        className="absolute inset-0"
                        style={{
                            background: `
                                radial-gradient(ellipse 50% 40% at 0% 0%, rgba(190, 242, 100, 0.12) 0%, transparent 70%),
                                radial-gradient(ellipse 45% 35% at 100% 100%, rgba(186, 230, 253, 0.15) 0%, transparent 70%),
                                radial-gradient(ellipse 40% 30% at 100% 0%, rgba(253, 224, 71, 0.1) 0%, transparent 65%),
                                radial-gradient(ellipse 35% 25% at 0% 100%, rgba(221, 214, 254, 0.12) 0%, transparent 60%)
                            `
                        }}
                    />

                    {/* Floating geometric shapes scattered across the viewport */}
                    {/* Top-left cluster */}
                    <div className="absolute top-[6%] left-[4%] w-10 h-10 bg-[#fde047] border-[2.5px] border-black rounded-xl shadow-[3px_3px_0px_#000] rotate-12 animate-[float_6s_ease-in-out_infinite]" />
                    <div className="absolute top-[14%] left-[8%] w-4 h-4 bg-black rounded-full" />

                    {/* Top-right cluster */}
                    <div className="absolute top-[8%] right-[6%] w-7 h-7 bg-[#bae6fd] border-[2.5px] border-black rounded-full shadow-[2px_2px_0px_#000] animate-[float_8s_ease-in-out_infinite_1s]" />
                    <div className="absolute top-[18%] right-[3%] w-3 h-3 bg-black rotate-45" />

                    {/* Mid-left */}
                    <div className="absolute top-[40%] left-[2%] w-5 h-5 bg-[#bef264] border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] -rotate-12 animate-[float_7s_ease-in-out_infinite_0.5s]" />

                    {/* Mid-right */}
                    <div className="absolute top-[55%] right-[2%] w-8 h-8 bg-white border-[2.5px] border-black shadow-[3px_3px_0px_#000] rotate-45 animate-[float_9s_ease-in-out_infinite_2s]" />
                    <div className="absolute top-[48%] right-[5%] w-3 h-3 bg-black rounded-full" />

                    {/* Bottom-left */}
                    <div className="absolute bottom-[12%] left-[3%] w-8 h-8 bg-white border-[2.5px] border-black shadow-[3px_3px_0px_#000] rotate-45 animate-[float_7s_ease-in-out_infinite_1.5s]" />
                    <div className="absolute bottom-[6%] left-[7%] w-5 h-5 bg-[#ddd6fe] border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] rotate-6 animate-[float_8s_ease-in-out_infinite_3s]" />

                    {/* Bottom-right */}
                    <div className="absolute bottom-[10%] right-[5%] w-6 h-6 bg-[#bae6fd] border-[2px] border-black rounded-full shadow-[2px_2px_0px_#000] animate-[float_6s_ease-in-out_infinite_2.5s]" />
                    <div className="absolute bottom-[20%] right-[8%] w-3 h-3 bg-black rotate-45" />

                    {/* Center-scattered accents */}
                    <div className="absolute top-[28%] left-[15%] w-3 h-3 bg-black rounded-full opacity-40" />
                    <div className="absolute top-[70%] right-[15%] w-3 h-3 bg-black rounded-full opacity-40" />
                    <div className="absolute top-[85%] left-[45%] w-4 h-4 bg-[#fde047] border-[2px] border-black rounded-full shadow-[2px_2px_0px_#000] animate-[float_10s_ease-in-out_infinite_4s]" />
                </>
            ) : (
                <>
                    {/* Light Mode High-Performance Aurora Mesh */}
                    <div 
                        className="absolute inset-0 dark:hidden transition-opacity duration-300"
                        style={{
                            background: `
                                radial-gradient(ellipse 70% 40% at 50% -5%, rgba(199, 210, 254, 0.45) 0%, rgba(224, 231, 255, 0.2) 45%, transparent 75%),
                                radial-gradient(circle 500px at 0% 30%, rgba(224, 231, 255, 0.35) 0%, transparent 65%),
                                radial-gradient(circle 550px at 100% 55%, rgba(241, 245, 249, 0.6) 0%, transparent 65%)
                            `
                        }}
                    />

                    {/* Dark Mode High-Performance Aurora Mesh */}
                    <div 
                        className="absolute inset-0 hidden dark:block transition-opacity duration-300"
                        style={{
                            background: `
                                radial-gradient(ellipse 75% 45% at 50% -5%, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 45%, transparent 75%),
                                radial-gradient(circle 500px at 0% 30%, rgba(67, 56, 202, 0.12) 0%, transparent 65%),
                                radial-gradient(circle 550px at 100% 55%, rgba(124, 58, 237, 0.09) 0%, transparent 65%)
                            `
                        }}
                    />
                </>
            )}
        </div>
    );
});

AmbientBackground.displayName = 'AmbientBackground';
