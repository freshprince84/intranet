import { Router } from 'express';
import { getAllUsers, getCurrentUser, updateProfile, getUserById, updateUserRoles, updateUserById, updateUserSettings, updateInvoiceSettings, switchUserRole } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Geschützte Routen - erfordern Authentifizierung
router.use(authMiddleware);

// Benutzer-Routen
router.get('/', getAllUsers);
router.get('/profile', getCurrentUser);
router.put('/profile', updateProfile);
router.put('/settings', updateUserSettings);
router.put('/invoice-settings', updateInvoiceSettings);
router.put('/switch-role', switchUserRole);

// Neue Routen für Benutzerverwaltung
router.get('/:id', getUserById);
router.put('/:id', updateUserById);
router.put('/:id/roles', updateUserRoles);

export default router; 