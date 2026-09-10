/**
 * Express 5 compatible MongoDB Operator Injection Sanitizer.
 * Recursively strips keys starting with '$' or containing '.' from req.body and req.params
 * to prevent NoSQL query selector injection (e.g. { $gt: "" }, { $ne: null }).
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      sanitizeObject(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
};

export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
};

export default mongoSanitizeMiddleware;
