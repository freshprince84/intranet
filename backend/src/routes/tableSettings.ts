import express from 'express';
import { getUserTableSettings, saveUserTableSettings } from '../controllers/tableSettingsController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Alle Routen mit authMiddleware schützen
router.use(authMiddleware);

// Tabelleneinstellungen für einen Benutzer abrufen
router.get('/:tableId', getUserTableSettings);

// Tabelleneinstellungen für einen Benutzer speichern
router.post('/', saveUserTableSettings);

export default router; 