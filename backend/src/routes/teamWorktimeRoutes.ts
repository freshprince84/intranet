import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { isTeamManager } from '../middleware/isTeamManager';
import {
  getActiveTeamWorktimes,
  stopUserWorktime,
  getUserWorktimesByDay,
  updateUserWorktime,
  updateApprovedOvertimeHours
} from '../controllers/teamWorktimeController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung und Team-Manager-Berechtigung
router.use(authenticateToken);
router.use(isTeamManager);

// Aktive Zeiterfassungen im Team abrufen
router.get('/active', getActiveTeamWorktimes);

// Zeiterfassung eines Benutzers stoppen
router.post('/stop-user', stopUserWorktime);

// Zeiterfassungen eines Benutzers für einen Tag abrufen
router.get('/user-day', getUserWorktimesByDay);

// Zeiterfassung aktualisieren
router.put('/update', updateUserWorktime);

// Bewilligte Überstunden aktualisieren
router.put('/overtime', updateApprovedOvertimeHours);

export default router; 