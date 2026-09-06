import React, { useEffect, useState, useMemo } from 'react';

// KaTeX Global Window Interface
declare global {
    interface Window {
        katex?: {
            renderToString: (
                tex: string,
                options?: {
                    displayMode?: boolean;
                    throwOnError?: boolean;
                    errorColor?: string;
                }
            ) => string;
        };
    }
}

// Global cache for loaded state & loaded promise
let isKatexLoaded = typeof window !== 'undefined' && Boolean(window.katex);
let katexLoadPromise: Promise<boolean> | null = null;

const loadKatex = (): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.katex) {
        isKatexLoaded = true;
        return Promise.resolve(true);
    }
    if (katexLoadPromise) return katexLoadPromise;

    katexLoadPromise = new Promise<boolean>((resolve) => {
        // Inject KaTeX CSS
        const existingLink = document.getElementById('katex-css');
        if (!existingLink) {
            const link = document.createElement('link');
            link.id = 'katex-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        }

        // Inject KaTeX JS
        const existingScript = document.getElementById('katex-js');
        if (existingScript) {
            existingScript.addEventListener('load', () => {
                isKatexLoaded = true;
                resolve(true);
            });
            return;
        }

        const script = document.createElement('script');
        script.id = 'katex-js';
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = () => {
            isKatexLoaded = true;
            resolve(true);
        };
        script.onerror = () => {
            console.warn('⚠️ KaTeX CDN failed to load, fallback math renderer active.');
            resolve(false);
        };
        document.head.appendChild(script);
    });

    return katexLoadPromise;
};

interface MathRendererProps {
    text: string | number | null | undefined;
    className?: string;
    inline?: boolean;
}

interface Segment {
    type: 'text' | 'inline-math' | 'block-math';
    content: string;
}

/**
 * Parses text into mixed standard text, inline math ($...$ or \(...\)), and block math ($$...$$ or \[...\]).
 */
const parseMathSegments = (input: string): Segment[] => {
    if (!input) return [];

    const segments: Segment[] = [];
    // Regex matches $$...$$ or \[...\] or $...$ or \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)[\s\S]*?\$|\\\([\s\S]*?\\\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
        // Plain text before match
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: input.substring(lastIndex, match.index)
            });
        }

        const raw = match[0];
        if (raw.startsWith('$$') && raw.endsWith('$$')) {
            segments.push({
                type: 'block-math',
                content: raw.slice(2, -2).trim()
            });
        } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
            segments.push({
                type: 'block-math',
                content: raw.slice(2, -2).trim()
            });
        } else if (raw.startsWith('$') && raw.endsWith('$')) {
            segments.push({
                type: 'inline-math',
                content: raw.slice(1, -1).trim()
            });
        } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
            segments.push({
                type: 'inline-math',
                content: raw.slice(2, -2).trim()
            });
        }

        lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < input.length) {
        segments.push({
            type: 'text',
            content: input.substring(lastIndex)
        });
    }

    return segments;
};

export const MathRenderer: React.FC<MathRendererProps> = ({
    text,
    className = '',
    inline = false
}) => {
    const [katexReady, setKatexReady] = useState(isKatexLoaded);

    useEffect(() => {
        if (!isKatexLoaded) {
            loadKatex().then((loaded) => {
                if (loaded) setKatexReady(true);
            });
        }
    }, []);

    const stringContent = text !== undefined && text !== null ? String(text) : '';

    const segments = useMemo(() => parseMathSegments(stringContent), [stringContent]);

    if (!stringContent) return null;

    // Fast path: if no math markers are in text, render clean text
    const hasMath = stringContent.includes('$') || stringContent.includes('\\(') || stringContent.includes('\\[');
    if (!hasMath) {
        return <span className={className}>{stringContent}</span>;
    }

    const renderSegment = (seg: Segment, idx: number) => {
        if (seg.type === 'text') {
            return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
        }

        const isBlock = seg.type === 'block-math';

        if (katexReady && window.katex) {
            try {
                const html = window.katex.renderToString(seg.content, {
                    displayMode: isBlock,
                    throwOnError: false,
                    errorColor: '#f43f5e'
                });
                return isBlock ? (
                    <div
                        key={idx}
                        className="my-2.5 overflow-x-auto custom-scrollbar py-1 text-center font-serif"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                ) : (
                    <span
                        key={idx}
                        className="inline-block px-0.5 font-serif"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            } catch (err) {
                console.warn('KaTeX render error:', err);
            }
        }

        // Fallback styling for when KaTeX is loading or offline
        return isBlock ? (
            <div
                key={idx}
                className="my-2 p-2 bg-indigo-500/10 dark:bg-indigo-950/30 rounded-xl border border-indigo-500/20 font-mono text-xs text-indigo-700 dark:text-indigo-300 text-center overflow-x-auto"
            >
                {seg.content}
            </div>
        ) : (
            <span
                key={idx}
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-500/20"
            >
                {seg.content}
            </span>
        );
    };

    const Container = inline ? 'span' : 'div';

    return (
        <Container className={className}>
            {segments.map(renderSegment)}
        </Container>
    );
};

export default MathRenderer;
