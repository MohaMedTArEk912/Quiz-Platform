import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, Film, ExternalLink } from 'lucide-react';

interface MediaPromptPlayerProps {
    audioUrl?: string;
    videoUrl?: string;
    videoTimestamp?: number;
}

export const MediaPromptPlayer: React.FC<MediaPromptPlayerProps> = ({
    audioUrl,
    videoUrl,
    videoTimestamp
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [replayCount, setReplayCount] = useState(0);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
                setReplayCount(prev => prev + 1);
            }).catch(console.error);
        }
    };

    const handleSpeedChange = (speed: number) => {
        setPlaybackRate(speed);
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    };

    if (!audioUrl && !videoUrl) return null;

    return (
        <div className="my-4 p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-[#0c0f1d]/80 border border-gray-200 dark:border-white/10 shadow-md backdrop-blur-md space-y-3">
            {/* Audio Prompt Player */}
            {audioUrl && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            <Volume2 className="w-4 h-4 animate-pulse" />
                            <span>Listening Prompt / Audio Clip</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                            Listened: {replayCount} time{replayCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />

                    {/* Custom Audio Controls */}
                    <div className="flex items-center justify-between gap-3 p-2 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200/60 dark:border-white/5">
                        <button
                            type="button"
                            onClick={toggleAudio}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span>{isPlaying ? 'Pause Clip' : 'Play Audio'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {[0.75, 1, 1.25].map((speed) => (
                                <button
                                    key={speed}
                                    type="button"
                                    onClick={() => handleSpeedChange(speed)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                        playbackRate === speed
                                            ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                            : 'text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Video Prompt Player */}
            {videoUrl && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        <Film className="w-4 h-4" />
                        <span>Video Comprehension Clip</span>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black aspect-video max-h-64 mx-auto w-full">
                        {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                            <iframe
                                src={`${videoUrl}?start=${videoTimestamp || 0}&autoplay=0`}
                                className="w-full h-full"
                                allowFullScreen
                                title="Video question prompt"
                            />
                        ) : (
                            <video
                                src={videoUrl}
                                controls
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaPromptPlayer;
