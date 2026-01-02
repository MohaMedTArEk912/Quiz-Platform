/**
 * Centralized Error Handler Utility
 * Ensures consistent error handling across all endpoints
 */

export class APIError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

/**
 * Handles errors consistently across all endpoints
 */
export const handleError = (error, res, context = {}) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  console.error(`\n❌ === ERROR in ${context.endpoint || 'Unknown'} ===`);
  console.error('Message:', error.message);
  console.error('Type:', error.name);
  console.error('Code:', error.statusCode || 500);
  if (isDev && error.stack) {
    console.error('Stack:', error.stack);
  }
  if (context.step) {
    console.error('Failed at:', context.step);
  }
  console.error('=== END ERROR ===\n');

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    ...(isDev && { details: error.details, step: context.step })
  };

  res.status(statusCode).json(response);
};

/**
 * Wraps async controller functions with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Safe database query wrapper
 * Returns null on error instead of throwing
 */
export const safeQuery = async (queryFn, fallbackValue = null) => {
  try {
    const result = await queryFn();
    return result || fallbackValue;
  } catch (error) {
    console.warn('⚠️ Query error:', error.message);
    return fallbackValue;
  }
};

/**
 * Validates required fields
 */
export const validateRequired = (data, fields) => {
  const missing = [];
  fields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    throw new APIError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      { missing }
    );
  }
};

/**
 * Validates that a resource exists
 */
export const validateExists = (resource, resourceName) => {
  if (!resource) {
    throw new APIError(
      `${resourceName} not found`,
      404,
      { resource: resourceName }
    );
  }
};

/**
 * Safe response sender
 */
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Logs database operation details
 */
export const logDBOperation = (operation, collection, details) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 [DB] ${operation} on ${collection}:`, details);
  }
};
