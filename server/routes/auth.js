import express from 'express';
import * as authController from '../controllers/authController.js';

import { validate, registerSchema, loginSchema } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/verify-session', authController.verifySession);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authController.changePassword);
router.post('/admin/change-user-password', authController.adminChangeUserPassword);

export default router;
