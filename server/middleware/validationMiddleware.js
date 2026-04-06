import { z } from 'zod';

const emailLike = z.string().trim().min(3).refine((value) => {
  const parts = value.split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !/\s/.test(value);
}, { message: 'Invalid email address' });

export const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse(req.body);
    req.body = validData; // Replace body with validated data
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = Array.isArray(error.issues)
        ? error.issues
        : Array.isArray(error.errors)
          ? error.errors
          : [];

      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: issues.map(e => ({ field: Array.isArray(e.path) ? e.path.join('.') : '', message: e.message || 'Invalid value' })) 
      });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const registerSchema = z.object({
  userId: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  createdAt: z.string().optional() // Or date, depending on usage
});

export const loginSchema = z.object({
  email: emailLike,
  password: z.string()
});
