import { Router } from 'express';
import { register, login, getCurrentUser, logout } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/user', authMiddleware, getCurrentUser);

export default router; 