import React from 'react';

export const AmbientBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Light Mode Blobs */}
            <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-red-400/20 lg:bg-[#FFC5C5]/40 rounded-full mix-blend-multiply filter blur-[100px] lg:blur-[140px] opacity-[0.5] animate-blob dark:hidden" />
            <div className="absolute top-[30%] right-[0%] w-[45vw] h-[45vw] bg-blue-400/20 lg:bg-[#C2D6FF]/40 rounded-full mix-blend-multiply filter blur-[100px] lg:blur-[150px] opacity-[0.45] animate-blob animation-delay-2000 dark:hidden" />
            <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] bg-pink-400/20 lg:bg-[#FBCFE8]/40 rounded-full mix-blend-multiply filter blur-[90px] lg:blur-[120px] opacity-[0.5] animate-blob animation-delay-4000 dark:hidden" />
            <div className="absolute top-[10%] right-[30%] w-[35vw] h-[35vw] bg-yellow-400/15 lg:bg-[#FDE047]/30 rounded-full mix-blend-multiply filter blur-[80px] lg:blur-[110px] opacity-[0.4] animate-blob animation-delay-[6000ms] dark:hidden" />

            {/* Dark Mode Blobs (Existing subtle look) */}
            <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob hidden dark:block" />
            <div className="absolute top-[30%] right-[0%] w-[45vw] h-[45vw] bg-violet-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob animation-delay-2000 hidden dark:block" />
            <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[128px] opacity-[0.10] animate-blob animation-delay-4000 hidden dark:block" />

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 15s infinite alternate; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};


