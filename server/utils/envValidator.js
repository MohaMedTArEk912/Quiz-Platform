/**
 * Runtime Environment & Secret Entropy Validator
 * Validates mandatory environment variables, formats, and secret strength
 * before server routes and database connections initialize.
 */

const WEAK_SECRETS = new Set([
  'secret',
  'jwt_secret',
  '123456',
  'password',
  'changeme',
  'quiz-platform-development-fallback-secret',
  'development',
  'test'
]);

export const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Validate Database URI
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongoUri || !String(mongoUri).trim()) {
    if (isProduction) {
      errors.push('MONGO_URI is required in production environment.');
    } else {
      warnings.push('MONGO_URI is not set. Database connections will fail until set.');
    }
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    warnings.push('MONGO_URI does not start with standard mongodb:// or mongodb+srv:// protocol.');
  }

  // 2. Validate JWT Secret & Entropy
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProduction) {
      errors.push('JWT_SECRET is required in production.');
    } else {
      warnings.push('JWT_SECRET is not configured. Falling back to development secret.');
    }
  } else {
    // Check secret entropy in production
    if (isProduction) {
      if (jwtSecret.length < 32) {
        errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Production requires minimum 32 characters for sufficient entropy.`);
      }
      if (WEAK_SECRETS.has(jwtSecret.toLowerCase())) {
        errors.push('JWT_SECRET is set to a known default/insecure value. Generate a cryptographic random string.');
      }
    }
  }

  // 3. Log diagnostics
  if (warnings.length > 0) {
    warnings.forEach((warn) => console.warn(`⚠️  [ENV WARNING] ${warn}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ ==========================================');
    console.error('❌ CRITICAL ENVIRONMENT CONFIGURATION ERRORS:');
    errors.forEach((err) => console.error(`❌ - ${err}`));
    console.error('❌ ==========================================\n');
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  console.log('✅ Environment configuration validated successfully.');
  return true;
};

export default validateEnv;
