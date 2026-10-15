/**
 * String similarity and fuzzy matching utilities for Quiz questions (Backend).
 */

export function normalizeText(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/['"“”‘’`]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactNormalize(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(userStr, targetStr) {
  const s1 = normalizeText(userStr);
  const s2 = normalizeText(targetStr);

  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const c1 = compactNormalize(userStr);
  const c2 = compactNormalize(targetStr);
  if (c1 && c2 && c1 === c2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(s1, s2);
  const charSim = Math.max(0, 1 - dist / maxLen);

  const tokens1 = s1.split(' ').filter(Boolean);
  const tokens2 = s2.split(' ').filter(Boolean);
  if (tokens1.length > 1 && tokens2.length > 1) {
    const set2 = new Set(tokens2);
    const matches = tokens1.filter(t => set2.has(t)).length;
    const totalUnique = new Set([...tokens1, ...tokens2]).size;
    const tokenSim = totalUnique > 0 ? matches / totalUnique : 0;
    return Math.max(charSim, tokenSim);
  }

  return charSim;
}

export function parseAcceptedAnswers(correctAnswer) {
  if (correctAnswer === undefined || correctAnswer === null) return [];
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map(c => String(c).trim()).filter(Boolean);
  }
  const str = String(correctAnswer);
  if (str.includes('|') || str.includes(',')) {
    return str.split(/[,|]/).map(s => s.trim()).filter(Boolean);
  }
  return [str.trim()];
}

export function evaluateTextAnswer(userAnswer, correctAnswer, threshold = 0.70) {
  const rawUserStr = userAnswer !== undefined && userAnswer !== null ? String(userAnswer).trim() : '';
  const acceptedList = parseAcceptedAnswers(correctAnswer);
  const canonical = acceptedList[0] || '';

  if (!rawUserStr || acceptedList.length === 0) {
    return {
      isPassed: false,
      isExact: false,
      similarityRatio: 0,
      percentage: 0,
      canonicalAnswer: canonical,
      acceptedAnswers: acceptedList,
      userAnswer: rawUserStr
    };
  }

  let maxRatio = 0;
  let bestCanonical = canonical;

  for (const target of acceptedList) {
    const ratio = calculateSimilarity(rawUserStr, target);
    if (ratio > maxRatio) {
      maxRatio = ratio;
      bestCanonical = target;
    }
  }

  const percentage = Math.round(maxRatio * 100);
  const isPassed = maxRatio >= threshold;
  const isExact = maxRatio >= 0.99;

  return {
    isPassed,
    isExact,
    similarityRatio: maxRatio,
    percentage,
    canonicalAnswer: bestCanonical,
    acceptedAnswers: acceptedList,
    userAnswer: rawUserStr
  };
}
