import React, { useEffect, useRef, useState } from 'react';

interface TransparentLogoProps {
    src: string;
    alt?: string;
    className?: string;
    threshold?: number;
}

const TransparentLogo: React.FC<TransparentLogoProps> = ({ src, alt = "Logo", className, threshold = 50 }) => {
    const [processedSrc, setProcessedSrc] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Check if pixel is dark (part of background)
                // We use a slightly generous threshold to catch compression artifacts
                if (r < threshold && g < threshold && b < threshold) {
                    data[i + 3] = 0; // Set alpha to 0
                } else {
                    // Optional: Smooth edges by reducing alpha on semi-dark pixels? 
                    // For now, strict cutoff is usually cleaner for logo on dark/dark comparison.
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setProcessedSrc(canvas.toDataURL());
        };
    }, [src, threshold]);

    return (
        <>
            <canvas ref={canvasRef} className="hidden" />
            {processedSrc ? (
                <img src={processedSrc} alt={alt} className={className} />
            ) : (
                // Skeleton/Placeholder while processing
                <img src={src} alt={alt} className={`${className} opacity-50`} />
            )}
        </>
    );
};

export default TransparentLogo;
