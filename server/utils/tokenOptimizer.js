/**
 * TOKEN OPTIMIZATION UTILITIES
 * 
 * Purpose: Reduce token consumption to stay within Free Tier limits
 * Strategy: Smart truncation that preserves context quality
 */

/**
 * Estimate token count (rough approximation)
 * Real tokenization is complex, but this gives a reasonable estimate
 * 
 * @param {string} text - Text to estimate
 * @returns {number} - Approximate token count
 */
export function estimateTokenCount(text) {
    if (!text) return 0;
    
    // Rough estimate: 1 token ≈ 4 characters for English
    // More accurate would use tiktoken, but this is lightweight
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // Average of character-based and word-based estimates
    const charBasedTokens = charCount / 4;
    const wordBasedTokens = wordCount * 1.3; // Words typically expand to 1.3 tokens
    
    return Math.ceil((charBasedTokens + wordBasedTokens) / 2);
}

/**
 * Intelligently truncate text to target token count
 * Preserves sentence boundaries and paragraph structure
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum tokens to keep
 * @returns {string} - Truncated text
 */
export function smartTruncate(text, maxTokens = 6000) {
    if (!text) return '';
    
    const estimatedTokens = estimateTokenCount(text);
    
    // If already under limit, return as is
    if (estimatedTokens <= maxTokens) {
        return text;
    }
    
    console.log(`[Token Optimizer] Input: ~${estimatedTokens} tokens, target: ${maxTokens}`);
    
    // Calculate target character count (rough)
    const ratio = maxTokens / estimatedTokens;
    const targetChars = Math.floor(text.length * ratio);
    
    // Try to break at sentence boundaries
    let truncated = text.substring(0, targetChars);
    
    // Find last complete sentence
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let lastSentenceEnd = -1;
    
    for (const ender of sentenceEnders) {
        const pos = truncated.lastIndexOf(ender);
        if (pos > lastSentenceEnd) {
            lastSentenceEnd = pos;
        }
    }
    
    // If we found a sentence boundary, use it
    if (lastSentenceEnd > targetChars * 0.8) { // At least 80% of target
        truncated = truncated.substring(0, lastSentenceEnd + 1);
    }
    
    // Add ellipsis if truncated
    if (truncated.length < text.length) {
        truncated += '\\n\\n[Content truncated for processing...]';
    }
    
    const finalTokens = estimateTokenCount(truncated);
    console.log(`[Token Optimizer] Output: ~${finalTokens} tokens (${Math.round(finalTokens/maxTokens*100)}% of target)`);
    
    return truncated;
}

/**
 * Extract most relevant sections from text
 * Uses simple keyword-based relevance scoring
 * 
 * @param {string} text - Full text
 * @param {string[]} keywords - Keywords to prioritize
 * @param {number} maxTokens - Maximum tokens to keep
 * @returns {string} - Extracted relevant sections
 */
export function extractRelevantSections(text, keywords = [], maxTokens = 6000) {
    if (!text) return '';
    if (keywords.length === 0) {
        return smartTruncate(text, maxTokens);
    }
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Score each paragraph by keyword presence
    const scoredParagraphs = paragraphs.map(para => {
        let score = 0;
        const lowerPara = para.toLowerCase();
        
        for (const keyword of keywords) {
            const lowerKeyword = keyword.toLowerCase();
            const count = (lowerPara.match(new RegExp(lowerKeyword, 'g')) || []).length;
            score += count;
        }
        
        return { para, score, tokens: estimateTokenCount(para) };
    });
    
    // Sort by score (highest first)
    scoredParagraphs.sort((a, b) => b.score - a.score);
    
    // Collect paragraphs until we hit token limit
    const selected = [];
    let totalTokens = 0;
    
    for (const item of scoredParagraphs) {
        if (totalTokens + item.tokens <= maxTokens) {
            selected.push(item.para);
            totalTokens += item.tokens;
        } else {
            break;
        }
    }
    
    console.log(`[Token Optimizer] Selected ${selected.length}/${paragraphs.length} paragraphs (~${totalTokens} tokens)`);
    
    // If we didn't get anything, fallback to smart truncate
    if (selected.length === 0) {
        return smartTruncate(text, maxTokens);
    }
    
    return selected.join('\\n\\n');
}

/**
 * Optimize prompt for token efficiency
 * Removes redundant instructions, shortens examples
 * 
 * @param {string} prompt - Original prompt
 * @returns {string} - Optimized prompt
 */
export function optimizePrompt(prompt) {
    if (!prompt) return '';
    
    let optimized = prompt;
    
    // Remove excessive whitespace
    optimized = optimized.replace(/\n{3,}/g, '\n\n');
    optimized = optimized.replace(/ {2,}/g, ' ');
    
    // Remove verbose phrases (can add more as needed)
    const verbosePhrases = [
        'Please note that ',
        'It is important to ',
        'Make sure to ',
        'Remember to ',
        'Please ensure that ',
    ];
    
    for (const phrase of verbosePhrases) {
        optimized = optimized.replace(new RegExp(phrase, 'gi'), '');
    }
    
    return optimized.trim();
}

/**
 * Validate token budget before sending to API
 * Helps prevent quota violations
 * 
 * @param {string} prompt - Full prompt to send
 * @param {number} maxInputTokens - Maximum input tokens allowed
 * @returns {Object} - { valid: boolean, tokens: number, message: string }
 */
export function validateTokenBudget(prompt, maxInputTokens = 30000) {
    const tokens = estimateTokenCount(prompt);
    
    if (tokens <= maxInputTokens) {
        return { valid: true, tokens, message: 'Within budget' };
    }
    
    return {
        valid: false,
        tokens,
        message: `Prompt too large: ${tokens} tokens (max: ${maxInputTokens}). Consider truncating input.`
    };
}

export default {
    estimateTokenCount,
    smartTruncate,
    extractRelevantSections,
    optimizePrompt,
    validateTokenBudget
};
