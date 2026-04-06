let warnedAboutFallback = false;

export const resolveJwtSecret = () => {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not configured');
  }

  if (!warnedAboutFallback) {
    console.warn('⚠️ JWT_SECRET is missing. Falling back to a development secret so auth can still work locally.');
    warnedAboutFallback = true;
  }

  return 'quiz-platform-development-fallback-secret';
};