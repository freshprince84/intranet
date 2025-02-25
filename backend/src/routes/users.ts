import { Router } from 'express';
import { getAllUsers, getCurrentUser, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Geschützte Routen - erfordern Authentifizierung
router.use(authMiddleware);

// Benutzer-Routen
router.get('/', getAllUsers);
router.get('/profile', getCurrentUser);
router.put('/profile', updateProfile);

export default router; 