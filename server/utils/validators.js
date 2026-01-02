/**
 * Comprehensive validation utilities for all endpoints
 */

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate user ID format
 */
export const isValidUserId = (userId) => {
  return userId && typeof userId === 'string' && userId.length > 0;
};

/**
 * Validate quiz ID format
 */
export const isValidQuizId = (quizId) => {
  return quizId && typeof quizId === 'string' && quizId.length > 0;
};

/**
 * Validate date range
 */
export const isValidDateRange = (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end && start.getTime() > 0 && end.getTime() > 0;
  } catch {
    return false;
  }
};

/**
 * Validate score (0-100)
 */
export const isValidScore = (score) => {
  return typeof score === 'number' && score >= 0 && score <= 100;
};

/**
 * Validate time in minutes
 */
export const isValidTime = (minutes) => {
  return typeof minutes === 'number' && minutes > 0 && minutes <= 1440; // max 24 hours
};

/**
 * Validate object ID (MongoDB format)
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize input string
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate pagination params
 */
export const validatePagination = (page, limit) => {
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 10;
  
  return {
    page: Math.max(1, p),
    limit: Math.min(Math.max(1, l), 100) // max 100 per page
  };
};

/**
 * Validate array of IDs
 */
export const isValidIdArray = (arr) => {
  return Array.isArray(arr) && arr.every(id => isValidUserId(id));
};

/**
 * Check if required fields exist
 */
export const checkRequired = (obj, fields) => {
  const missing = fields.filter(field => !obj[field]);
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Validate enum value
 */
export const isValidEnum = (value, enumValues) => {
  return enumValues.includes(value);
};

/**
 * Validate attempt data
 */
export const isValidAttemptData = (attempt) => {
  const required = ['userId', 'quizId', 'answers', 'score', 'totalQuestions'];
  const { valid, missing } = checkRequired(attempt, required);
  
  if (!valid) {
    return { valid: false, missing };
  }
  
  if (!isValidScore(attempt.score)) {
    return { valid: false, error: 'Invalid score' };
  }
  
  if (attempt.totalQuestions <= 0) {
    return { valid: false, error: 'Invalid total questions' };
  }
  
  return { valid: true };
};

/**
 * Validate quiz data
 */
export const isValidQuizData = (quiz) => {
  const required = ['id', 'title', 'description', 'category', 'difficulty', 'timeLimit', 'passingScore'];
  const { valid, missing } = checkRequired(quiz, required);
  
  if (!valid) {
    return { valid: false, missing };
  }
  
  if (quiz.timeLimit <= 0 || quiz.timeLimit > 1440) {
    return { valid: false, error: 'Invalid time limit' };
  }
  
  if (!isValidScore(quiz.passingScore)) {
    return { valid: false, error: 'Invalid passing score' };
  }
  
  return { valid: true };
};

/**
 * Validate user data
 */
export const isValidUserData = (user) => {
  const required = ['userId', 'name', 'email'];
  const { valid, missing } = checkRequired(user, required);
  
  if (!valid) {
    return { valid: false, missing };
  }
  
  if (!isValidEmail(user.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
};
