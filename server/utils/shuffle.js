/**
 * Unbiased Fisher-Yates shuffle returning a new shuffled copy of the array.
 * @param {Array} items
 * @returns {Array}
 */
export const shuffleArray = (items = []) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Forces quiz-level and question-level shuffle flags to true so no quiz or
 * question can opt out of forced randomization.
 * @param {object} quiz
 * @returns {object}
 */
export const enforceQuizShuffleFlags = (quiz) => {
  if (!quiz || typeof quiz !== 'object') return quiz;
  const plain = typeof quiz.toObject === 'function' ? quiz.toObject() : { ...quiz };

  plain.shuffleQuestions = true;
  if (Array.isArray(plain.questions)) {
    plain.questions = plain.questions.map((q) => {
      if (!q || typeof q !== 'object') return q;
      const plainQ = typeof q.toObject === 'function' ? q.toObject() : { ...q };
      return {
        ...plainQ,
        shuffleOptions: true
      };
    });
  }

  return plain;
};
