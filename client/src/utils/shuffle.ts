/**
 * Unbiased Fisher-Yates shuffle returning a new shuffled array.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Generates a Fisher-Yates shuffled permutation of indices [0, ..., length - 1].
 */
export function generateShuffledIndices(length: number): number[] {
    return shuffleArray(Array.from({ length }, (_, i) => i));
}

/**
 * Shuffles items so they do not start in the exact original sequence (or forbiddenOrder)
 * when there are at least 2 distinct positions.
 */
export function shuffleOrderingItems<T>(items: readonly T[], forbiddenOrder?: readonly T[]): T[] {
    if (!items || items.length <= 1) return [...(items || [])];

    const shuffledIndices = generateShuffledIndices(items.length);
    const isIdentity = shuffledIndices.every((idx, pos) => idx === pos);
    if (isIdentity) {
        [shuffledIndices[0], shuffledIndices[1]] = [shuffledIndices[1], shuffledIndices[0]];
    }

    const result = shuffledIndices.map(idx => items[idx]);

    if (
        forbiddenOrder &&
        result.length === forbiddenOrder.length &&
        result.every((val, idx) => val === forbiddenOrder[idx])
    ) {
        const swapIdx = result.findIndex((val, idx) => idx > 0 && val !== result[0]);
        const targetIdx = swapIdx !== -1 ? swapIdx : 1;
        [result[0], result[targetIdx]] = [result[targetIdx], result[0]];
    }

    return result;
}

/**
 * Resolves the canonical option index for a question's correctAnswer
 * (supports numeric index, numeric string like "0", or exact option text match).
 */
export function resolveOptionIndex(options: readonly string[], answer: unknown): number | null {
    if (typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < options.length) {
        return answer;
    }

    if (typeof answer === 'string') {
        const trimmed = answer.trim();
        if (/^\d+$/.test(trimmed)) {
            const parsed = Number(trimmed);
            if (parsed >= 0 && parsed < options.length) {
                return parsed;
            }
        }
        const textIdx = options.findIndex(opt => String(opt).trim() === trimmed);
        if (textIdx !== -1) {
            return textIdx;
        }
    }

    return null;
}

/**
 * Shuffles both the question array and each question's options array while
 * remapping `correctAnswer` to the new option index. Useful for synchronized
 * multiplayer sessions where all participants render pre-shuffled payloads.
 */
export function shuffleQuestionsWithOptions<
    T extends { options?: string[]; correctAnswer?: unknown; shuffleOptions?: boolean }
>(questions: readonly T[]): T[] {
    const shuffledQuestions = shuffleArray(questions);

    return shuffledQuestions.map(q => {
        const origOptions = Array.isArray(q.options) ? q.options : [];
        if (origOptions.length <= 1) {
            return origOptions.length === 1 ? { ...q, shuffleOptions: true } : { ...q };
        }

        const perm = generateShuffledIndices(origOptions.length);
        const shuffledOptions = perm.map(origIdx => origOptions[origIdx]);

        let remappedCorrectAnswer = q.correctAnswer;
        if (Array.isArray(q.correctAnswer)) {
            remappedCorrectAnswer = q.correctAnswer.map(entry => {
                const origIdx = resolveOptionIndex(origOptions, entry);
                return origIdx !== null ? perm.indexOf(origIdx) : entry;
            });
        } else {
            const origIdx = resolveOptionIndex(origOptions, q.correctAnswer);
            if (origIdx !== null) {
                remappedCorrectAnswer = perm.indexOf(origIdx);
            }
        }

        return {
            ...q,
            options: shuffledOptions,
            correctAnswer: remappedCorrectAnswer,
            shuffleOptions: true
        };
    });
}
