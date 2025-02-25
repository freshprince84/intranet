import { Router } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole, getRolePermissions } from '../controllers/roleController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Alle Rollen abrufen
router.get('/', authMiddleware, getAllRoles);

// Eine spezifische Rolle abrufen
router.get('/:id', authMiddleware, getRoleById);

// Neue Rolle erstellen
router.post('/', authMiddleware, createRole);

// Rolle aktualisieren
router.put('/:id', authMiddleware, updateRole);

// Rolle löschen
router.delete('/:id', authMiddleware, deleteRole);

// Berechtigungen einer Rolle abrufen
router.get('/:id/permissions', authMiddleware, getRolePermissions);

export default router; 