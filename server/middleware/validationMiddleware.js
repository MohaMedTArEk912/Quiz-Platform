import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    const validData = schema.parse(req.body);
    req.body = validData; // Replace body with validated data
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) 
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
  email: z.string().email(),
  password: z.string()
});
