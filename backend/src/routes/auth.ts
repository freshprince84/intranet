import { Router } from 'express';
import { register, login, logout, requestPasswordReset, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
// ❌ ENTFERNT: /auth/user - wird nicht verwendet, Standard ist /users/profile (getUserById in userController.ts)
router.post('/reset-password-request', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router; 