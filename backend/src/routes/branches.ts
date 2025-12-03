import { Router } from 'express';
import { getTest, getAllBranches, getUserBranches, switchUserBranch, createBranch, updateBranch, deleteBranch, getRoomDescriptions, updateRoomDescriptions, getRoomDescription } from '../controllers/branchController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Debug-Route ohne Auth
router.get('/debug', (_req, res) => {
    res.json({ message: 'Die Route /api/branches/debug funktioniert!' });
});

// Test-Route ohne Auth mit Controller
router.get('/test', getTest);

// Alle Routen erfordern Authentifizierung und Organisation-Kontext
router.use(authMiddleware);
router.use(organizationMiddleware);

// Alle Niederlassungen abrufen - nur für authentifizierte User der Organisation
router.get('/', getAllBranches);

// Branches des aktuellen Benutzers mit lastUsed-Flag abrufen
router.get('/user', getUserBranches);

// Aktiven Branch des Benutzers wechseln
router.post('/switch', switchUserBranch);

// Branch erstellen
router.post('/', createBranch);

// Branch aktualisieren
router.put('/:id', updateBranch);

// Branch löschen
router.delete('/:id', deleteBranch);

// Zimmer-Beschreibungen
router.get('/:id/room-descriptions', getRoomDescriptions);
router.put('/:id/room-descriptions', updateRoomDescriptions);
router.get('/:id/room-descriptions/:categoryId', getRoomDescription);

export default router; 