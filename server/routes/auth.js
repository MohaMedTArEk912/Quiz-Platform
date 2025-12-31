import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/verify-session', authController.verifySession);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authController.changePassword);
router.post('/admin/change-user-password', authController.adminChangeUserPassword);

export default router;
